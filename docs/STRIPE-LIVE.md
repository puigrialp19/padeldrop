# Stripe de PADEL DROP (MODO REAL)

Cuenta: acct_1USXZLRq7KJQz9G9 · generado 2026-10-26 con server/scripts/stripe-setup.js

| Pack | Price ID | Enlace de pago |
|---|---|---|
| Pack Básico / PADEL DROP START (8,90 €) | price_1UUnkxRq7KJQz9G9gkFvkUSX | https://buy.stripe.com/dRm9AVdvWg4C88jfNceZ203 |
| Pack Intermedio / PADEL DROP PLAYER (12,90 €) | price_1UUnkyRq7KJQz9G927JLEfJ0 | https://buy.stripe.com/8x200l63u3hQ9cndF4eZ204 |
| Pack Premium / PADEL DROP PRO (15,90 €) | price_1UUnl0Rq7KJQz9G96YWEimIb | https://buy.stripe.com/fZu5kF9fG6u260bfNceZ205 |
| Envío mensual (0,90 €) | price_1UUnl1Rq7KJQz9G93YN79a0P | (segunda línea de cada enlace) |

- Código de socio: `INTERPADEL-GUISSONA-TARREGA-GOLMES-3` (cupón INTERPADEL10, 10 % primer mes, solo clientes nuevos)
- Portal de cliente: https://billing.stripe.com/p/login/7sY28t0Ja8Ca88jgRgeZ200
- Webhook: https://www.padeldrop.net/api/stripe/webhook (checkout.session.completed, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.paid)

## SQL para Supabase

```sql
UPDATE packs SET stripe_price_id = 'price_1UUnkxRq7KJQz9G9gkFvkUSX', cans = 1, grips = 2, price_cents = 890 WHERE slug = 'start';
UPDATE packs SET stripe_price_id = 'price_1UUnkyRq7KJQz9G927JLEfJ0', cans = 2, grips = 3, price_cents = 1290 WHERE slug = 'player';
UPDATE packs SET stripe_price_id = 'price_1UUnl0Rq7KJQz9G96YWEimIb', cans = 3, grips = 3, price_cents = 1590 WHERE slug = 'pro';
```
