import { sql } from '../db/db.js';

// Los meses del negocio se cuentan en hora peninsular española.
export const TZ = 'Europe/Madrid';
export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const monthFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit' });
/** 'AAAA-MM' de una fecha en hora de España. */
export const monthOf = (date = new Date()) => monthFmt.format(date).slice(0, 7);
export const currentMonth = () => monthOf();

export function shiftMonth(month, n) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}
/** Inicio de mes en hora de España, como expresión SQL timestamptz. */
const monthStart = (month) => sql`(${`${month}-01`}::timestamp AT TIME ZONE ${TZ})`;

// Suscripciones activas en un instante (ni canceladas ni pausadas todavía), por pack.
const activeAt = (t) => sql`
  SELECT pack_id, count(*) AS subs, coalesce(sum(price_cents), 0) AS mrr
  FROM subscriptions
  WHERE started_at <= ${t} AND (canceled_at IS NULL OR canceled_at > ${t}) AND (paused_at IS NULL OR paused_at > ${t})
  GROUP BY pack_id`;

const sumUp = (rows) => ({
  byPack: Object.fromEntries(rows.map((r) => [r.pack_id, r])),
  subs: rows.reduce((a, r) => a + r.subs, 0),
  mrr: rows.reduce((a, r) => a + r.mrr, 0),
});

/**
 * Métricas del panel para un mes ('AAAA-MM').
 * - MRR: suma de cuotas de las suscripciones activas al final del mes (o ahora, si es el mes en curso). Sin envío.
 * - Churn: bajas del mes / suscriptores activos al empezar el mes.
 */
export async function getDashboard(month, monthsBack = 12) {
  const isCurrent = month === currentMonth();
  const first = shiftMonth(month, -(monthsBack - 1));
  const from = monthStart(first);
  const to = monthStart(shiftMonth(month, 1));
  const end = isCurrent ? new Date() : to;

  const [packs, atStartRows, atEndRows, revenueRows, newRows, cancelRows, totals, statusRows, activeStarts] = await Promise.all([
    sql`SELECT id, slug, name, commercial_name, cans, grips, price_cents FROM packs ORDER BY sort_order`,
    activeAt(monthStart(month)),
    activeAt(end),
    sql`SELECT period, pack_id, count(*) AS orders, sum(amount_cents) AS pack_cents, sum(shipping_cents) AS shipping_cents
        FROM orders WHERE period BETWEEN ${first} AND ${month} GROUP BY period, pack_id`,
    sql`SELECT to_char(started_at AT TIME ZONE ${TZ}, 'YYYY-MM') AS period, pack_id, count(*) AS n
        FROM subscriptions WHERE started_at >= ${from} AND started_at < ${to} GROUP BY 1, 2`,
    sql`SELECT to_char(canceled_at AT TIME ZONE ${TZ}, 'YYYY-MM') AS period, pack_id, count(*) AS n
        FROM subscriptions WHERE canceled_at >= ${from} AND canceled_at < ${to} GROUP BY 1, 2`,
    sql`SELECT pack_id, count(*) AS orders, sum(amount_cents) AS pack_cents, sum(shipping_cents) AS shipping_cents FROM orders GROUP BY pack_id`,
    sql`SELECT pack_id, status, count(*) AS n FROM subscriptions GROUP BY pack_id, status`,
    // Suscriptores activos al empezar cada mes de la serie (para el churn mensual)
    sql`SELECT to_char(m, 'YYYY-MM') AS period, (
          SELECT count(*) FROM subscriptions s, LATERAL (SELECT m AT TIME ZONE ${TZ} AS t) x
          WHERE s.started_at <= x.t AND (s.canceled_at IS NULL OR s.canceled_at > x.t) AND (s.paused_at IS NULL OR s.paused_at > x.t)
        ) AS active
        FROM generate_series(${`${first}-01`}::timestamp, ${`${month}-01`}::timestamp, interval '1 month') m`,
  ]);

  const atStart = sumUp(atStartRows);
  const atEnd = sumUp(atEndRows);
  const totalsBy = Object.fromEntries(totals.map((t) => [t.pack_id, t]));
  const activeStartBy = Object.fromEntries(activeStarts.map((r) => [r.period, r.active]));
  const n = (rows, period, packId) => rows.filter((r) => r.period === period && (packId == null || r.pack_id === packId)).reduce((a, r) => a + r.n, 0);

  const series = [];
  for (let i = 0; i < monthsBack; i++) {
    const p = shiftMonth(first, i);
    const pr = revenueRows.filter((r) => r.period === p);
    const canceled = n(cancelRows, p);
    series.push({
      period: p,
      revenueByPack: Object.fromEntries(packs.map((pk) => [pk.slug, pr.find((r) => r.pack_id === pk.id)?.pack_cents || 0])),
      shippingCents: pr.reduce((a, r) => a + r.shipping_cents, 0),
      orders: pr.reduce((a, r) => a + r.orders, 0),
      newSubs: n(newRows, p),
      canceled,
      churn: activeStartBy[p] ? canceled / activeStartBy[p] : 0,
    });
  }

  const cur = series[series.length - 1];
  const prev = series[series.length - 2];
  const monthRevenue = (s) => (s ? Object.values(s.revenueByPack).reduce((a, b) => a + b, 0) + s.shippingCents : 0);

  const byPack = packs.map((pk) => {
    const st = Object.fromEntries(statusRows.filter((r) => r.pack_id === pk.id).map((r) => [r.status, r.n]));
    const t = totalsBy[pk.id] || { orders: 0, pack_cents: 0, shipping_cents: 0 };
    return {
      slug: pk.slug, name: pk.name, commercialName: pk.commercial_name, cans: pk.cans, grips: pk.grips, priceCents: pk.price_cents,
      activeSubs: atEnd.byPack[pk.id]?.subs || 0,
      mrrCents: atEnd.byPack[pk.id]?.mrr || 0,
      pausedSubs: st.paused || 0,
      canceledSubs: st.canceled || 0,
      newSubs: n(newRows, month, pk.id),
      canceledInMonth: n(cancelRows, month, pk.id),
      monthRevenueCents: cur.revenueByPack[pk.slug],
      totalRevenueCents: t.pack_cents + t.shipping_cents,
      totalOrders: t.orders,
    };
  });

  return {
    month,
    isCurrentMonth: isCurrent,
    packs: packs.map((p) => ({ slug: p.slug, name: p.name })),
    kpis: {
      totalSalesCents: totals.reduce((a, r) => a + r.pack_cents + r.shipping_cents, 0),
      totalOrders: totals.reduce((a, r) => a + r.orders, 0),
      monthSalesCents: monthRevenue(cur),
      prevMonthSalesCents: monthRevenue(prev),
      mrrCents: atEnd.mrr,
      prevMrrCents: atStart.mrr, // MRR al cierre del mes anterior
      activeSubs: atEnd.subs,
      activeAtStart: atStart.subs,
      newSubs: cur.newSubs,
      canceled: cur.canceled,
      churn: cur.churn,
      prevChurn: prev?.churn ?? 0,
      arpuCents: atEnd.subs ? Math.round(atEnd.mrr / atEnd.subs) : 0,
    },
    byPack,
    series,
  };
}
