// Endpoint que recibe los avisos (webhooks) de Stripe: POST /api/stripe/webhook
// Eventos a activar en Stripe: checkout.session.completed, customer.subscription.created,
// customer.subscription.updated, customer.subscription.deleted, invoice.paid
import express, { Router } from 'express';
import Stripe from 'stripe';
import { config } from '../config.js';
import { handleStripeEvent } from '../services/stripe-sync.js';

export const stripeRouter = Router();

const stripe = config.stripe.secretKey ? new Stripe(config.stripe.secretKey) : null;

stripeRouter.post('/webhook', express.raw({ type: 'application/json', limit: '1mb' }), async (req, res) => {
  if (!stripe || !config.stripe.webhookSecret) return res.status(503).json({ error: 'Stripe no está configurado en el servidor.' });
  let event;
  try {
    // La firma garantiza que el evento viene de Stripe y no de un tercero.
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], config.stripe.webhookSecret);
  } catch (err) {
    return res.status(400).send(`Firma no válida: ${err.message}`);
  }
  try {
    await handleStripeEvent(stripe, event);
    res.json({ received: true });
  } catch (err) {
    // 500 -> Stripe reintenta el evento durante 3 días; no se pierde ningún pedido.
    console.error('[stripe-webhook]', event.type, event.id, err);
    res.status(500).json({ error: 'Error procesando el evento; Stripe lo reintentará.' });
  }
});
