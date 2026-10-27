import { api } from '../api.js';
import { esc, eur, int, pageHeader, currentMonth, toast, debounce } from '../ui.js';

// Textos del cartel en castellano y catalán
const T = {
  es: {
    kicker: 'Suscripción mensual de pádel', title: 'Pelotas y grips nuevos cada mes, en tu casa',
    scan: 'Escanea y suscríbete', members: (n) => `Socios de ${n}`, code: (c) => `Código ${c}: se aplica solo al escanear`,
    foot: 'Sin permanencia · Envío a domicilio 0,90 €/mes', per: '/mes', content: (c, g) => `${c === 1 ? '1 bote' : `${c} botes`} de pelotas + ${g} overgrips`,
    packs: { start: 'Pack Básico', player: 'Pack Intermedio', pro: 'Pack Premium' }, short: 'Pelotas y grips cada mes, en casa',
  },
  ca: {
    kicker: 'Subscripció mensual de pàdel', title: 'Pilotes i grips nous cada mes, a casa teva',
    scan: 'Escaneja i subscriu-te', members: (n) => `Socis de ${n}`, code: (c) => `Codi ${c}: s'aplica sol en escanejar`,
    foot: 'Sense permanència · Enviament a domicili 0,90 €/mes', per: '/mes', content: (c, g) => `${c === 1 ? '1 pot' : `${c} pots`} de pilotes + ${g} overgrips`,
    packs: { start: 'Pack Bàsic', player: 'Pack Intermedi', pro: 'Pack Prèmium' }, short: 'Pilotes i grips cada mes, a casa',
  },
};

const slugify = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 34);

// Al imprimir, las medidas van en vh (alto de la hoja): el cartel se adapta al papel y a los márgenes y siempre cabe
// en una sola página, tanto en A4 como en A3.
function poster(s, packs, qr, link) {
  const t = T[s.lang];
  // La web pública (sin /admin ni ?ref) para que se pueda teclear a mano.
  const web = link ? new URL(link).host : location.host;
  return `
  <article class="poster mx-auto flex aspect-[210/297] w-full max-w-[210mm] flex-col overflow-hidden bg-white text-black print:aspect-auto print:h-[100vh] print:max-w-none print:w-full">
    <header class="flex items-center justify-center bg-black px-[8%] py-[3%]"><img src="/assets/img/logo-padel-drop.png" alt="PADEL DROP" class="w-[48%]"></header>
    <div class="flex flex-1 flex-col items-center px-[8%] pt-[4%] text-center">
      <p class="text-[clamp(11px,2.5vw,17pt)] font-semibold uppercase tracking-[0.18em] text-neutral-600 print:text-[1.78vh]">${esc(t.kicker)}</p>
      <h1 class="mt-[2%] font-display text-[clamp(30px,7.6vw,54pt)] font-extrabold uppercase leading-[0.93] print:text-[5.46vh]">${esc(t.title)}</h1>
      <ul class="mt-[3.5%] w-full space-y-[1.4%] text-left text-[clamp(13px,3vw,20pt)] print:text-[2.38vh]">
        ${packs.map((p) => `<li class="flex items-center justify-between gap-3 border-b border-neutral-300 pb-[1.2%]"><span class="min-w-0 leading-tight"><b class="block font-display text-[1.25em] font-extrabold uppercase leading-none">${esc(t.packs[p.slug] || p.name)}</b><span class="block text-[0.75em] text-neutral-600">${esc(t.content(p.cans, p.grips))}</span></span><b class="whitespace-nowrap font-display text-[1.35em] font-extrabold">${eur(p.priceCents)}<small class="text-[0.6em] font-semibold">${t.per}</small></b></li>`).join('')}
      </ul>
      ${s.code || s.offer ? `<div class="mt-[3.5%] w-full rounded-[14px] border-[3px] border-black bg-lime px-[4%] py-[2%] print:[print-color-adjust:exact]">
        <p class="font-display text-[clamp(18px,4.2vw,30pt)] font-extrabold uppercase leading-none print:text-[2.49vh]">${esc(s.name && s.code ? t.members(s.name) : '')}${s.name && s.code && s.offer ? ': ' : ''}${esc(s.offer)}</p>
        ${s.code ? `<p class="mt-[1.5%] text-[clamp(10px,2vw,13pt)] font-semibold print:text-[1.43vh]">${esc(t.code(s.code))}</p>` : ''}
      </div>` : ''}
      <div class="mt-[3%] flex flex-1 flex-col items-center justify-center pb-[1%]">
        <img src="${esc(qr)}" alt="" class="aspect-square min-w-[90px] print:min-w-0 ${s.code ? 'w-[20%] print:w-[11.8vh]' : 'w-[26%] print:w-[16.2vh]'}">
        <p class="mt-[2%] font-display text-[clamp(18px,4vw,28pt)] font-extrabold uppercase print:text-[3.09vh]">${esc(t.scan)}</p>
      </div>
    </div>
    <footer class="bg-black px-[6%] py-[2.5%] text-center text-[clamp(9px,1.8vw,12pt)] font-semibold text-white print:text-[1.43vh] print:[print-color-adjust:exact]"><span class="block font-display text-[1.45em] font-extrabold tracking-wide">${esc(web)}</span>${esc(t.foot)}</footer>
  </article>`;
}

