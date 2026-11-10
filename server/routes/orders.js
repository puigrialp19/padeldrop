import { Router } from 'express';
import { sql, audit } from '../db/db.js';
import { MONTH_RE, TZ, currentMonth } from '../services/metrics.js';
import { toCsv } from '../services/csv.js';
import { packlinkCsv, sendToPacklink } from '../services/packlink.js';
import { config } from '../config.js';

export const ordersRouter = Router();

const STATUSES = ['pending', 'shipped', 'delivered'];
const DELIVERY_LABEL = {
  home: () => 'A domicilio',
  office: (o) => `Oficina Correos/CityPaq${o.pickup_office ? `: ${o.pickup_office}` : ' (la más cercana)'}`,
  club: (o) => `Recogida: ${o.pickup_club}`,
};
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
               OR o.ship_postal_code ILIKE ${like} OR o.tracking_number ILIKE ${like} OR o.pickup_club ILIKE ${like} OR o.pickup_office ILIKE ${like})` : sql``}`;
  return { month, status, where };
}

const select = () => sql`
  SELECT o.id, o.user_id, o.period, o.amount_cents, o.shipping_cents, o.status, o.carrier, o.tracking_number,
         o.ship_name, o.ship_phone, o.ship_street, o.ship_number, o.ship_floor_door, o.ship_postal_code, o.ship_city, o.ship_province, o.ship_country, o.pickup_club, o.delivery, o.pickup_office, o.refunded_cents, o.refunded_at, o.packlink_ref, o.packlink_error, o.packlink_sent_at,
         o.paid_at, o.shipped_at, o.delivered_at, u.email, p.slug AS pack_slug, p.name AS pack_name, p.cans, p.grips,
         coalesce(s.interval_months, 1) AS interval_months
  FROM orders o JOIN users u ON u.id = o.user_id JOIN packs p ON p.id = o.pack_id LEFT JOIN subscriptions s ON s.id = o.subscription_id`;

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
    res.json({ month: f.month, orders, summary: Object.fromEntries(summary.map((s) => [s.status, s])), packlink: Boolean(config.packlink.apiKey) });
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

// Comprueba la clave de Packlink PRO sin crear nada (consulta los datos de la cuenta).
ordersRouter.get('/packlink/check', async (req, res, next) => {
  try {
    if (!config.packlink.apiKey) return res.json({ ok: false, error: 'Falta la clave PACKLINK_API_KEY en Render.' });
    const r = await fetch(`${config.packlink.apiUrl}clients`, { headers: { Authorization: config.packlink.apiKey, Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.json({ ok: false, error: `Packlink rechaza la clave (${r.status}). Revisa PACKLINK_API_KEY en Render.` });
    res.json({ ok: true, account: data.email || data.company || '' });
  } catch (err) {
    res.json({ ok: false, error: `No se pudo conectar con Packlink: ${err.message}` });
  }
});

// Enviar (o reintentar) un pedido a Packlink PRO como envío pendiente.
ordersRouter.post('/:id/packlink', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isSafeInteger(id)) return res.status(404).json({ error: 'Pedido no encontrado.' });
    if (!config.packlink.apiKey) return res.status(400).json({ error: 'Falta la clave PACKLINK_API_KEY en Render.' });
    // Un intento que se cortó a medias (servidor reiniciado) deja «enviando»: se libera para reintentar
    await sql`UPDATE orders SET packlink_ref = '' WHERE id = ${id} AND packlink_ref = 'enviando' AND packlink_sent_at IS NULL`;
    const r = await sendToPacklink(id);
    await audit(req, 'send_packlink', 'order', id, { status: r.status, reference: r.reference || '' });
    const [order] = await sql`${select()} WHERE o.id = ${id}`;
    if (r.status === 'error') return res.status(502).json({ error: r.error, order });
    if (r.status === 'waiting') return res.status(400).json({ error: 'Al pedido le falta la dirección de envío.', order });
    res.json({ order, result: r.status });
  } catch (err) {
    next(err);
  }
});

ordersRouter.get('/export.csv', async (req, res, next) => {
  try {
    const f = filters(req.query);
    const rows = await sql`${select()} WHERE ${f.where} ORDER BY o.delivery, o.pickup_club, o.ship_postal_code, o.ship_name`;
    const header = ['Pedido', 'Mes', 'Entrega', 'Nombre', 'Teléfono', 'Email', 'Calle', 'Número', 'Piso/Puerta', 'Código postal', 'Ciudad', 'Provincia', 'País',
      'Pack', 'Frecuencia', 'Botes', 'Grips', 'Bultos', 'Estado', 'Transportista', 'Nº seguimiento', 'Fecha de cobro'];
    const csv = toCsv(header, rows.map((o) => [
      `PD-${o.id}`, o.period, DELIVERY_LABEL[o.delivery] ? DELIVERY_LABEL[o.delivery](o) : 'A domicilio', o.ship_name, o.ship_phone, o.email, o.ship_street, o.ship_number, o.ship_floor_door, o.ship_postal_code,
      o.ship_city, o.ship_province, o.ship_country, o.pack_name, o.interval_months === 1 ? 'Cada mes' : `Cada ${o.interval_months} meses`, o.cans, o.grips, 1, STATUS_LABEL[o.status], o.carrier, o.tracking_number,
      o.paid_at.toLocaleDateString('sv-SE', { timeZone: TZ }), // AAAA-MM-DD en hora de España
    ]));
    await audit(req, 'export_orders', 'order', '', { month: f.month, status: f.status || 'all', rows: rows.length });
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="envios-rallybox-${f.month}${f.status ? '-' + f.status : ''}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

// Pedidos pendientes de enviar por transportista (a domicilio u oficina de Correos/CityPaq), en el formato de Packlink PRO.
// No incluye la recogida en club ni los reembolsados. Respeta el mes, el pack y la búsqueda de la pantalla.
ordersRouter.get('/packlink.csv', async (req, res, next) => {
  try {
    const f = filters({ ...req.query, status: 'pending' });
    const rows = await sql`${select()} WHERE ${f.where} AND o.delivery IN ('home', 'office')
      AND NOT (o.refunded_cents > 0 AND o.refunded_cents >= o.amount_cents + o.shipping_cents)
      ORDER BY o.delivery, o.ship_postal_code, o.ship_name`;
    await audit(req, 'export_packlink', 'order', '', { month: f.month, rows: rows.length });
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="packlink-rallybox-${f.month}.csv"`);
    res.send(packlinkCsv(rows));
  } catch (err) {
    next(err);
  }
});
