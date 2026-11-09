import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import * as KB from '../../content/asistente.mjs';
import { D, TOPICS, answer, bump, logQuestion, chatStats } from '../services/assistant.js';

// ---- Público: el chat de la web (sin cookies ni datos personales) ----
export const chatRouter = Router();

const fromOwnSite = (req) => {
  const origin = req.headers.origin;
  return origin === `${req.protocol}://${req.get('host')}` || origin === config.publicUrl;
};
const isAdmin = (req) => (req.headers.cookie || '').includes(`${config.cookieName}=`);
const BOTS = /bot|crawl|spider|slurp|headless|lighthouse|curl|wget|python|axios/i;

// Límites para que nadie pueda abusar del chat ni agotar el cupo gratuito de la IA
const msgLimiter = rateLimit({ windowMs: 60_000, limit: 15, standardHeaders: 'draft-7', legacyHeaders: false,
  message: { error: 'Vas muy rápido. Espera un momento y vuelve a escribir.' } });
const dayLimiter = rateLimit({ windowMs: 24 * 60 * 60_000, limit: 200, standardHeaders: 'draft-7', legacyHeaders: false,
  message: { error: 'Has llegado al máximo de mensajes de hoy. Si necesitas ayuda, escríbenos.' } });
const eventLimiter = rateLimit({ windowMs: 60_000, limit: 40, standardHeaders: 'draft-7', legacyHeaders: false });

chatRouter.use(express.json({ limit: '12kb' }));

// Datos iniciales del chat (bienvenida, preguntas rápidas y contacto)
chatRouter.get('/hello', (req, res) => {
  res.json({ welcome: KB.BIENVENIDA, quick: KB.RAPIDAS, whatsapp: D.whatsapp, email: D.email, waText: KB.WHATSAPP_TEXTO });
});

chatRouter.post('/', msgLimiter, dayLimiter, async (req, res, next) => {
  try {
    if (!fromOwnSite(req)) return res.status(403).json({ error: 'Origen no permitido.' });
    const message = String(req.body?.message || '').trim().slice(0, 500);
    if (!message) return res.status(400).json({ error: 'Escribe tu pregunta.' });
    // Historial para dar contexto a la IA: los últimos 8 mensajes, recortados
    const history = (Array.isArray(req.body?.history) ? req.body.history : []).slice(-8)
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m) => ({ role: m.role, content: m.content.slice(0, 600) }));
    const r = await answer(message, history, req.body?.state);

    const count = !isAdmin(req) && !BOTS.test(req.headers['user-agent'] || '');
    if (count) {
      if (req.body?.first === true) bump('conversation');
      bump('message');
      bump('topic', r.topic);
      bump('source', r.source);
      for (const c of r.cards || []) bump('pack_shown', c.id);
      if (r.topic === 'recomendar' && r.cards?.length) bump('recommended', r.cards[0].id);
      if (r.wa) bump('wa_suggested');
      if (r.source !== 'motor') logQuestion(message, r.source);
    }
    res.json({ text: r.text, cards: r.cards || [], quick: r.quick || [], wa: !!r.wa, state: r.state || {}, topic: TOPICS[r.topic] || TOPICS.otra });
  } catch (err) { next(err); }
});

// Clics dentro del chat: abrirlo, ir a un pack, WhatsApp o correo
const EVENTS = new Set(['open', 'pack_click', 'wa_click', 'email_click']);
chatRouter.post('/event', eventLimiter, (req, res) => {
  const type = String(req.body?.type || '');
  if (fromOwnSite(req) && EVENTS.has(type) && !isAdmin(req) && !BOTS.test(req.headers['user-agent'] || '')) {
    const pack = D.packs.some((p) => p.id === req.body?.pack) ? req.body.pack : '';
    bump(type, type === 'pack_click' ? pack : '');
  }
  res.status(204).end();
});

// ---- Panel (solo administradores) ----
export const chatAdminRouter = Router();
chatAdminRouter.get('/', async (req, res, next) => {
  try {
    const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
    const s = await chatStats(days);
    res.json({ ...s, topicLabels: TOPICS });
  } catch (err) { next(err); }
});
