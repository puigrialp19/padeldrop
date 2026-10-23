// Rellena la base de datos con clientes, suscripciones y pedidos FICTICIOS para probar el panel.
// Uso: npm run db:seed            (falla si ya hay clientes)
//      npm run db:seed -- --reset (borra los clientes ficticios y los vuelve a generar)
//      npm run db:seed -- --clear (borra los clientes ficticios y no genera nada: antes de abrir al público)
// Nunca toca administradores ni clientes que vengan de Stripe.
import { sql, closeDb } from '../db/db.js';
import { config } from '../config.js';
import { monthOf } from '../services/metrics.js';

const reset = process.argv.includes('--reset');
const clear = process.argv.includes('--clear');

async function main() {
  if (config.isProd && !clear) throw new Error('El seed de demostración no se ejecuta con NODE_ENV=production.');

  const [{ real }] = await sql`SELECT count(*) AS real FROM users WHERE role = 'CUSTOMER' AND stripe_customer_id IS NOT NULL`;
  const [{ fake }] = await sql`SELECT count(*) AS fake FROM users WHERE role = 'CUSTOMER' AND stripe_customer_id IS NULL`;
  if (fake && !reset && !clear) throw new Error(`Ya hay ${fake} clientes ficticios. Usa "npm run db:seed -- --reset" para regenerarlos.`);
  if (real && !clear) throw new Error(`Hay ${real} clientes reales de Stripe: no se generan datos ficticios en esta base de datos.`);

  if (reset || clear) {
    // Los pedidos y suscripciones se borran en cascada con el usuario.
    await sql`DELETE FROM users WHERE role = 'CUSTOMER' AND stripe_customer_id IS NULL`;
    console.log(`Borrados ${fake} clientes ficticios.`);
    if (clear) return;
  }

  // Generador pseudoaleatorio con semilla: siempre los mismos datos.
  let seed = 20261023;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const int = (min, max) => min + Math.floor(rnd() * (max - min + 1));

  const FIRST = ['Laura', 'Marc', 'Júlia', 'Pau', 'Marta', 'Jordi', 'Anna', 'David', 'Núria', 'Sergi', 'Carla', 'Àlex', 'Lucía', 'Pablo', 'María', 'Javier', 'Elena', 'Daniel', 'Sara', 'Hugo', 'Paula', 'Adrià', 'Clara', 'Óscar', 'Irene', 'Víctor', 'Noelia', 'Raúl', 'Berta', 'Iván'];
  const LAST = ['García', 'Martínez', 'Puig', 'Vidal', 'Ferrer', 'Soler', 'Serra', 'López', 'Sánchez', 'Pérez', 'Roca', 'Font', 'Costa', 'Mas', 'Navarro', 'Torres', 'Ruiz', 'Gómez', 'Bosch', 'Pujol', 'Riera', 'Camps', 'Moreno', 'Jiménez', 'Castells'];
  const PLACES = [
    ['25210', 'Guissona', 'Lleida'], ['25300', 'Tàrrega', 'Lleida'], ['25241', 'Golmés', 'Lleida'], ['25001', 'Lleida', 'Lleida'],
    ['25250', 'Bellpuig', 'Lleida'], ['25200', 'Cervera', 'Lleida'], ['25600', 'Balaguer', 'Lleida'], ['25230', 'Mollerussa', 'Lleida'],
    ['08001', 'Barcelona', 'Barcelona'], ['08240', 'Manresa', 'Barcelona'], ['08500', 'Vic', 'Barcelona'], ['43001', 'Tarragona', 'Tarragona'],
    ['43201', 'Reus', 'Tarragona'], ['17001', 'Girona', 'Girona'], ['50001', 'Zaragoza', 'Zaragoza'], ['28001', 'Madrid', 'Madrid'],
    ['46001', 'València', 'Valencia'], ['22001', 'Huesca', 'Huesca'],
  ];
  const STREETS = ['Carrer Major', 'Avinguda Catalunya', 'Carrer de la Pau', 'Carrer Sant Jaume', 'Plaça de l\'Església', 'Carrer Nou', 'Avinguda Lleida', 'Carrer del Raval', 'Calle Mayor', 'Avenida de la Constitución', 'Carrer de Ponent', 'Carrer Barcelona'];
  const CARRIERS = ['Correos Express', 'SEUR', 'MRW'];
  const SHIPPING_CENTS = 350;

  const today = new Date();
  const addMonths = (d, n) => { const x = new Date(d); x.setUTCMonth(x.getUTCMonth() + n); return x; };
  const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/gi, '').toLowerCase();

  const packs = await sql`SELECT id, slug, price_cents FROM packs ORDER BY sort_order`;
  if (packs.length < 3) throw new Error('Faltan los packs: ejecuta antes "npm run db:init".');
  const packFor = () => { const r = rnd(); return r < 0.36 ? packs[0] : r < 0.8 ? packs[1] : packs[2]; };

  // 1) Generar todo en memoria
  const people = [];
  for (let i = 0; i < 170; i++) {
    const first = pick(FIRST), last1 = pick(LAST), last2 = pick(LAST);
    const [cp, city, province] = pick(PLACES);
    // Altas repartidas en los últimos 14 meses, con más altas recientes (negocio en crecimiento).
    const monthsAgo = Math.floor(Math.pow(rnd(), 1.6) * 14);
    const start = addMonths(today, -monthsAgo);
    start.setUTCDate(int(1, 28)); start.setUTCHours(int(8, 21), int(0, 59), 0, 0);
    if (start > today) start.setTime(today.getTime() - 86400000 * int(1, 5));
    const pack = packFor();
    const user = {
      email: `${strip(first)}.${strip(last1)}${i}@example.com`, role: 'CUSTOMER', first_name: first, last_name: `${last1} ${last2}`,
      phone: `6${int(10, 99)} ${int(100, 999)} ${int(100, 999)}`, street: pick(STREETS), street_number: String(int(1, 120)),
      floor_door: rnd() < 0.55 ? `${int(1, 6)}º ${pick(['1ª', '2ª', 'A', 'B', 'C'])}` : '', postal_code: cp, city, province, country: 'ES', created_at: start,
    };

    // Estado: ~22 % cancelan en algún momento, ~6 % pausan.
    let status = 'active', canceledAt = null, pausedAt = null, lastMonth = monthOf(today);
    const r = rnd();
    if (r < 0.22 && monthsAgo >= 1) {
      status = 'canceled';
      const c = addMonths(start, int(1, Math.max(1, monthsAgo)));
      if (c > today) c.setTime(today.getTime() - 86400000 * int(1, 10));
      canceledAt = c; lastMonth = monthOf(addMonths(c, -1));
      if (lastMonth < monthOf(start)) lastMonth = monthOf(start);
    } else if (r < 0.28 && monthsAgo >= 2) {
      status = 'paused';
      const p = addMonths(today, -int(0, 1)); p.setUTCDate(int(1, 20));
      if (p > today) p.setTime(today.getTime());
      pausedAt = p; lastMonth = monthOf(addMonths(p, -1));
    }
    let renewal = null;
    if (status !== 'canceled') {
      renewal = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), start.getUTCDate(), 9));
      if (renewal <= today) renewal = addMonths(renewal, 1);
    }
    const sub = { pack_id: pack.id, status, price_cents: pack.price_cents, started_at: start, current_period_end: renewal, paused_at: pausedAt, canceled_at: canceledAt, created_at: start };

    const orders = [];
    const discounted = rnd() < 0.25; // código de socio Interpàdel: 10 % el primer mes
    for (let m = 0; ; m++) {
      const paid = addMonths(start, m);
      const period = monthOf(paid);
      if (period > lastMonth || paid > today) break;
      const isCurrent = period === monthOf(today);
      const ageDays = (today - paid) / 86400000;
      let st = 'delivered';
      if (isCurrent && ageDays < 3) st = 'pending';
      else if (isCurrent && ageDays < 6) st = rnd() < 0.5 ? 'pending' : 'shipped';
      else if (ageDays < 8) st = 'shipped';
      orders.push({
        pack_id: pack.id, period, amount_cents: m === 0 && discounted ? Math.round(pack.price_cents * 0.9) : pack.price_cents,
        shipping_cents: SHIPPING_CENTS, status: st, carrier: st === 'pending' ? '' : pick(CARRIERS),
        tracking_number: st === 'pending' ? '' : `PD${period.replace('-', '')}${String(i).padStart(4, '0')}${int(10, 99)}ES`,
        ship_name: `${first} ${last1} ${last2}`, ship_phone: user.phone, ship_street: user.street, ship_number: user.street_number,
        ship_floor_door: user.floor_door, ship_postal_code: cp, ship_city: city, ship_province: province, ship_country: 'ES',
        paid_at: paid, shipped_at: st === 'pending' ? null : new Date(paid.getTime() + 86400000 * int(1, 2)),
        delivered_at: st === 'delivered' ? new Date(paid.getTime() + 86400000 * int(3, 5)) : null, created_at: paid,
      });
    }
    people.push({ user, sub, orders });
  }

  // 2) Insertar por lotes dentro de una transacción (pocas idas y vueltas: rápido también contra Supabase)
  let nOrders = 0;
  await sql.begin(async (tx) => {
    const users = await tx`INSERT INTO users ${tx(people.map((p) => p.user))} RETURNING id, email`;
    const userId = Object.fromEntries(users.map((u) => [u.email, u.id]));
    const subs = await tx`INSERT INTO subscriptions ${tx(people.map((p) => ({ ...p.sub, user_id: userId[p.user.email] })))} RETURNING id, user_id`;
    const subId = Object.fromEntries(subs.map((s) => [s.user_id, s.id]));
    const allOrders = people.flatMap((p) => p.orders.map((o) => ({ ...o, user_id: userId[p.user.email], subscription_id: subId[userId[p.user.email]] })));
    for (let i = 0; i < allOrders.length; i += 500) await tx`INSERT INTO orders ${tx(allOrders.slice(i, i + 500))}`;
    nOrders = allOrders.length;
  });
  console.log(`Datos de demostración creados: ${people.length} clientes y ${nOrders} pedidos.`);
}

try {
  await main();
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await closeDb();
}
