// Prueba del webhook de Stripe SIN conexión a Stripe: simula los eventos de una compra completa
// y comprueba lo que queda en la base de datos. Borra todo lo que crea al terminar.
// Uso: npm run test:webhook
process.env.STRIPE_SECRET_KEY ||= 'sk_test_simulado';
process.env.STRIPE_WEBHOOK_SECRET ||= 'whsec_simulado';

const { config } = await import('../config.js');
const { sql, closeDb } = await import('../db/db.js');
const { handleStripeEvent, initPickup } = await import('../services/stripe-sync.js');
await initPickup();
const { initPush, __setSender } = await import('../services/push.js');
// Avisos al móvil: se capturan en vez de enviarse de verdad
const pushes = [];
await initPush();
__setSender(async (sub, payload) => { pushes.push(JSON.parse(payload)); });
const { monthOf } = await import('../services/metrics.js');
const { stripeRouter } = await import('../routes/stripe-webhook.js');
const { default: express } = await import('express');
const { default: Stripe } = await import('stripe');

if (config.isProd) { console.error('No se ejecuta con NODE_ENV=production.'); process.exit(1); }

const T = `TEST${Date.now()}`;           // sufijo único para no chocar con datos reales
const now = Math.floor(Date.now() / 1000);
const DAY = 86400;
let failures = 0;
const check = (name, cond, extra = '') => { console.log(`${cond ? '  OK ' : '  FALLO'}  ${name}${extra ? `  (${extra})` : ''}`); if (!cond) failures++; };

// Si los packs aún no tienen Price ID de Stripe (instalación nueva), se ponen unos temporales y se quitan al acabar
const tempPrice = await sql`UPDATE packs SET stripe_price_id = 'price_prueba_' || slug || ${'_' + T} WHERE stripe_price_id IS NULL RETURNING slug`;
const packs = Object.fromEntries((await sql`SELECT slug, id, stripe_price_id FROM packs`).map((p) => [p.slug, p]));
const SHIP = config.stripe.shippingPriceId || 'price_envio';

// ---- Stripe simulado ----
const customers = {
  [`cus_A${T}`]: { id: `cus_A${T}`, email: `ana.${T}@example.com`, name: 'Ana Prueba Webhook', phone: null, shipping: null, address: null },
  [`cus_B${T}`]: { id: `cus_B${T}`, email: `bruno.${T}@example.com`, name: 'Bruno Prueba', phone: '+34600111222',
    shipping: { name: 'Bruno Prueba', phone: '+34600111222', address: { line1: 'Carrer Major 5', line2: '2º 1ª', postal_code: '25210', city: 'Guissona', state: 'Lleida', country: 'ES' } } },
  [`cus_C${T}`]: { id: `cus_C${T}`, email: `carla.${T}@example.com`, name: 'Carla Prueba', shipping: null },
  [`cus_F${T}`]: { id: `cus_F${T}`, email: `ferran.${T}@example.com`, name: 'Ferran Club', phone: null, shipping: null, address: null },
};
const subs = {};
const fakeStripe = {
  customers: { retrieve: async (id) => customers[id] },
  subscriptions: { retrieve: async (id) => subs[id] },
};
const ev = (type, object) => ({ id: `evt_${type}_${T}`, type, data: { object } });

