# PADEL DROP: web + panel de administración

Web de suscripción mensual de pelotas y grips de pádel (`public/`, el diseño de siempre, sin cambios)
y panel privado `/admin` para gestionar ventas, clientes y envíos.

## Tecnología

| Capa | Elección | Por qué |
|---|---|---|
| Servidor | **Node.js 20.12+ y Express** | Un único proceso sirve la web, el panel y la API. |
| Base de datos | **PostgreSQL**: **Supabase** en producción; **PGlite** (PostgreSQL embebido) en local | Datos gestionados y con copias en la nube; en local no hace falta instalar nada (`DATABASE_URL=pglite`). |
| Panel | **HTML + JS (módulos ES) + Tailwind CSS v4** | Igual que la web: sin framework. Tailwind se compila a `admin/css/admin.css`. |
| Gráficos | SVG propio (`admin/js/charts.js`) | Sin librerías externas, compatible con la CSP estricta. |
| Pagos | Stripe Payment Links + **webhook** | Stripe cobra; el webhook crea clientes, suscripciones y pedidos en la base de datos. |

## Estructura

```
padel-drop/
├── public/                     WEB PÚBLICA (index.html, css/, js/, assets/)
├── admin/                      PANEL /admin
│   ├── login.html · index.html
│   ├── css/admin.css           Generado por Tailwind (no editar a mano)
│   └── js/                     app.js (router) · api.js · ui.js · charts.js · login.js · views/
├── server/                     BACKEND
│   ├── index.js                Arranque: rutas, seguridad, archivos estáticos, /healthz
│   ├── config.js               Lee .env.local
│   ├── db/schema.sql           ESQUEMA COMPLETO (el mismo que se pega en Supabase)
│   ├── db/create-admin.sql     Alternativa SQL para crear el primer administrador en Supabase
│   ├── db/db.js                Conexión a PostgreSQL (Supabase o PGlite local)
│   ├── middleware/             auth.js (sesiones, requireAdmin) · security.js (CSP, límites, CSRF)
│   ├── routes/                 auth · metrics · customers · orders · stripe-webhook
│   ├── services/               metrics.js (MRR, churn) · csv.js · passwords.js
│   └── scripts/                init-db.js · seed.js (datos ficticios) · create-admin.js
├── tailwind/admin.css          Entrada de Tailwind (colores de marca)
├── data/                       Base de datos local PGlite (no se sube a git)
├── legacy/ · docs/
├── .env.local.example          PLANTILLA de variables de entorno
└── package.json
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm install` | Instala dependencias |
| `npm run db:init` | Crea tablas y los 3 packs en la base de datos de `DATABASE_URL` (se puede repetir sin riesgo) |
| `npm run db:seed` | 170 clientes ficticios para probar el panel (`-- --reset` para regenerarlos) |
| `npm run db:clear-demo` | Borra los clientes ficticios (nunca toca admins ni clientes de Stripe) |
| `npm run create-admin -- tu@email.com` | Crea un administrador o cambia su contraseña |
| `npm run dev` | Arranca en local y se reinicia al cambiar código |
| `npm start` | Arranca (producción) |
| `npm run build` | Compila el CSS del panel (Tailwind) |

Con `DATABASE_URL=pglite` solo un proceso puede usar la base de datos local a la vez:
para el servidor (Ctrl+C) antes de ejecutar `db:init`, `db:seed` o `create-admin`.

## Base de datos

```
users ──< subscriptions >── packs
  │             │             │
  └──────< orders >───────────┘
users ──< sessions          users ──< audit_log
```

| Tabla | Contenido clave |
|---|---|
| `users` | email, `password_hash` (bcrypt), **`role` ADMIN o CUSTOMER**, nombre, apellidos, teléfono, dirección de envío desglosada, `stripe_customer_id` |
| `packs` | Básico = START (1 bote + 2 grips, 8,90 €) · Intermedio = PLAYER (2 botes + 3 grips, 12,90 €) · Premium = PRO (3 botes + 3 grips, 15,90 €) · envío 0,90 €/mes · **`stripe_price_id`** |
| `subscriptions` | usuario, pack, **estado `active`/`paused`/`canceled`**, precio, alta, **`current_period_end` (próximo cobro)**, pausa y baja |
| `orders` | envío mensual: periodo `AAAA-MM`, importes, **estado `pending`/`shipped`/`delivered`**, transportista, **nº de seguimiento**, copia de la dirección |
| `sessions` · `audit_log` | sesiones del panel (solo hash del token) y registro de acciones de los administradores |

Importes en céntimos; meses contados en hora de España (`Europe/Madrid`). En Supabase todas las tablas tienen
**RLS activado sin políticas**: la API pública de Supabase no puede leerlas; solo el servidor.

## Seguridad del panel

- Solo `role = 'ADMIN'` puede entrar; páginas y API se comprueban **en el servidor**.
- Contraseñas con bcrypt (coste 12); mismo mensaje y tiempo si el email no existe; **5 intentos** cada 15 min.
- Cookie de sesión `HttpOnly` + `SameSite=Strict` (+ `Secure` y `__Host-` en producción); caduca tras 8 h sin uso.
- Protección CSRF por origen, CSP estricta, `no-store`, `noindex`, CSV sin inyección de fórmulas y auditoría (RGPD).
- Solo se sirven `public/` y `admin/`: el código, `.env.local` y la base de datos no son accesibles.

## Puesta en marcha

Guía paso a paso por etapas: 1) local, 2) Supabase y administrador, 3) Stripe, 4) producción y dominio, 5) prueba de compra.
Etapa 1 en resumen:

```powershell
npm install
Copy-Item .env.local.example .env.local
npm run db:init
npm run create-admin -- tu@email.com
npm run dev
```

Abre http://localhost:3000 (web) y http://localhost:3000/admin (panel).

## Publicación (Render)

- `render.yaml` define el servidor: región Frankfurt, plan Starter, `npm ci --omit=dev`, `npm start`, comprobación `/healthz`.
- Variables en Render: `DATABASE_URL` (Supabase, Session pooler), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
  `PUBLIC_URL` solo hace falta con dominio propio (sin él se usa la dirección de Render).
- Webhook de Stripe en producción: `https://TU-DIRECCION/api/stripe/webhook` con los eventos
  `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`,
  `customer.subscription.deleted` e `invoice.paid`.
- Cada `git push` a GitHub publica la nueva versión automáticamente.

## Qué se edita y dónde

- Precios y textos de la web: `public/js/config.js` y `public/index.html`. **Si cambias un precio o un Price ID, cámbialo también en la tabla `packs`.**
- Colores del panel: variables `--pd-*` en `tailwind/admin.css` (después, `npm run build`).
