import { Router } from 'express';
import { audit } from '../db/db.js';
import { publicKey, saveSubscription, removeSubscription, countSubscriptions, notifyAdmins } from '../services/push.js';

export const pushRouter = Router();

pushRouter.get('/', async (req, res, next) => {
  try {
    res.json({ publicKey: publicKey(), devices: await countSubscriptions(req.user.id) });
  } catch (err) { next(err); }
});

pushRouter.post('/subscribe', async (req, res, next) => {
  try {
    await saveSubscription(req.user.id, req.body?.subscription, req.headers['user-agent']);
    await audit(req, 'push_subscribe', 'user', req.user.id);
    res.json({ ok: true });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message });
    next(err);
  }
});

pushRouter.post('/unsubscribe', async (req, res, next) => {
  try {
    await removeSubscription(req.user.id, req.body?.endpoint);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

pushRouter.post('/test', async (req, res, next) => {
  try {
    const r = await notifyAdmins({ title: '🎾 Avisos activados', body: 'Así te avisaremos cuando entre un pedido nuevo.', url: '/admin/#/pedidos', tag: 'pd-test' }, req.user.id);
    if (!r.sent) return res.status(502).json({ error: 'No se ha podido enviar la notificación a ningún dispositivo.' });
    res.json(r);
  } catch (err) { next(err); }
});
