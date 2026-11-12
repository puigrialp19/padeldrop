# Protección de datos y cumplimiento legal de RALLYBOX

Documento interno (no se publica). Actualizado el 12 de noviembre de 2026.
Responsable: **RALLYBOX, Sociedad Civil**, Avinguda Onze de Setembre, 35, 25210 Guissona (Lleida). Contacto: rallyboox@gmail.com.

## 1. Registro de actividades de tratamiento (art. 30 RGPD)

Hay que tenerlo aunque seáis pocos, porque tratáis datos de clientes de forma habitual. Este es el registro: guardadlo y actualizadlo si algo cambia.

| Actividad | Datos | Personas | Finalidad y base | Destinatarios | Conservación |
|---|---|---|---|---|---|
| Clientes y suscripciones | Nombre, correo, teléfono, direcciones, pack, cobros, envíos | Clientes | Gestionar la suscripción, cobrar y enviar (art. 6.1.b) | Stripe, Supabase, Render, Packlink, transportistas, club Interpàdel elegido | Mientras dure la suscripción; después, bloqueados 6 años (mercantil) y 4 (fiscal) |
| Facturación y contabilidad | Datos de facturación e importes | Clientes | Obligaciones fiscales y contables (art. 6.1.c) | Asesoría, Agencia Tributaria | 6 años |
| Atención al cliente | Correo, WhatsApp y lo que cuente el cliente | Clientes y personas interesadas | Responder consultas, desistimientos y reclamaciones (art. 6.1.b y c) | Google (Gmail), WhatsApp | Mientras sea necesario para la consulta |
| Asistente virtual | Preguntas sin respuesta (sin correos ni teléfonos) | Visitantes | Mejorar las respuestas (art. 6.1.f) | Cloudflare (solo si está activada la IA) | 90 días |
| Estadística de visitas | Recuento anónimo por día y origen | Visitantes | Conocer el uso de la web (art. 6.1.f) | Nadie | Sin datos personales |
| Seguridad de la web | IP y registros del servidor | Visitantes | Proteger la web (art. 6.1.f) | Render, Cloudflare | Máximo 30 días |
| Panel de gestión | Correo, IP y accesos de los socios | Socios | Seguridad del panel (art. 6.1.f) | Supabase, Render | Mientras tengan acceso |

**Medidas de seguridad:** HTTPS, contraseñas cifradas, acceso al panel solo para los socios, registro de accesos, copias de seguridad de la base de datos, claves de Stripe y Supabase solo en las variables de Render (nunca en el código).

## 2. Contratos con quien accede a datos de clientes (encargados del tratamiento, art. 28 RGPD)

| Proveedor | ¿Hay contrato? | Qué hacer |
|---|---|---|
| Stripe | Sí, incluido en sus condiciones (DPA de Stripe) | Nada |
| Supabase | Sí, su DPA se acepta desde el panel | Supabase → Organization → Legal Documents: comprueba que el DPA está aceptado (si no, se firma ahí en un clic) |
| Render | Sí, su DPA forma parte de sus condiciones | Nada |
| Cloudflare | Sí, su DPA forma parte de sus condiciones | Nada |
| Packlink | Sí, en sus condiciones generales | Nada |
| Gmail (cuenta gratuita) | **No.** Las cuentas gratuitas de Gmail no tienen contrato de encargado | Recomendado: pasar a Google Workspace (unos 7 €/mes), que sí lo incluye. Mientras tanto, usad Gmail solo para responder y no guardéis listas de clientes en el correo |
| Clubs Interpàdel (recogida) | **No** | Firmar con cada club un contrato de encargado sencillo: modelo en el apartado 4 |
| Asesoría o gestoría | Normalmente lo incluye su contrato | Pedídselo cuando la contratéis |
| Correos y transportistas | No hace falta: son responsables de su propio servicio de entrega | Nada |

## 3. Comprobación de la lista de la web

