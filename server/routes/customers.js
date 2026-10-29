import { Router } from 'express';
import { sql, audit } from '../db/db.js';

export const customersRouter = Router();

const STATUSES = ['active', 'paused', 'canceled'];
const PAGE_SIZE = 25;

// Suscripción "actual" de cada cliente = la más reciente.
const latestSub = () => sql`
  SELECT DISTINCT ON (user_id) * FROM subscriptions ORDER BY user_id, started_at DESC, id DESC`;

customersRouter.get('/', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 100).replace(/[%_\\]/g, '');
    const status = STATUSES.includes(req.query.status) ? req.query.status : '';
    const pack = String(req.query.pack || '').slice(0, 20);
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const like = `%${q}%`;

    const from = sql`
      FROM users u
      LEFT JOIN (${latestSub()}) ls ON ls.user_id = u.id
      LEFT JOIN packs p ON p.id = ls.pack_id
      WHERE u.role = 'CUSTOMER'
        ${q ? sql`AND (u.first_name || ' ' || u.last_name ILIKE ${like} OR u.email ILIKE ${like} OR u.phone ILIKE ${like}
                   OR u.city ILIKE ${like} OR u.postal_code ILIKE ${like})` : sql``}
        ${status ? sql`AND ls.status = ${status}` : sql``}
        ${pack ? sql`AND p.slug = ${pack}` : sql``}`;

    const [[{ total }], customers, counts] = await Promise.all([
      sql`SELECT count(*) AS total ${from}`,
      sql`SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.city, u.province,
                 ls.status, ls.current_period_end, ls.started_at, p.slug AS pack_slug, p.name AS pack_name
          ${from}
          ORDER BY CASE ls.status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 ELSE 2 END, u.last_name, u.first_name
          LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
      sql`SELECT ls.status, count(*) AS n FROM (${latestSub()}) ls GROUP BY ls.status`,
    ]);

    res.json({ total, page, pageSize: PAGE_SIZE, counts: Object.fromEntries(counts.map((r) => [r.status, r.n])), customers });
  } catch (err) {
    next(err);
  }
});

customersRouter.get('/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isSafeInteger(id)) return res.status(404).json({ error: 'Cliente no encontrado.' });
    const [customer] = await sql`SELECT id, email, first_name, last_name, phone, street, street_number, floor_door, postal_code, city,
        province, country, stripe_customer_id, created_at FROM users WHERE id = ${id} AND role = 'CUSTOMER'`;
    if (!customer) return res.status(404).json({ error: 'Cliente no encontrado.' });

    const [subscriptions, orders] = await Promise.all([
      sql`SELECT s.id, s.status, s.price_cents, s.started_at, s.current_period_end, s.paused_at, s.canceled_at, s.stripe_subscription_id,
            p.slug AS pack_slug, p.name AS pack_name, p.commercial_name, p.cans, p.grips
          FROM subscriptions s JOIN packs p ON p.id = s.pack_id WHERE s.user_id = ${id} ORDER BY s.started_at DESC`,
      sql`SELECT o.id, o.period, o.amount_cents, o.shipping_cents, o.refunded_cents, o.status, o.carrier, o.tracking_number, o.paid_at, o.shipped_at, o.delivered_at,
            p.name AS pack_name, p.slug AS pack_slug
          FROM orders o JOIN packs p ON p.id = o.pack_id WHERE o.user_id = ${id} ORDER BY o.paid_at DESC`,
    ]);

    // Ver la ficha completa queda registrado: es acceso a datos personales (RGPD).
    await audit(req, 'view_customer', 'user', id);
    res.json({ customer, subscription: subscriptions[0] || null, subscriptions, orders });
  } catch (err) {
    next(err);
  }
});
