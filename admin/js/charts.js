// Gráfico de barras en SVG (apiladas o agrupadas) con leyenda, tooltip y tabla accesible.
// Sin dependencias externas: la CSP del panel solo permite scripts propios.
import { esc } from './ui.js';

const W = 720, H = 240, PAD = { top: 12, right: 8, bottom: 28, left: 56 };

// Escala "redonda": paso de 1, 2, 2,5 o 5 × 10^n (sin 2,5 si los valores son enteros), unas 4 divisiones.
function niceScale(v, integer) {
  if (v <= 0) return { max: integer ? 4 : 1, step: integer ? 1 : 0.25 };
  const raw = v / 4;
  const exp = 10 ** Math.floor(Math.log10(raw));
  const f = raw / exp;
  let step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 && !integer ? 2.5 : f <= 5 ? 5 : 10) * exp;
  if (integer) step = Math.max(1, Math.round(step));
  return { max: Math.ceil(v / step) * step, step };
}

// Rectángulo con solo las esquinas superiores redondeadas (extremo de dato), base recta.
function topRounded(x, y, w, h, r) {
  if (h <= 0) return '';
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/**
 * @param {HTMLElement} el
 * @param {{ title: string, categories: string[], labels: string[], series: {label:string, fill:string, swatch:string, values:number[]}[],
 *           stacked?: boolean, format: (n:number)=>string, axisFormat?: (n:number)=>string, extra?: (i:number)=>string }} opt
 */
export function barChart(el, opt) {
  const { categories, labels, series, stacked = false, integer = false, format, axisFormat = format, extra } = opt;
  const n = categories.length;
  const totals = categories.map((_, i) => series.reduce((a, s) => a + s.values[i], 0));
  const { max, step } = niceScale(stacked ? Math.max(...totals) : Math.max(...series.flatMap((s) => s.values)), integer);
  const iw = W - PAD.left - PAD.right, ih = H - PAD.top - PAD.bottom;
  const band = iw / n;
  const y = (v) => PAD.top + ih - (v / max) * ih;

  let svg = '';
  // Rejilla y eje Y (recesivos)
  for (let t = 0; t <= Math.round(max / step); t++) {
    const v = step * t, yy = y(v);
    svg += `<line x1="${PAD.left}" x2="${W - PAD.right}" y1="${yy}" y2="${yy}" class="${t === 0 ? 'stroke-muted/60' : 'stroke-grid'}" stroke-width="1"/>`;
    svg += `<text x="${PAD.left - 8}" y="${yy + 4}" text-anchor="end" class="fill-muted text-[11px] num">${esc(axisFormat(v))}</text>`;
  }
  // Barras
  const groupW = Math.min(band * 0.62, 44);
  categories.forEach((_, i) => {
    const x0 = PAD.left + band * i + (band - groupW) / 2;
    if (stacked) {
      let acc = 0;
      const top = series.map((s, k) => (s.values[i] > 0 ? k : -1)).filter((k) => k > -1).pop();
      series.forEach((s, k) => {
        const v = s.values[i];
        if (v <= 0) return;
        const y1 = y(acc + v), h = y(acc) - y1;
        acc += v;
        // 2px de separación entre segmentos (trazo del color de la superficie)
        const d = k === top ? topRounded(x0, y1, groupW, h, 4) : `M${x0},${y1 + h}V${y1}H${x0 + groupW}V${y1 + h}Z`;
        svg += `<path d="${d}" class="${s.fill} stroke-card" stroke-width="2" paint-order="stroke"/>`;
      });
    } else {
      const bw = (groupW - 2 * (series.length - 1)) / series.length;
      series.forEach((s, k) => {
        const v = s.values[i];
        const y1 = y(v);
        svg += `<path d="${topRounded(x0 + k * (bw + 2), y1, bw, y(0) - y1, 4)}" class="${s.fill}"/>`;
      });
    }
    // Etiquetas del eje X (salta alguna en pantallas estrechas mediante clase)
    svg += `<text x="${PAD.left + band * i + band / 2}" y="${H - 8}" text-anchor="middle" class="fill-muted text-[11px] ${i % 2 && n > 8 ? 'max-sm:hidden' : ''}">${esc(labels[i])}</text>`;
    // Zona de interacción más grande que la barra
    svg += `<rect x="${PAD.left + band * i}" y="${PAD.top}" width="${band}" height="${ih}" fill="transparent" data-i="${i}" class="cursor-pointer"/>`;
  });

  const legend = series.map((s) => `<span class="inline-flex items-center gap-1.5"><span class="size-2.5 rounded-sm ${s.swatch}" aria-hidden="true"></span>${esc(s.label)}</span>`).join('');
  const table = `<table class="w-full text-sm"><thead><tr><th class="th">Mes</th>${series.map((s) => `<th class="th text-right">${esc(s.label)}</th>`).join('')}${stacked ? '<th class="th text-right">Total</th>' : ''}</tr></thead><tbody>
    ${categories.map((c, i) => `<tr class="border-t border-line"><td class="td">${esc(labels[i])}</td>${series.map((s) => `<td class="td text-right num">${esc(format(s.values[i]))}</td>`).join('')}${stacked ? `<td class="td text-right num font-semibold">${esc(format(totals[i]))}</td>` : ''}</tr>`).join('')}
  </tbody></table>`;

  el.innerHTML = `
    <div class="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">${legend}</div>
    <div class="relative" data-plot>
      <svg viewBox="0 0 ${W} ${H}" class="h-auto w-full overflow-visible" role="img" aria-label="${esc(opt.title)}">${svg}<line data-cross class="stroke-muted/40" stroke-width="1" y1="${PAD.top}" y2="${PAD.top + ih}" visibility="hidden"/></svg>
      <div data-tip class="pointer-events-none absolute z-10 min-w-40 rounded-xl border border-line bg-card px-3 py-2 text-xs shadow-lg" hidden></div>
    </div>
    <details class="mt-3 text-sm"><summary class="cursor-pointer text-xs font-semibold text-muted hover:text-ink">Ver como tabla</summary><div class="mt-2 overflow-x-auto">${table}</div></details>`;

  const plot = el.querySelector('[data-plot]');
  const tip = el.querySelector('[data-tip]');
  const cross = el.querySelector('[data-cross]');
  const svgEl = plot.querySelector('svg');

  function show(i) {
    // En barras apiladas, el orden del tooltip sigue al de la pila (arriba primero).
    const rows = (stacked ? series.slice().reverse() : series).map((s) => `<div class="flex items-center justify-between gap-4"><span class="inline-flex items-center gap-1.5 text-muted"><span class="size-2 rounded-sm ${s.swatch}"></span>${esc(s.label)}</span><span class="num font-semibold text-ink">${esc(format(s.values[i]))}</span></div>`).join('');
    tip.innerHTML = `<div class="mb-1 font-semibold text-ink">${esc(categories[i])}</div>${rows}${stacked ? `<div class="mt-1 flex justify-between gap-4 border-t border-line pt-1"><span class="text-muted">Total</span><span class="num font-semibold">${esc(format(totals[i]))}</span></div>` : ''}${extra ? extra(i) : ''}`;
    tip.hidden = false;
    const scale = svgEl.getBoundingClientRect().width / W;
    const cx = (PAD.left + band * i + band / 2) * scale;
    const left = Math.min(Math.max(cx - tip.offsetWidth / 2, 0), plot.clientWidth - tip.offsetWidth);
    tip.style.left = `${left}px`;
    tip.style.top = `${-tip.offsetHeight - 6}px`;
    cross.setAttribute('x1', PAD.left + band * i + band / 2);
    cross.setAttribute('x2', PAD.left + band * i + band / 2);
    cross.setAttribute('visibility', 'visible');
  }
  const hide = () => { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); };
  plot.addEventListener('pointermove', (e) => { const i = e.target.dataset?.i; if (i != null) show(Number(i)); });
  plot.addEventListener('pointerleave', hide);
}
