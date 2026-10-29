var botes=function(n){return n===1?'1 bote':n+' botes'};
var eur=function(n){return new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"}).format(n)};
var pl=document.getElementById("pl");
/* Formas de entrega: solo se ofrecen las que tienen sus 3 enlaces de pago de Stripe */
var full=function(u){return !!(u&&u.start&&u.player&&u.pro)};
var CLUBS=(CONFIG.pickupClubs||[]).join(", ").replace(/, ([^,]*)$/," o $1");
var DLV=[
  {id:"home",url:CONFIG.checkoutUrl,ship:CONFIG.shipping,title:"Envío a domicilio",desc:"Te llega a casa cada mes.",what:"envío a domicilio",li:"envío a domicilio"},
  {id:"office",url:CONFIG.officeUrl,ship:CONFIG.officeShipping,title:"Recogida en oficina de Correos o CityPaq",desc:"Lo recoges en la oficina o el locker CityPaq que indiques al pagar (si no, el más cercano a tu dirección).",what:"envío a oficina de Correos o CityPaq",li:"recogida en Correos o CityPaq"},
  {id:"club",url:CONFIG.clubUrl,ship:0,title:"Recogida en tu club",desc:"Solo para jugadores de "+CLUBS+". Eliges el club al pagar.",what:"recogida en tu club",li:"recogida gratis en tu club*"}
].filter(function(d){return full(d.url)});
var CLUB=DLV.some(function(d){return d.id==="club"});
function dlvOf(id){return DLV.filter(function(d){return d.id===id})[0]||DLV[0]}
var DLV_LI=DLV.map(function(d){return d.li}).join(", ").replace(/, ([^,]*)$/," o $1");DLV_LI=DLV_LI.charAt(0).toUpperCase()+DLV_LI.slice(1);
PLANS.forEach(function(p){
  var d=document.createElement("article");d.className="plan rv"+(p.featured?" f":"");
  d.innerHTML=(p.featured?'<span class="badge">RECOMENDADO - MÁS VENDIDO</span>':'')+
  '<h3>'+p.name+'</h3>'+(p.who?'<p class="who">'+p.who+'</p>':'')+
  '<div class="price">'+eur(p.price)+' <small>/ mes</small></div>'+
  '<p class="eq">'+p.eq+'</p>'+
  '<ul><li>'+botes(p.cans)+' de pelotas de pádel al mes</li><li>'+p.grips+' overgrips incluidos al mes</li><li>'+DLV_LI+'</li><li>Renovación automática sin permanencia</li></ul>'+
  '<button class="btn b1" data-id="'+p.id+'">Suscribirme a '+p.name.split(" ")[2]+'</button>';
  pl.appendChild(d);
});
document.getElementById("pn").textContent=CLUB?"* Recogida gratis solo para jugadores de "+CLUBS+": te llevamos la caja a tu club cada mes.":CONFIG.shippingNote;
var dlg=document.getElementById("dlg"),cb=document.getElementById("cb"),cn=document.getElementById("cn"),cart=null;
var QS=new URLSearchParams(location.search);
/* Si se llega desde un QR de club con ?codigo=XXX, el código se aplica solo en la página de pago de Stripe */
var PROMO=(QS.get("codigo")||"").toUpperCase().replace(/[^A-Z0-9-]/g,"").slice(0,40);
/* Entrega elegida: "home", "office" o "club". Desde un QR de Interpàdel se propone la recogida en el club. */
var deliv=CLUB&&/^qr-interpadel/.test(QS.get("ref")||"")?"club":"home";
function payUrl(id){return dlvOf(deliv).url[id]}
function checkoutLink(id){var u=payUrl(id);return PROMO?u+(u.indexOf("?")>-1?"&":"?")+"prefilled_promo_code="+encodeURIComponent(PROMO):u}
function planOf(id){return PLANS.filter(function(x){return x.id===id})[0]}
function drawCart(){
  cn.hidden=!cart;
  if(!cart){cb.innerHTML='<p>Tu cesta está vacía. Elige un pack para empezar.</p><a class="btn b1" style="width:100%;margin-top:12px" href="#planes" data-close>Ver packs</a>';return}
  var p=planOf(cart),d=dlvOf(deliv),ship=d.ship;
  cb.innerHTML=(DLV.length>1?'<fieldset class="dlv"><legend>¿Cómo quieres recibirlo?</legend>'+DLV.map(function(o){
    return '<label><input type="radio" name="dlv" value="'+o.id+'"'+(o.id===d.id?' checked':'')+'><span><strong>'+o.title+'</strong> · '+(o.ship?'+'+eur(o.ship)+' al mes':'gratis')+'<br>'+o.desc+'</span></label>'}).join('')+'</fieldset>':'')+
  '<div class="sum"><strong>'+p.name+'</strong><br>'+botes(p.cans)+' de pelotas + '+p.grips+' overgrips cada mes<br><strong>'+eur(p.price)+' / mes</strong>'+(ship?' + '+eur(ship)+' de '+d.what+' al mes (se añade en el checkout)':', '+d.what+' sin gastos de envío')+'. IVA incluido.</div>'+
  '<p>Total a pagar hoy: <strong>'+eur(p.price+ship)+'</strong>'+(ship?' ('+eur(p.price)+' del pack + '+eur(ship)+' de envío)':' (sin gastos de envío)')+'. La suscripción se renueva cada mes por el mismo importe hasta que la canceles.</p>'+
  '<div class="row"><label><input type="checkbox" id="k1"><span>He leído y acepto las <a href="#/condiciones" data-close>condiciones de contratación</a>, el <a href="#/aviso-legal" data-close>aviso legal</a> y la <a href="#/privacidad" data-close>política de privacidad</a>.</span></label>'+
  '<label><input type="checkbox" id="k2"><span>Entiendo que es una suscripción con renovación automática mensual y que tengo derecho de desistimiento según la ley.</span></label></div>'+
  (PROMO?'<p class="sum" style="margin-top:12px">Código <strong>'+PROMO+'</strong>: se aplicará automáticamente al pagar.</p>':'')+
  '<a class="btn b1" id="go" role="button" target="_blank" rel="noopener" aria-disabled="true" style="width:100%">Contratar y pagar · '+eur(p.price+ship)+'</a><p id="cm"></p><button class="lnk" id="rm">Quitar de la cesta</button>';
  var k1=document.getElementById("k1"),k2=document.getElementById("k2"),go=document.getElementById("go");
  k1.checked=!!drawCart.k1;k2.checked=!!drawCart.k2;
  function sync(){drawCart.k1=k1.checked;drawCart.k2=k2.checked;var ok=k1.checked&&k2.checked&&payUrl(cart);go.setAttribute("aria-disabled",ok?"false":"true");if(ok)go.href=checkoutLink(cart);else go.removeAttribute("href")}
  k1.onchange=k2.onchange=sync;sync();
  /* Cambiar la entrega redibuja el resumen y el total sin perder las casillas marcadas */
  [].forEach.call(cb.querySelectorAll('input[name="dlv"]'),function(r){r.onchange=function(){deliv=r.value;drawCart()}});
  go.onclick=function(e){var m=document.getElementById("cm");
    if(!(k1.checked&&k2.checked)){e.preventDefault();m.textContent="Marca las dos casillas para continuar."}
    else if(!payUrl(cart)){e.preventDefault();m.textContent="El pago de este pack aún no está activado. No se ha hecho ningún cargo."}
    else m.textContent="Se abre el pago seguro de Stripe en una pestaña nueva."};
}
function openCart(){drawCart();if(!dlg.open)dlg.showModal()}
pl.addEventListener("click",function(e){var b=e.target.closest("button[data-id]");if(!b)return;if(cart!==b.dataset.id)drawCart.k1=drawCart.k2=false;cart=b.dataset.id;openCart()});
document.getElementById("ct").onclick=openCart;
dlg.addEventListener("click",function(e){
  if(e.target===dlg||e.target.closest("#dc")||e.target.closest("[data-close]"))dlg.close();
  if(e.target.closest("#rm")){cart=null;drawCart()}
});
if(CONFIG.portalUrl){var ac=document.getElementById("acc");ac.href=CONFIG.portalUrl;ac.hidden=false}
drawCart();
var bg=document.getElementById("bg"),lk=document.getElementById("lk");
bg.onclick=function(){var o=lk.classList.toggle("open");bg.setAttribute("aria-expanded",o)};
lk.addEventListener("click",function(e){if(e.target.tagName==="A"){lk.classList.remove("open");bg.setAttribute("aria-expanded","false")}});
var els=document.querySelectorAll(".rv");
if("IntersectionObserver" in window){
  var io=new IntersectionObserver(function(en){en.forEach(function(x){if(x.isIntersecting){x.target.classList.add("on");io.unobserve(x.target)}})},{threshold:.12});
  els.forEach(function(el){io.observe(el)});
}else{els.forEach(function(el){el.classList.add("on")})}
var IP=CONFIG.interpadel;
document.getElementById("ip1").textContent=IP.subDiscount;
document.getElementById("ipt").textContent=IP.conditions||"Condiciones de la promoción por definir.";
function ipShow(){var pv=location.hash==="#preview-interpadel";document.getElementById("interpadel").hidden=!(IP.enabled||pv);document.getElementById("preview-interpadel").hidden=IP.enabled||!pv}
document.getElementById("ipform").addEventListener("submit",function(e){e.preventDefault();
  var v=document.getElementById("ipcode").value.trim().toUpperCase(),m=document.getElementById("ipm");
  if(!IP.codes.length){m.textContent="Las ofertas para socios se publicarán muy pronto."}
  else if(IP.codes.map(function(c){return c.toUpperCase()}).indexOf(v)>-1){m.textContent="Código válido. Introdúcelo en el campo de código promocional al pagar: "+v}
  else{m.textContent="Ese código no es válido. Revisa que esté bien escrito."}});
/* Reseñas: las de ejemplo (demo) solo se ven en la vista previa #preview-resenas */
var RV=CONFIG.reviews||{items:[]},rsg=document.getElementById("rsg");
function rsEsc(t){var d=document.createElement("div");d.textContent=t==null?"":String(t);return d.innerHTML.replace(/"/g,"&quot;")}
function rsDate(d){var t=new Date(d);return isNaN(t)?rsEsc(d):t.toLocaleDateString("es-ES",{month:"long",year:"numeric"})}
function rsCard(r,big){var st=r.rating>0?Math.min(5,Math.round(r.rating)):0;
return '<figure class="rcard'+(big?' rf':'')+(r.photo?'':' rtx')+'">'+
(r.photo?'<div class="rph"><img src="'+rsEsc(r.photo)+'" alt="'+rsEsc(r.alt||("Foto de "+(r.name||"un cliente")+" con su caja PADEL DROP"))+'" loading="lazy" decoding="async">'+(r.demo?'<span class="rdemo">Ejemplo</span>':'')+'</div>':'')+
'<figcaption>'+(!r.photo&&r.demo?'<span class="rdemo rdt">Ejemplo</span>':'')+
(st?'<p class="rst" role="img" aria-label="'+st+' de 5 estrellas">'+'★★★★★'.slice(0,st)+'<i>'+'★★★★★'.slice(st)+'</i></p>':'')+
'<blockquote>'+rsEsc(r.text)+'</blockquote>'+
'<p class="rwho">'+(r.demo?'<span>Reseña de ejemplo'+(r.photo?' · imagen ilustrativa':'')+'</span>':'<span>'+(r.name?'<b>'+rsEsc(r.name)+'</b>':'')+(r.city?(r.name?' · ':'')+rsEsc(r.city):'')+'</span>')+(r.date&&!r.demo?'<span>'+rsDate(r.date)+'</span>':'')+'</p>'+
'</figcaption></figure>'}
function rsShow(){var pv=location.hash==="#preview-resenas",its=RV.items.filter(function(r){return pv||!r.demo});
document.getElementById("preview-resenas").hidden=!pv;document.getElementById("resenas").hidden=!((RV.enabled||pv)&&its.length);
var f=its.filter(function(r){return r.photo})[0],rest=its.filter(function(r){return r!==f});
rsg.innerHTML=(f?rsCard(f,true):'')+'<div class="rsm'+(rest.length<4?' rs2':'')+'">'+rest.map(function(r){return rsCard(r)}).join("")+'</div>'}
var T={condiciones:"Condiciones de contratación",privacidad:"Política de privacidad",cookies:"Política de cookies","aviso-legal":"Aviso legal"};
function route(){ipShow();rsShow();var h=location.hash,r=h.indexOf("#/")===0?h.slice(2):"",on=!!T[r],m=document.getElementById("top");
document.getElementById("legal").hidden=!on;m.hidden=on;
document.querySelectorAll("[data-r]").forEach(function(a){a.hidden=a.dataset.r!==r});
document.title=on?T[r]+" · PADEL DROP":"PADEL DROP · Suscripción mensual de grips y pelotas de pádel";
if(on){scrollTo(0,0)}else if(h.length>1){var t=document.getElementById(h.slice(1));if(t)t.scrollIntoView()}}
addEventListener("hashchange",route);route();
