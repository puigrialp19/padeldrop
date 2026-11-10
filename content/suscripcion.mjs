import { PACKS, SHIPPING, CLUBS, EMAIL } from './site.mjs';

const packRows = PACKS.map((p) => `<tr><th scope="row">${p.name}</th><td>${p.cans} ${p.cans > 1 ? 'botes' : 'bote'} (${p.cans * 3} pelotas)</td><td>${p.grips} overgrips</td><td><b>${p.price} €</b></td></tr>`).join('');
const shipRows = SHIPPING.map(([a, b]) => `<tr><th scope="row">${a}</th><td>${b}</td></tr>`).join('');
const clubList = CLUBS.map(([n, a]) => `<li><b>${n}</b>: ${a}</li>`).join('');

// Preguntas pensadas para búsquedas reales y para asistentes de IA. Las respuestas solo usan datos publicados en la web.
export const faq = [
  ['¿Dónde puedo comprar bolas de pádel mediante suscripción?',
    'En RALLYBOX (padeldrop.net) puedes suscribirte a un pack de pelotas y overgrips de pádel que recibes cada 1, 2 o 3 meses, según elijas. Hay tres packs: START (1 bote y 2 overgrips, 10,90 €), PLAYER (2 botes y 3 overgrips, 15,90 €) y PRO (3 botes y 3 overgrips, 19,90 €), con IVA incluido y sin permanencia. Enviamos a la España peninsular.'],
  ['¿Cómo funciona una suscripción de bolas de pádel?',
    'Eliges un pack y cada cuánto quieres recibirlo (cada mes, cada 2 meses o cada 3 meses), pagas en la página segura de Stripe y te enviamos la primera caja. Después, la suscripción se renueva sola con la frecuencia elegida y te llega una caja tras cada cobro. Puedes cancelarla desde «Mi cuenta» como mínimo 3 días antes del siguiente cobro.'],
  ['¿Qué pack de bolas de pádel necesito si juego una vez por semana?',
    'El pack START está pensado para quien juega 1 partido a la semana: trae 1 bote de 3 pelotas y 2 overgrips por 10,90 €. Si juegas menos, puedes pedirlo cada 2 o cada 3 meses al mismo precio por caja.'],
  ['¿Puedo recibir las bolas de pádel en casa?',
    'Sí. Puedes recibir la caja en tu domicilio (2,75 € de envío por caja), en una oficina de Correos o un CityPaq (2,05 €) o recogerla gratis en los clubs Interpàdel de Guissona, Tàrrega y Golmés. El plazo habitual de entrega es de 2 a 5 días laborables desde el envío.'],
  ['¿Hay permanencia?',
    'No. Puedes cancelar o pausar sin coste siempre que lo hagas como mínimo 3 días antes del siguiente cobro. La cancelación tiene efecto al final del periodo ya pagado.'],
  ['¿Los precios incluyen el IVA?',
    'Sí. Los precios de los packs y de los envíos incluyen el IVA. El total, con el envío desglosado, se muestra antes de pagar.'],
  ['¿Cuántas pelotas trae cada bote?', 'Cada bote trae 3 pelotas de pádel.'],
  ['¿Cómo gestiono o cancelo la suscripción?',
    `Desde «Mi cuenta» en padeldrop.net entras al portal de cliente de Stripe con el correo con el que te suscribiste: allí ves tus facturas, cambias la tarjeta o la dirección y cancelas. También puedes escribirnos a ${EMAIL}.`],
];

