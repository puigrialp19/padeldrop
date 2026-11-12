// BASE DE CONOCIMIENTO DEL ASISTENTE VIRTUAL DE RALLYBOX
// ----------------------------------------------------------------------------------------------
// Aquí están los textos del asistente y las palabras con las que reconoce cada pregunta.
// Los PRECIOS, packs, envíos, clubs y el número de WhatsApp NO se escriben aquí: se leen solos de
// public/js/config.js, public/js/links.js y content/site.mjs, así que el chat siempre dice lo mismo que la web.
//
// Para cambiar una respuesta, edita su texto. Para que reconozca una forma nueva de preguntar, añade
// palabras en "frases" (expresiones de varias palabras, cuentan más) o en "palabras" (sueltas).
// Escribe en minúsculas y sin acentos: el asistente ya quita acentos y entiende pequeñas faltas.
// Si alguien pregunta algo que no está aquí, responde la IA gratuita con esta misma información
// y, si tampoco lo sabe, ofrece WhatsApp (o el correo).

export const BIENVENIDA = '¡Hola! 👋 Soy el asistente virtual de RALLYBOX: un asistente automático, no una persona. Estoy aquí para ayudarte con cualquier duda sobre nuestras suscripciones, packs y envíos. ¿En qué puedo ayudarte?';

export const RAPIDAS = [
  '¿Cómo funciona RALLYBOX?',
  '¿Qué incluye cada pack?',
  '¿Qué suscripción me recomiendas?',
  '¿Cuánto cuesta el envío?',
  '¿Cómo puedo cancelar mi suscripción?',
  'Quiero hablar con vosotros',
];

// Texto que se envía por WhatsApp (se añade debajo un resumen de lo que ha preguntado el cliente).
export const WHATSAPP_TEXTO = '¡Hola! Estaba hablando con el asistente virtual de RALLYBOX y necesito ayuda con una consulta.';

// Respuesta cuando no sabe algo.
export const NO_SE = 'Eso no lo tengo confirmado en la información de la web y prefiero no inventármelo. Te lo resuelve mejor una persona del equipo:';

// Los packs también se reconocen por estos nombres.
export const ALIAS_PACKS = {
  start: ['start', 'starter', 'basico', 'pequeno'],
  player: ['player', 'plaier', 'intermedio', 'mediano'],
  pro: ['pro'],
};

const eur = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
const lista = (a, y = ' y ') => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + y + a[a.length - 1];
const freqTxt = (D) => lista(D.freqs.map((m) => (m === 1 ? 'cada mes' : `cada ${m} meses`)), ' o ');
const packLine = (p) => `**${p.short}** (${eur(p.price)}): ${p.cans} ${p.cans > 1 ? 'botes' : 'bote'} de 3 pelotas y ${p.grips} overgrips`;

