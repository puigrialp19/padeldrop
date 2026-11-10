/* RALLYBOX · movimiento e interacción (GSAP + ScrollTrigger, servidos desde js/vendor).
   - Portada: entrada con máscara por líneas, parallax con el scroll y con el ratón.
   - Títulos: cada palabra sube desde detrás de una máscara. Manifiesto: las palabras se iluminan con el scroll (scrub).
   - Tarjetas, planes, reseñas y preguntas: aparecen escalonadas. Precios: cuentan hasta su valor.
   - «Cómo funciona»: en escritorio la sección se fija y los pasos cambian con el scroll.
   - Ratón: cursor propio, botones magnéticos y tarjetas que se inclinan con brillo.
   Sin GSAP o con «reducir movimiento» no se anima nada y todo se ve tal cual. */
(function () {
  var doc = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  /* Barra fija de compra en móvil y sombra de la cabecera: funcionan siempre, con o sin animaciones */
  var scta = $('#scta'), hero = $('.hero'), planes = $('#planes'), foot = $('footer'), head = $('header');
  if (scta && 'IntersectionObserver' in window) {
    var seen = { hero: true, planes: false, foot: false };
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) { seen[x.target === hero ? 'hero' : x.target === planes ? 'planes' : 'foot'] = x.isIntersecting; });
      scta.classList.toggle('on', !seen.hero && !seen.planes && !seen.foot);
    });
    [hero, planes, foot].forEach(function (el) { if (el) io.observe(el); });
  }
  addEventListener('scroll', function () { head.classList.toggle('sc', scrollY > 30); }, { passive: true });

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  doc.classList.add('gs');
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var EASE = 'power4.out';

  /* ---------- Utilidades ---------- */
  // Parte un título en palabras con máscara (.w > span), respetando <em> y demás etiquetas internas
  function splitWords(el, cls) {
    var walk = function (node) {
      [].slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.nodeValue.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = cls;
            if (cls === 'w') { var i = document.createElement('span'); i.textContent = part; w.appendChild(i); } else w.textContent = part;
            frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', el.textContent.trim());
    walk(el);
    return $$(cls === 'w' ? '.w > span' : '.' + cls, el);
  }
  // Lo que ya quedó por encima de la pantalla (p. ej. al entrar con #planes) se muestra sin esperar
  function showIfPassed(els) {
    els.forEach(function (el) { if (el.getBoundingClientRect().bottom < 0) gsap.set(el, { clearProps: 'opacity,transform' }); });
  }

  /* ---------- Portada ---------- */
  var intro = gsap.timeline({ defaults: { ease: EASE, duration: 1.1 } });
  intro.from('.hey', { y: 24, opacity: 0, duration: .9 })
    .from('.ht .ln > span', { yPercent: 115, rotate: 2.5, stagger: .12, duration: 1.25 }, '-=.6')
    .from('.hero .sub', { y: 30, opacity: 0 }, '-=.85')
    .from('.hero .cta > *', { y: 30, opacity: 0, stagger: .1 }, '-=.9')
    .from('.tags li', { y: 16, opacity: 0, stagger: .07, duration: .8 }, '-=.8')
    .from('.hv .pack', { scale: .8, rotate: -8, opacity: 0, duration: 1.4, ease: 'expo.out' }, .35)
    .from('.ring', { scale: .6, opacity: 0, duration: 1.6, ease: 'expo.out' }, .3)
    .from('.hball', { scale: 0, rotate: -180, ease: 'back.out(2.4)', duration: 1 }, .9);
  gsap.to('.hv .pack', { y: -12, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.6 });

  // Parallax con el scroll: el texto sube, la mascota y los fondos van a otro ritmo
  var hs = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
  gsap.to('.hg .ht', { yPercent: -18, ease: 'none', scrollTrigger: hs }); // sin oscurecer el título: al volver arriba se ve siempre al 100 %
  gsap.to('.hrow', { y: -60, ease: 'none', scrollTrigger: hs });
  gsap.to('.hv', { y: 90, ease: 'none', scrollTrigger: hs });
  gsap.to('.bl1', { yPercent: 30, ease: 'none', scrollTrigger: hs });
  gsap.to('.bl2', { yPercent: -25, ease: 'none', scrollTrigger: hs });
  gsap.to('.hgrid', { y: 120, ease: 'none', scrollTrigger: hs });

  // Parallax con el ratón sobre la portada
  if (fine) {
    var px = gsap.quickTo('.hv .pack', 'x', { duration: 1.2, ease: 'power3' }), py = gsap.quickTo('.hv .pack', 'y', { duration: 1.2, ease: 'power3' });
    var bx = gsap.quickTo('.bl3', 'x', { duration: 2, ease: 'power3' }), by = gsap.quickTo('.bl3', 'y', { duration: 2, ease: 'power3' });
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect(), dx = (e.clientX - r.left) / r.width - .5, dy = (e.clientY - r.top) / r.height - .5;
      px(dx * 34); py(dy * 24);
      bx(dx * 160); by(dy * 120);
    });
  }

  /* ---------- Marquesina: avanza sola y acelera con la velocidad del scroll ---------- */
  var mq = $('.mq');
  if (mq) {
    var loop = gsap.to(mq, { xPercent: -50, duration: 28, ease: 'none', repeat: -1 });
    var boost = gsap.to(loop, { timeScale: 1, duration: .6, paused: true });
    ScrollTrigger.create({
      trigger: '.marquee', start: 'top bottom', end: 'bottom top',
      onUpdate: function (st) {
        var v = st.getVelocity() / 300, dir = v < 0 ? -1 : 1;
        loop.timeScale(dir * Math.min(6, 1 + Math.abs(v)));
        boost.vars.timeScale = dir; boost.invalidate().restart();
      },
    });
    gsap.fromTo('.marquee', { rotate: -3 }, { rotate: 0, ease: 'none', scrollTrigger: { trigger: '.marquee', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  /* ---------- Manifiesto: cada palabra pasa de apagada a encendida con el scroll ---------- */
  var mf = $('.mf');
  if (mf) {
    var words = splitWords(mf, 'mw');
    gsap.fromTo(words, { opacity: .14 }, {
      opacity: 1, stagger: .08, ease: 'none',
      scrollTrigger: { trigger: mf, start: 'top 78%', end: 'bottom 45%', scrub: .6 },
    });
  }

  /* ---------- Títulos con revelado por palabras ---------- */
  $$('h2.split').forEach(function (h) {
    var w = splitWords(h, 'w');
    gsap.set(w, { yPercent: 115 });
    ScrollTrigger.create({
      trigger: h, start: 'top 88%', once: true,
      onEnter: function () { gsap.to(w, { yPercent: 0, duration: 1.1, ease: EASE, stagger: .06 }); },
    });
    var eb = h.previousElementSibling;
    if (eb && eb.classList.contains('eyebrow')) gsap.from(eb, { x: -24, opacity: 0, duration: .9, ease: EASE, scrollTrigger: { trigger: h, start: 'top 90%', once: true } });
  });

  /* ---------- Listados escalonados ---------- */
  function batch(sel, from) {
    var els = $$(sel); if (!els.length) return;
    gsap.set(els, from);
    ScrollTrigger.batch(els, {
      start: 'top 90%', once: true,
      onEnter: function (b) { gsap.to(b, { opacity: 1, y: 0, x: 0, scale: 1, rotate: 0, duration: 1.1, ease: EASE, stagger: .11, overwrite: true }); },
    });
    showIfPassed(els);
  }
  batch('.bens .card', { opacity: 0, y: 70, rotate: 1.5 });
  batch('#pl .plan', { opacity: 0, y: 90, scale: .96 });
  batch('.pcard', { opacity: 0, y: 90, rotate: 2 });
  batch('.cls > li', { opacity: 0, x: -50 });
  // Mapa: entra con zoom, la ruta se dibuja y los puntos caen uno tras otro
  var mp = $('#map');
  if (mp) {
    var road = $('.mroad2'), len = road.getTotalLength();
    gsap.set(road, { strokeDasharray: len, strokeDashoffset: len });
    gsap.set('.mpi', { opacity: 0, y: -40 });
    gsap.timeline({ scrollTrigger: { trigger: mp, start: 'top 80%', once: true } })
      .from(mp, { opacity: 0, scale: .92, y: 60, duration: 1.2, ease: 'expo.out' })
      .to(road, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' }, '-=.6')
      .to('.mpi', { opacity: 1, y: 0, stagger: .18, duration: .9, ease: 'bounce.out' }, '-=1.1');
    gsap.to('.pglow', { yPercent: 40, ease: 'none', scrollTrigger: { trigger: '.phil', start: 'top bottom', end: 'bottom top', scrub: true } });
  }
  batch('.faq details', { opacity: 0, y: 30 });
  batch('.perks .card, .ipf, #fq, .note, .rsc', { opacity: 0, y: 30 });
  batch('footer .wrap > *', { opacity: 0, y: 24 });
  $$('.ipl').forEach(function (el) { gsap.from(el, { opacity: 0, scale: .9, rotate: -3, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true } }); });

  // Precios: cuentan desde 0 hasta su valor al aparecer
  var fmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
  $$('#pl .price').forEach(function (p, i) {
    var t = p.firstChild, val = (window.PLANS && PLANS[i] && PLANS[i].price) || 0;
    if (!t || t.nodeType !== 3 || !val) return;
    var o = { v: 0 };
    ScrollTrigger.create({
      trigger: p, start: 'top 90%', once: true,
      onEnter: function () { gsap.to(o, { v: val, duration: 1.6, ease: 'power3.out', delay: .15 * i, onUpdate: function () { t.nodeValue = fmt.format(o.v) + ' '; } }); },
    });
  });

  /* ---------- Parallax suave en imágenes y llamada final ---------- */
  $$('.ipl img').forEach(function (img) { gsap.fromTo(img, { yPercent: 8 }, { yPercent: -8, ease: 'none', scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: true } }); });
  gsap.fromTo('.final', { scale: .9, borderRadius: 80 }, { scale: 1, borderRadius: 40, ease: 'none', scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'top 45%', scrub: true } });
  gsap.from('.final h2, .final p, .final .btn', { y: 50, opacity: 0, stagger: .12, duration: 1.1, ease: EASE, scrollTrigger: { trigger: '.final', start: 'top 70%', once: true } });

  /* ---------- «Cómo funciona»: sección fijada en escritorio, pasos escalonados en móvil ---------- */
  var mm = gsap.matchMedia(), steps = $('.steps'), items = $$('.step'), cur = $('.stc'), bar = $('.stbar i');
  mm.add('(min-width: 901px)', function () {
    steps.classList.add('pinable');
    gsap.set(items, { opacity: 0, y: 60, scale: .96 });
    gsap.set(items[0], { opacity: 1, y: 0, scale: 1 });
    var tl = gsap.timeline({
      defaults: { ease: 'power2.inOut', duration: 1 },
      scrollTrigger: {
        trigger: steps, start: 'top 68px', end: '+=' + (items.length * 70) + '%', pin: true, scrub: .8, anticipatePin: 1,
        onUpdate: function (st) {
          var n = Math.min(items.length, Math.floor(st.progress * items.length) + 1);
          cur.textContent = (n < 10 ? '0' : '') + n;
          gsap.set(bar, { scaleX: (st.progress * (items.length - 1) + 1) / items.length });
        },
      },
    });
    for (var i = 1; i < items.length; i++) {
      tl.to({}, { duration: .5 }).to(items[i - 1], { opacity: 0, y: -50, scale: .94, duration: .6 }).to(items[i], { opacity: 1, y: 0, scale: 1, duration: .8 }, '<.2');
    }
    tl.to({}, { duration: .5 });
    return function () { steps.classList.remove('pinable'); gsap.set(items, { clearProps: 'all' }); cur.textContent = '01'; };
  });
  mm.add('(max-width: 900px)', function () {
    gsap.set(items, { opacity: 0, y: 60 });
    var b = ScrollTrigger.batch(items, { start: 'top 90%', once: true, onEnter: function (x) { gsap.to(x, { opacity: 1, y: 0, duration: 1, ease: EASE, stagger: .12 }); } });
    return function () { b.forEach(function (t) { t.kill(); }); gsap.set(items, { clearProps: 'all' }); };
  });

  /* ---------- Microinteracciones con ratón ---------- */
  if (fine) {
    doc.classList.add('has-cur');
    var c = $('.cur'), dot = $('.cdot'), ring = $('.cring'), lab = $('.clab');
    var dx = gsap.quickTo(dot, 'x', { duration: .12, ease: 'power3' }), dy = gsap.quickTo(dot, 'y', { duration: .12, ease: 'power3' });
    var rx = gsap.quickTo(ring, 'x', { duration: .55, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: .55, ease: 'power3' });
    gsap.set([dot, ring], { x: -100, y: -100 });
    addEventListener('pointermove', function (e) { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); }, { passive: true });
    addEventListener('pointerdown', function () { c.classList.add('down'); });
    addEventListener('pointerup', function () { c.classList.remove('down'); });
    document.addEventListener('mouseleave', function () { gsap.to([dot, ring], { opacity: 0, duration: .3 }); });
    document.addEventListener('mouseenter', function () { gsap.to([dot, ring], { opacity: 1, duration: .3 }); });
    $$('#pl .btn').forEach(function (b) { b.dataset.cursor = 'Elegir'; });
    $$('.hero .b1, .final .b1').forEach(function (b) { b.dataset.cursor = 'Vamos'; });
    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest && e.target.closest('a, button, summary, label, [data-cursor]');
      var l = t && t.dataset.cursor;
      c.classList.toggle('hov', !!t && !l); c.classList.toggle('lab', !!l); lab.textContent = l || '';
    });

    // Botones magnéticos: se desplazan hacia el cursor y vuelven con un rebote
    $$('.mag').forEach(function (b) {
      if (b.closest('dialog')) return;
      var mx = gsap.quickTo(b, 'x', { duration: .5, ease: 'power3' }), my = gsap.quickTo(b, 'y', { duration: .5, ease: 'power3' });
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * .32); my((e.clientY - r.top - r.height / 2) * .4);
      });
      b.addEventListener('pointerleave', function () { gsap.to(b, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, .35)' }); });
    });

    // Tarjetas que se inclinan en 3D y un brillo que sigue al cursor
    $$('.tilt').forEach(function (el) {
      var tx = gsap.quickTo(el, 'rotationY', { duration: .6, ease: 'power3' }), ty = gsap.quickTo(el, 'rotationX', { duration: .6, ease: 'power3' });
      gsap.set(el, { transformPerspective: 1000 });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        tx((x - .5) * 9); ty((.5 - y) * 9);
        el.style.setProperty('--mx', x * 100 + '%'); el.style.setProperty('--my', y * 100 + '%');
      });
      el.addEventListener('pointerleave', function () { tx(0); ty(0); });
    });
  }

  /* ---------- Recalcular posiciones cuando cambia el contenido ---------- */
  var refresh = function () { ScrollTrigger.refresh(); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  addEventListener('load', refresh);
  addEventListener('hashchange', function () { setTimeout(refresh, 50); });
})();
