// Sincroniza eventos de Stripe con la base de datos: clientes, suscripciones y pedidos.
// Recibe el cliente de Stripe como parámetro para poder probarlo sin conexión (ver server/scripts/test-webhook.js).
import { sql } from '../db/db.js';
import { config } from '../config.js';
import { monthOf } from './metrics.js';
import { notifyAdmins } from './push.js';
import { PICKUP_CLUBS } from './clubs.js';

/** Columnas añadidas después del esquema inicial (recogida en club y reembolsos): se crean solas al arrancar. */
export async function initOrderExtras() {
  await sql`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS pickup_club text NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_club text NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_cents integer NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_at timestamptz`;
  // Entrega: home (a domicilio) | office (oficina de Correos o CityPaq) | club. pickup_office = oficina que pide el cliente.
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery text NOT NULL DEFAULT 'home'`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_office text NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS pickup_office text NOT NULL DEFAULT ''`;
  await sql`UPDATE orders SET delivery = 'club' WHERE pickup_club <> '' AND delivery = 'home'`; // pedidos de antes de la columna
}

// metadata.entrega de los enlaces de pago (stripe-setup.js) -> valor guardado en orders.delivery
const DELIVERY = { domicilio: 'home', oficina: 'office', club: 'club' };

const eur = (c) => (c / 100).toFixed(2).replace('.', ',') + ' €';

const toDate = (unix) => (unix ? new Date(unix * 1000) : null);
const idOf = (v) => (typeof v === 'string' ? v : v?.id) || null;
// El precio de una línea está en sitios distintos según la versión de la API de Stripe.
const priceIdOf = (l) => l?.price?.id || l?.pricing?.price_details?.price || l?.plan?.id || null;

async function findPack(priceId, planSlug) {
  if (priceId) {
    const [p] = await sql`SELECT id, price_cents FROM packs WHERE stripe_price_id = ${priceId}`;
    if (p) return p;
  }
  // Plan B: los Payment Links marcan el pack en metadata.plan (start | player | pro)
  if (planSlug) {
    const [p] = await sql`SELECT id, price_cents FROM packs WHERE slug = ${String(planSlug).toLowerCase()}`;
    if (p) return p;
  }
  return null;
}

function splitName(full = '') {
  const parts = full.trim().split(/\s+/);
  return { first: parts.shift() || '', last: parts.join(' ') };
}

/** Crea o actualiza el cliente local. `shipping`/`details` (del checkout) tienen prioridad sobre lo guardado en Stripe. */
async function upsertCustomer(stripe, customerId, shipping = null, details = null) {
  const c = await stripe.customers.retrieve(customerId);
  if (c.deleted) {
    const [u] = await sql`SELECT id FROM users WHERE stripe_customer_id = ${customerId}`;
    return u?.id ?? null;
  }
  const ship = (shipping?.address ? shipping : null) || c.shipping || {};
  const addr = ship.address || details?.address || c.address || {};
  const { first, last } = splitName(ship.name || details?.name || c.name || '');
  const email = (details?.email || c.email || `${customerId}@sin-email.invalid`).toLowerCase();
  const row = {
    first_name: first, last_name: last, phone: ship.phone || details?.phone || c.phone || '',
    // Stripe guarda calle y número juntos en line1; el número queda dentro de "street".
    street: addr.line1 || '', floor_door: addr.line2 || '', postal_code: addr.postal_code || '',
    city: addr.city || '', province: addr.state || '', country: addr.country || 'ES', stripe_customer_id: customerId,
  };
  // Si ya existía (mismo id de Stripe o mismo email), se actualiza en vez de duplicarlo.
  const [existing] = await sql`SELECT id FROM users WHERE stripe_customer_id = ${customerId} OR lower(email) = ${email}
    ORDER BY stripe_customer_id NULLS LAST LIMIT 1`;
  if (existing) {
    // Solo se sobrescriben los datos que vienen rellenos: un evento sin dirección no borra la guardada.
    const filled = Object.fromEntries(Object.entries(row).filter(([, v]) => v !== ''));
    await sql`UPDATE users SET ${sql(filled)}, updated_at = now() WHERE id = ${existing.id}`;
    return existing.id;
  }
  const [created] = await sql`INSERT INTO users ${sql({ ...row, email, role: 'CUSTOMER' })} ON CONFLICT DO NOTHING RETURNING id`;
  if (created) return created.id;
  const [again] = await sql`SELECT id FROM users WHERE stripe_customer_id = ${customerId} OR lower(email) = ${email} LIMIT 1`;
  return again.id; // otro evento simultáneo lo acaba de crear
}