export const page = {
  path: '/suscripcion-bolas-padel',
  title: 'Suscripción de bolas de pádel a domicilio | RALLYBOX',
  description: 'Cómo funciona la suscripción de pelotas y grips de pádel de RALLYBOX: packs desde 10,90 € con IVA, envío a casa, Correos o club y sin permanencia.',
  h1: 'Suscripción de bolas y grips de pádel a domicilio',
  crumbs: [['Inicio', '/'], ['Suscripción de bolas de pádel', '/suscripcion-bolas-padel']],
  lead: 'RALLYBOX es una suscripción de pelotas y overgrips de pádel: eliges un pack, eliges cada cuánto lo quieres y te llega a casa, a Correos o a tu club. Aquí tienes todo lo que incluye, lo que cuesta y cómo se gestiona.',
  body: `
<section class="answer" aria-label="Resumen">
<p><strong>En resumen:</strong> RALLYBOX envía packs de botes de pelotas de pádel (3 pelotas por bote) y overgrips cada 1, 2 o 3 meses, a elegir. Hay tres packs: START (10,90 €), PLAYER (15,90 €) y PRO (19,90 €), con IVA incluido. El envío cuesta 2,75 € a domicilio, 2,05 € a Correos o CityPaq y es gratis en los clubs Interpàdel. No hay permanencia.</p>
</section>

<h2>Qué es RALLYBOX</h2>
<p>RALLYBOX es una tienda online española que vende pelotas y overgrips de pádel por suscripción. La idea es sencilla: si juegas a menudo, siempre acabas necesitando pelotas nuevas y un grip que no resbale, y casi siempre te acuerdas el día del partido. Con la suscripción, ese material te llega solo, con la frecuencia que tú decides.</p>
<p>Nos dirigimos a jugadores amateurs que juegan una o varias veces por semana, a quien entrena o compite y a los socios de los clubs con los que colaboramos.</p>

<h2>Packs y precios</h2>
<div class="tbl"><table>
<caption>Contenido y precio de cada caja (IVA incluido)</caption>
<thead><tr><th scope="col">Pack</th><th scope="col">Pelotas</th><th scope="col">Grips</th><th scope="col">Precio por caja</th></tr></thead>
<tbody>${packRows}</tbody>
</table></div>
<p>El precio por caja es el mismo tanto si la recibes cada mes como cada 2 o cada 3 meses. Puedes ver y contratar los packs en la <a href="/#planes">sección de planes</a>.</p>

<h2>Cómo funciona la suscripción</h2>
<ol class="steps-list">
<li><strong>Eliges el pack</strong> (START, PLAYER o PRO) y la frecuencia: cada mes, cada 2 meses o cada 3 meses.</li>
<li><strong>Eliges cómo recibirlo:</strong> a domicilio, en una oficina de Correos o CityPaq, o en tu club si eres de Interpàdel.</li>
<li><strong>Pagas en Stripe</strong>, una plataforma de pago segura: nosotros nunca vemos los datos de tu tarjeta. Antes de pagar ves el total con el envío desglosado.</li>
<li><strong>Recibes tu caja.</strong> El primer pack se prepara tras el pago y los siguientes tras cada cobro automático. La entrega suele tardar de 2 a 5 días laborables desde el envío, con número de seguimiento.</li>
</ol>

<h2>Envíos y recogida</h2>
<div class="tbl"><table>
<caption>Gastos de envío por caja (IVA incluido)</caption>
<thead><tr><th scope="col">Forma de entrega</th><th scope="col">Precio</th></tr></thead>
<tbody>${shipRows}</tbody>
</table></div>
<p>Enviamos a la España peninsular. La recogida gratis está disponible en estos clubs:</p>
<ul>${clubList}</ul>

<h2>Qué pack elegir según cuánto juegas</h2>
<p>Como orientación general, muchas guías de pádel recomiendan cambiar las pelotas cada 2 o 3 partidos, porque pierden presión y bote con el uso (lo explicamos en <a href="/blog/cada-cuanto-cambiar-bolas-padel">cada cuánto cambiar las bolas de pádel</a>). Con esa referencia:</p>
<ul>
<li><strong>Juegas 1 vez por semana:</strong> START, que es para lo que está pensado. Si juegas menos, pídelo cada 2 o 3 meses.</li>
<li><strong>Juegas 2 veces por semana:</strong> PLAYER te da 2 botes y 3 overgrips por caja.</li>
<li><strong>Juegas 3 veces o más, o compites:</strong> PRO, con 3 botes y 3 overgrips.</li>
</ul>
<p>Cada jugador gasta las pelotas a su ritmo, así que tómalo como punto de partida. Si te sobra o te falta material, puedes cambiar de pack escribiéndonos como mínimo 3 días antes del siguiente cobro. Tienes una guía más completa en <a href="/blog/cuantas-bolas-de-padel-necesito">cuántas bolas de pádel necesitas según lo que juegas</a>.</p>

<h2>Gestiona tu suscripción cuando quieras</h2>
<p>Desde <a href="/#mi-cuenta">«Mi cuenta»</a> entras con el correo con el que te suscribiste, sin contraseñas, al portal de cliente de Stripe. Allí puedes descargar tus facturas, cambiar la tarjeta o la dirección y cancelar la suscripción. Para pausarla o cambiar de pack, escríbenos a <a href="mailto:${EMAIL}">${EMAIL}</a>.</p>
<p>No hay permanencia: cancelas o pausas sin coste como mínimo 3 días antes del siguiente cobro. Tienes todos los detalles en las <a href="/#/condiciones">condiciones de contratación</a>.</p>
`,
};