try {
  // Un administrador de prueba con un móvil suscrito a los avisos
  const [adm] = await sql`INSERT INTO users (email, role) VALUES (${`push.${T}@example.com`}, 'ADMIN') RETURNING id`;
  await sql`INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (${adm.id}, ${`https://push.example.com/${T}`}, 'clave', 'auth')`;
  // ===== Escenario A: API nueva (2025+). La factura llega ANTES que el checkout (pasa en la vida real). =====
  console.log('\nA) Pack Intermedio, código de descuento 10 %, formato de API nuevo');
  subs[`sub_A${T}`] = {
    id: `sub_A${T}`, customer: `cus_A${T}`, status: 'active', start_date: now, created: now, metadata: { plan: 'player' },
    items: { data: [
      { price: { id: packs.player.stripe_price_id, unit_amount: 1590 }, current_period_end: now + 30 * DAY },
      { price: { id: SHIP, unit_amount: 350 }, current_period_end: now + 30 * DAY },
    ] },
  };
  const invoiceA = {
    id: `in_A${T}`, customer: `cus_A${T}`, customer_shipping: null, status_transitions: { paid_at: now },
    parent: { subscription_details: { subscription: `sub_A${T}`, metadata: { plan: 'player' } } },
    lines: { data: [
      { amount: 1590, pricing: { price_details: { price: packs.player.stripe_price_id } }, discount_amounts: [{ amount: 159 }] },
      { amount: 350, pricing: { price_details: { price: SHIP } }, discount_amounts: [{ amount: 35 }] },
    ] },
  };
  await handleStripeEvent(fakeStripe, ev('invoice.paid', invoiceA));
  await handleStripeEvent(fakeStripe, ev('customer.subscription.created', subs[`sub_A${T}`]));
  await handleStripeEvent(fakeStripe, ev('checkout.session.completed', {
    id: `cs_A${T}`, mode: 'subscription', customer: `cus_A${T}`, subscription: `sub_A${T}`,
    customer_details: { email: `ana.${T}@example.com`, name: 'Ana Prueba Webhook', phone: '+34611222333', address: { line1: 'Facturación 1', postal_code: '25300', city: 'Tàrrega', country: 'ES' } },
    collected_information: { shipping_details: { name: 'Ana Prueba Webhook', address: { line1: 'Avinguda Catalunya 10', line2: '3º B', postal_code: '25300', city: 'Tàrrega', state: 'Lleida', country: 'ES' } } },
  }));
  await handleStripeEvent(fakeStripe, ev('invoice.paid', invoiceA)); // Stripe reenvía el mismo evento

  const [ua] = await sql`SELECT * FROM users WHERE stripe_customer_id = ${`cus_A${T}`}`;
  const oa = await sql`SELECT * FROM orders WHERE user_id = ${ua?.id ?? 0}`;
  const [sa] = await sql`SELECT s.*, p.slug FROM subscriptions s JOIN packs p ON p.id = s.pack_id WHERE stripe_subscription_id = ${`sub_A${T}`}`;
  check('cliente creado con nombre y teléfono del checkout', ua?.first_name === 'Ana' && ua?.phone === '+34611222333', `${ua?.first_name} ${ua?.last_name} · ${ua?.phone}`);
  check('dirección de ENVÍO (no la de facturación)', ua?.street === 'Avinguda Catalunya 10' && ua?.floor_door === '3º B', ua?.street);
  check('un solo pedido aunque el evento llegue dos veces', oa.length === 1, `${oa.length} pedidos`);
  const avisosPedido = pushes.filter((p) => p.title.includes('Pedido nuevo'));
  check('aviso al móvil de pedido nuevo, uno solo aunque el evento se repita', avisosPedido.length === 1, avisosPedido.map((p) => `${p.title}: ${p.body}`).join(' | '));
  check('el aviso abre la pantalla de pedidos', avisosPedido[0]?.url === '/admin/#/pedidos');
  check('pedido pendiente, del mes actual', oa[0]?.status === 'pending' && oa[0]?.period === monthOf(), `${oa[0]?.status} ${oa[0]?.period}`);
  check('importes con descuento: 14,31 € + 3,15 € de envío', oa[0]?.amount_cents === 1431 && oa[0]?.shipping_cents === 315, `${oa[0]?.amount_cents} + ${oa[0]?.shipping_cents}`);
  check('el pedido recibe la dirección del checkout aunque llegó antes', oa[0]?.ship_street === 'Avinguda Catalunya 10' && oa[0]?.ship_postal_code === '25300', oa[0]?.ship_street);
  check('suscripción activa, Pack Intermedio, con fecha de renovación', sa?.status === 'active' && sa?.slug === 'player' && !!sa?.current_period_end);

  subs[`sub_A${T}`] = { ...subs[`sub_A${T}`], pause_collection: { behavior: 'void' } };
  await handleStripeEvent(fakeStripe, ev('customer.subscription.updated', subs[`sub_A${T}`]));
  const [ua2] = await sql`SELECT street FROM users WHERE id = ${ua.id}`;
  check('pausa -> estado "paused"', (await sql`SELECT status FROM subscriptions WHERE id = ${sa.id}`)[0].status === 'paused');
  check('un evento sin dirección NO borra la dirección guardada', ua2.street === 'Avinguda Catalunya 10', ua2.street);

  await handleStripeEvent(fakeStripe, ev('customer.subscription.deleted', { ...subs[`sub_A${T}`], pause_collection: null, status: 'canceled', ended_at: now + DAY }));
  const [sa3] = await sql`SELECT status, canceled_at, current_period_end FROM subscriptions WHERE id = ${sa.id}`;
  check('baja -> estado "canceled" con fecha de baja', sa3.status === 'canceled' && !!sa3.canceled_at && !sa3.current_period_end);
  const avisosBaja = pushes.filter((p) => p.title.includes('Baja'));
  check('aviso al móvil de baja (uno, y no en la pausa)', avisosBaja.length === 1, avisosBaja.map((p) => p.body).join(' | '));

  // ===== Escenario B: API antigua, dirección en la factura. =====
  console.log('\nB) Pack Premium, formato de API antiguo');
  subs[`sub_B${T}`] = { id: `sub_B${T}`, customer: `cus_B${T}`, status: 'active', start_date: now, current_period_end: now + 30 * DAY,
    items: { data: [{ price: { id: packs.pro.stripe_price_id, unit_amount: 2390 } }, { price: { id: SHIP, unit_amount: 350 } }] } };
  await handleStripeEvent(fakeStripe, ev('invoice.paid', {
    id: `in_B${T}`, customer: `cus_B${T}`, subscription: `sub_B${T}`, status_transitions: { paid_at: now }, billing_reason: 'subscription_cycle',
    customer_shipping: customers[`cus_B${T}`].shipping,
    lines: { data: [{ amount: 2390, price: { id: packs.pro.stripe_price_id } }, { amount: 350, price: { id: SHIP } }] },
  }));
  const [ob] = await sql`SELECT o.*, p.slug FROM orders o JOIN packs p ON p.id = o.pack_id WHERE stripe_invoice_id = ${`in_B${T}`}`;
  check('pedido Pack Premium 23,90 € + 3,50 €', ob?.slug === 'pro' && ob?.amount_cents === 2390 && ob?.shipping_cents === 350);
  const avisoRenov = pushes.find((p) => p.title.includes('renovación'));
  check('aviso de renovación mensual con importe y ciudad', !!avisoRenov && avisoRenov.body.includes('27,40 €') && avisoRenov.body.includes('Guissona'), avisoRenov?.body);
  check('dirección completa en el pedido', ob?.ship_street === 'Carrer Major 5' && ob?.ship_floor_door === '2º 1ª' && ob?.ship_city === 'Guissona');
  const [sb] = await sql`SELECT current_period_end FROM subscriptions WHERE stripe_subscription_id = ${`sub_B${T}`}`;
  check('fecha de renovación leída del formato antiguo', !!sb?.current_period_end);

  // ===== Escenario C: Price ID desconocido, pack por metadata.plan =====
  console.log('\nC) Price ID que no está en la tabla packs');
  subs[`sub_C${T}`] = { id: `sub_C${T}`, customer: `cus_C${T}`, status: 'active', start_date: now, metadata: { plan: 'start' },
    items: { data: [{ price: { id: 'price_desconocido', unit_amount: 1190 }, current_period_end: now + 30 * DAY }] } };
  await handleStripeEvent(fakeStripe, ev('customer.subscription.created', subs[`sub_C${T}`]));
  const [sc] = await sql`SELECT p.slug FROM subscriptions s JOIN packs p ON p.id = s.pack_id WHERE stripe_subscription_id = ${`sub_C${T}`}`;
  check('pack identificado por metadata.plan = start', sc?.slug === 'start');

  // ===== Escenario D: factura que no es de un pack =====
  console.log('\nD) Factura sin ningún pack');
  await handleStripeEvent(fakeStripe, ev('invoice.paid', { id: `in_D${T}`, customer: `cus_C${T}`, lines: { data: [{ amount: 500, price: { id: 'price_otra_cosa' } }] } }));
  check('se ignora (no crea pedido)', (await sql`SELECT count(*) AS n FROM orders WHERE stripe_invoice_id = ${`in_D${T}`}`)[0].n === 0);

  // ===== Escenario F: recogida en club (sin envío). La factura llega antes que el checkout con el club. =====
  console.log('\nF) Recogida gratis en club');
  subs[`sub_F${T}`] = { id: `sub_F${T}`, customer: `cus_F${T}`, status: 'active', start_date: now, metadata: { plan: 'start', entrega: 'club' },
    items: { data: [{ price: { id: packs.start.stripe_price_id, unit_amount: 890 }, current_period_end: now + 30 * DAY }] } };
  const invoiceF = (id) => ({ id, customer: `cus_F${T}`, customer_shipping: null, status_transitions: { paid_at: now },
    parent: { subscription_details: { subscription: `sub_F${T}`, metadata: { plan: 'start', entrega: 'club' } } },
    lines: { data: [{ amount: 890, pricing: { price_details: { price: packs.start.stripe_price_id } } }] } });
  await handleStripeEvent(fakeStripe, ev('invoice.paid', invoiceF(`in_F1${T}`)));
  await handleStripeEvent(fakeStripe, ev('checkout.session.completed', {
    id: `cs_F${T}`, mode: 'subscription', customer: `cus_F${T}`, subscription: `sub_F${T}`,
    customer_details: { email: `ferran.${T}@example.com`, name: 'Ferran Club', phone: '+34622333444', address: { postal_code: '25241', country: 'ES' } },
    custom_fields: [{ key: 'club', type: 'dropdown', dropdown: { value: 'golmes' } }],
  }));
  const [of1] = await sql`SELECT * FROM orders WHERE stripe_invoice_id = ${`in_F1${T}`}`;
  check('primer pedido marcado para recoger en Interpàdel Golmés', of1?.pickup_club === 'Interpàdel Golmés', of1?.pickup_club);
  check('sin gastos de envío', of1?.amount_cents === 890 && of1?.shipping_cents === 0, `${of1?.amount_cents} + ${of1?.shipping_cents}`);
  await handleStripeEvent(fakeStripe, ev('invoice.paid', { ...invoiceF(`in_F2${T}`), billing_reason: 'subscription_cycle' }));
  const [of2] = await sql`SELECT * FROM orders WHERE stripe_invoice_id = ${`in_F2${T}`}`;
  check('la renovación del mes siguiente también va al club', of2?.pickup_club === 'Interpàdel Golmés', of2?.pickup_club);
  const avisoClub = pushes.find((p) => p.body.includes('Ferran') && p.title.includes('renovación'));
  check('el aviso al móvil dice dónde se recoge', !!avisoClub && avisoClub.body.includes('recoge en Interpàdel Golmés'), avisoClub?.body);

  // ===== Escenario E: firma del webhook por HTTP =====
  console.log('\nE) Firma del webhook');
  const app = express().use('/api/stripe', stripeRouter);
  const server = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  const url = `http://127.0.0.1:${server.address().port}/api/stripe/webhook`;
  const payload = JSON.stringify(ev('product.created', { id: 'prod_x' }));
  const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
  const ok = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': header }, body: payload });
  const bad = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=falsa' }, body: payload });
  const none = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload });
  server.close();
  check('evento firmado por Stripe -> aceptado (200)', ok.status === 200, String(ok.status));
  check('firma falsa -> rechazado (400)', bad.status === 400, String(bad.status));
  check('sin firma -> rechazado (400)', none.status === 400, String(none.status));
} catch (err) {
  failures++;
  console.error('\nError inesperado:', err);
} finally {
  // Limpieza: todo lo creado lleva el sufijo único de esta prueba (pedidos y suscripciones caen en cascada).
  await sql`DELETE FROM users WHERE stripe_customer_id LIKE ${`%${T}`} OR email = ${`push.${T}@example.com`}`;
  if (tempPrice.length) await sql`UPDATE packs SET stripe_price_id = NULL WHERE stripe_price_id LIKE ${`%_${T}`}`;
  console.log(failures ? `\n${failures} comprobaciones FALLIDAS.` : '\nTodo correcto: el webhook funciona. Datos de prueba borrados.');
  process.exitCode = failures ? 1 : 0;
  await closeDb();
}