function mapStatus(sub) {
  if (['canceled', 'incomplete_expired', 'unpaid'].includes(sub.status)) return 'canceled';
  if (sub.pause_collection || sub.status === 'paused') return 'paused';
  return 'active';
}

async function syncSubscription(stripe, sub) {
  let item = null, pack = null;
  for (const i of sub.items?.data || []) {
    pack = await findPack(priceIdOf(i), null);
    if (pack) { item = i; break; }
  }
  if (!pack) {
    pack = await findPack(null, sub.metadata?.plan);
    item = (sub.items?.data || []).find((i) => priceIdOf(i) !== config.stripe.shippingPriceId) || sub.items?.data?.[0];
  }
  if (!pack) {
    console.warn(`[stripe] Suscripción ${sub.id} sin pack reconocido: revisa stripe_price_id en la tabla packs.`);
    return;
  }

  const userId = await upsertCustomer(stripe, idOf(sub.customer));
  const status = mapStatus(sub);
  const [prev] = await sql`SELECT status FROM subscriptions WHERE stripe_subscription_id = ${sub.id}`;
  const row = {
    user_id: userId,
    pack_id: pack.id,
    status,
    price_cents: item?.price?.unit_amount ?? pack.price_cents,
    started_at: toDate(sub.start_date || sub.created),
    current_period_end: status === 'canceled' ? null : toDate(item?.current_period_end || sub.current_period_end),
    paused_at: status === 'paused' ? new Date() : null,
    canceled_at: status === 'canceled' ? toDate(sub.ended_at || sub.canceled_at) || new Date() : null,
    stripe_subscription_id: sub.id,
  };
  await sql`INSERT INTO subscriptions ${sql(row)}
    ON CONFLICT (stripe_subscription_id) DO UPDATE SET
      pack_id = EXCLUDED.pack_id, status = EXCLUDED.status, price_cents = EXCLUDED.price_cents,
      current_period_end = EXCLUDED.current_period_end,
      paused_at = CASE WHEN EXCLUDED.status = 'paused' THEN COALESCE(subscriptions.paused_at, EXCLUDED.paused_at) ELSE NULL END,
      canceled_at = EXCLUDED.canceled_at, updated_at = now()`;

  if (status === 'canceled' && prev && prev.status !== 'canceled') {
    const [info] = await sql`SELECT u.first_name, u.last_name, u.email, p.name AS pack FROM users u, packs p WHERE u.id = ${userId} AND p.id = ${pack.id}`;
    await notifyAdmins({
      title: '👋 Baja de un cliente',
      body: `${`${info.first_name} ${info.last_name}`.trim() || info.email} ha cancelado su ${info.pack}.`,
      url: '/admin/#/clientes?status=canceled', tag: `pd-baja-${sub.id}`,
    });
  }
}

