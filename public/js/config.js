
/* CONFIGURACIÓN EDITABLE. Precios orientativos, pendientes de validar comercialmente.
   checkoutUrl: pega aquí un Payment Link de Stripe (modo prueba) por plan para activar el pago. */
var CONFIG={
  checkoutUrl:{start:"https://buy.stripe.com/dRm9AVdvWg4C88jfNceZ203",player:"https://buy.stripe.com/8x200l63u3hQ9cndF4eZ204",pro:"https://buy.stripe.com/fZu5kF9fG6u260bfNceZ205"},interpadel:{enabled:true,subDiscount:"10 % el primer mes",productDiscount:"",codes:["INTERPADEL-GUISSONA-TARREGA-GOLMES-3"],conditions:"Descuento del 10 % en el primer mes para nuevos suscriptores socios de Interpàdel. Introduce el código al pagar."},
  /* Reseñas: photo = ruta en assets/img/resenas/ (foto real del cliente, con su permiso). name, city, rating (1-5) y date
     solo si son reales. demo:true = ejemplo: nunca se publica, solo se ve en la vista previa (#preview-resenas). */
  reviews:{enabled:false,items:[
    {demo:true,photo:"assets/img/resenas/recibido-entrada.jpg",text:"Me llegó el jueves y el sábado ya estrené pelotas. Lo mejor es no tener que acordarme de comprarlas."},
    {demo:true,text:"Juego dos veces por semana y con el PLAYER voy justo. Los grips los cambio más que antes, la verdad."},
    {demo:true,photo:"assets/img/resenas/caja-sofa.jpg",text:"Lo pedí para probar un mes y sigo. Llega bien embalado y te pasan el seguimiento."},
    {demo:true,text:"Mi pareja también juega, así que el PRO nos sale mejor que ir comprando botes sueltos."},
    {demo:true,text:"Cómodo. Me llega a casa y listo, no tengo que pasar por la tienda del club."},
    {demo:true,text:"El primer envío tardó un día más de lo que pensaba, pero bien. Las pelotas, buenas."}
  ]},
  portalUrl:"https://billing.stripe.com/p/login/7sY28t0Ja8Ca88jgRgeZ200",
  shipping:0.9,
  shippingNote:""
};
var PLANS=[
  {id:"start",name:"PADEL DROP START",who:"Ideal para 1 partido a la semana",grips:2,cans:1,price:8.9,eq:"1 bote + 2 overgrips por menos de 9 € al mes"},
  {id:"player",name:"PADEL DROP PLAYER",who:"",grips:3,cans:2,price:12.9,featured:true,eq:"Equivale a solo 6,45 € por bote, con grips incluidos"},
  {id:"pro",name:"PADEL DROP PRO",who:"Para jugadores habituales",grips:3,cans:3,price:15.9,eq:"¡Solo 5,30 € por bote, con grips incluidos!"}
];
