// CSV compatible con Excel en español: separador ";", BOM UTF-8 y saltos de línea CRLF.
// Las celdas que empiezan por = + - @ se neutralizan para evitar inyección de fórmulas en Excel.
function cell(value) {
  let s = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(header, rows) {
  return '﻿' + [header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n') + '\r\n';
}