async function createOrderFromInvoice(stripe, inv) {
  const [done] = await sql`SELECT 1 FROM orders WHERE stripe_invoice_id = ${inv.id}`;
  if (done) return; // ya procesada (Stripe puede reenviar el mismo evento)

  const subId = idOf(inv.subscription) || idOf(inv.parent?.subscription_details?.subscription);
  const lines = inv.lines?.data || [];
  let packLine = null, pack = null;
  for (const l of lines) {
    pack = await findPack(priceIdOf(l), null);
    if (pack) { packLine = l; break; }
  }
  if (!pack) {
    const planSlug = inv.parent?.subscription_details?.metadata?.plan || inv.subscription_details?.metadata?.plan;
    pack = await findPack(null, planSlug);
    packLine = lines.find((l) => priceIdOf(l) !== config.stripe.shippingPriceId);
  }
  if (!pack || !packLine) return; // no es una factura de un pack
  // Envío = la línea con el Price ID de envío configurado; si no coincide (p. ej. al cambiar de cuenta de Stripe), la otra línea.
  const shipLine = lines.find((l) => l !== packLine && priceIdOf(l) === config.stripe.shippingPriceId)
    || lines.find((l) => l !== packLine);
  const discount = (l) => (l?.discount_amounts || []).reduce((a, d) => a + d.amount, 0);

  if (subId) await syncSubscription(stripe, await stripe.subscriptions.retrieve(subId));

  const userId = await upsertCustomer(stripe, idOf(inv.customer), inv.customer_shipping);
  const [u] = await sql`SELECT * FROM users WHERE id = ${userId}`;
  const [local] = subId ? await sql`SELECT id, pickup_club, pickup_office FROM subscriptions WHERE stripe_subscription_id = ${subId}` : [];
  const entrega = (inv.parent?.subscription_details?.metadata || inv.subscription_details?.metadata || {}).entrega;
  const ship = inv.customer_shipping?.address ? inv.customer_shipping : {};
  const addr = ship.address || {};
  const paidAt = toDate(inv.status_transitions?.paid_at) || new Date();

  const order = {
    user_id: userId,
    subscription_id: local?.id ?? null,
    pack_id: pack.id,
    period: monthOf(paidAt),
    amount_cents: packLine.amount - discount(packLine),
    shipping_cents: shipLine ? shipLine.amount - discount(shipLine) : 0,
    status: 'pending',
    ship_name: ship.name || `${u.first_name} ${u.last_name}`.trim(),
    ship_phone: ship.phone || u.phone,
    ship_street: addr.line1 || u.street,
    ship_floor_door: addr.line2 || u.floor_door,
    ship_postal_code: addr.postal_code || u.postal_code,
    ship_city: addr.city || u.city,
    ship_province: addr.state || u.province,
    ship_country: addr.country || u.country,
    // Si la factura llega antes que el checkout, el club aún no se sabe: lo completa syncCheckout.
    pickup_club: local?.pickup_club || '',
    pickup_office: local?.pickup_office || '',
    delivery: DELIVERY[entrega] || (local?.pickup_club ? 'club' : 'home'),
    paid_at: paidAt,
    stripe_invoice_id: inv.id,
  };
  const [created] = await sql`INSERT INTO orders ${sql(order)} ON CONFLICT (stripe_invoice_id) DO NOTHING RETURNING id`;
  if (created) {
    const [{ name: packName }] = await sql`SELECT name FROM packs WHERE id = ${pack.id}`;
    const renewal = inv.billing_reason === 'subscription_cycle';
    await notifyAdmins({
      title: renewal ? '🔁 Pedido nuevo (renovación)' : '🎾 Pedido nuevo',
      body: `${order.ship_name || u.email} · ${packName} · ${eur(order.amount_cents + order.shipping_cents)}${order.delivery === 'club' ? ` · recoge en ${order.pickup_club || 'su club'}` : `${order.delivery === 'office' ? ' · oficina/CityPaq' : ''}${order.ship_city ? ` · ${order.ship_city}` : ''}`}`,
      url: '/admin/#/pedidos', tag: `pd-pedido-${created.id}`,
    });
  }
}

