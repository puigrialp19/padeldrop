// Crea en TU cuenta de Stripe todo lo que necesita PADEL DROP y conecta la web con ella:
//   - 3 packs (START/PLAYER/PRO) + envío mensual, con sus precios (IVA incluido)
//   - cupón y código de socio de Interpàdel (10 % el primer mes, solo clientes nuevos)
//   - 3 enlaces de pago (pack + envío, pide nombre, teléfono y dirección en España)
//   - 3 enlaces de recogida gratis en club (solo el pack; el cliente elige Guissona, Tàrrega o Golmés)
//   - portal de cliente (facturas, tarjeta, datos y cancelación)
//   - webhook hacia tu web
// Después actualiza public/js/config.js y te da el SQL para Supabase y las variables para Render.
//
// Uso:  node iniciar-padel-drop.js stripe     (o: npm run stripe:setup)
// Se puede repetir: lo que ya existe se reutiliza, no se duplica.
// La clave secreta se pide por pantalla y NO se guarda en ningún archivo.
import { createInterface } from 'node:readline/promises';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Stripe from 'stripe';
import { PICKUP_CLUBS } from '../services/clubs.js';

// No usa la base de datos: no importa server/config.js (que exige DATABASE_URL).
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const PACKS = [
  { slug: 'start', name: 'PADEL DROP START', cans: 1, grips: 2, cents: 890, who: 'Pack Básico' },
  { slug: 'player', name: 'PADEL DROP PLAYER', cans: 2, grips: 3, cents: 1290, who: 'Pack Intermedio' },
  { slug: 'pro', name: 'PADEL DROP PRO', cans: 3, grips: 3, cents: 1590, who: 'Pack Premium' },
];
const SHIPPING = { slug: 'envio', name: 'Envío mensual a domicilio', cents: 90 };
const botes = (n) => (n === 1 ? '1 bote' : `${n} botes`);
const COUPON_ID = 'INTERPADEL10';
const PROMO_CODE = 'INTERPADEL-GUISSONA-TARREGA-GOLMES-3';
const EVENTS = ['checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted', 'invoice.paid'];

const eur = (c) => (c / 100).toFixed(2).replace('.', ',');
const step = (t) => console.log(`\n  · ${t}`);
const ok = (t) => console.log(`      ${t}`);

async function ask(rl, question, fallback = '') {
  const a = (await rl.question(question)).trim();
  return a || fallback;
}

/** Busca un producto nuestro por metadata.pd_slug; si no existe lo crea. */
async function ensureProduct(stripe, slug, data) {
  // products.list (inmediato) en vez de search (tarda ~1 min en ver lo recién creado y duplicaría al repetir)
  const found = [];
  for await (const p of stripe.products.list({ active: true, limit: 100 })) if (p.metadata?.pd_slug === slug) found.push(p);
  if (found[0]) {
    const p = await stripe.products.update(found[0].id, { name: data.name, description: data.description });
    ok(`${data.name}: ya existía (${p.id})`);
    return p;
  }
  const p = await stripe.products.create({ ...data, metadata: { ...data.metadata, pd_slug: slug } });
  ok(`${data.name}: creado (${p.id})`);
  return p;
}

/** Precio mensual en EUR con lookup_key fija: si ya existe con el mismo importe, se reutiliza. */
async function ensurePrice(stripe, product, slug, cents, nickname) {
  const lookup = `pd_${slug}_monthly`;
  const { data } = await stripe.prices.list({ lookup_keys: [lookup], active: true, limit: 1 });
  if (data[0] && data[0].unit_amount === cents && data[0].product === product.id) {
    ok(`precio ${eur(cents)} €/mes: ya existía (${data[0].id})`);
    return data[0];
  }
  const price = await stripe.prices.create({
    product: product.id, currency: 'eur', unit_amount: cents, recurring: { interval: 'month' },
    tax_behavior: 'inclusive', nickname, lookup_key: lookup, transfer_lookup_key: true, metadata: { pd_slug: slug },
  });
  await stripe.products.update(product.id, { default_price: price.id });
  // El precio anterior se archiva: las suscripciones que ya lo usan siguen igual, pero no se ofrece a nuevos clientes
  if (data[0] && data[0].id !== price.id) await stripe.prices.update(data[0].id, { active: false });
  ok(`precio ${eur(cents)} €/mes: creado (${price.id})${data[0] ? ` · archivado el anterior de ${eur(data[0].unit_amount)} €` : ''}`);
  return price;
}

