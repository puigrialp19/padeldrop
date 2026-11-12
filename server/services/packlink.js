// Packlink PRO: envío automático de cada pedido como envío pendiente (API) y exportación CSV (Nuevo envío → Importar CSV).
// CSV: mismo formato que el de ejemplo de Packlink: UTF-8 con BOM, separador ";", sin comillas, decimales con punto.
import { sql } from '../db/db.js';
import { config } from '../config.js';

// Remitente (datos del aviso legal). Cámbialos aquí si enviáis desde otra dirección.
export const SENDER = {
  firstName: 'Èric', lastName: 'Puig Rialp', company: 'RALLYBOX',
  address1: 'Plaza Vell Pla', address2: '3', postalCode: '25210', city: 'Guissona',
  phone: '672449282', email: 'rallyboox@gmail.com',
};

// Caja de envío (cm) y peso aproximado lleno por pack (kg).
export const BOX = { width: 26, length: 35, height: 8 };
export const WEIGHT_KG = { start: 0.5, player: 0.75, pro: 1 };

const HEADER = ['Referencia', 'Nombre del Remitente', 'Apellido del Remitente', 'Empresa Remitente', 'Direccion del Remitente 1',
  'Direccion del Remitente 2', 'Codigo Postal Origen', 'Ciudad Origen', 'Estado Origen', 'Pais Origen', 'Telefono del Remitente',
  'Email del Remitente', 'Nombre del Destinatario', 'Apellido del Destinatario', 'Empresa Destinataria', 'Direccion Envio 1',
  'Direccion Envio 2', 'Codigo Postal Destino', 'Ciudad Destino', 'Estado Destino', 'Pais Destino', 'Telefono Destinatario',
  'Email Destinatario', 'Seguro', 'Articulo', 'Valor', 'Ancho', 'Largo', 'Alto', 'Peso'];

// Sin comillas: se quitan ";" y saltos de línea, y los signos que Excel tomaría como fórmula al principio.
const clean = (v) => String(v ?? '').replace(/[;\r\n\t]+/g, ' ').replace(/^[=+\-@]+/, '').trim();
// Teléfono español sin espacios ni prefijo +34 / 0034, como en el ejemplo de Packlink.
const phone = (v) => String(v || '').replace(/[^\d+]/g, '').replace(/^(\+|00)34/, '');
const splitName = (full) => {
  const parts = String(full || '').trim().split(/\s+/);
  return [parts.shift() || '', parts.join(' ')];
};

/** Filas de pedidos (a domicilio u oficina de Correos/CityPaq) -> texto CSV para Packlink PRO. */
export function packlinkCsv(orders) {
  const rows = orders.map((o) => {
    const [first, last] = splitName(o.ship_name);
    // La oficina o CityPaq se elige en Packlink al escoger el servicio: va en la referencia para tenerla a la vista.
    const ref = o.delivery === 'office' ? `PD-${o.id} OFICINA${o.pickup_office ? ` ${o.pickup_office}` : ''}`.slice(0, 60) : `PD-${o.id}`;
    return [
      ref, SENDER.firstName, SENDER.lastName, SENDER.company, SENDER.address1, SENDER.address2, SENDER.postalCode, SENDER.city, 'ES', 'ES',
      SENDER.phone, SENDER.email, first, last, '', o.ship_street, o.ship_floor_door, o.ship_postal_code, o.ship_city, 'ES',
      o.ship_country || 'ES', phone(o.ship_phone), o.email, 'no', 'Pelotas y overgrips de padel',
      Math.round((o.amount_cents || 0) / 100), BOX.width, BOX.length, BOX.height, WEIGHT_KG[o.pack_slug] ?? 1,
    ].map(clean).join(';');
  });
  return '﻿' + [HEADER.join(';'), ...rows].join('\r\n') + '\r\n';
}

/* ---------- Envío automático a Packlink PRO por su API ----------
   Mismo formato que usan los módulos oficiales de Packlink (PrestaShop, WooCommerce): POST {apiUrl}shipments con la
   cabecera «Authorization: <clave>», y la respuesta trae «reference». El envío queda en Packlink como pendiente:
   allí se elige transportista (y oficina o CityPaq), se paga y se imprime la etiqueta. */

const refOf = (o) => (o.delivery === 'office' ? `PD-${o.id} OFICINA${o.pickup_office ? ` ${o.pickup_office}` : ''}` : `PD-${o.id}`).slice(0, 60);