function card(s, qr) {
  const t = T[s.lang];
  return `
  <div class="flex h-full items-center gap-[4mm] border border-dashed border-neutral-400 bg-white p-[4mm] text-black">
    <img src="${esc(qr)}" alt="" class="h-[36mm] w-[36mm] shrink-0">
    <div class="min-w-0">
      <p class="font-display text-[17pt] font-extrabold uppercase leading-none">Padel <span class="rounded bg-lime px-1 [print-color-adjust:exact]">Drop</span></p>
      <p class="mt-[2mm] text-[9.5pt] font-semibold leading-tight">${esc(t.short)}</p>
      ${s.offer ? `<p class="mt-[2mm] text-[9pt] leading-tight"><b>${esc(s.name && s.code ? t.members(s.name) + ': ' : '')}${esc(s.offer)}</b></p>` : ''}
      <p class="mt-[2mm] font-display text-[11pt] font-extrabold uppercase">${esc(t.scan)}</p>
    </div>
  </div>`;
}

export async function renderQr(view, { isStale }) {
  const s = { name: 'Interpàdel Guissona', code: '', offer: '', lang: 'es' };
  view.innerHTML = `
    ${pageHeader('Material para clubs', 'Carteles y tarjetas con un QR que lleva a tu web y aplica solo el descuento del club.')}
    <div class="grid gap-4 xl:grid-cols-[minmax(0,380px)_1fr] print:hidden">
      <form class="card space-y-4 p-5" id="qrform" autocomplete="off">
        <div><label class="label" for="q-name">Club o lugar</label><input class="input" id="q-name" value="${esc(s.name)}" maxlength="40" placeholder="Interpàdel Guissona"></div>
        <div><label class="label" for="q-code">Código de descuento (opcional)</label><input class="input uppercase" id="q-code" maxlength="40" placeholder="INTERPADEL-GUISSONA-TARREGA-GOLMES-3">
          <p class="mt-1 text-xs text-muted">Tiene que existir en Stripe (cobros reales). Al escanear, se aplica solo en la página de pago.</p></div>
        <div><label class="label" for="q-offer">Texto de la oferta (opcional)</label><input class="input" id="q-offer" maxlength="60" placeholder="10 % el primer mes"></div>
        <div><span class="label">Idioma del cartel</span>
          <div class="flex gap-2" role="group" aria-label="Idioma">${[['es', 'Castellano'], ['ca', 'Català']].map(([v, l]) => `<button type="button" data-lang="${v}" aria-pressed="${v === s.lang}" class="rounded-full border px-4 py-1.5 text-sm font-semibold ${v === s.lang ? 'border-lime bg-lime text-black' : 'border-line bg-card'}">${l}</button>`).join('')}</div></div>
        <div class="rounded-xl bg-soft p-3 text-sm">
          <p class="label mb-1">Enlace del QR</p>
          <p class="break-all font-mono text-xs" id="q-link"></p>
          <button type="button" class="btn-ghost mt-2 px-3 py-1 text-xs" id="q-copy">Copiar enlace</button>
        </div>
        <div class="rounded-xl bg-soft p-3 text-sm" id="q-stats"></div>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn-primary" id="p-poster-a3">Imprimir cartel A3</button>
          <button type="button" class="btn-ghost" id="p-poster">Imprimir cartel A4</button>
          <button type="button" class="btn-ghost" id="p-cards">Imprimir 8 tarjetas</button>
          <a class="btn-ghost" id="q-download" download>Descargar QR</a>
        </div>
      </form>
      <div class="card bg-soft p-4 sm:p-6"><p class="label mb-3">Vista previa del cartel</p><div id="q-preview"></div></div>
    </div>`;

  let packs = [];
  try { packs = (await api.metrics(currentMonth())).byPack; } catch { /* sin precios: el cartel sale sin la lista de packs */ }
  if (isStale()) return;

  const $ = (id) => view.querySelector(id);
  const link = () => {
    const p = new URLSearchParams({ ref: `qr-${slugify(s.name) || 'club'}` });
    if (s.code) p.set('codigo', s.code);
    return `${location.origin}/?${p}`;
  };
  const qrSrc = () => api.qrUrl(link());

  const loadStats = debounce(async () => {
    try {
      const r = await api.sourceStats(`qr-${slugify(s.name) || 'club'}`);
      if (!isStale()) $('#q-stats').innerHTML = `<p class="label mb-1">Visitas por este QR</p><p>Hoy <b class="num">${int(r.today)}</b> · 7 días <b class="num">${int(r.week)}</b> · Total <b class="num">${int(r.total)}</b></p>`;
    } catch { $('#q-stats').textContent = ''; }
  }, 300);

  const paint = debounce(() => {
    $('#q-link').textContent = link();
    $('#q-download').href = qrSrc();
    $('#q-download').setAttribute('download', `qr-${slugify(s.name) || 'club'}.svg`);
    $('#q-preview').innerHTML = poster(s, packs, qrSrc(), link());
    loadStats();
  }, 200);

  $('#q-name').addEventListener('input', (e) => { s.name = e.target.value.trim(); paint(); });
  $('#q-code').addEventListener('input', (e) => { s.code = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''); e.target.value = s.code; paint(); });
  $('#q-offer').addEventListener('input', (e) => { s.offer = e.target.value.trim(); paint(); });
  view.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => {
    s.lang = b.dataset.lang;
    view.querySelectorAll('[data-lang]').forEach((x) => {
      const on = x === b;
      x.setAttribute('aria-pressed', on);
      x.className = `rounded-full border px-4 py-1.5 text-sm font-semibold ${on ? 'border-lime bg-lime text-black' : 'border-line bg-card'}`;
    });
    paint();
  }));
  $('#q-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(link()); toast('Enlace copiado.'); } catch { toast('No se ha podido copiar.', true); }
  });

  // Impresión: se monta lo que se va a imprimir fuera del panel y se imprime solo eso
  // A3: se carga una hoja de estilo que cambia el papel a A3 y amplía el cartel (la CSP del panel no permite estilos en línea)
  function printWith(html, a3 = false) {
    document.getElementById('print-root')?.remove();
    document.getElementById('print-a3')?.remove();
    const root = document.createElement('div');
    root.id = 'print-root';
    root.innerHTML = html;
    document.body.appendChild(root);
    let css = null;
    if (a3) {
      css = Object.assign(document.createElement('link'), { id: 'print-a3', rel: 'stylesheet', href: '/admin/css/print-a3.css' });
      document.head.appendChild(css);
    }
    const imgs = [...root.querySelectorAll('img')];
    const waits = imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = r; i.onerror = r; })));
    if (css) waits.push(new Promise((r) => { css.onload = r; css.onerror = r; }));
    Promise.all(waits).then(() => {
      // No se quita al terminar: el diálogo del sistema o las preferencias de la impresora (y el iPhone) vuelven a
      // pedir el contenido después de cerrar el de Chrome y saldría en blanco. Se sustituye en la siguiente impresión
      // y en pantalla está oculto.
      // Si la impresora añade encabezado, que muestre la web pública y no la dirección del panel.
      const [url, title] = [location.href, document.title];
      history.replaceState(history.state, '', '/');
      document.title = 'PADEL DROP';
      window.addEventListener('afterprint', () => { history.replaceState(history.state, '', url); document.title = title; }, { once: true });
      window.print();
    });
  }
  $('#p-poster').addEventListener('click', () => printWith(poster(s, packs, qrSrc(), link())));
  $('#p-poster-a3').addEventListener('click', () => printWith(poster(s, packs, qrSrc(), link()), true));
  $('#p-cards').addEventListener('click', () => printWith(`<div class="grid h-[100vh] w-full grid-cols-2 grid-rows-4 gap-[4mm] bg-white p-[8mm]">${Array.from({ length: 8 }, () => card(s, qrSrc())).join('')}</div>`));

  paint();
}
