
/* CONFIGURACIÓN EDITABLE. Precios orientativos, pendientes de validar comercialmente.
   checkoutUrl: pega aquí un Payment Link de Stripe (modo prueba) por plan para activar el pago. */
var CONFIG={
  checkoutUrl:{start:"https://buy.stripe.com/7sY28t0Ja8Ca88jgRgeZ200",player:"https://buy.stripe.com/cNifZj4Zq9Ge3S36cCeZ201",pro:"https://buy.stripe.com/bJe4gB63u9Ge9cn9oOeZ202"},interpadel:{enabled:true,subDiscount:"10 % el primer mes",productDiscount:"",codes:["INTERPADEL-GUISSONA-TARREGA-GOLMES-3"],conditions:"Descuento del 10 % en el primer mes para nuevos suscriptores socios de Interpàdel. Introduce el código al pagar."},
  portalUrl:"https://billing.stripe.com/p/login/7sY28t0Ja8Ca88jgRgeZ200",
  shipping:0.9,
  shippingNote:""
};
var PLANS=[
  {id:"start",name:"PADEL DROP START",who:"Ideal para 1 partido a la semana",grips:2,cans:1,price:8.9,eq:"1 bote + 2 overgrips por menos de 9 € al mes"},
  {id:"player",name:"PADEL DROP PLAYER",who:"",grips:3,cans:2,price:12.9,featured:true,eq:"Equivale a solo 6,45 € por bote, con grips incluidos"},
  {id:"pro",name:"PADEL DROP PRO",who:"Para jugadores habituales",grips:3,cans:3,price:15.9,eq:"¡Solo 5,30 € por bote, con grips incluidos!"}
];
