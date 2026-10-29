# Stripe de PADEL DROP (MODO REAL)

Cuenta: acct_1USXZLRq7KJQz9G9 · generado 2026-10-29 con server/scripts/stripe-setup.js

| Pack | Price ID | Enlace de pago |
|---|---|---|
| Pack Básico / PADEL DROP START (8,90 €) | price_1UUnkxRq7KJQz9G9gkFvkUSX | https://buy.stripe.com/4gM14pajKf0ybkv8kKeZ209 |
| Pack Intermedio / PADEL DROP PLAYER (12,90 €) | price_1UUnkyRq7KJQz9G927JLEfJ0 | https://buy.stripe.com/6oUcN7dvW6u260bbwWeZ20a |
| Pack Premium / PADEL DROP PRO (15,90 €) | price_1UUnl0Rq7KJQz9G96YWEimIb | https://buy.stripe.com/8x228t9fG05EdsDbwWeZ20b |
| Envío a domicilio (1,95 €) | price_1UW0D4Rq7KJQz9G9cDK39Trz | (segunda línea de cada enlace a domicilio) |
| Envío a oficina/CityPaq (1,50 €) | price_1UW0D5Rq7KJQz9G9wGNOC7e4 | (segunda línea de cada enlace a oficina) |
| PADEL DROP START · oficina de Correos o CityPaq | price_1UUnkxRq7KJQz9G9gkFvkUSX | https://buy.stripe.com/fZu28tcrS2dM1JVcB0eZ20c |
| PADEL DROP PLAYER · oficina de Correos o CityPaq | price_1UUnkyRq7KJQz9G927JLEfJ0 | https://buy.stripe.com/28EdRb1Neg4CfAL9oOeZ20d |
| PADEL DROP PRO · oficina de Correos o CityPaq | price_1UUnl0Rq7KJQz9G96YWEimIb | https://buy.stripe.com/00w8wR77y2dM4W78kKeZ20e |
| PADEL DROP START · recogida en club (sin envío) | price_1UUnkxRq7KJQz9G9gkFvkUSX | https://buy.stripe.com/28EaEZajK2dMfALasSeZ206 |
| PADEL DROP PLAYER · recogida en club (sin envío) | price_1UUnkyRq7KJQz9G927JLEfJ0 | https://buy.stripe.com/5kQ14pcrS4lU3S37gGeZ207 |
| PADEL DROP PRO · recogida en club (sin envío) | price_1UUnl0Rq7KJQz9G96YWEimIb | https://buy.stripe.com/9B6fZj1Ne4lU9cn8kKeZ208 |

- Código de socio: `INTERPADEL-GUISSONA-TARREGA-GOLMES-3` (cupón INTERPADEL10, 10 % primer mes, solo clientes nuevos)
- Portal de cliente: https://billing.stripe.com/p/login/7sY28t0Ja8Ca88jgRgeZ200
- Webhook: https://www.padeldrop.net/api/stripe/webhook (checkout.session.completed, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.paid, charge.refunded)

## SQL para Supabase

```sql
UPDATE packs SET stripe_price_id = 'price_1UUnkxRq7KJQz9G9gkFvkUSX', cans = 1, grips = 2, price_cents = 890 WHERE slug = 'start';
UPDATE packs SET stripe_price_id = 'price_1UUnkyRq7KJQz9G927JLEfJ0', cans = 2, grips = 3, price_cents = 1290 WHERE slug = 'player';
UPDATE packs SET stripe_price_id = 'price_1UUnl0Rq7KJQz9G96YWEimIb', cans = 3, grips = 3, price_cents = 1590 WHERE slug = 'pro';
```
