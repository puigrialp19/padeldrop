# Canvi de marca a RALLYBOX: què queda pendent

Llista del que encara diu «Padel Drop» i que no s'ha pogut canviar des del codi ni des del connector de Stripe.
Actualitzat el 10 de novembre de 2026.

## Ho has de fer tu (des dels seus taulers)

| On | Què canviar | Com |
|---|---|---|
| Domini | La web continua a www.padeldrop.net | Quan compris el domini nou, avisa i faig el canvi amb redireccions 301 |
| Correu | padeldropp@gmail.com | Quan tinguis el correu nou de RALLYBOX, avisa i el canvio a tot arreu |
| Render | Nom del servei («padel-drop») | Només és intern. Si el canvies, avisa'm abans, perquè l'adreça interna de Render també canvia. |
| GitHub | Nom del repositori («padeldrop») | Només és intern. Si el canvies, Render s'ha de tornar a connectar. |
| Google Search Console i Bing | Nom del lloc | Es canvia sol quan Google torni a rastrejar la web. Demana una nova indexació de la portada. |
| Xarxes socials, perfil de Google, WhatsApp Business | Nom, foto i biografia | Des de cada app, amb el logo nou (`public/assets/img/logo-rallybox.png`) |
| Caixes impreses | Porten «PADEL DROP» | Cal tornar a imprimir-les amb el logo nou |
| Vídeos (projecte `padel-drop-videos`) | Logo i textos antics | Demana-m'ho i els adapto |
| Registre de marca | RALLYBOX | Comprova-ho a TMview i a l'OEPM i registra-la abans d'imprimir caixes |

## No es pot canviar (és històric)

- **Factures i rebuts ja emesos** amb «PADEL DROP»: Stripe no permet modificar documents ja emesos.
- **Una subscripció antiga, ja cancel·lada**, amb la descripció «PADEL DROP PLAYER…»: Stripe no deixa editar les subscripcions cancel·lades.
- **Els 27 enllaços de pagament antics**: estan desactivats i mostren «Este enlace ya no está disponible. Suscríbete desde www.padeldrop.net».

## Es manté a propòsit (intern, no el veuen els clients)

- Referències de comanda `PD-123` a Packlink i al panell: canviar-les podria duplicar enviaments.
- Camp intern `pd_slug` dels productes i enllaços de Stripe: el fa servir l'script de configuració.
- Noms interns del codi (classes `pdc-` del xat, clau `pd-chat-v1`).

## Fet

- Tota la web, el blog, els textos legals, l'assistent, el panell, el logo, les icones i la imatge per compartir ja són RALLYBOX.
- Stripe:
  - productes RALLYBOX START, PLAYER i PRO;
  - 27 enllaços de pagament nous, amb descripció i missatge RALLYBOX (mateixos preus i condicions);
  - portal «Mi cuenta» amb el títol RALLYBOX.
- Packlink: el remitent de les etiquetes (API) i l'adreça de remitent del compte (àlies i empresa) ara són RALLYBOX. Al compte només queda el correu padeldropp@gmail.com, que es manté de moment.
- Stripe: nom públic del compte, text de l'extracte bancari, logotip i icona de la pàgina de pagament canviats a RALLYBOX, i dades internes dels productes corregides (1, 2 i 3 pots) (10 de novembre de 2026).
- Còpia de seguretat de la web anterior: etiqueta `backup-padeldrop-2026-11-10` a GitHub i el zip `Documents\padel-drop-copia-2026-11-10.zip`.
