# Stripe de PADEL DROP (MODO REAL)

Cuenta: acct_1USXZLRq7KJQz9G9 · generado 2026-10-24 con server/scripts/stripe-setup.js

| Pack | Price ID | Enlace de pago |
|---|---|---|
| Pack Básico / PADEL DROP START (11,90 €) | price_1UU1exRq7KJQz9G9at3D9bA3 | https://buy.stripe.com/7sY28t0Ja8Ca88jgRgeZ200 |
| Pack Intermedio / PADEL DROP PLAYER (15,90 €) | price_1UU1eyRq7KJQz9G9mQwP3cTk | https://buy.stripe.com/cNifZj4Zq9Ge3S36cCeZ201 |
| Pack Premium / PADEL DROP PRO (23,90 €) | price_1UU1ewRq7KJQz9G9E4sd7Gpj | https://buy.stripe.com/bJe4gB63u9Ge9cn9oOeZ202 |
| Envío mensual (3,50 €) | price_1UU1eyRq7KJQz9G9l2YDDjWF | (segunda línea de cada enlace) |

- Código de socio: `INTERPADEL-GUISSONA-TARREGA-GOLMES-3` (cupón INTERPADEL10, 10 % primer mes, solo clientes nuevos)
- Portal de cliente: https://billing.stripe.com/p/login/7sY28t0Ja8Ca88jgRgeZ200
- Webhook: https://padel-drop.onrender.com/api/stripe/webhook (checkout.session.completed, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.paid)

## SQL para Supabase

```sql
UPDATE packs SET stripe_price_id = 'price_1UU1exRq7KJQz9G9at3D9bA3' WHERE slug = 'start';
UPDATE packs SET stripe_price_id = 'price_1UU1eyRq7KJQz9G9mQwP3cTk' WHERE slug = 'player';
UPDATE packs SET stripe_price_id = 'price_1UU1ewRq7KJQz9G9E4sd7Gpj' WHERE slug = 'pro';
```
