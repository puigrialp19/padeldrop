// Genera las páginas estáticas de contenido (SEO/GEO): la página de la suscripción, el blog, sitemap.xml y llms.txt.
// Uso: npm run build:content   (después, revisa el resultado en public/ y haz commit)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE, EMAIL, PACKS, SHIPPING, CLUBS } from '../../content/site.mjs';
import { page as sub, faq as subFaq } from '../../content/suscripcion.mjs';
import { posts } from '../../content/blog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pub = path.join(root, 'public');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const fecha = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const ORG = { '@type': 'Organization', '@id': SITE + '/#org', name: 'PADEL DROP', url: SITE + '/', logo: SITE + '/assets/img/logo-padel-drop.png' };

const crumbsLd = (crumbs) => ({ '@type': 'BreadcrumbList', itemListElement: crumbs.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + url })) });
const faqLd = (faq) => ({ '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
const faqHtml = (faq) => faq?.length ? `<h2>Preguntas frecuentes</h2><div class="faq">${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>` : '';

function layout({ path: url, title, description, h1, lead, body, crumbs, ld, type = 'website', meta = '', aside = '' }) {
  const canonical = SITE + url;
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<link rel="canonical" href="${canonical}">
<meta property="og:site_name" content="PADEL DROP">
<meta property="og:locale" content="es_ES">
<meta property="og:type" content="${type}">
<meta property="og:url" content="${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${SITE}/assets/img/og-padel-drop.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0b0d10">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon-192.png" type="image/png" sizes="192x192">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="alternate" type="text/plain" href="/llms.txt" title="Resumen de PADEL DROP para asistentes de IA">
<link rel="preload" href="/assets/fonts/barlow-condensed-latin-800-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/css/fonts-local.css">
<link rel="stylesheet" href="/css/styles.css">
<link rel="stylesheet" href="/css/content.css">
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': [ORG, crumbsLd(crumbs), ...ld] })}</script>
</head>
<body class="cpage">
<header><div class="wrap nav">
<a href="/" class="lg" aria-label="PADEL DROP, inicio" style="height:46px;width:120px"></a>
<nav class="cnav" aria-label="Principal"><a href="/suscripcion-bolas-padel">Cómo funciona</a><a href="/blog/">Blog</a><a class="btn b1 sm" href="/#planes">Ver packs</a></nav>
</div></header>
<main class="wrap cmain">
<nav class="crumbs" aria-label="Migas de pan"><ol>${crumbs.map(([n, u], i) => i === crumbs.length - 1 ? `<li aria-current="page">${esc(n)}</li>` : `<li><a href="${u}">${esc(n)}</a></li>`).join('')}</ol></nav>
<article class="prose">
<h1>${esc(h1)}</h1>
${meta}
${lead ? `<p class="lead">${lead}</p>` : ''}
${body}
</article>
${aside}
<section class="ccta" aria-label="Packs de PADEL DROP">
<h2>Tu pádel, siempre a punto</h2>
<p>Pelotas y overgrips en una caja, cada 1, 2 o 3 meses. Desde ${PACKS[0].price} € con IVA, sin permanencia.</p>
<a class="btn b1" href="/#planes">Ver los packs</a>
</section>
</main>
<footer><div class="wrap cfoot">
<div><a href="/" class="lg" aria-label="PADEL DROP" style="height:58px;width:150px"></a><p>Tu pádel. Siempre a punto.</p></div>
<nav aria-label="Enlaces"><a href="/#planes">Packs</a><a href="/suscripcion-bolas-padel">Suscripción de bolas de pádel</a><a href="/blog/">Blog</a><a href="/#faq">Preguntas frecuentes</a><a href="mailto:${EMAIL}">${EMAIL}</a></nav>
<nav aria-label="Legal"><a href="/#/aviso-legal">Aviso legal</a><a href="/#/privacidad">Política de privacidad</a><a href="/#/cookies">Política de cookies</a><a href="/#/condiciones">Condiciones de contratación</a></nav>
</div></footer>
</body>
</html>
`;
}

const write = (rel, html) => { const f = path.join(pub, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); console.log('  ' + rel); };
const today = new Date().toISOString().slice(0, 10);

// 1 · Página de la suscripción
write('suscripcion-bolas-padel.html', layout({ ...sub, body: sub.body + faqHtml(subFaq),
  ld: [faqLd(subFaq), { '@type': 'WebPage', '@id': SITE + sub.path, url: SITE + sub.path, name: sub.title, description: sub.description, inLanguage: 'es-ES', about: { '@id': SITE + '/#org' } }] }));

// 2 · Artículos
const sorted = [...posts].sort((a, b) => b.date.localeCompare(a.date));
for (const p of sorted) {
  const url = `/blog/${p.slug}`;
  const related = sorted.filter((x) => x !== p).slice(0, 3);
  write(`blog/${p.slug}.html`, layout({
    path: url, title: p.title + ' | PADEL DROP', description: p.description, h1: p.h1, lead: p.lead, type: 'article',
    meta: `<p class="pmeta">Por el equipo de PADEL DROP · <time datetime="${p.date}">${fecha(p.date)}</time></p>`,
    body: p.body + faqHtml(p.faq),
    aside: `<aside class="related" aria-label="Más artículos"><h2>Sigue leyendo</h2><ul>${related.map((r) => `<li><a href="/blog/${r.slug}">${esc(r.h1)}</a></li>`).join('')}</ul></aside>`,
    crumbs: [['Inicio', '/'], ['Blog', '/blog/'], [p.h1, url]],
    ld: [{ '@type': 'BlogPosting', '@id': SITE + url, mainEntityOfPage: SITE + url, headline: p.h1, description: p.description, datePublished: p.date, dateModified: p.updated || p.date, inLanguage: 'es-ES', image: SITE + '/assets/img/og-padel-drop.jpg', author: { '@id': SITE + '/#org' }, publisher: { '@id': SITE + '/#org' } },
      ...(p.faq ? [faqLd(p.faq)] : [])],
  }));
}

// 3 · Índice del blog
write('blog/index.html', layout({
  path: '/blog/', title: 'Blog de pádel: bolas, grips y material | PADEL DROP',
  description: 'Guías prácticas sobre bolas y grips de pádel: cada cuánto cambiarlos, cuántos necesitas, cómo conservarlos y qué material llevar.',
  h1: 'Blog de pádel', lead: 'Guías claras sobre el material que más se gasta: bolas y grips. Cuándo cambiarlos, cuánto necesitas y cómo cuidarlos.',
  crumbs: [['Inicio', '/'], ['Blog', '/blog/']],
  body: `<ul class="posts">${sorted.map((p) => `<li><a href="/blog/${p.slug}"><h2>${esc(p.h1)}</h2><p>${esc(p.description)}</p><span>Leer artículo →</span></a></li>`).join('')}</ul>`,
  ld: [{ '@type': 'Blog', '@id': SITE + '/blog/', url: SITE + '/blog/', name: 'Blog de PADEL DROP', inLanguage: 'es-ES', publisher: { '@id': SITE + '/#org' },
    blogPost: sorted.map((p) => ({ '@type': 'BlogPosting', headline: p.h1, url: `${SITE}/blog/${p.slug}`, datePublished: p.date })) }],
}));

// 4 · sitemap.xml
const urls = [['/', today, '1.0'], [sub.path, today, '0.9'], ['/blog/', today, '0.6'], ...sorted.map((p) => [`/blog/${p.slug}`, p.updated || p.date, '0.6'])];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, d, pr]) => `  <url><loc>${SITE}${u}</loc><lastmod>${d}</lastmod><priority>${pr}</priority></url>`).join('\n')}
</urlset>
`);

// 5 · llms.txt (resumen en texto plano para asistentes de IA, propuesta llmstxt.org)
write('llms.txt', `# PADEL DROP

> PADEL DROP (www.padeldrop.net) es una tienda online española de suscripción de pelotas y overgrips de pádel. Envía packs cada 1, 2 o 3 meses, a elegir, a domicilio, a una oficina de Correos o CityPaq, o para recoger gratis en los clubs Interpàdel de Guissona, Tàrrega y Golmés (Lleida). Sin permanencia. Precios con IVA incluido.

No confundir con otras empresas o apps de nombre parecido: esta es la suscripción de padeldrop.net.

## Packs (precio por caja, IVA incluido)
${PACKS.map((p) => `- ${p.name}: ${p.cans} ${p.cans > 1 ? 'botes' : 'bote'} de 3 pelotas de pádel y ${p.grips} overgrips, ${p.price} €`).join('\n')}
- El precio por caja es el mismo con envío cada mes, cada 2 meses o cada 3 meses.

## Envío por caja (IVA incluido)
${SHIPPING.map(([a, b]) => `- ${a}: ${b}`).join('\n')}
- Solo España peninsular. Entrega habitual: 2 a 5 días laborables desde el envío, con seguimiento.

## Clubs de recogida gratis
${CLUBS.map(([n, a]) => `- ${n}: ${a}`).join('\n')}

## Cómo se contrata y se gestiona
- Se elige el pack, la frecuencia y la entrega en ${SITE}/#planes y se paga con Stripe.
- La suscripción se renueva automáticamente. Se cancela desde «Mi cuenta» (portal de cliente de Stripe, con el correo de la compra) o por correo, como mínimo 3 días antes del siguiente cobro. Pausa y cambio de pack por correo.
- Derecho de desistimiento de 14 días según la ley española (condiciones en ${SITE}/#/condiciones).
- Contacto: ${EMAIL}

## Páginas
- [Inicio y packs](${SITE}/): planes, precios y contratación
- [Suscripción de bolas de pádel](${SITE}${sub.path}): cómo funciona, precios, envíos y preguntas frecuentes
- [Blog](${SITE}/blog/): guías sobre bolas y grips de pádel
${sorted.map((p) => `- [${p.h1}](${SITE}/blog/${p.slug}): ${p.description}`).join('\n')}
`);
console.log('Contenido generado.');
