import { Router } from 'express';
import { getDashboard, MONTH_RE, currentMonth } from '../services/metrics.js';

export const metricsRouter = Router();

metricsRouter.get('/', async (req, res, next) => {
  try {
    const month = MONTH_RE.test(req.query.month) ? req.query.month : currentMonth();
    if (month > currentMonth()) return res.status(400).json({ error: 'No hay datos de meses futuros.' });
    res.json(await getDashboard(month));
  } catch (err) {
    next(err);
  }
});
