import { Router } from 'express';
import { sql, audit } from '../db/db.js';
import { verifyPassword } from '../services/passwords.js';
import { createSession, destroySession, requireAdminApi } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/security.js';

export const authRouter = Router();

authRouter.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 254);
    const password = String(req.body?.password || '').slice(0, 200);
    const [user] = email ? await sql`SELECT id, email, role, password_hash FROM users WHERE lower(email) = ${email}` : [];

    // Siempre se ejecuta bcrypt (también si el email no existe) y el mensaje de error es el mismo.
    const ok = await verifyPassword(password, user?.password_hash);
    if (!ok || user.role !== 'ADMIN') {
      await audit(req, 'login_failed', 'user', user?.id ?? '', { email });
      return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
    }

    // Una sesión nueva en cada login (evita fijación de sesión).
    await destroySession(req, res);
    await createSession(req, res, user.id);
    req.user = { id: user.id };
    await audit(req, 'login', 'user', user.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    if (req.user) await audit(req, 'logout', 'user', req.user.id);
    await destroySession(req, res);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAdminApi, (req, res) => {
  res.json({ user: req.user });
});
