/* Contador ANÓNIMO de visitantes en directo para el panel de PADEL DROP.
   No usa cookies ni guarda nada en tu dispositivo: un número aleatorio que solo vive mientras
   tienes la página abierta, la sección que miras y de dónde vienes (TikTok, Instagram, un QR...). */
(function () {
  if (navigator.webdriver || !window.fetch) return;
  var id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Math.random().toString(36).slice(2) + Date.now().toString(36));
  var params = new URLSearchParams(location.search);
  var clean = function (v) { return String(v || '').toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 40); };

  function fromReferrer() {
    try {
      var h = new URL(document.referrer).hostname;
      if (!h || h === location.hostname) return '';
      if (/tiktok/.test(h)) return 'tiktok';
      if (/instagram/.test(h)) return 'instagram';
      if (/facebook|fb\.|messenger/.test(h)) return 'facebook';
      if (/whatsapp|wa\.me/.test(h)) return 'whatsapp';
      if (/google\./.test(h)) return 'google';
      if (/t\.co$|twitter|x\.com/.test(h)) return 'x';
      if (/youtube|youtu\.be/.test(h)) return 'youtube';
      return h.replace(/^www\./, '');
    } catch (e) { return ''; }
  }
  var source = clean(params.get('ref') || params.get('utm_source')) || fromReferrer() || 'directo';
  var stages = ['web', 'planes', 'cesta', 'pago'];
  var stage = 'web';
  function advance(s) { if (stages.indexOf(s) > stages.indexOf(stage)) { stage = s; send(); } }
  function page() { return location.hash.indexOf('#/') === 0 ? location.hash.slice(2) : 'inicio'; }

  function post(path, body) {
    return fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true, credentials: 'same-origin' }).catch(function () {});
  }
  function send() { if (document.visibilityState === 'visible') post('/api/visit', { id: id, page: page(), stage: stage, source: source }); }

  // Etapas: ha visto los planes, ha abierto la cesta, ha ido a pagar
  var planes = document.getElementById('planes');
  if (planes && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) advance('planes'); }); }, { threshold: 0.3 }).observe(planes);
  }
  var dlg = document.getElementById('dlg');
  if (dlg && 'MutationObserver' in window) {
    new MutationObserver(function () { if (dlg.open) advance('cesta'); }).observe(dlg, { attributes: true, attributeFilter: ['open'] });
  }
  document.addEventListener('click', function (e) {
    var go = e.target.closest && e.target.closest('#go');
    if (go && go.getAttribute('aria-disabled') === 'false') advance('pago');
  });

  addEventListener('hashchange', send);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') send(); else post('/api/visit/leave', { id: id });
  });
  addEventListener('pagehide', function () { post('/api/visit/leave', { id: id }); });
  setInterval(send, 15000);
  send();
})();