async function ensureCoupon(stripe) {
  let coupon = await stripe.coupons.retrieve(COUPON_ID).catch(() => null);
  if (!coupon) {
    coupon = await stripe.coupons.create({ id: COUPON_ID, percent_off: 10, duration: 'once', name: 'Socios Interpàdel: 10 % primer mes' });
    ok(`cupón ${COUPON_ID}: creado`);
  } else ok(`cupón ${COUPON_ID}: ya existía`);
  const { data } = await stripe.promotionCodes.list({ code: PROMO_CODE, limit: 1 });
  if (data[0]) ok(`código ${PROMO_CODE}: ya existía`);
  else {
    await stripe.promotionCodes.create({ coupon: COUPON_ID, code: PROMO_CODE, restrictions: { first_time_transaction: true } });
    ok(`código ${PROMO_CODE}: creado (solo clientes nuevos)`);
  }
}

/** Enlace de pago activo con metadata.pd_slug y los mismos precios; si no, se crea uno nuevo (y se desactiva el viejo). */
async function ensurePaymentLink(stripe, pack, price, shippingPrice) {
  const links = await stripe.paymentLinks.list({ active: true, limit: 100 });
  for (const l of links.data.filter((x) => x.metadata?.pd_slug === pack.slug)) {
    const items = await stripe.paymentLinks.listLineItems(l.id, { limit: 10 });
    const ids = items.data.map((i) => i.price.id).sort().join();
    if (ids === [price.id, shippingPrice.id].sort().join()) {
      ok(`enlace ${pack.name}: ya existía`);
      return l;
    }
    await stripe.paymentLinks.update(l.id, { active: false }); // precios antiguos: se desactiva
  }
  const link = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }, { price: shippingPrice.id, quantity: 1 }],
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    phone_number_collection: { enabled: true },
    shipping_address_collection: { allowed_countries: ['ES'] },
    custom_text: { submit: { message: `Suscripción mensual con renovación automática. El total incluye el pack y ${eur(SHIPPING.cents)} € de envío mensual. Puedes cancelarla antes de la siguiente renovación para evitar cobros futuros.` } },
    subscription_data: { description: `${pack.name}: ${botes(pack.cans)} + ${pack.grips} overgrips al mes`, metadata: { plan: pack.slug } },
    metadata: { plan: pack.slug, pd_slug: pack.slug },
    after_completion: { type: 'hosted_confirmation', hosted_confirmation: { custom_message: '¡Gracias por suscribirte a PADEL DROP! Recibirás la confirmación por correo electrónico.' } },
  });
  ok(`enlace ${pack.name}: creado`);
  return link;
}

/** Enlace de recogida en club: solo el pack (sin envío ni dirección) y un desplegable obligatorio con el club. */
async function ensurePickupLink(stripe, pack, price) {
  const slug = `${pack.slug}-club`;
  const clubs = Object.entries(PICKUP_CLUBS);
  const links = await stripe.paymentLinks.list({ active: true, limit: 100 });
  for (const l of links.data.filter((x) => x.metadata?.pd_slug === slug)) {
    const items = await stripe.paymentLinks.listLineItems(l.id, { limit: 10 });
    const sameClubs = (l.custom_fields?.[0]?.dropdown?.options || []).map((o) => o.value).join() === clubs.map(([v]) => v).join();
    if (items.data.length === 1 && items.data[0].price.id === price.id && sameClubs) {
      ok(`enlace ${pack.name} (recogida en club): ya existía`);
      return l;
    }
    await stripe.paymentLinks.update(l.id, { active: false });
  }
  const link = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    phone_number_collection: { enabled: true },
    custom_fields: [{ key: 'club', label: { type: 'custom', custom: 'Club donde recogerás tu caja' }, type: 'dropdown', dropdown: { options: clubs.map(([value, label]) => ({ value, label })) } }],
    custom_text: { submit: { message: 'Suscripción mensual con renovación automática. Recoges tu caja gratis cada mes en el club que elijas (sin gastos de envío). Puedes cancelarla antes de la siguiente renovación para evitar cobros futuros.' } },
    subscription_data: { description: `${pack.name}: ${botes(pack.cans)} + ${pack.grips} overgrips al mes · recogida en club`, metadata: { plan: pack.slug, entrega: 'club' } },
    metadata: { plan: pack.slug, pd_slug: slug, entrega: 'club' },
    after_completion: { type: 'hosted_confirmation', hosted_confirmation: { custom_message: '¡Gracias por suscribirte a PADEL DROP! Te avisaremos cuando tu caja esté en el club.' } },
  });
  ok(`enlace ${pack.name} (recogida en club): creado`);
  return link;
}