/** Pedido (con pack_slug y email) -> borrador de envío de Packlink. */
export function packlinkDraft(o) {
  const [first, last] = splitName(o.ship_name);
  return {
    from: {
      name: SENDER.firstName, surname: SENDER.lastName, company: SENDER.company, street1: `${SENDER.address1} ${SENDER.address2}`,
      street2: '', zip_code: SENDER.postalCode, city: SENDER.city, country: 'ES', phone: SENDER.phone, email: SENDER.email,
    },
    to: {
      name: first, surname: last, company: '', street1: o.ship_street, street2: o.ship_floor_door || '', zip_code: o.ship_postal_code,
      city: o.ship_city, country: o.ship_country || 'ES', phone: phone(o.ship_phone), email: o.email,
    },
    packages: [{ width: BOX.width, height: BOX.height, length: BOX.length, weight: WEIGHT_KG[o.pack_slug] ?? 1 }],
    content: 'Pelotas y overgrips de padel',
    contentvalue: Math.round(o.amount_cents || 0) / 100,
    shipment_custom_reference: refOf(o),
  };
}

const ORDER = (id) => sql`SELECT o.*, p.slug AS pack_slug, u.email FROM orders o JOIN packs p ON p.id = o.pack_id JOIN users u ON u.id = o.user_id WHERE o.id = ${id}`;

/**
 * Crea el envío pendiente en Packlink si el pedido lo necesita y aún no está allí.
 * Devuelve { status: 'sent' | 'skipped' | 'waiting' | 'error', reference?, error? }. Nunca lanza: un fallo de Packlink
 * no debe impedir que se guarde el pedido; queda anotado y se puede reintentar desde el panel.
 */
export async function sendToPacklink(orderId) {
  if (!config.packlink.apiKey) return { status: 'skipped', error: 'Falta PACKLINK_API_KEY' };
  const [o] = await ORDER(orderId);
  if (!o) return { status: 'skipped', error: 'Pedido no encontrado' };
  if (!['home', 'office'].includes(o.delivery) || o.status !== 'pending') return { status: 'skipped' };
  if (o.refunded_cents > 0 && o.refunded_cents >= o.amount_cents + o.shipping_cents) return { status: 'skipped' };
  if (o.packlink_ref) return { status: 'skipped', reference: o.packlink_ref };
  if (!o.ship_street || !o.ship_postal_code || !o.ship_city) return { status: 'waiting' }; // la dirección llega con el checkout

  // Se reserva el pedido para que dos eventos simultáneos no creen dos envíos
  const [claimed] = await sql`UPDATE orders SET packlink_ref = 'enviando' WHERE id = ${o.id} AND packlink_ref = '' RETURNING id`;
  if (!claimed) return { status: 'skipped' };
  try {
    const res = await fetch(`${config.packlink.apiUrl}shipments`, {
      method: 'POST',
      headers: { Authorization: config.packlink.apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(packlinkDraft(o)),
      signal: AbortSignal.timeout(8000), // corto: se llama desde el webhook de Stripe
    });
    const text = await res.text();
    let data = {};
    try { data = JSON.parse(text); } catch { /* respuesta no JSON */ }
    if (!res.ok || !data.reference) throw new Error(`Packlink respondió ${res.status}: ${text.slice(0, 300) || 'sin contenido'}`);
    await sql`UPDATE orders SET packlink_ref = ${String(data.reference).slice(0, 60)}, packlink_error = '', packlink_sent_at = now(), updated_at = now() WHERE id = ${o.id}`;
    return { status: 'sent', reference: data.reference };
  } catch (err) {
    const msg = String(err.message || err).slice(0, 500);
    console.warn(`[packlink] Pedido PD-${o.id} no enviado: ${msg}`);
    await sql`UPDATE orders SET packlink_ref = '', packlink_error = ${msg}, updated_at = now() WHERE id = ${o.id}`;
    return { status: 'error', error: msg };
  }
}

/** Envía todos los pedidos pendientes de una suscripción que aún no estén en Packlink (tras completar el checkout). */
export async function sendSubscriptionToPacklink(subscriptionId) {
  if (!config.packlink.apiKey || !subscriptionId) return;
  const rows = await sql`SELECT id FROM orders WHERE subscription_id = ${subscriptionId} AND status = 'pending' AND packlink_ref = '' AND delivery IN ('home', 'office')`;
  for (const r of rows) await sendToPacklink(r.id);
}
