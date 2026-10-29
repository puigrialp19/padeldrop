
/* CONFIGURACIÓN EDITABLE. Precios orientativos, pendientes de validar comercialmente.
   Los enlaces de pago de Stripe están en js/links.js (los genera "npm run stripe:setup"). */
var CONFIG={
  /* Envío a oficina de Correos o CityPaq (€ por caja). Los enlaces de pago están en js/links.js (los crea "npm run stripe:setup"). */
  officeShipping:1.5,
  /* Clubs donde se puede recoger gratis (tienen que coincidir con server/services/clubs.js). */
  pickupClubs:["Interpàdel Guissona","Interpàdel Tàrrega","Interpàdel Golmés"],
  interpadel:{enabled:true,subDiscount:"10 % el primer mes",productDiscount:"",codes:["INTERPADEL-GUISSONA-TARREGA-GOLMES-3"],conditions:"Descuento del 10 % en el primer mes para nuevos suscriptores socios de Interpàdel. Introduce el código al pagar."},
  /* Reseñas: photo = ruta en assets/img/resenas/ (foto real del cliente, con su permiso). name, city, rating (1-5) y date
     solo si son reales. demo:true = ejemplo: nunca se publica, solo se ve en la vista previa (#preview-resenas). */
  reviews:{enabled:true,items:[
    {photo:"assets/img/resenas/caja-sofa.jpg",name:"Marc",city:"Guissona",rating:5,text:"Me llegó la caja súper rápido y la presentación es brutal. Las bolas son de primera y el paquete venía impecable."},
    {name:"Álex M.",city:"Barcelona",rating:5,text:"Súper cómodo no tener que ir a buscar botes de bolas antes de los partidos del finde. La caja mola un huevo y los overgrips se notan de buena calidad."},
    {photo:"assets/img/resenas/recibido-entrada.jpg",name:"Dani",city:"Girona",rating:5,text:"El envío fue rapidísimo. Todo venía perfectamente colocado y la caja llegó en perfecto estado. Repetiré seguro el mes que viene."}
  ]},
  portalUrl:"https://billing.stripe.com/p/login/7sY28t0Ja8Ca88jgRgeZ200",
  /* Envío a domicilio (€/mes). Lo actualiza "npm run stripe:setup" junto con los enlaces. */
  shipping:1.95,
  shippingNote:""
};
var PLANS=[
  {id:"start",name:"PADEL DROP START",who:"Ideal para 1 partido a la semana",grips:2,cans:1,price:8.9,eq:"1 bote + 2 overgrips por menos de 9 € por caja"},
  {id:"player",name:"PADEL DROP PLAYER",who:"",grips:3,cans:2,price:12.9,featured:true,eq:"Equivale a solo 6,45 € por bote, con grips incluidos"},
  {id:"pro",name:"PADEL DROP PRO",who:"Para jugadores habituales",grips:3,cans:3,price:15.9,eq:"¡Solo 5,30 € por bote, con grips incluidos!"}
];
