// Artículos del blog. Cada uno cubre una intención de búsqueda distinta (sin repetir temas entre artículos).
// Las cifras técnicas proceden del reglamento de la FIP; lo demás son pautas generales, presentadas como orientación.
// Para añadir uno: copia un objeto, cambia slug/título/fecha y ejecuta "npm run build:content".
const CTA_PACKS = '<a href="/#planes">ver los packs</a>';

export const posts = [
{
  slug: 'cada-cuanto-cambiar-bolas-padel',
  title: '¿Cada cuánto cambiar las bolas de pádel? Cuánto duran y cómo saberlo',
  description: 'Cuántos partidos duran unas bolas de pádel, por qué pierden bote y cómo saber cuándo cambiarlas. Diferencias entre bolas nuevas y usadas.',
  h1: '¿Cada cuánto hay que cambiar las bolas de pádel?',
  date: '2026-11-06',
  lead: 'La respuesta corta: como orientación, cada 2 o 3 partidos si juegas a nivel amateur, y antes si compites. Pero más que contar partidos, lo que importa es el bote. Te explicamos por qué y cómo comprobarlo.',
  body: `
<section class="answer"><p><strong>Respuesta rápida:</strong> unas bolas de pádel suelen rendir bien durante unos 2 a 4 partidos de nivel aficionado. La pauta más repetida es cambiarlas cada 2 o 3 partidos, y cada 1 o 2 si compites. Cámbialas antes si notan un bote claramente bajo o el fieltro está liso.</p></section>

<h2>Por qué las bolas de pádel «mueren»</h2>
<p>La mayoría de las bolas de pádel son presurizadas: tienen aire a presión dentro. El reglamento de la Federación Internacional de Pádel (FIP) fija que la presión interna debe estar entre 4,6 y 5,2 kg por cada 2,54 cm², y que al dejarla caer desde 2,54 m sobre una superficie dura debe botar entre 135 y 145 cm.</p>
<p>Desde que abres el bote, la pelota empieza a perder esa presión poco a poco, la uses o no. Además, los golpes y el roce con la pista desgastan el fieltro. El resultado es una bola que bota menos, sale más lenta de la pala y se controla peor.</p>

<h2>¿Cuántos partidos duran unas bolas de pádel?</h2>
<p>No hay una cifra oficial: depende de cuánto y cómo juegues. Como orientación:</p>
<div class="tbl"><table>
<thead><tr><th scope="col">Tipo de juego</th><th scope="col">Cambio orientativo</th></tr></thead>
<tbody>
<tr><th scope="row">Amateur, partidos de ocio</th><td>Cada 2 o 3 partidos</td></tr>
<tr><th scope="row">Entrenamiento intenso o competición</th><td>Cada 1 o 2 partidos</td></tr>
<tr><th scope="row">Torneos profesionales</th><td>Se cambian con mucha frecuencia, incluso durante el partido</td></tr>
</tbody></table></div>
<p>Influyen también el tipo de pista, el calor y la humedad, la altitud y la calidad de la pelota.</p>

<h2>Cómo saber si tus bolas ya no sirven</h2>
<ul>
<li><strong>El bote:</strong> déjala caer desde la altura del hombro junto a una nueva. Si bota claramente menos, ha perdido presión.</li>
<li><strong>Al apretarla:</strong> una bola gastada se hunde con mucha facilidad entre los dedos.</li>
<li><strong>El fieltro:</strong> si está liso, apelmazado o ha perdido color, la bola agarra peor y cambia su trayectoria.</li>
<li><strong>El sonido:</strong> el golpe suena más apagado.</li>
</ul>

<h2>Bolas nuevas y usadas: qué cambia en la pista</h2>
<p>Con bolas nuevas, el bote en el cristal y en el suelo es el esperado, la bola sale viva de la pala y los globos llegan a donde apuntas. Con bolas usadas, el juego se vuelve más lento: cuesta más rematar por 3 o por 4, la bola se queda «muerta» tras la pared y los golpes cambian de un punto a otro. Para entrenar golpes concretos pueden servir, pero para jugar un partido notarás la diferencia.</p>

<h2>Cómo tener siempre bolas en buen estado</h2>
<p>La forma más sencilla es no esperar a que se te acaben. Si juegas cada semana, una suscripción como la de RALLYBOX te envía botes nuevos (3 pelotas por bote) y overgrips cada 1, 2 o 3 meses. Puedes ${CTA_PACKS} o leer <a href="/blog/cuantas-bolas-de-padel-necesito">cuántas bolas necesitas según lo que juegas</a>.</p>
<p>Y si quieres que te duren un poco más, revisa <a href="/blog/conservar-bolas-padel">cómo conservar las bolas de pádel</a>.</p>
`,
  faq: [
    ['¿Cada cuánto se cambian las bolas de pádel?', 'Como orientación, cada 2 o 3 partidos a nivel amateur y cada 1 o 2 si compites. Cámbialas antes si notas que botan claramente menos o el fieltro está liso.'],
    ['¿Cuántos partidos duran unas bolas de pádel?', 'Suelen rendir bien entre 2 y 4 partidos de nivel aficionado, según la intensidad, la pista, el clima y la calidad de la pelota.'],
    ['¿Cuánto debe botar una bola de pádel?', 'Según el reglamento de la FIP, al dejarla caer desde 2,54 m sobre una superficie dura debe botar entre 135 y 145 cm.'],
  ],
},
{
  slug: 'cuando-cambiar-grip-pala-padel',
  title: '¿Cuándo cambiar el grip de la pala de pádel? Señales y frecuencia',
  description: 'Cómo saber cuándo cambiar el overgrip de tu pala de pádel, cada cuánto hacerlo según lo que juegas y cómo ponerlo bien.',
  h1: '¿Cuándo hay que cambiar el grip de la pala de pádel?',
  date: '2026-11-06',
  lead: 'El overgrip es la pieza más barata de tu equipo y la que más influye en cómo sujetas la pala. Te contamos las señales para cambiarlo y una frecuencia orientativa.',
  body: `
<section class="answer"><p><strong>Respuesta rápida:</strong> cambia el overgrip cuando resbale, esté brillante o roto, o huela. Como orientación, si juegas 1 o 2 veces por semana, eso suele ocurrir cada pocas semanas; si sudas mucho o juegas a diario, antes.</p></section>

<h2>Grip y overgrip no son lo mismo</h2>
<p>El <strong>grip</strong> (o grip base) es el recubrimiento que trae la pala de fábrica. El <strong>overgrip</strong> es una cinta fina que se enrolla encima. Lo habitual es no tocar el grip base y cambiar solo el overgrip, que es lo que se desgasta. Cuando en pádel se habla de «cambiar el grip», casi siempre se refiere al overgrip.</p>

<h2>Señales de que toca cambiarlo</h2>
<ul>
<li><strong>Resbala:</strong> notas que aprietas más la pala para que no gire en la mano.</li>
<li><strong>Está brillante o liso:</strong> ha perdido el tacto adherente o absorbente.</li>
<li><strong>Está roto o despegado</strong> por el borde o la parte de arriba.</li>
<li><strong>Huele o ha cambiado de color:</strong> ha acumulado sudor.</li>
<li><strong>Te salen ampollas o te cansas antes el antebrazo:</strong> apretar de más tiene un coste.</li>
</ul>

<h2>Cada cuánto cambiar el overgrip</h2>
<p>No hay una regla fija. Depende de cuánto juegues, de cuánto te suden las manos y del tipo de overgrip (más adherente o más absorbente). Como referencia: quien juega una vez por semana suele cambiarlo con menos frecuencia que quien juega varias veces, y en verano se gasta antes. La señal de verdad es el tacto: si dudas de él, cámbialo.</p>

<h2>Cómo poner un overgrip paso a paso</h2>
<ol class="steps-list">
<li>Quita el overgrip viejo y limpia el grip base si está sucio.</li>
<li>Empieza por la parte de abajo del mango, con el extremo cortado en diagonal.</li>
<li>Enrolla en espiral, tensando un poco y montando cada vuelta sobre la anterior de forma uniforme.</li>
<li>Al llegar arriba, corta lo que sobre y sujétalo con la cinta adhesiva que trae.</li>
</ol>
<p>Si quieres un mango más grueso, puedes poner dos overgrips, uno encima del otro.</p>

<h2>Ten siempre uno de repuesto</h2>
<p>Lo práctico es llevar un overgrip nuevo en la mochila. Todos los packs de RALLYBOX incluyen overgrips: 2 en START y 3 en PLAYER y PRO, junto con los botes de pelotas. Puedes ${CTA_PACKS}.</p>
`,
  faq: [
    ['¿Cuándo se cambia el overgrip de la pala de pádel?', 'Cuando resbala, está brillante, roto o huele. La frecuencia depende de cuánto juegues y de cuánto te suden las manos.'],
    ['¿Es lo mismo grip que overgrip?', 'No. El grip es el recubrimiento de fábrica de la pala y el overgrip es la cinta fina que se pone encima y que se cambia con frecuencia.'],
  ],
},
{
  slug: 'cuantas-bolas-de-padel-necesito',
  title: '¿Cuántas bolas de pádel necesito? Guía según cuánto juegas',
  description: 'Calcula cuántos botes de bolas de pádel necesitas al mes según las veces que juegas y cómo elegir una suscripción de bolas de pádel.',
  h1: '¿Cuántas bolas de pádel necesitas según cuánto juegas?',
  date: '2026-11-06',
  lead: 'Saber cuántos botes gastas al mes te ahorra quedarte sin pelotas y comprar de más. Te damos una forma sencilla de calcularlo y qué mirar al elegir una suscripción.',
  body: `
<section class="answer"><p><strong>Respuesta rápida:</strong> si cambias las bolas cada 2 o 3 partidos (la pauta más habitual a nivel amateur) y juegas 1 vez por semana, gastarás 1 o 2 botes al mes. Con 2 partidos por semana, unos 3 o 4 botes. En pareja o con un grupo fijo, el gasto se reparte entre todos.</p></section>

<h2>Cómo calcularlo en 1 minuto</h2>
<p>Un bote trae 3 pelotas y se suele usar un bote por partido. La cuenta es:</p>
<p class="formula">partidos al mes ÷ partidos que te dura un bote = botes al mes</p>
<div class="tbl"><table>
<caption>Botes al mes, si un bote te dura 2 o 3 partidos</caption>
<thead><tr><th scope="col">Juegas</th><th scope="col">Partidos al mes</th><th scope="col">Botes al mes (aprox.)</th></tr></thead>
<tbody>
<tr><th scope="row">1 vez por semana</th><td>4</td><td>1 o 2</td></tr>
<tr><th scope="row">2 veces por semana</th><td>8</td><td>3 o 4</td></tr>
<tr><th scope="row">3 veces por semana</th><td>12</td><td>4 a 6</td></tr>
</tbody></table></div>
<p>Si el bote lo ponéis a turnos entre los cuatro jugadores, divide entre lo que aportas tú. Si compites o entrenas fuerte, probablemente cambiarás antes y gastarás más.</p>

<h2>Qué mirar al elegir una suscripción de bolas de pádel</h2>
<ul>
<li><strong>Qué incluye cada caja:</strong> cuántos botes y si trae overgrips.</li>
<li><strong>La frecuencia:</strong> que puedas recibirla cada mes o espaciarla si juegas menos.</li>
<li><strong>El precio final:</strong> con IVA y con el envío incluidos, antes de pagar.</li>
<li><strong>La permanencia:</strong> que puedas cancelar o pausar sin coste.</li>
<li><strong>La entrega:</strong> a domicilio, en un punto de recogida o en tu club.</li>
<li><strong>La gestión:</strong> que puedas cambiar la tarjeta, la dirección o cancelar tú mismo.</li>
</ul>

<h2>Cómo encaja con los packs de RALLYBOX</h2>
<p>En RALLYBOX hay tres packs, y cada uno se puede recibir cada 1, 2 o 3 meses al mismo precio por caja:</p>
<ul>
<li><strong>START</strong>: 1 bote y 2 overgrips por 10,90 €. Pensado para 1 partido a la semana.</li>
<li><strong>PLAYER</strong>: 2 botes y 3 overgrips por 15,90 €.</li>
<li><strong>PRO</strong>: 3 botes y 3 overgrips por 19,90 €.</li>
</ul>
<p>Los precios incluyen el IVA. El envío es aparte: 2,75 € a domicilio, 2,05 € a Correos o CityPaq y gratis en los clubs Interpàdel. No hay permanencia. Si juegas mucho, compara también con lo que gastas hoy en botes sueltos. Puedes ${CTA_PACKS} o leer <a href="/suscripcion-bolas-padel">cómo funciona la suscripción</a>.</p>
`,
  faq: [
    ['¿Cuántas pelotas trae un bote de pádel?', 'Lo habitual es 3 pelotas por bote. Los botes de RALLYBOX traen 3 pelotas.'],
    ['¿Cuántos botes de bolas de pádel necesito al mes si juego una vez por semana?', 'Si cambias las bolas cada 2 o 3 partidos, entre 1 y 2 botes al mes.'],
  ],
},
{
  slug: 'ahorrar-bolas-padel-recibir-en-casa',
  title: 'Cómo ahorrar en bolas de pádel y ventajas de recibirlas en casa',
  description: 'Ideas prácticas para gastar menos en bolas de pádel y qué ventajas e inconvenientes tiene recibirlas en casa con una suscripción.',
  h1: 'Cómo ahorrar en bolas de pádel (y si te compensa recibirlas en casa)',
  date: '2026-11-06',
  lead: 'Las bolas son el gasto que más se repite en el pádel. Con un poco de organización puedes gastar menos sin jugar con bolas muertas.',
  body: `
<section class="answer"><p><strong>Respuesta rápida:</strong> para ahorrar en bolas de pádel, calcula cuántos botes gastas, compra en packs en lugar de botes sueltos, reparte el bote con tu grupo y consérvalas bien. Recibirlas en casa con una suscripción te ahorra viajes y compras de última hora, pero compara siempre el precio final con el envío.</p></section>

<h2>6 formas de gastar menos en bolas</h2>
<ol class="steps-list">
<li><strong>Calcula lo que gastas de verdad.</strong> Cuenta partidos y botes de un mes. Te sorprenderá (tienes una guía en <a href="/blog/cuantas-bolas-de-padel-necesito">cuántas bolas necesitas</a>).</li>
<li><strong>Evita las compras de urgencia.</strong> El bote que compras en el último minuto suele ser el más caro.</li>
<li><strong>Compra en packs.</strong> Los packs de varios botes suelen salir más baratos por bote que comprarlos sueltos.</li>
<li><strong>Repartid el bote.</strong> Turnaos para poner bolas nuevas en el grupo de siempre.</li>
<li><strong>Consérvalas bien.</strong> Fuera del calor y, si quieres, en un presurizador (lo explicamos en <a href="/blog/conservar-bolas-padel">cómo conservar las bolas</a>).</li>
<li><strong>Usa las viejas para entrenar.</strong> Para practicar saques o volea, una bola algo gastada sirve.</li>
</ol>

<h2>Ventajas de recibir las bolas de pádel en casa</h2>
<ul>
<li><strong>No te quedas sin material</strong> justo antes de jugar.</li>
<li><strong>Ahorras tiempo:</strong> no tienes que ir a la tienda ni acordarte de pedir.</li>
<li><strong>Gasto previsible:</strong> sabes cada mes lo que pagas.</li>
<li><strong>Bolas y grips juntos:</strong> en una sola caja.</li>
</ul>

<h2>Lo que conviene comprobar</h2>
<ul>
<li><strong>Los gastos de envío</strong> y el precio final con IVA.</li>
<li><strong>Si puedes espaciar los envíos</strong> cuando juegas menos (por ejemplo, en vacaciones).</li>
<li><strong>Si hay permanencia</strong> y cómo se cancela.</li>
</ul>

<h2>Cómo lo hacemos en RALLYBOX</h2>
<p>Los packs van de 10,90 € a 19,90 € por caja, IVA incluido, y traen botes de 3 pelotas y overgrips. Puedes recibirlos cada 1, 2 o 3 meses al mismo precio por caja; el envío cuesta 2,75 € a domicilio, 2,05 € a Correos o CityPaq y es gratis en los clubs Interpàdel. No hay permanencia y se cancela desde «Mi cuenta». Puedes ${CTA_PACKS}.</p>
`,
},
{
  slug: 'conservar-bolas-padel',
  title: 'Cómo conservar las bolas de pádel para que duren más',
  description: 'Consejos para conservar las bolas de pádel en buen estado: temperatura, presurizadores, dónde guardarlas y qué evitar.',
  h1: 'Cómo conservar las bolas de pádel en buen estado',
  date: '2026-11-06',
  lead: 'Ninguna bola dura para siempre, pero cómo las guardas sí cambia cuánto aguantan con buen bote. Estos son los cuidados básicos.',
  body: `
<section class="answer"><p><strong>Respuesta rápida:</strong> guarda las bolas en un sitio fresco y seco, fuera del sol y del coche en verano, y cierra bien el bote o usa un presurizador. No abras un bote hasta que lo vayas a usar.</p></section>

<h2>Por qué pierden bote aunque no las uses</h2>
<p>Las bolas presurizadas tienen aire a presión dentro. Una vez abierto el bote, esa presión se escapa poco a poco a través de la goma, aunque no juegues. Por eso un bote abierto hace semanas no bota igual que uno recién abierto.</p>

<h2>5 cuidados que sí funcionan</h2>
<ol class="steps-list">
<li><strong>No abras el bote antes de tiempo.</strong> Los botes cerrados vienen presurizados y conservan mejor las bolas.</li>
<li><strong>Evita el calor.</strong> No las dejes en el maletero ni al sol: el calor acelera el desgaste de la goma.</li>
<li><strong>Usa un presurizador</strong> si quieres alargar algo su vida entre partidos: es un bote que mantiene presión alrededor de las bolas.</li>
<li><strong>Sécalas si se mojan</strong> y no las guardes húmedas: el fieltro se apelmaza.</li>
<li><strong>Sepáralas por uso:</strong> las nuevas para partido, las gastadas para entrenar.</li>
</ol>

<h2>Lo que no te recomendamos</h2>
<ul>
<li>Guardarlas en sitios con mucho calor o cambios bruscos de temperatura.</li>
<li>Usar bolas muy gastadas en partido: cambian el bote y castigan más el brazo por la falta de salida.</li>
</ul>

<h2>Mejor que conservar: tener siempre bolas nuevas</h2>
<p>Si prefieres no estar pendiente, en RALLYBOX te enviamos botes cerrados de 3 pelotas y overgrips cada 1, 2 o 3 meses, según elijas. Puedes ${CTA_PACKS} o ver <a href="/blog/cada-cuanto-cambiar-bolas-padel">cada cuánto conviene cambiar las bolas</a>.</p>
`,
},
{
  slug: 'accesorios-imprescindibles-padel',
  title: 'Accesorios imprescindibles para jugar al pádel: la lista básica',
  description: 'Qué accesorios necesitas para jugar al pádel: pala, bolas, overgrips, calzado, protector y lo que conviene llevar siempre en la mochila.',
  h1: 'Accesorios que necesita cualquier jugador de pádel',
  date: '2026-11-06',
  lead: 'Para jugar al pádel no hace falta mucho, pero hay unas cuantas cosas que marcan la diferencia. Esta es la lista básica, de lo imprescindible a lo recomendable.',
  body: `
<section class="answer"><p><strong>Respuesta rápida:</strong> lo imprescindible es una pala, bolas en buen estado, overgrips, calzado específico de pádel y ropa deportiva. Muy recomendables: un protector para la pala, una muñequera, agua y una mochila o paletero.</p></section>

<h2>Lo imprescindible</h2>
<ul>
<li><strong>Pala:</strong> elige según tu nivel y estilo; si empiezas, una pala de control (redonda) suele ser más fácil.</li>
<li><strong>Bolas en buen estado:</strong> con bolas gastadas el juego cambia mucho. Mira <a href="/blog/cada-cuanto-cambiar-bolas-padel">cada cuánto cambiarlas</a>.</li>
<li><strong>Overgrips:</strong> un grip que no resbala te da control y evita apretar de más. Mira <a href="/blog/cuando-cambiar-grip-pala-padel">cuándo cambiar el grip</a>.</li>
<li><strong>Zapatillas de pádel:</strong> la suela está pensada para la pista de césped artificial con arena y ayuda a evitar resbalones.</li>
<li><strong>Ropa deportiva</strong> transpirable.</li>
</ul>

<h2>Muy recomendables</h2>
<ul>
<li><strong>Protector de pala:</strong> cinta para el marco que evita golpes y desconchones.</li>
<li><strong>Muñequera o cinta para el sudor.</strong></li>
<li><strong>Botella de agua.</strong></li>
<li><strong>Paletero o mochila:</strong> para llevar pala, bolas, grips y ropa de cambio.</li>
<li><strong>Presurizador de bolas,</strong> si quieres alargar su vida (más en <a href="/blog/conservar-bolas-padel">cómo conservar las bolas</a>).</li>
</ul>

<h2>Lo que siempre debería ir en tu mochila</h2>
<p>Un bote de bolas sin abrir y un overgrip de repuesto. Son lo que más se gasta y lo que antes se olvida. Con la suscripción de RALLYBOX te llegan los dos en la misma caja, cada 1, 2 o 3 meses. Puedes ${CTA_PACKS}.</p>
`,
},
];
