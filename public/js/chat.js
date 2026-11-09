/* Asistente virtual de PADEL DROP.
   Botón flotante abajo a la derecha. El estilo (css/chat.css) se carga después de la página para no frenarla.
   Las respuestas las da el servidor (/api/chat): motor propio + IA gratuita, con los precios reales de la web.
   La conversación solo se guarda en esta pestaña (sessionStorage) para no perderla al cambiar de página. */
(function () {
  if (window.__pdChat) return;
  window.__pdChat = 1;
  var API = '/api/chat', KEY = 'pd-chat-v1', AVATAR = '/favicon-192.png';

  var S = load() || { msgs: [], state: {}, topics: [], first: true, opened: false };
  var hello = null, panel, log, input, sendBtn, contactA, launch, busy = false;

  function load() { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* modo privado: no pasa nada */ } }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(s) {
    return esc(s)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)»])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/(^|[\s(])([\w.+-]+@[\w-]+\.[\w.]+[a-z])/gi, '$1<a href="mailto:$2">$2</a>')
      .replace(/\n/g, '<br>');
  }
  function post(url, body) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' });
  }
  function track(type, pack) { try { post(API + '/event', { type: type, pack: pack || '' }); } catch (e) { /* da igual */ } }

  var ICON = {
    x: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    send: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    wa: '<svg class="wa" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.6 11.6 0 0 0 4.4 3.9c1.6.7 2.3.8 3.1.6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .2-1.2c-.1-.1-.3-.2-.6-.3z"/></svg>',
    mail: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
  };

  // ---------- Contacto con una persona (WhatsApp o, si no hay número, correo) con resumen ----------
  function summary() {
    var asked = S.msgs.filter(function (m) { return m.r === 'u'; }).map(function (m) { return m.t; });
    var topics = S.topics.filter(function (t) { return t !== 'saludo' && t !== 'despedida'; });
    var lines = [];
    if (topics.length) lines.push('- Temas: ' + topics.slice(-5).join(', '));
    if (S.state && S.state.pack) lines.push('- Pack: ' + S.state.pack.toUpperCase());
    if (asked.length) lines.push('- Mi última pregunta: «' + asked[asked.length - 1].slice(0, 220) + '»');
    return lines.length ? '\n\nResumen de lo que he consultado:\n' + lines.join('\n') : '';
  }
  function contact() {
    if (!hello) return { href: 'mailto:padeldropp@gmail.com', label: 'Escribir a una persona del equipo', icon: ICON.mail, type: 'email_click' };
    var text = hello.waText + summary();
    if (hello.whatsapp) return { href: 'https://wa.me/' + hello.whatsapp + '?text=' + encodeURIComponent(text), label: 'Hablar con una persona por WhatsApp', icon: ICON.wa, type: 'wa_click' };
    return { href: 'mailto:' + hello.email + '?subject=' + encodeURIComponent('Consulta desde el asistente de Padel Drop') + '&body=' + encodeURIComponent(text), label: 'Escribir a una persona del equipo', icon: ICON.mail, type: 'email_click' };
  }
  function contactLink(cls) {
    var c = contact(), a = el('a', cls, c.icon + '<span>' + esc(c.label) + '</span>');
    a.href = c.href;
    if (c.type === 'wa_click') { a.target = '_blank'; a.rel = 'noopener'; }
    a.addEventListener('click', function () { a.href = contact().href; track(c.type); }); // resumen al día en el momento del clic
    return a;
  }

  // ---------- Pintar la conversación ----------
  function cardEl(c) {
    var d = el('div', 'pdc-card');
    d.innerHTML = '<h4>' + esc(c.name) + '</h4><span class="pr">' + esc(c.price) + '</span>' +
      '<p><strong>' + esc(c.contents) + '</strong> en cada caja · IVA incluido, envío aparte' + (c.who ? '<br>' + esc(c.who) : '') + '</p>';
    var a = el('a', null, 'Elegir ' + esc(c.name) + ' <span aria-hidden="true">→</span>');
    a.href = c.url;
    a.addEventListener('click', function () { track('pack_click', c.id); toggle(false); });
    d.appendChild(a);
    return d;
  }
  // Cursor siempre en el chat (en ordenador; en el móvil no se abre el teclado sin que el cliente lo pida)
  var FINE = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  function keepFocus() {
    if (FINE && input && panel && panel.classList.contains('open') && document.activeElement !== input) input.focus({ preventScroll: true });
  }
  var shown = 0;
  function render() {
    if (!log) return;
    var start = log.childNodes.length ? shown : S.msgs.length; // al abrir, nada se anima
    log.innerHTML = '';
    S.msgs.forEach(function (m, i) {
      var last = i === S.msgs.length - 1, from = log.childNodes.length;
      log.appendChild(el('div', 'pdc-m ' + (m.r === 'u' ? 'u' : 'b'), fmt(m.t)));
      if (m.cards && m.cards.length) { var cw = el('div', 'pdc-cards'); m.cards.forEach(function (c) { cw.appendChild(cardEl(c)); }); log.appendChild(cw); }
      if (m.wa) log.appendChild(contactLink('pdc-wa-inline'));
      if (last && m.r === 'b' && m.quick && m.quick.length) {
        var q = el('div', 'pdc-quick');
        m.quick.forEach(function (t) { var b = el('button', null, esc(t)); b.type = 'button'; b.addEventListener('mousedown', function (e) { e.preventDefault(); }); b.addEventListener('click', function () { send(t); }); q.appendChild(b); });
        log.appendChild(q);
      }
      if (i < start) for (var k = from; k < log.childNodes.length; k++) log.childNodes[k].classList.add('na');
    });
    shown = S.msgs.length;
    if (busy) log.appendChild(el('div', 'pdc-typing', '<i></i><i></i><i></i>'));
    if (contactA) { var c = contact(); contactA.innerHTML = c.icon + '<span>' + esc(c.label) + '</span>'; contactA.href = c.href; contactA.dataset.type = c.type; contactA.target = c.type === 'wa_click' ? '_blank' : ''; }
    requestAnimationFrame(function () { log.scrollTop = log.scrollHeight; });
    keepFocus();
  }

  // ---------- Enviar ----------
  function send(text) {
    text = String(text || '').trim();
    if (!text || busy) return;
    S.msgs.push({ r: 'u', t: text.slice(0, 500) });
    busy = true; sendBtn.disabled = true; render(); save();
    var history = S.msgs.slice(0, -1).filter(function (m) { return m.t; }).slice(-8).map(function (m) { return { role: m.r === 'u' ? 'user' : 'assistant', content: m.t }; });
    post(API, { message: text, history: history, state: S.state, first: S.first })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.j && res.j.error);
        var j = res.j;
        S.first = false;
        S.state = j.state || {};
        if (j.topic && S.topics.indexOf(j.topic) < 0) S.topics.push(j.topic);
        // No repetir la misma tarjeta que en la respuesta anterior
        var prev = S.msgs.filter(function (m) { return m.r === 'b'; }).pop();
        var ids = function (c) { return (c || []).map(function (x) { return x.id; }).join(); };
        var cards = prev && ids(prev.cards) && ids(prev.cards) === ids(j.cards) ? [] : j.cards;
        S.msgs.push({ r: 'b', t: j.text, cards: cards, quick: j.quick, wa: j.wa });
      })
      .catch(function (e) {
        S.msgs.push({ r: 'b', t: (e && e.message) || 'Ahora mismo no puedo responder. Inténtalo en un momento o habla con una persona del equipo:', wa: true });
      })
      .then(function () { busy = false; sendBtn.disabled = false; if (S.msgs.length > 60) S.msgs = S.msgs.slice(-60); save(); render(); });
  }

  // ---------- Ventana ----------
  function build() {
    panel = el('div', 'pdc-panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Asistente virtual de Padel Drop');
    panel.id = 'pdc-panel';
    var head = el('div', 'pdc-head', '<img src="' + AVATAR + '" alt="" width="40" height="40"><div><b>Asistente Padel Drop</b><small>En línea · respuesta al momento</small></div>');
    var close = el('button', 'pdc-close', ICON.close);
    close.type = 'button'; close.setAttribute('aria-label', 'Cerrar el asistente');
    close.addEventListener('click', function () { toggle(false); launch.focus(); });
    head.appendChild(close);
    log = el('div', 'pdc-log');
    log.setAttribute('aria-live', 'polite');
    var foot = el('div', 'pdc-foot');
    var form = el('form', 'pdc-form');
    input = el('textarea');
    input.rows = 1; input.maxLength = 500; input.placeholder = 'Escribe tu pregunta…'; input.setAttribute('aria-label', 'Tu pregunta');
    input.addEventListener('input', function () { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 110) + 'px'; });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : submit(); } });
    sendBtn = el('button', 'pdc-send', ICON.send);
    sendBtn.type = 'submit'; sendBtn.setAttribute('aria-label', 'Enviar');
    sendBtn.addEventListener('mousedown', function (e) { e.preventDefault(); });
    function submit() { var t = input.value; input.value = ''; input.style.height = 'auto'; send(t); }
    form.addEventListener('submit', function (e) { e.preventDefault(); submit(); });
    form.appendChild(input); form.appendChild(sendBtn);
    contactA = el('a', 'pdc-contact');
    contactA.rel = 'noopener';
    contactA.addEventListener('click', function () { contactA.href = contact().href; track(contactA.dataset.type || 'email_click'); });
    foot.appendChild(form);
    foot.appendChild(contactA);
    foot.appendChild(el('p', 'pdc-note', 'Asistente automático: puede equivocarse. No escribas datos personales. <a href="/#/privacidad">Privacidad</a>'));
    panel.appendChild(head); panel.appendChild(log); panel.appendChild(foot);
    panel.addEventListener('click', function (e) {
      if (e.target.closest('a, button, textarea')) return;
      var sel = window.getSelection && getSelection();
      if (sel && !sel.isCollapsed) return;
      keepFocus();
    });
    panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') { toggle(false); launch.focus(); } });
    document.body.appendChild(panel);
  }

  function greet() {
    if (!S.msgs.length && hello) { S.msgs.push({ r: 'b', t: hello.welcome, quick: hello.quick }); save(); }
    render();
  }

  function toggle(open) {
    if (open && !panel) build();
    if (!panel) return;
    panel.classList.toggle('open', open);
    launch.setAttribute('aria-expanded', open ? 'true' : 'false');
    launch.setAttribute('aria-label', open ? 'Cerrar el asistente' : 'Abrir el asistente de Padel Drop');
    if (!open) return;
    if (!S.opened) { S.opened = true; save(); track('open'); }
    if (hello) greet();
    else {
      render();
      fetch(API + '/hello', { credentials: 'same-origin' }).then(function (r) { return r.json(); })
        .then(function (j) { hello = j; greet(); })
        .catch(function () { hello = null; if (!S.msgs.length) S.msgs.push({ r: 'b', t: '¡Hola! 👋 Ahora mismo no puedo conectar. Puedes escribir al equipo:', wa: true }); render(); });
    }
    keepFocus();
    setTimeout(keepFocus, 80); // por si la animación de apertura aún no ha terminado
  }

  function start() {
    launch = el('button', 'pdc-launch', '<img src="' + AVATAR + '" alt="" width="62" height="62"><span class="pdc-x">' + ICON.x + '</span><span class="pdc-dot"></span>');
    launch.type = 'button';
    launch.setAttribute('aria-controls', 'pdc-panel');
    launch.setAttribute('aria-expanded', 'false');
    launch.setAttribute('aria-label', 'Abrir el asistente de Padel Drop');
    launch.title = '¿Dudas? Pregúntame';
    launch.addEventListener('click', function () { toggle(!(panel && panel.classList.contains('open'))); });
    document.body.appendChild(launch);
  }

  // El estilo se carga después de la página; el botón aparece cuando está listo
  var css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = '/css/chat.css';
  css.onload = start;
  css.onerror = start;
  document.head.appendChild(css);
})();