| Requisito | Estado |
|---|---|
| Aviso legal, privacidad, cookies y condiciones | Hecho (pie de todas las páginas) |
| Política de envíos, devoluciones y desistimiento, y garantía | Hecho: páginas propias en el pie (/#/envios, /#/devoluciones, /#/garantia) |
| Denominación legal, domicilio y correo | Hecho |
| **NIF de la sociedad** | **Falta.** Pone «en trámite». Hay que ponerlo en cuanto Hacienda lo asigne (multa posible si se vende sin él) |
| Precios con IVA y gastos de envío antes de pagar | Hecho (web y página de pago) |
| Plazos de entrega | Hecho (2–5 días laborables; máximo 30 días) |
| Confirmación del pedido | Stripe envía el recibo por correo: **comprobad** en Stripe → Configuración → Correos de clientes que «Pagos correctos» está activado |
| Información en soporte duradero (condiciones y formulario) | Meted en la primera caja la hoja impresa `Documents\RALLYBOX-legal\condiciones-para-la-caja.pdf` |
| Desistimiento de 14 días y formulario | Hecho |
| Garantía legal de 3 años | Hecho |
| Botón final con obligación de pago | Hecho: junto al botón de Stripe pone «Al pulsar «Suscribirse» realizas un pedido con obligación de pago» |
| Casilla para aceptar condiciones antes de pagar | Hecho |
| Banner de cookies | **No hace falta**: la web solo usa cookies técnicas y no instala ninguna cookie que requiera consentimiento. Google Maps solo se carga si el usuario pulsa el botón. Si un día añadís Google Analytics, píxel de Meta o TikTok, hay que poner antes un banner con «Aceptar», «Rechazar» y «Configurar» |
| Consentimiento para publicidad | No se envía publicidad. Si un día queréis enviar ofertas por correo, hay que pedir antes una casilla de consentimiento (no marcada) |
| Aviso de que el chat es automático (Reglamento de IA) | Hecho |
| Hojas oficiales de reclamación de la Generalitat | Informado en la web. **Tenedlas** (se descargan en consum.gencat.cat) para enviarlas si alguien las pide |
| Atención en catalán | Informado en la web. Recomendado: versión en catalán de los textos legales |
| Accesibilidad (Ley 11/2023) | No obligatoria para microempresas (menos de 10 personas y 2 M€ de facturación) |

## 4. Modelo de contrato de encargado para los clubs

> **Contrato de encargo de tratamiento de datos**
>
> En Guissona, a ___ de ________ de 20__.
>
> RALLYBOX, Sociedad Civil (NIF ________), con domicilio en Avinguda Onze de Setembre, 35, 25210 Guissona, como **responsable**, y ________________ (NIF ________), titular del club ________________, como **encargado**, acuerdan:
>
> 1. **Objeto.** El club guarda y entrega a los clientes de RALLYBOX los packs que eligen recoger en sus instalaciones. Para ello recibe el nombre del cliente (y, si hace falta, su teléfono).
> 2. **Instrucciones.** El club solo usará esos datos para entregar el pack, siguiendo las instrucciones de RALLYBOX. No los usará para otros fines ni los comunicará a nadie.
> 3. **Confidencialidad.** Las personas del club que entreguen los packs mantendrán la confidencialidad de los datos.
> 4. **Seguridad.** Guardará los packs y cualquier lista de clientes en un lugar no accesible al público.
> 5. **Subencargados.** No podrá recurrir a otros sin autorización por escrito de RALLYBOX.
> 6. **Derechos y brechas.** Avisará a RALLYBOX en un máximo de 48 horas si un cliente ejerce sus derechos ante el club o si hay una pérdida o acceso indebido a los datos.
> 7. **Fin del encargo.** Al terminar, devolverá o destruirá los datos y los packs no recogidos, según indique RALLYBOX.
> 8. **Duración.** Mientras dure la colaboración de recogida en el club.
>
> Firmado: por RALLYBOX, S.C. ____________   Por el club ____________

## 5. Qué hacer si pasa algo

- **Un cliente pide sus datos o que se borren:** responder en un máximo de 1 mes desde rallyboox@gmail.com. Si está suscrito, primero cancelad la suscripción en Stripe; los datos de facturación se conservan bloqueados los plazos legales.
- **Pérdida o robo de datos** (por ejemplo, os entran en el panel o en el correo): cambiad contraseñas y, si hay riesgo para los clientes, avisad a la AEPD en un máximo de 72 horas (sedeagpd.gob.es).