async function ensurePortal(stripe, siteUrl) {
  const { data } = await stripe.billingPortal.configurations.list({ active: true, limit: 100 });
  const mine = data.find((c) => c.metadata?.pd === 'portal');
  const params = {
    business_profile: { headline: 'PADEL DROP · Gestiona tu suscripción', privacy_policy_url: `${siteUrl}/#/privacidad`, terms_of_service_url: `${siteUrl}/#/condiciones` },
    default_return_url: siteUrl,
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      customer_update: { enabled: true, allowed_updates: ['email', 'phone', 'shipping', 'address', 'name'] },
      subscription_cancel: { enabled: true, mode: 'at_period_end', cancellation_reason: { enabled: true, options: ['too_expensive', 'unused', 'switched_service', 'other'] } },
    },
    login_page: { enabled: true },
    metadata: { pd: 'portal' },
  };
  const conf = mine ? await stripe.billingPortal.configurations.update(mine.id, params) : await stripe.billingPortal.configurations.create(params);
  ok(`portal de cliente: ${mine ? 'actualizado' : 'creado'}`);
  return conf;
}

async function ensureWebhook(stripe, siteUrl) {
  const url = `${siteUrl}/api/stripe/webhook`;
  const { data } = await stripe.webhookEndpoints.list({ limit: 100 });
  const existing = data.find((w) => w.url === url);
  if (existing) {
    await stripe.webhookEndpoints.update(existing.id, { enabled_events: EVENTS, disabled: false });
    ok(`webhook ${url}: ya existía (su secreto whsec_ está en Stripe → Desarrolladores → Webhooks)`);
    return { endpoint: existing, secret: null };
  }
  const endpoint = await stripe.webhookEndpoints.create({ url, enabled_events: EVENTS, description: 'PADEL DROP: pedidos y suscripciones' });
  ok(`webhook ${url}: creado`);
  return { endpoint, secret: endpoint.secret };
}

