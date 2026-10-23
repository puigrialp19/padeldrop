-- =====================================================================
-- PADEL DROP · Esquema de base de datos (PostgreSQL / Supabase)
-- Se puede ejecutar varias veces sin romper nada (IF NOT EXISTS / ON CONFLICT).
-- Importes en céntimos (integer). Fechas con zona horaria (timestamptz).
-- =====================================================================

-- ---------- Personas: clientes y administradores ----------
CREATE TABLE IF NOT EXISTS users (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email               text        NOT NULL,
  password_hash       text,                                   -- NULL para clientes (compran por Stripe)
  role                text        NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('ADMIN', 'CUSTOMER')),
  first_name          text        NOT NULL DEFAULT '',
  last_name           text        NOT NULL DEFAULT '',
  phone               text        NOT NULL DEFAULT '',
  street              text        NOT NULL DEFAULT '',
  street_number       text        NOT NULL DEFAULT '',
  floor_door          text        NOT NULL DEFAULT '',        -- piso / puerta
  postal_code         text        NOT NULL DEFAULT '',
  city                text        NOT NULL DEFAULT '',
  province            text        NOT NULL DEFAULT '',
  country             text        NOT NULL DEFAULT 'ES',
  stripe_customer_id  text        UNIQUE,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
-- Email único sin distinguir mayúsculas/minúsculas
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (lower(email));

-- ---------- Catálogo de packs ----------
CREATE TABLE IF NOT EXISTS packs (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug             text    NOT NULL UNIQUE,                  -- start | player | pro
  name             text    NOT NULL,                         -- Pack Básico / Intermedio / Premium
  commercial_name  text    NOT NULL,                         -- PADEL DROP START / PLAYER / PRO
  cans             integer NOT NULL,                         -- botes de pelotas al mes
  grips            integer NOT NULL,                         -- overgrips al mes
  price_cents      integer NOT NULL,
  stripe_price_id  text    UNIQUE,
  sort_order       integer NOT NULL DEFAULT 0,
  active           boolean NOT NULL DEFAULT true
);

-- ---------- Suscripciones (una fila por alta) ----------
CREATE TABLE IF NOT EXISTS subscriptions (
  id                      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id                 bigint      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pack_id                 bigint      NOT NULL REFERENCES packs(id),
  status                  text        NOT NULL CHECK (status IN ('active', 'paused', 'canceled')),
  price_cents             integer     NOT NULL,
  started_at              timestamptz NOT NULL,
  current_period_end      timestamptz,                       -- próxima renovación / cobro
  paused_at               timestamptz,
  canceled_at             timestamptz,
  stripe_subscription_id  text        UNIQUE,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscriptions_user_idx   ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions (status);

-- ---------- Pedidos: un envío mensual cobrado ----------
CREATE TABLE IF NOT EXISTS orders (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id            bigint      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id    bigint      REFERENCES subscriptions(id) ON DELETE SET NULL,
  pack_id            bigint      NOT NULL REFERENCES packs(id),
  period             text        NOT NULL CHECK (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),  -- 'AAAA-MM'
  amount_cents       integer     NOT NULL,                   -- pack cobrado (con descuentos)
  shipping_cents     integer     NOT NULL DEFAULT 0,
  status             text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'shipped', 'delivered')),
  carrier            text        NOT NULL DEFAULT '',
  tracking_number    text        NOT NULL DEFAULT '',
  -- Copia de la dirección en el momento del pedido
  ship_name          text        NOT NULL DEFAULT '',
  ship_phone         text        NOT NULL DEFAULT '',
  ship_street        text        NOT NULL DEFAULT '',
  ship_number        text        NOT NULL DEFAULT '',
  ship_floor_door    text        NOT NULL DEFAULT '',
  ship_postal_code   text        NOT NULL DEFAULT '',
  ship_city          text        NOT NULL DEFAULT '',
  ship_province      text        NOT NULL DEFAULT '',
  ship_country       text        NOT NULL DEFAULT 'ES',
  paid_at            timestamptz NOT NULL,
  shipped_at         timestamptz,
  delivered_at       timestamptz,
  stripe_invoice_id  text        UNIQUE,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_period_idx ON orders (period);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);
CREATE INDEX IF NOT EXISTS orders_user_idx   ON orders (user_id);

-- ---------- Sesiones del panel (solo el hash del token) ----------
CREATE TABLE IF NOT EXISTS sessions (
  token_hash  text PRIMARY KEY,
  user_id     bigint      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL,
  ip          text        NOT NULL DEFAULT '',
  user_agent  text        NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);

-- ---------- Registro de acciones de administradores ----------
CREATE TABLE IF NOT EXISTS audit_log (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     bigint REFERENCES users(id) ON DELETE SET NULL,
  action      text   NOT NULL,
  entity      text   NOT NULL DEFAULT '',
  entity_id   text   NOT NULL DEFAULT '',
  details     text   NOT NULL DEFAULT '',
  ip          text   NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------- Seguridad en Supabase ----------
-- Supabase publica las tablas por su API REST. Activando RLS sin ninguna política,
-- NADIE puede leerlas desde esa API; solo nuestro servidor (que entra como "postgres").
ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE packs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log     ENABLE ROW LEVEL SECURITY;

-- ---------- Los 3 packs de PADEL DROP ----------
-- Price IDs de Stripe en MODO PRUEBAS. En la Etapa 3 se sustituyen por los de modo real.
INSERT INTO packs (slug, name, commercial_name, cans, grips, price_cents, stripe_price_id, sort_order) VALUES
  ('start',  'Pack Básico',     'PADEL DROP START',  2, 2, 1190, 'price_1UTR6WRq7KJQz9G9XnGJvUvf', 1),
  ('player', 'Pack Intermedio', 'PADEL DROP PLAYER', 3, 3, 1590, 'price_1UTR6ZRq7KJQz9G9LsL75KUQ', 2),
  ('pro',    'Pack Premium',    'PADEL DROP PRO',    5, 5, 2390, 'price_1UTR6bRq7KJQz9G9dnELxvRj', 3)
ON CONFLICT (slug) DO NOTHING;
