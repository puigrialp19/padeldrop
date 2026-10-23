-- =====================================================================
-- PADEL DROP · Crear el primer ADMINISTRADOR desde el editor SQL de Supabase
-- (Alternativa a "npm run create-admin". Úsalo solo si no puedes ejecutar el comando.)
--
-- 1) Cambia el email y la contraseña de las dos líneas marcadas.
--    Contraseña: mínimo 12 caracteres, con letras y números.
-- 2) Pulsa "Run". Si el email ya existe, lo convierte en ADMIN y le cambia la contraseña.
-- 3) Después, borra esta consulta del historial del editor SQL (contiene la contraseña).
-- =====================================================================
WITH datos AS (
  SELECT lower('tu@email.com')            AS email,      -- <-- TU EMAIL
         'CAMBIA-ESTA-CONTRASEÑA-123'     AS contrasena  -- <-- TU CONTRASEÑA
)
INSERT INTO users (email, password_hash, role)
SELECT email, extensions.crypt(contrasena, extensions.gen_salt('bf', 12)), 'ADMIN'
FROM datos
ON CONFLICT (lower(email)) DO UPDATE
  SET password_hash = EXCLUDED.password_hash, role = 'ADMIN', updated_at = now();

-- Comprobación: debe aparecer tu email con role = ADMIN
SELECT id, email, role, created_at FROM users WHERE role = 'ADMIN';
