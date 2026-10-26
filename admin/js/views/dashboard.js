import { api } from '../api.js';
import { barChart } from '../charts.js';
import { setQuery } from '../app.js';
import { esc, eur, eur0, botes, pct, int, monthName, currentMonth, PACK_CLASS, pageHeader, monthInput, loading, errorBox, applyWidths } from '../ui.js';

// Variación respecto al mes anterior. goodWhenUp=false para métricas donde subir es malo (churn).
function delta(cur, prev, { goodWhenUp = true, asPoints = false } = {}) {
  if (!prev && !asPoints) return '<span class="text-xs text-muted">sin datos del mes anterior</span>';
  const diff = asPoints ? (cur - prev) * 100 : ((cur - prev) / prev) * 100;
  if (Math.abs(diff) < 0.05) return '<span class="text-xs text-muted">= que el mes anterior</span>';
  const up = diff > 0;
  const good = up === goodWhenUp;
  const txt = `${up ? '▲' : '▼'} ${Math.abs(diff).toLocaleString('es-ES', { maximumFractionDigits: 1 })}${asPoints ? ' p.p.' : ' %'}`;
  return `<span class="text-xs font-semibold ${good ? 'text-[#006300] dark:text-good' : 'text-critical'}">${txt}</span> <span class="text-xs text-muted">vs mes anterior</span>`;
}

const tile = (label, value, foot, hint = '') => `
  <div class="card p-4 sm:p-5">
    <p class="text-xs font-semibold uppercase tracking-wide text-muted" ${hint ? `title="${esc(hint)}"` : ''}>${esc(label)}</p>
    <p class="mt-2 text-2xl font-semibold sm:text-3xl">${value}</p>
    <p class="mt-1">${foot}</p>
  </div>`;