/** El checkout trae la dirección que el cliente acaba de escribir: se guarda y se completa el primer pedido si le faltaba. */
async function syncCheckout(stripe, session) {
  if (session.mode !== 'subscription' || !session.customer) return;
  const shipping = session.collected_information?.shipping_details || session.shipping_details || null;
  const userId = await upsertCustomer(stripe, idOf(session.customer), shipping, session.customer_details);
  const [u] = await sql`SELECT * FROM users WHERE id = ${userId}`;
  await sql`UPDATE orders SET ship_name = ${`${u.first_name} ${u.last_name}`.trim()}, ship_phone = ${u.phone},
      ship_street = ${u.street}, ship_floor_door = ${u.floor_door}, ship_postal_code = ${u.postal_code},
      ship_city = ${u.city}, ship_province = ${u.province}, ship_country = ${u.country}, updated_at = now()
    WHERE user_id = ${userId} AND status = 'pending' AND ship_street = ''`;
  if (!session.subscription) return;
  const subId = idOf(session.subscription);
  await syncSubscription(stripe, await stripe.subscriptions.retrieve(subId));
  // Enlaces de recogida: el club elegido en el desplegable de Stripe se guarda en la suscripción y en su primer pedido.
  const club = PICKUP_CLUBS[(session.custom_fields || []).find((f) => f.key === 'club')?.dropdown?.value];
  if (club) {
    await sql`UPDATE subscriptions SET pickup_club = ${club}, updated_at = now() WHERE stripe_subscription_id = ${subId}`;
    await sql`UPDATE orders SET pickup_club = ${club}, updated_at = now()
      WHERE subscription_id = (SELECT id FROM subscriptions WHERE stripe_subscription_id = ${subId}) AND status = 'pending'`;
  }
  // Enlaces a oficina de Correos o CityPaq: la oficina que escribe el cliente (opcional; si no, la más cercana a su dirección).
  const office = String((session.custom_fields || []).find((f) => f.key === 'oficina')?.text?.value || '').trim().slice(0, 255);
  if (office) {
    await sql`UPDATE subscriptions SET pickup_office = ${office}, updated_at = now() WHERE stripe_subscription_id = ${subId}`;
    await sql`UPDATE orders SET pickup_office = ${office}, updated_at = now()
      WHERE subscription_id = (SELECT id FROM subscriptions WHERE stripe_subscription_id = ${subId}) AND status = 'pending'`;
  }
}

/**
 * Reembolso (total o parcial) hecho en Stripe: se guarda en el pedido para que no cuente como ingreso.
 * Con la API nueva el cargo ya no trae la factura; entonces se busca el pedido del mismo cliente con el mismo
 * importe cobrado más cerca de la fecha del cargo (±3 días).
 */
async function syncRefund(stripe, charge) {
  const refunded = charge.amount_refunded || 0;
  let [order] = charge.invoice ? await sql`SELECT id FROM orders WHERE stripe_invoice_id = ${idOf(charge.invoice)}` : [];
  if (!order && charge.customer) {
    const at = toDate(charge.created);
    [order] = await sql`SELECT o.id FROM orders o JOIN users u ON u.id = o.user_id
      WHERE u.stripe_customer_id = ${idOf(charge.customer)} AND o.amount_cents + o.shipping_cents = ${charge.amount}
        AND o.paid_at BETWEEN ${at}::timestamptz - interval '3 days' AND ${at}::timestamptz + interval '3 days'
      ORDER BY abs(extract(epoch FROM o.paid_at - ${at}::timestamptz)) LIMIT 1`;
  }
  if (!order) {
    console.warn(`[stripe] Reembolso del cargo ${charge.id} sin pedido asociado.`);
    return;
  }
  await sql`UPDATE orders SET refunded_cents = ${refunded}, refunded_at = CASE WHEN ${refunded} > 0 THEN COALESCE(refunded_at, now()) END,
    updated_at = now() WHERE id = ${order.id}`;
}

export const HANDLED_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'charge.refunded',
];

export async function handleStripeEvent(stripe, event) {
  const obj = event.data.object;
  switch (event.type) {
    case 'checkout.session.completed':
      return syncCheckout(stripe, obj);
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      return syncSubscription(stripe, obj);
    case 'invoice.paid':
      return createOrderFromInvoice(stripe, obj);
    case 'charge.refunded':
      return syncRefund(stripe, obj);
    default:
      return undefined; // otros eventos: se ignoran
  }
}