// Cada intención: id (para las estadísticas), frases y palabras que la activan, y la respuesta.
// «menos»: si aparecen estas palabras y no se nombra ningún pack, la intención pierde fuerza (así «¿cuánto cuesta el envío?» no se confunde con el precio de los packs).
// Las palabras que empiezan por ~ cuentan poco (solas no bastan: por ejemplo «pack» o «caja»).
// La respuesta recibe D (datos reales de la web) y ctx (pack del que se habla, si hay uno).
// Puede devolver: text, pack (muestra la tarjeta de ese pack), packs (las tres), quick (botones), wa (sugerir WhatsApp).
export const INTENCIONES = [
  {
    id: 'saludo', frases: ['buenos dias', 'buenas tardes', 'buenas noches'], palabras: ['hola', 'buenas', 'hey', 'ey', 'holi', 'saludos'],
    soloSiNada: true,
    r: () => ({ text: '¡Hola! ¿En qué te ayudo? Puedo explicarte los packs y los envíos, o recomendarte el pack que mejor te va.', quick: ['¿Qué incluye cada pack?', '¿Qué suscripción me recomiendas?'] }),
  },
  {
    id: 'que_es', frases: ['que es rallybox', 'que es rally box', 'que es padel drop', 'que es padeldrop', 'que sois', 'que haceis', 'quienes sois', 'de que va', 'que vendeis', 'que es esto'],
    palabras: [],
    r: (D) => ({ text: `RALLYBOX es una suscripción de pelotas y overgrips de pádel: eliges un pack y te lo enviamos ${freqTxt(D)}, a casa, a una oficina de Correos o CityPaq, o para recoger gratis en los clubs ${lista(D.clubs.map((c) => c.short))}. Sin permanencia.`, quick: ['¿Qué incluye cada pack?', '¿Qué suscripción me recomiendas?'] }),
  },
  {
    id: 'funciona', frases: ['como funciona', 'como va esto', 'como va la suscripcion', 'funcionamiento', 'como se pide', 'como pido', 'como compro', 'como me suscribo', 'como contrato', 'quiero suscribirme', 'quiero contratar'],
    palabras: ['funciona', 'suscribirme', 'contratar', 'comprar'],
    r: (D) => ({ text: `Es muy fácil:\n1. Eliges tu pack (START, PLAYER o PRO) y cada cuánto lo quieres: ${freqTxt(D)}.\n2. Eliges cómo recibirlo (casa, Correos/CityPaq o tu club Interpàdel) y pagas de forma segura con Stripe.\n3. Te llega la primera caja y las siguientes después de cada cobro. Sin permanencia: puedes pausar o cancelar cuando quieras (como mínimo 3 días antes del siguiente cobro).`, quick: ['¿Qué incluye cada pack?', '¿Qué suscripción me recomiendas?', '¿Cuánto cuesta el envío?'] }),
  },
  {
    id: 'contenido', frases: ['que incluye', 'que trae', 'que lleva', 'que tiene', 'que viene', 'que contiene', 'que hay en', 'diferencia entre', 'diferencias entre', 'que diferencia', 'cada pack', 'los packs', 'los planes'],
    palabras: ['incluye', 'contenido', 'contiene', 'diferencia', 'diferencias', '~packs', '~planes', '~pack', '~plan', 'overgrips', 'overgrip', 'grips', 'grip', '~caja'],
    packAware: true,
    r: (D, ctx) => ctx.pack
      ? { text: `El ${packLine(ctx.pack)} en cada caja, IVA incluido. ${ctx.pack.who ? ctx.pack.who + '.' : ''}`, pack: ctx.pack.id }
      : { text: `Cada caja lleva botes de pelotas (3 pelotas por bote) y overgrips:\n• ${D.packs.map(packLine).join('\n• ')}\nPrecios por caja con IVA incluido; el envío va aparte según cómo la recibas.`, packs: true, quick: ['¿Qué suscripción me recomiendas?', '¿Cuánto cuesta el envío?'] },
  },
  {
    id: 'precio', frases: ['cuanto cuesta', 'cuanto vale', 'cuanto sale', 'cuanto es', 'que precio', 'cuanto me cuesta', 'cuanto cuestan', 'cuanto valen'],
    palabras: ['precio', 'precios', 'cuesta', 'cuestan', 'coste', 'tarifa', 'tarifas', 'barato', 'caro', 'euros'],
    packAware: true, menos: ['envio', 'envios', 'portes', 'transporte', 'iva', 'impuestos'],
    r: (D, ctx) => {
      if (!ctx.pack) return { text: `Precio por caja, IVA incluido:\n• ${D.packs.map((p) => `${p.short}: ${eur(p.price)}`).join('\n• ')}\nEs el mismo precio si lo recibes cada mes, cada 2 o cada 3 meses. El envío se suma aparte: ${eur(D.ship.home)} a domicilio, ${eur(D.ship.office)} a Correos/CityPaq o gratis en tu club Interpàdel.`, packs: true, quick: ['¿Qué incluye cada pack?', '¿Qué suscripción me recomiendas?'] };
      const p = ctx.pack, d = ctx.delivery;
      const total = d ? ` Con ${d === 'club' ? 'recogida gratis en tu club' : d === 'home' ? `envío a domicilio (${eur(D.ship.home)})` : `envío a Correos/CityPaq (${eur(D.ship.office)})`} serían **${eur(p.price + (d === 'club' ? 0 : D.ship[d]))}** por caja.` : ` El envío va aparte: ${eur(D.ship.home)} a domicilio, ${eur(D.ship.office)} a Correos/CityPaq o gratis en tu club Interpàdel.`;
      return { text: `El **${p.short}** cuesta **${eur(p.price)}** por caja, IVA incluido (${p.cans} ${p.cans > 1 ? 'botes' : 'bote'} de 3 pelotas y ${p.grips} overgrips).${total}`, pack: p.id };
    },
  },
  {
    id: 'recomendar', frases: ['que pack', 'que plan', 'cual me', 'cual elijo', 'cual escojo', 'cual es mejor', 'cual me conviene', 'me conviene', 'que me recomiendas', 'que suscripcion', 'cual pido', 'no se cual', 'ayudame a elegir'],
    palabras: ['recomiendas', 'recomienda', 'recomendacion', 'recomendar', 'aconsejas', 'conviene', 'elegir', 'escoger'],
    flujo: true,
  },
  {
    id: 'envio_coste', frases: ['llega a casa', 'recibir en casa', 'recibirlo en casa', 'enviar a casa', 'enviais a casa', 'gastos de envio', 'coste de envio', 'coste del envio', 'precio del envio', 'cuesta el envio', 'cuanto cuesta enviar', 'envio gratis', 'envio incluido'],
    palabras: ['envio', 'envios', 'portes', 'transporte', '~enviais', '~mandais', '~domicilio', '~casa'],
    r: (D) => ({ text: `El envío depende de cómo recibas la caja (por caja, IVA incluido):\n• A domicilio: ${eur(D.ship.home)}\n• Oficina de Correos o CityPaq: ${eur(D.ship.office)}\n• Recogida en tu club Interpàdel (${lista(D.clubs.map((c) => c.short))}): gratis\nSe suma al pack en el pago y se cobra en cada renovación. Enviamos a la España peninsular.` }),
  },
  {
    id: 'envio_plazo', frases: ['cuanto tarda', 'cuanto tardais', 'cuando llega', 'cuando me llega', 'cuando envias', 'cuando enviais', 'cuando se envia', 'cuando recibo', 'numero de seguimiento', 'en cuantos dias'],
    palabras: ['tarda', 'tardais', 'plazo', 'seguimiento', '~llega', '~recibo', 'entrega'],
    r: () => ({ text: 'El primer pack se prepara tras el pago y los siguientes, tras cada cobro. La entrega suele tardar de 2 a 5 días laborables desde el envío y te damos el número de seguimiento.' }),
  },
  {
    id: 'zona', frases: ['fuera de espana', 'islas canarias', 'islas baleares', 'a portugal', 'a francia', 'a andorra'],
    palabras: ['canarias', 'baleares', 'mallorca', 'menorca', 'ibiza', 'tenerife', 'ceuta', 'melilla', 'portugal', 'francia', 'andorra', 'internacional', 'extranjero', 'islas'],
    r: (D) => ({ text: `De momento solo enviamos a la España peninsular. Si indicas una dirección de Baleares, Canarias, Ceuta o Melilla te contactaremos y, si no es posible enviar, cancelamos la suscripción y te devolvemos el importe íntegro.` }),
  },
  {
    id: 'club', frases: ['recoger en el club', 'recogida en club', 'recoger en club', 'en mi club'],
    palabras: ['club', 'clubs', 'clubes', 'recoger', 'recogida', 'interpadel', 'guissona', 'tarrega', 'golmes'],
    r: (D) => ({ text: `Puedes recoger tu caja gratis (sin gastos de envío) en estos clubs:\n• ${D.clubs.map((c) => `${c.name}: ${c.address}`).join('\n• ')}\nEliges el club al pagar.${D.interpadel ? ' Si eres socio de Interpàdel, además tienes un descuento: pregúntame por él.' : ''}` }),
  },
  {
    id: 'correos', frases: ['oficina de correos', 'punto de recogida'],
    palabras: ['correos', 'citypaq', 'locker', '~oficina'],
    r: (D) => ({ text: `Con la opción de oficina de Correos o CityPaq (${eur(D.ship.office)} por caja) indicas al pagar la oficina o el locker que prefieras; si no indicas ninguno, va al más cercano a tu dirección. Correos te avisa cuando está disponible y tienes el plazo de recogida que indique Correos.` }),
  },
  {
    id: 'frecuencia', frases: ['elegir cada cuanto', 'cada cuanto', 'cada mes', 'cada dos meses', 'cada 2 meses', 'cada tres meses', 'cada 3 meses', 'con que frecuencia'],
    palabras: ['frecuencia', 'mensual', 'bimensual', 'trimestral', 'periodicidad'],
    r: (D) => ({ text: `Tú eliges cada cuánto recibes la caja: ${freqTxt(D)}. El precio por caja es el mismo en todos los casos; solo cambia cada cuánto se envía y se cobra. Para cambiarla más adelante, escríbenos como mínimo 3 días antes del siguiente cobro.` }),
  },
  {
    id: 'cancelar', frases: ['dar de baja', 'darme de baja', 'dar la baja', 'como cancelo', 'quiero cancelar', 'cancelar la suscripcion', 'cancelar mi suscripcion'],
    palabras: ['cancelar', 'cancelo', 'cancelacion', 'baja', 'anular', 'desuscribir'],
    r: (D) => ({ text: `Puedes cancelar cuando quieras, sin coste ni permanencia, como mínimo 3 días antes del siguiente cobro:\n• Desde «Mi cuenta» (el portal de cliente de Stripe, entrando con el correo de tu suscripción): ${D.portal}\n• O escribiendo a ${D.email}` }),
  },
  {
    id: 'pausar', frases: ['pausar la suscripcion', 'me voy de vacaciones', 'parar unos meses', 'saltar un mes', 'saltarme un mes'],
    palabras: ['pausar', 'pausa', 'vacaciones', 'parar', 'congelar', 'lesion', 'lesionado'],
    r: (D) => ({ text: `Sí, puedes pausar la suscripción sin coste. Escríbenos a ${D.email} como mínimo 3 días antes del siguiente cobro y te la pausamos.`, wa: true }),
  },
  {
    id: 'cambiar_plan', frases: ['cambiar al', 'cambiarme al', 'pasarme al', 'cambiar a', 'cambiar de pack', 'cambiar de plan', 'cambiar el pack', 'cambiar el plan', 'cambiar mi pack', 'pasar al', 'subir de pack', 'bajar de pack', 'otro pack'],
    palabras: ['cambiar', 'cambiarme', 'cambio'],
    r: (D) => ({ text: `Sí, puedes cambiar de pack. Escríbenos a ${D.email} como mínimo 3 días antes de tu próximo cobro y el nuevo pack se aplica desde ese cobro.`, wa: true }),
  },
  {
    id: 'permanencia', frases: ['sin permanencia', 'hay permanencia', 'tiempo minimo'],
    palabras: ['permanencia', 'compromiso', 'atado', '~minimo'],
    r: () => ({ text: 'No hay permanencia. Puedes pausar o cancelar cuando quieras, sin coste, siempre como mínimo 3 días antes del siguiente cobro.' }),
  },
  {
    id: 'pago', frases: ['como se paga', 'como pago', 'forma de pago', 'formas de pago', 'metodo de pago', 'metodos de pago', 'cuando me cobrais', 'cuando se cobra', 'cambiar la tarjeta', 'cambiar tarjeta'],
    palabras: ['pago', 'pagos', 'pagar', 'tarjeta', 'stripe', 'cobro', 'cobrais', 'cobran', 'renueva', 'renovacion', 'bizum', 'paypal', 'domiciliacion'],
    r: (D) => ({ text: `El pago se hace en la página segura de Stripe (nosotros nunca vemos tu tarjeta) y siempre ves el importe antes de confirmar. La suscripción se renueva sola con la frecuencia que elijas y por el mismo importe hasta que la canceles. Puedes revisar o cambiar tu método de pago desde «Mi cuenta»: ${D.portal}` }),
  },
  {
    id: 'iva', frases: ['incluye iva', 'iva incluido', 'con iva'],
    palabras: ['iva', 'impuestos'],
    r: () => ({ text: 'Sí, todos los precios llevan el IVA incluido, también los gastos de envío.' }),
  },
  {
    id: 'descuento', frases: ['codigo de interpadel', 'descuento de interpadel', 'socio de interpadel', 'codigo de descuento', 'codigo promocional', 'hay descuento', 'algun descuento', 'alguna oferta'],
    palabras: ['descuento', 'descuentos', 'codigo', 'cupon', 'promocion', 'promo', 'oferta', 'ofertas', 'rebaja'],
    r: (D) => ({ text: D.interpadel
      ? `Ahora mismo el único descuento que tenemos es para socios de Interpàdel: ${D.interpadel.charAt(0).toLowerCase() + D.interpadel.slice(1)}`
      : 'Ahora mismo no tenemos ningún descuento ni promoción activos.' }),
  },
  {
    id: 'devolucion', frases: ['derecho de desistimiento', 'devolver el pedido', 'no me gusta', 'quiero devolver'],
    palabras: ['devolver', 'devolucion', 'desistimiento', 'desistir', 'reembolso'],
    r: (D) => ({ text: `Tienes 14 días naturales para desistir desde que recibes el primer pack. Por higiene, solo se pueden devolver los botes de pelotas sin abrir y los overgrips con su precinto. Los gastos de la devolución corren a tu cargo y te reembolsamos lo pagado en un máximo de 14 días. Para hacerlo, escríbenos a ${D.email}. Tienes todos los detalles en las condiciones: ${D.site}/#/condiciones` }),
  },
  {
    id: 'incidencia', frases: ['no me ha llegado', 'no ha llegado', 'no llega', 'llego roto', 'ha llegado mal', 'llego mal', 'mal estado', 'mi pedido', 'problema con'],
    palabras: ['roto', 'rota', 'danado', 'danada', 'incidencia', 'retraso', 'retrasado', 'perdido', 'equivocado', 'reclamacion', '~problema'],
    r: (D) => ({ text: `Siento el problema. Escríbenos con tu número de pedido (y una foto si ha llegado dañado) y lo resolvemos: te lo reenviamos o te devolvemos el importe. Lo más rápido es hablar con una persona del equipo:`, wa: true }),
  },
  {
    id: 'humano', frases: ['hablar con una persona', 'hablar con alguien', 'hablar con vosotros', 'quiero hablar', 'atencion al cliente', 'contactar con vosotros', 'numero de telefono', 'una persona real'],
    palabras: ['~persona', 'humano', 'agente', 'whatsapp', 'telefono', 'llamar', 'contacto', 'contactar', 'email', '~correo'],
    r: () => ({ text: '¡Claro! Te atiende una persona del equipo:', wa: true }),
  },
  {
    id: 'cuenta', frases: ['mi cuenta', 'cambiar la direccion', 'cambiar mi direccion', 'cambiar de direccion', 'ver mis pedidos', 'mis facturas'],
    palabras: ['~cuenta', 'portal', 'direccion', 'acceder', 'contrasena'],
    r: (D) => ({ text: `En «Mi cuenta» (el portal de cliente de Stripe) entras con el correo de tu suscripción, sin contraseña, y puedes ver tus pagos, cambiar el método de pago o cancelar: ${D.portal}\nPara cambiar la dirección de envío o cualquier otra cosa, escríbenos a ${D.email}.` }),
  },
  {
    id: 'pelotas', frases: ['cuantas pelotas', 'pelotas por bote', 'pelotas trae', 'bolas por bote', 'cuantas bolas'],
    palabras: [],
    r: (D) => ({ text: `Cada bote trae 3 pelotas de pádel. Así, el START lleva 3 pelotas, el PLAYER 6 y el PRO 9, además de los overgrips.` }),
  },
  {
    id: 'marca', frases: ['que marca', 'de que marca', 'que pelotas son', 'que bolas son', 'que modelo'],
    palabras: ['marca', 'marcas', 'modelo', 'head', 'bullpadel', 'wilson', 'babolat', 'dunlop', 'adidas', 'nox', 'siux'],
    r: () => ({ text: 'La marca y el modelo de las pelotas y los overgrips no aparecen en la web, así que no te lo quiero decir sin estar seguro. Pregúntalo directamente al equipo:', wa: true }),
  },
  {
    id: 'gracias', frases: ['muchas gracias', 'vale gracias', 'ok gracias'],
    palabras: ['gracias', 'genial', 'perfecto', 'guay', 'thanks'],
    soloSiNada: true,
    r: () => ({ text: '¡A ti! Si te surge cualquier otra duda, aquí estoy. 🎾' }),
  },
  {
    id: 'adios', frases: ['hasta luego', 'nos vemos'], palabras: ['adios', 'chao', 'agur'],
    soloSiNada: true,
    r: () => ({ text: '¡Hasta pronto! Que vaya genial en la pista. 🎾' }),
  },
];

// RECOMENDADOR. Cálculo: el pack START (1 bote al mes) está pensado para 1 partido a la semana, así que
// se estima 1 bote al mes por cada partido semanal si pones tú las pelotas, y la mitad si os turnáis.
export const RECOMENDADOR = {
  p1: { text: '¡Vamos a ello! Te hago 3 preguntas rápidas. ¿Cuántas veces juegas a pádel a la semana?', quick: ['1 vez o menos', '2 veces', '3 o más'] },
  p2: { text: '¿Sueles poner tú las pelotas o os turnáis entre los jugadores?', quick: ['Las pongo yo', 'Nos turnamos'] },
  p3: { text: 'Última: ¿cuántos botes de pelotas sueles gastar al mes, más o menos?', quick: ['1 o menos', '2', '3 o más', 'No lo sé'] },
};