function updateSiteConfig(links, clubLinks, portalUrl) {
  const file = path.join(ROOT, 'public', 'js', 'config.js');
  let js = readFileSync(file, 'utf8');
  const urls = (l) => `{start:${JSON.stringify(l.start.url)},player:${JSON.stringify(l.player.url)},pro:${JSON.stringify(l.pro.url)}}`;
  js = js.replace(/checkoutUrl:\{[^}]*\}/, `checkoutUrl:${urls(links)}`).replace(/clubUrl:\{[^}]*\}/, `clubUrl:${urls(clubLinks)}`)
    .replace(/portalUrl:"[^"]*"/, `portalUrl:${JSON.stringify(portalUrl)}`);
  writeFileSync(file, js);
}

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log('\n  PADEL DROP · Configurar Stripe');
  console.log('  Necesitas la CLAVE SECRETA de tu cuenta (Stripe → Desarrolladores → Claves de API → "Clave secreta").');
  console.log('  Empieza por sk_ o rk_, seguido de test_ (pruebas) o live_ (cobros reales). No se guarda en ningún archivo.\n');
  const key = process.env.STRIPE_SETUP_KEY || await ask(rl, '  Pega la clave secreta y pulsa Enter: ');
  if (!/^(sk|rk)_(test|live)_[A-Za-z0-9]+$/.test(key)) { rl.close(); throw new Error('Eso no parece una clave secreta (debe empezar por sk_ o rk_, seguido de test_ o live_).'); }
  const live = /^(sk|rk)_live_/.test(key);
  const siteUrl = (await ask(rl, '  Dirección de tu web [https://www.padeldrop.net]: ', 'https://www.padeldrop.net')).replace(/\/$/, '');
  if (!siteUrl.startsWith('https://')) { rl.close(); throw new Error('La dirección debe empezar por https://'); }
  if (live) {
    const sure = await ask(rl, '  ATENCIÓN: es una clave de COBROS REALES. Escribe SI para continuar: ');
    if (sure.toUpperCase() !== 'SI') { rl.close(); console.log('  Cancelado. No se ha cambiado nada.'); return; }
  }
  rl.close();

  // PD_STRIPE_MOCK solo se usa en las pruebas automáticas (Stripe simulado en este ordenador).
  const mock = process.env.PD_STRIPE_MOCK ? new URL(process.env.PD_STRIPE_MOCK) : null;
  const stripe = mock ? new Stripe(key, { host: mock.hostname, port: mock.port, protocol: 'http' }) : new Stripe(key);
  const account = await stripe.accounts.retrieve().catch(() => null);
  console.log(`\n  Cuenta: ${account?.settings?.dashboard?.display_name || account?.business_profile?.name || '(sin nombre)'} · ${account?.id || ''} · ${live ? 'MODO REAL' : 'modo prueba'}`);

  step('Productos y precios');
  const prices = {};
  for (const p of PACKS) {
    const product = await ensureProduct(stripe, p.slug, {
      name: p.name,
      description: `Suscripción mensual: ${botes(p.cans)} de pelotas de pádel + ${p.grips} overgrips. Envío aparte (${eur(SHIPPING.cents)} €/mes).`,
      metadata: { plan: p.slug, botes: String(p.cans), grips: String(p.grips) },
    });
    prices[p.slug] = await ensurePrice(stripe, product, p.slug, p.cents, `${p.slug.toUpperCase()} mensual ${eur(p.cents)}`);
  }
  const shipProduct = await ensureProduct(stripe, SHIPPING.slug, {
    name: SHIPPING.name, description: 'Gastos de envío del pack mensual a domicilio (España peninsular).', metadata: { tipo: 'envio' },
  });
  const shipPrice = await ensurePrice(stripe, shipProduct, SHIPPING.slug, SHIPPING.cents, `Envío mensual ${eur(SHIPPING.cents)}`);

  step('Código de socio Interpàdel');
  await ensureCoupon(stripe);

  step('Enlaces de pago');
  const links = {};
  for (const p of PACKS) links[p.slug] = await ensurePaymentLink(stripe, p, prices[p.slug], shipPrice);
  const clubLinks = {};
  for (const p of PACKS) clubLinks[p.slug] = await ensurePickupLink(stripe, p, prices[p.slug]);

  step('Portal de cliente');
  const portal = await ensurePortal(stripe, siteUrl);

  step('Webhook');
  const { secret } = await ensureWebhook(stripe, siteUrl);

  step('Web: actualizando public/js/config.js con los nuevos enlaces');
  updateSiteConfig(links, clubLinks, portal.login_page.url);
  ok('hecho');

  const sqlLines = PACKS.map((p) => `UPDATE packs SET stripe_price_id = '${prices[p.slug].id}', cans = ${p.cans}, grips = ${p.grips}, price_cents = ${p.cents} WHERE slug = '${p.slug}';`);
  const doc = [
    `# Stripe de PADEL DROP (${live ? 'MODO REAL' : 'modo prueba'})`, '',
    `Cuenta: ${account?.id || '?'} · generado ${new Date().toISOString().slice(0, 10)} con server/scripts/stripe-setup.js`, '',
    '| Pack | Price ID | Enlace de pago |', '|---|---|---|',
    ...PACKS.map((p) => `| ${p.who} / ${p.name} (${eur(p.cents)} €) | ${prices[p.slug].id} | ${links[p.slug].url} |`),
    `| Envío mensual (${eur(SHIPPING.cents)} €) | ${shipPrice.id} | (segunda línea de cada enlace) |`,
    ...PACKS.map((p) => `| ${p.name} · recogida en club (sin envío) | ${prices[p.slug].id} | ${clubLinks[p.slug].url} |`), '',
    `- Código de socio: \`${PROMO_CODE}\` (cupón ${COUPON_ID}, 10 % primer mes, solo clientes nuevos)`,
    `- Portal de cliente: ${portal.login_page.url}`,
    `- Webhook: ${siteUrl}/api/stripe/webhook (${EVENTS.join(', ')})`, '',
    '## SQL para Supabase', '', '```sql', ...sqlLines, '```', '',
  ].join('\n');
  writeFileSync(path.join(ROOT, 'docs', live ? 'STRIPE-LIVE.md' : 'STRIPE-TEST.md'), doc);

  console.log('\n  ================================================================');
  console.log('  LISTO. Te quedan 3 cosas (también están en docs/STRIPE-' + (live ? 'LIVE' : 'TEST') + '.md):');
  console.log('\n  1) Supabase → SQL Editor → New query → pega esto → Run:\n');
  sqlLines.forEach((l) => console.log('     ' + l));
  console.log('\n  2) Render → padel-drop → Environment → cambia y guarda:');
  if (secret) console.log(`     STRIPE_WEBHOOK_SECRET = ${secret}`);
  else console.log('     STRIPE_WEBHOOK_SECRET = (el whsec_ del webhook, en Stripe → Desarrolladores → Webhooks)');
  console.log('     STRIPE_SECRET_KEY     = una clave RESTRINGIDA nueva de ESTA cuenta (Customers: Read, Subscriptions: Read)');
  console.log(`     STRIPE_SHIPPING_PRICE_ID = ${shipPrice.id}`);
  console.log('\n  3) Publica los enlaces nuevos de la web: dímelo y lo subo, o ejecuta  node iniciar-padel-drop.js publicar');
  console.log('  ================================================================\n');
}

try {
  await main();
} catch (err) {
  console.error(`\n  ERROR: ${err.message}\n`);
  if (err.type === 'StripeAuthenticationError') console.error('  La clave no es válida. Cópiala otra vez desde Stripe → Desarrolladores → Claves de API.\n');
  process.exitCode = 1;
}
