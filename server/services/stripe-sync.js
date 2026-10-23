// Sincroniza eventos de Stripe con la base de datos: clientes, suscripciones y pedidos.
// Recibe el cliente de Stripe como parámetro para poder probarlo sin conexión (ver server/scripts/test-webhook.js).
import { sql } from '../db/db.js';
import { config } from '../config.js';
import { monthOf } from './metrics.js';

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
  const [local] = subId ? await sql`SELECT id FROM subscriptions WHERE stripe_subscription_id = ${subId}` : [];
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
    paid_at: paidAt,
    stripe_invoice_id: inv.id,
  };
  await sql`INSERT INTO orders ${sql(order)} ON CONFLICT (stripe_invoice_id) DO NOTHING`;
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
  if (session.subscription) await syncSubscription(stripe, await stripe.subscriptions.retrieve(idOf(session.subscription)));
}

export const HANDLED_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
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
    default:
      return undefined; // otros eventos: se ignoran
  }
}
