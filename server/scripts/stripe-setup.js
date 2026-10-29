// Crea en TU cuenta de Stripe todo lo que necesita PADEL DROP y conecta la web con ella:
//   - 3 packs (START/PLAYER/PRO) + envío a domicilio y a oficina, con sus precios (IVA incluido)
//   - cupón y código de socio de Interpàdel (10 % el primer mes, solo clientes nuevos)
//   - 3 enlaces a domicilio (pack + envío 1,95 €) y 3 a oficina de Correos o CityPaq (pack + envío 1,50 €)
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
const SHIPPING = { slug: 'envio', name: 'Envío mensual a domicilio', cents: 195 };
const OFFICE = { slug: 'envio-oficina', name: 'Envío mensual a oficina de Correos o CityPaq', cents: 150 };
const botes = (n) => (n === 1 ? '1 bote' : `${n} botes`);
const COUPON_ID = 'INTERPADEL10';
const PROMO_CODE = 'INTERPADEL-GUISSONA-TARREGA-GOLMES-3';
const EVENTS = ['checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted', 'invoice.paid', 'charge.refunded'];

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

/** Precio recurrente (cada `months` meses) en EUR con lookup_key fija: si ya existe con el mismo importe, se reutiliza. */
async function ensurePrice(stripe, product, slug, cents, nickname, months = 1) {
  const lookup = months === 1 ? `pd_${slug}_monthly` : `pd_${slug}_every${months}m`;
  const per = months === 1 ? '€/mes' : `€ cada ${months} meses`;
  const { data } = await stripe.prices.list({ lookup_keys: [lookup], active: true, limit: 1 });
  if (data[0] && data[0].unit_amount === cents && data[0].product === product.id && (data[0].recurring?.interval_count || 1) === months) {
    ok(`precio ${eur(cents)} ${per}: ya existía (${data[0].id})`);
    return data[0];
  }
  const price = await stripe.prices.create({
    product: product.id, currency: 'eur', unit_amount: cents, recurring: { interval: 'month', interval_count: months },
    tax_behavior: 'inclusive', nickname, lookup_key: lookup, transfer_lookup_key: true, metadata: { pd_slug: slug, meses: String(months) },
  });
  if (months === 1) await stripe.products.update(product.id, { default_price: price.id });
  // El precio anterior se archiva: las suscripciones que ya lo usan siguen igual, pero no se ofrece a nuevos clientes
  if (data[0] && data[0].id !== price.id) await stripe.prices.update(data[0].id, { active: false });
  ok(`precio ${eur(cents)} ${per}: creado (${price.id})${data[0] ? ` · archivado el anterior de ${eur(data[0].unit_amount)} €` : ''}`);
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

/** Firma de los campos personalizados de un enlace (clave y opciones), para saber si hay que rehacerlo. */
const fieldsKey = (fields = []) => fields.map((f) => `${f.key}:${f.type}:${(f.dropdown?.options || []).map((o) => o.value).join('|')}`).join();

/** Enlace de pago activo con metadata.pd_slug, los mismos precios y los mismos campos; si no, se crea uno nuevo (y se desactiva el viejo). */
async function ensureLink(stripe, slug, label, prices, params) {
  const want = prices.map((p) => p.id).sort().join();
  const links = await stripe.paymentLinks.list({ active: true, limit: 100 });
  for (const l of links.data.filter((x) => x.metadata?.pd_slug === slug)) {
    const items = await stripe.paymentLinks.listLineItems(l.id, { limit: 10 });
    if (items.data.map((i) => i.price.id).sort().join() === want && fieldsKey(l.custom_fields) === fieldsKey(params.custom_fields)) {
      ok(`enlace ${label}: ya existía`);
      return l;
    }
    await stripe.paymentLinks.update(l.id, { active: false }); // precios o campos antiguos: se desactiva
  }
  const link = await stripe.paymentLinks.create({
    line_items: prices.map((p) => ({ price: p.id, quantity: 1 })),
    allow_promotion_codes: true,
    phone_number_collection: { enabled: true },
    ...params,
    metadata: { ...params.metadata, pd_slug: slug },
  });
  ok(`enlace ${label}: creado`);
  return link;
}

// Frecuencias que puede elegir el cliente (meses entre cajas). Mismo precio por caja en todas.
const FREQS = [1, 2, 3];
const each = (m) => (m === 1 ? 'cada mes' : `cada ${m} meses`);
const sfx = (m) => (m === 1 ? '' : `-${m}m`);
const RENEWAL = (m) => `Suscripción con renovación automática ${each(m)}. Puedes cancelarla antes de la siguiente renovación para evitar cobros futuros.`;
const subscription = (pack, entrega, suffix, m) => ({
  description: `${pack.name}: ${botes(pack.cans)} + ${pack.grips} overgrips ${each(m)} · ${suffix}`, metadata: { plan: pack.slug, entrega, frecuencia: String(m) },
});
const thanks = (message) => ({ type: 'hosted_confirmation', hosted_confirmation: { custom_message: message } });

/** Envío a domicilio: pack + envío, con dirección en España. */
const ensureHomeLink = (stripe, pack, price, shipPrice, m) => ensureLink(stripe, `${pack.slug}${sfx(m)}`, `${pack.name} (a domicilio, ${each(m)})`, [price, shipPrice], {
  billing_address_collection: 'required',
  shipping_address_collection: { allowed_countries: ['ES'] },
  custom_text: { submit: { message: `El total incluye el pack y ${eur(SHIPPING.cents)} € de envío a domicilio ${each(m)}. ${RENEWAL(m)}` } },
  subscription_data: subscription(pack, 'domicilio', 'envío a domicilio', m),
  metadata: { plan: pack.slug, entrega: 'domicilio', frecuencia: String(m) },
  after_completion: thanks('¡Gracias por suscribirte a PADEL DROP! Recibirás la confirmación por correo electrónico.'),
});

/** Envío a oficina de Correos o CityPaq: pack + envío reducido; la dirección sirve para elegir la oficina más cercana. */
const ensureOfficeLink = (stripe, pack, price, officePrice, m) => ensureLink(stripe, `${pack.slug}-oficina${sfx(m)}`, `${pack.name} (oficina/CityPaq, ${each(m)})`, [price, officePrice], {
  billing_address_collection: 'required',
  shipping_address_collection: { allowed_countries: ['ES'] },
  custom_fields: [{ key: 'oficina', type: 'text', optional: true, label: { type: 'custom', custom: 'Oficina de Correos o CityPaq preferido' } }],
  custom_text: {
    shipping_address: { message: 'Recogerás tu caja en la oficina de Correos o el CityPaq (locker) más cercano a esta dirección, salvo que indiques otro abajo.' },
    submit: { message: `El total incluye el pack y ${eur(OFFICE.cents)} € de envío a oficina de Correos o CityPaq ${each(m)}. ${RENEWAL(m)}` },
  },
  subscription_data: subscription(pack, 'oficina', 'recogida en oficina de Correos o CityPaq', m),
  metadata: { plan: pack.slug, entrega: 'oficina', frecuencia: String(m) },
  after_completion: thanks('¡Gracias por suscribirte a PADEL DROP! Te avisaremos cuando tu caja esté lista para recoger.'),
});

/** Recogida en club: solo el pack (sin envío ni dirección) y un desplegable obligatorio con el club. */
const ensurePickupLink = (stripe, pack, price, m) => ensureLink(stripe, `${pack.slug}-club${sfx(m)}`, `${pack.name} (recogida en club, ${each(m)})`, [price], {
  billing_address_collection: 'auto',
  custom_fields: [{ key: 'club', label: { type: 'custom', custom: 'Club donde recogerás tu caja' }, type: 'dropdown', dropdown: { options: Object.entries(PICKUP_CLUBS).map(([value, label]) => ({ value, label })) } }],
  custom_text: { submit: { message: `Recoges tu caja gratis ${each(m)} en el club que elijas (sin gastos de envío). ${RENEWAL(m)}` } },
  subscription_data: subscription(pack, 'club', 'recogida en club', m),
  metadata: { plan: pack.slug, entrega: 'club', frecuencia: String(m) },
  after_completion: thanks('¡Gracias por suscribirte a PADEL DROP! Te avisaremos cuando tu caja esté en el club.'),
});

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

/** Escribe public/js/links.js (enlaces de pago por entrega y frecuencia) y los precios de envío en config.js. */
function updateSiteConfig(links, portalUrl) {
  const urls = {};
  for (const [kind, byFreq] of Object.entries(links)) {
    urls[kind] = Object.fromEntries(Object.entries(byFreq).map(([m, byPack]) => [m, Object.fromEntries(Object.entries(byPack).map(([p, l]) => [p, l.url]))]));
  }
  writeFileSync(path.join(ROOT, 'public', 'js', 'links.js'),
    `/* Enlaces de pago de Stripe por entrega (home/office/club), frecuencia (meses) y pack. Lo genera server/scripts/stripe-setup.js: no editar a mano. */\nvar LINKS=${JSON.stringify(urls)};\n`);
  const file = path.join(ROOT, 'public', 'js', 'config.js');
  let js = readFileSync(file, 'utf8');
  js = js.replace(/shipping:[\d.]+,/, `shipping:${SHIPPING.cents / 100},`).replace(/officeShipping:[\d.]+/, `officeShipping:${OFFICE.cents / 100}`)
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
      description: `Suscripción (cada 1, 2 o 3 meses): ${botes(p.cans)} de pelotas de pádel + ${p.grips} overgrips por caja. Envío a domicilio ${eur(SHIPPING.cents)} €, a oficina de Correos o CityPaq ${eur(OFFICE.cents)} € o recogida gratis en club.`,
      metadata: { plan: p.slug, botes: String(p.cans), grips: String(p.grips) },
    });
    prices[p.slug] = {};
    for (const m of FREQS) prices[p.slug][m] = await ensurePrice(stripe, product, p.slug, p.cents, `${p.slug.toUpperCase()} ${each(m)} ${eur(p.cents)}`, m);
  }
  const shipProduct = await ensureProduct(stripe, SHIPPING.slug, {
    name: SHIPPING.name, description: 'Gastos de envío del pack mensual a domicilio (España peninsular).', metadata: { tipo: 'envio' },
  });
  const shipPrices = {};
  for (const m of FREQS) shipPrices[m] = await ensurePrice(stripe, shipProduct, SHIPPING.slug, SHIPPING.cents, `Envío ${each(m)} ${eur(SHIPPING.cents)}`, m);
  const shipPrice = shipPrices[1];
  const officeProduct = await ensureProduct(stripe, OFFICE.slug, {
    name: OFFICE.name, description: 'Gastos de envío del pack mensual a una oficina de Correos o CityPaq (España peninsular).', metadata: { tipo: 'envio' },
  });
  const officePrices = {};
  for (const m of FREQS) officePrices[m] = await ensurePrice(stripe, officeProduct, OFFICE.slug, OFFICE.cents, `Envío a oficina ${each(m)} ${eur(OFFICE.cents)}`, m);
  const officePrice = officePrices[1];

  step('Código de socio Interpàdel');
  await ensureCoupon(stripe);

  step('Enlaces de pago');
  const all = { home: {}, office: {}, club: {} };
  for (const m of FREQS) {
    all.home[m] = {}; all.office[m] = {}; all.club[m] = {};
    for (const p of PACKS) {
      all.home[m][p.slug] = await ensureHomeLink(stripe, p, prices[p.slug][m], shipPrices[m], m);
      all.office[m][p.slug] = await ensureOfficeLink(stripe, p, prices[p.slug][m], officePrices[m], m);
      all.club[m][p.slug] = await ensurePickupLink(stripe, p, prices[p.slug][m], m);
    }
  }
  const links = all.home[1], officeLinks = all.office[1], clubLinks = all.club[1];

  step('Portal de cliente');
  const portal = await ensurePortal(stripe, siteUrl);

  step('Webhook');
  const { secret } = await ensureWebhook(stripe, siteUrl);

  step('Web: actualizando public/js/links.js y config.js con los nuevos enlaces');
  updateSiteConfig(all, portal.login_page.url);
  ok('hecho');

  const sqlLines = PACKS.map((p) => `UPDATE packs SET stripe_price_id = '${prices[p.slug][1].id}', cans = ${p.cans}, grips = ${p.grips}, price_cents = ${p.cents} WHERE slug = '${p.slug}';`);
  const doc = [
    `# Stripe de PADEL DROP (${live ? 'MODO REAL' : 'modo prueba'})`, '',
    `Cuenta: ${account?.id || '?'} · generado ${new Date().toISOString().slice(0, 10)} con server/scripts/stripe-setup.js`, '',
    '| Pack | Price ID | Enlace de pago |', '|---|---|---|',
    ...PACKS.map((p) => `| ${p.who} / ${p.name} (${eur(p.cents)} €) | ${prices[p.slug][1].id} | ${links[p.slug].url} |`),
    `| Envío a domicilio (${eur(SHIPPING.cents)} €) | ${shipPrice.id} | (segunda línea de cada enlace a domicilio) |`,
    `| Envío a oficina/CityPaq (${eur(OFFICE.cents)} €) | ${officePrice.id} | (segunda línea de cada enlace a oficina) |`,
    ...PACKS.map((p) => `| ${p.name} · oficina de Correos o CityPaq | ${prices[p.slug][1].id} | ${officeLinks[p.slug].url} |`),
    ...PACKS.map((p) => `| ${p.name} · recogida en club (sin envío) | ${prices[p.slug][1].id} | ${clubLinks[p.slug].url} |`), '',
    'Cada 2 y 3 meses (mismo precio por caja): todos los enlaces están en public/js/links.js.', '',
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
