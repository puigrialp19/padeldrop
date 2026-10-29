import { Router } from 'express';
import { sql, audit } from '../db/db.js';
import { MONTH_RE, TZ, currentMonth } from '../services/metrics.js';
import { toCsv } from '../services/csv.js';

export const ordersRouter = Router();

const STATUSES = ['pending', 'shipped', 'delivered'];
const STATUS_LABEL = { pending: 'Pendiente de preparar', shipped: 'Enviado', delivered: 'Entregado' };

function filters(query) {
  const month = MONTH_RE.test(query.month) ? query.month : currentMonth();
  const status = STATUSES.includes(query.status) ? query.status : '';
  const pack = String(query.pack || '').slice(0, 20);
  const q = String(query.q || '').trim().slice(0, 100).replace(/[%_\\]/g, '');
  const like = `%${q}%`;
  const where = sql`o.period = ${month}
    ${status ? sql`AND o.status = ${status}` : sql``}
    ${pack ? sql`AND p.slug = ${pack}` : sql``}
    ${q ? sql`AND (o.ship_name ILIKE ${like} OR u.email ILIKE ${like} OR o.ship_city ILIKE ${like}
               OR o.ship_postal_code ILIKE ${like} OR o.tracking_number ILIKE ${like} OR o.pickup_club ILIKE ${like})` : sql``}`;
  return { month, status, where };
}

const select = () => sql`
  SELECT o.id, o.user_id, o.period, o.amount_cents, o.shipping_cents, o.status, o.carrier, o.tracking_number,
         o.ship_name, o.ship_phone, o.ship_street, o.ship_number, o.ship_floor_door, o.ship_postal_code, o.ship_city, o.ship_province, o.ship_country, o.pickup_club, o.refunded_cents, o.refunded_at,
         o.paid_at, o.shipped_at, o.delivered_at, u.email, p.slug AS pack_slug, p.name AS pack_name, p.cans, p.grips
  FROM orders o JOIN users u ON u.id = o.user_id JOIN packs p ON p.id = o.pack_id`;

ordersRouter.get('/', async (req, res, next) => {
  try {
    const f = filters(req.query);
    const [orders, summary] = await Promise.all([
      sql`${select()} WHERE ${f.where}
          ORDER BY CASE o.status WHEN 'pending' THEN 0 WHEN 'shipped' THEN 1 ELSE 2 END, o.paid_at`,
      // Resumen del mes (sin filtros) para las tarjetas y la lista de preparación.
      sql`SELECT o.status, count(*) AS n, sum(p.cans) AS cans, sum(p.grips) AS grips
          FROM orders o JOIN packs p ON p.id = o.pack_id WHERE o.period = ${f.month} GROUP BY o.status`,
    ]);
    res.json({ month: f.month, orders, summary: Object.fromEntries(summary.map((s) => [s.status, s])) });
  } catch (err) {
    next(err);
  }
});

ordersRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const [order] = Number.isSafeInteger(id) ? await sql`SELECT * FROM orders WHERE id = ${id}` : [];
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado.' });

    // Marcar a mano como reembolsado (entero) o deshacerlo: deja de contar (o vuelve a contar) como ingreso.
    if (typeof req.body?.refunded === 'boolean') {
      const cents = req.body.refunded ? order.amount_cents + order.shipping_cents : 0;
      await sql`UPDATE orders SET refunded_cents = ${cents}, refunded_at = ${req.body.refunded ? new Date() : null}, updated_at = now() WHERE id = ${id}`;
      await audit(req, req.body.refunded ? 'refund_order' : 'unrefund_order', 'order', id, { cents });
      const [updated] = await sql`${select()} WHERE o.id = ${id}`;
      return res.json({ order: updated });
    }

    const status = req.body?.status ?? order.status;
    if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Estado no válido.' });
    const tracking = String(req.body?.tracking_number ?? order.tracking_number).trim();
    const carrier = String(req.body?.carrier ?? order.carrier).trim();
    if (tracking.length > 60 || !/^[A-Za-z0-9 .\-_/]*$/.test(tracking)) {
      return res.status(400).json({ error: 'El número de seguimiento solo puede tener letras, números, espacios y . - _ / (máx. 60).' });
    }
    if (carrier.length > 40) return res.status(400).json({ error: 'Nombre de transportista demasiado largo.' });

    const now = new Date();
    const shippedAt = status === 'pending' ? null : order.shipped_at || now;
    const deliveredAt = status === 'delivered' ? order.delivered_at || now : null;

    await sql`UPDATE orders SET status = ${status}, tracking_number = ${tracking}, carrier = ${carrier},
      shipped_at = ${shippedAt}, delivered_at = ${deliveredAt}, updated_at = now() WHERE id = ${id}`;
    await audit(req, 'update_order', 'order', id, { from: order.status, to: status, tracking });

    const [updated] = await sql`${select()} WHERE o.id = ${id}`;
    res.json({ order: updated });
  } catch (err) {
    next(err);
  }
});

ordersRouter.get('/export.csv', async (req, res, next) => {
  try {
    const f = filters(req.query);
    const rows = await sql`${select()} WHERE ${f.where} ORDER BY o.pickup_club, o.ship_postal_code, o.ship_name`;
    const header = ['Pedido', 'Mes', 'Entrega', 'Nombre', 'Teléfono', 'Email', 'Calle', 'Número', 'Piso/Puerta', 'Código postal', 'Ciudad', 'Provincia', 'País',
      'Pack', 'Botes', 'Grips', 'Bultos', 'Estado', 'Transportista', 'Nº seguimiento', 'Fecha de cobro'];
    const csv = toCsv(header, rows.map((o) => [
      `PD-${o.id}`, o.period, o.pickup_club ? `Recogida: ${o.pickup_club}` : 'A domicilio', o.ship_name, o.ship_phone, o.email, o.ship_street, o.ship_number, o.ship_floor_door, o.ship_postal_code,
      o.ship_city, o.ship_province, o.ship_country, o.pack_name, o.cans, o.grips, 1, STATUS_LABEL[o.status], o.carrier, o.tracking_number,
      o.paid_at.toLocaleDateString('sv-SE', { timeZone: TZ }), // AAAA-MM-DD en hora de España
    ]));
    await audit(req, 'export_orders', 'order', '', { month: f.month, status: f.status || 'all', rows: rows.length });
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="envios-padel-drop-${f.month}${f.status ? '-' + f.status : ''}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});
