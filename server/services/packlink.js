// Exportación de pedidos para importarlos en Packlink PRO (Nuevo envío → Importar CSV).
// Mismo formato que el CSV de ejemplo de Packlink: UTF-8 con BOM, separador ";", sin comillas, decimales con punto.

// Remitente (datos del aviso legal). Cámbialos aquí si enviáis desde otra dirección.
export const SENDER = {
  firstName: 'Èric', lastName: 'Puig Rialp', company: 'PADEL DROP',
  address1: 'Plaza Vell Pla', address2: '3', postalCode: '25210', city: 'Guissona',
  phone: '672449282', email: 'padeldropp@gmail.com',
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