export async function renderDashboard(view, { params, isStale }) {
  const month = /^\d{4}-\d{2}$/.test(params.month || '') ? params.month : currentMonth();
  view.innerHTML = pageHeader('Resumen', 'Ventas, suscriptores y cancelaciones.', monthInput('month', month)) + loading();
  view.querySelector('#month').addEventListener('change', (e) => { if (e.target.value) location.hash = `#/dashboard?month=${e.target.value}`; });

  let d;
  try { d = await api.metrics(month); } catch (err) { if (!isStale()) view.querySelector('.card').outerHTML = errorBox(err.message); return; }
  if (isStale()) return;
  setQuery({ month: month === currentMonth() ? '' : month });

  const k = d.kpis;
  const label = d.isCurrentMonth ? `${monthName(month)} (en curso)` : monthName(month);
  const totalActive = d.byPack.reduce((a, p) => a + p.activeSubs, 0) || 1;

  const html = `
    <p class="mb-4 text-sm text-muted">Mostrando <strong class="text-ink">${esc(label)}</strong>. Importes con IVA, envío incluido salvo donde se indica.</p>

    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4" aria-label="Indicadores principales">
      ${tile('Ventas del mes', eur(k.monthSalesCents), delta(k.monthSalesCents, k.prevMonthSalesCents))}
      ${tile('MRR', eur(k.mrrCents), delta(k.mrrCents, k.prevMrrCents), 'Ingreso mensual recurrente: suma de las cuotas de las suscripciones activas (sin envío).')}
      ${tile('Suscriptores activos', int(k.activeSubs), `<span class="text-xs text-muted"><b class="text-ink">+${int(k.newSubs)}</b> altas · <b class="text-ink">−${int(k.canceled)}</b> bajas</span>`)}
      ${tile('Churn del mes', pct(k.churn), delta(k.churn, k.prevChurn, { goodWhenUp: false, asPoints: true }), 'Bajas del mes ÷ suscriptores activos al empezar el mes.')}
    </section>

    <a href="#/directo" class="card mt-3 flex items-center gap-3 p-4 hover:border-muted lg:mt-4" id="live-card">
      <span class="size-3 shrink-0 rounded-full bg-muted/40" id="live-dot" aria-hidden="true"></span>
      <span class="text-sm"><b class="num" id="live-n">…</b> <span id="live-txt">personas en la web ahora</span></span>
      <span class="ml-auto text-xs text-muted">Ver en directo →</span>
    </a>
    <section class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:mt-4 lg:gap-4" aria-label="Totales históricos">
      <div class="card flex items-center justify-between gap-3 p-4"><span class="text-sm text-muted">Ventas totales (histórico)</span><span class="text-lg font-semibold num">${eur0(k.totalSalesCents)}</span></div>
      <div class="card flex items-center justify-between gap-3 p-4"><span class="text-sm text-muted">Pedidos cobrados (histórico)</span><span class="text-lg font-semibold num">${int(k.totalOrders)}</span></div>
      <div class="card flex items-center justify-between gap-3 p-4"><span class="text-sm text-muted">Cuota media por suscriptor</span><span class="text-lg font-semibold num">${eur(k.arpuCents)}</span></div>
    </section>

    <h2 class="mt-8 mb-3 text-lg font-semibold">Desglose por pack</h2>
    <section class="grid grid-cols-1 gap-3 md:grid-cols-3 lg:gap-4">
      ${d.byPack.map((p) => `
        <article class="card p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="flex items-center gap-2 font-semibold"><span class="size-3 rounded-full ${PACK_CLASS[p.slug].bg}" aria-hidden="true"></span>${esc(p.name)}</h3>
              <p class="text-xs text-muted">${esc(p.commercialName)} · ${botes(p.cans)} + ${p.grips} grips · ${eur(p.priceCents)}/mes</p>
            </div>
          </div>
          <div class="mt-4 flex items-end justify-between">
            <div><p class="text-3xl font-semibold num">${int(p.activeSubs)}</p><p class="text-xs text-muted">suscriptores activos</p></div>
            <div class="text-right"><p class="text-lg font-semibold num">${eur(p.mrrCents)}</p><p class="text-xs text-muted">MRR</p></div>
          </div>
          <div class="mt-3 h-2 overflow-hidden rounded-full bg-soft" role="img" aria-label="${pct(p.activeSubs / totalActive, 0)} de los suscriptores activos">
            <div class="h-full rounded-full ${PACK_CLASS[p.slug].bg}" data-w="${(p.activeSubs / totalActive) * 100}"></div>
          </div>
          <p class="mt-1 text-xs text-muted">${pct(p.activeSubs / totalActive, 0)} de los activos</p>
          <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-4 text-sm">
            <dt class="text-muted">Ventas del mes</dt><dd class="text-right font-medium num">${eur(p.monthRevenueCents)}</dd>
            <dt class="text-muted">Altas / bajas</dt><dd class="text-right font-medium num">+${int(p.newSubs)} / −${int(p.canceledInMonth)}</dd>
            <dt class="text-muted">Pausadas</dt><dd class="text-right font-medium num">${int(p.pausedSubs)}</dd>
            <dt class="text-muted">Ventas totales</dt><dd class="text-right font-medium num">${eur0(p.totalRevenueCents)}</dd>
          </dl>
        </article>`).join('')}
    </section>

    <section class="mt-8 grid grid-cols-1 gap-4 xl:grid-cols-5">
      <div class="card p-5 xl:col-span-3">
        <h2 class="font-semibold">Ventas mensuales por pack</h2>
        <p class="mb-4 text-xs text-muted">Últimos 12 meses · importe de los packs, sin envío</p>
        <div id="chart-revenue"></div>
      </div>
      <div class="card p-5 xl:col-span-2">
        <h2 class="font-semibold">Altas y bajas</h2>
        <p class="mb-4 text-xs text-muted">Suscripciones nuevas y canceladas por mes</p>
        <div id="chart-subs"></div>
      </div>
    </section>`;

  view.querySelector('.card').outerHTML = html;
  applyWidths(view);
  api.liveSummary().then(({ count }) => {
    if (isStale()) return;
    view.querySelector('#live-n').textContent = count;
    view.querySelector('#live-txt').textContent = count === 1 ? 'persona en la web ahora' : 'personas en la web ahora';
    view.querySelector('#live-dot').className = `size-3 shrink-0 rounded-full ${count ? 'bg-good animate-pulse' : 'bg-muted/40'}`;
  }).catch(() => {});

  const s = d.series;
  const cats = s.map((x) => monthName(x.period));
  const labels = s.map((x) => monthName(x.period, 'short').replace('.', ''));
  barChart(view.querySelector('#chart-revenue'), {
    title: 'Ventas mensuales por pack, últimos 12 meses',
    categories: cats, labels, stacked: true,
    series: d.packs.map((p) => ({ label: p.name, fill: PACK_CLASS[p.slug].fill, swatch: PACK_CLASS[p.slug].bg, values: s.map((x) => x.revenueByPack[p.slug]) })),
    format: eur, axisFormat: eur0,
  });
  barChart(view.querySelector('#chart-subs'), {
    title: 'Altas y bajas por mes, últimos 12 meses',
    categories: cats, labels,
    series: [
      { label: 'Altas', fill: 'fill-ink', swatch: 'bg-ink', values: s.map((x) => x.newSubs) },
      { label: 'Bajas', fill: 'fill-[#e34948] dark:fill-[#e66767]', swatch: 'bg-[#e34948] dark:bg-[#e66767]', values: s.map((x) => x.canceled) },
    ],
    format: int, integer: true,
    extra: (i) => `<div class="mt-1 flex justify-between gap-4 border-t border-line pt-1"><span class="text-muted">Churn</span><span class="num font-semibold">${pct(s[i].churn)}</span></div>`,
  });
}
