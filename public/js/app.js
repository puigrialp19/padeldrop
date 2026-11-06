var botes=function(n){return n===1?'1 bote':n+' botes'};
var eur=function(n){return new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"}).format(n)};
var pl=document.getElementById("pl");
/* Enlaces de pago (js/links.js): LINKS[entrega][meses][pack]. Solo se ofrece lo que tiene sus 3 enlaces. */
var full=function(u){return !!(u&&u.start&&u.player&&u.pro)};
var linksOf=function(kind,m){return ((window.LINKS||{})[kind]||{})[m]};
var CLUBS=(CONFIG.pickupClubs||[]).join(", ").replace(/, ([^,]*)$/," o $1");
var DLV_ALL=[
  {id:"home",ship:CONFIG.shipping,title:"Envío a domicilio",desc:"Te llega a casa.",what:"envío a domicilio",li:"envío a domicilio"},
  {id:"office",ship:CONFIG.officeShipping,title:"Recogida en oficina de Correos o CityPaq",desc:"Lo recoges en la oficina o el locker CityPaq que indiques al pagar (si no, el más cercano a tu dirección).",what:"envío a oficina de Correos o CityPaq",li:"recogida en Correos o CityPaq"},
  {id:"club",ship:0,title:"Recogida en tu club",desc:"Solo para jugadores de "+CLUBS+". Eliges el club al pagar.",what:"recogida en tu club",li:"recogida gratis en tu club*"}
];
/* Frecuencia: meses entre cajas. Mismo precio por caja; solo cambia cada cuánto se envía y se cobra. */
var FREQS=[1,2,3].filter(function(m){return full(linksOf("home",m))});
var freq=1;
var each=function(m){return m===1?"cada mes":"cada "+m+" meses"};
var per=function(m){return m===1?"mes":m+" meses"};
function dlvList(){return DLV_ALL.filter(function(d){return full(linksOf(d.id,freq))})}
function dlvOf(id){var l=dlvList();return l.filter(function(d){return d.id===id})[0]||l[0]}
var CLUB=dlvList().some(function(d){return d.id==="club"});
var DLV_LI=dlvList().map(function(d){return d.li}).join(", ").replace(/, ([^,]*)$/," o $1");DLV_LI=DLV_LI.charAt(0).toUpperCase()+DLV_LI.slice(1);
var freqHtml=function(name){return FREQS.length>1?'<fieldset class="frq"><legend>¿Cada cuánto quieres tu caja?</legend>'+FREQS.map(function(m){
  return '<label><input type="radio" name="'+name+'" value="'+m+'"'+(m===freq?' checked':'')+'><span>'+each(m).charAt(0).toUpperCase()+each(m).slice(1)+'</span></label>'}).join('')+'</fieldset>':''};
if(FREQS.length>1){var fq=document.createElement("div");fq.id="fq";pl.parentNode.insertBefore(fq,pl)}
function drawFreq(){
  if(fq)fq.innerHTML=freqHtml("fqp")+'<p class="frq-n">Mismo precio por caja, la elijas cada mes, cada 2 o cada 3 meses.</p>';
  [].forEach.call(document.querySelectorAll(".per"),function(e){e.textContent="/ "+per(freq)});
  [].forEach.call(document.querySelectorAll(".each"),function(e){e.textContent=each(freq)});
}
pl.innerHTML="";PLANS.forEach(function(p){
  var d=document.createElement("article");d.className="plan tilt"+(p.featured?" f":"");
  d.innerHTML=(p.featured?'<span class="badge">RECOMENDADO - MÁS VENDIDO</span>':'')+
  '<h3>'+p.name+'</h3>'+(p.who?'<p class="who">'+p.who+'</p>':'')+
  '<div class="price">'+eur(p.price)+' <small class="per">/ mes</small></div>'+
  '<p class="eq">'+p.eq+'</p>'+
  '<ul><li><span>'+botes(p.cans)+' de pelotas de pádel <span class="each">cada mes</span></span></li><li><span>'+p.grips+' overgrips incluidos <span class="each">cada mes</span></span></li><li>'+DLV_LI+'</li><li>Renovación automática sin permanencia</li></ul>'+
  '<button class="btn b1 mag" data-id="'+p.id+'">Suscribirme a '+p.name.split(" ")[2]+'</button>';
  pl.appendChild(d);
});
drawFreq();
if(fq)fq.addEventListener("change",function(e){if(e.target.name==="fqp"){freq=+e.target.value;drawFreq()}});
document.getElementById("pn").textContent=CLUB?"* Recogida gratis solo para jugadores de "+CLUBS+": te llevamos la caja a tu club.":CONFIG.shippingNote;
var dlg=document.getElementById("dlg"),cb=document.getElementById("cb"),cn=document.getElementById("cn"),cart=null;
var QS=new URLSearchParams(location.search);
/* Si se llega desde un QR de club con ?codigo=XXX, el código se aplica solo en la página de pago de Stripe */
var PROMO=(QS.get("codigo")||"").toUpperCase().replace(/[^A-Z0-9-]/g,"").slice(0,40);
/* Entrega elegida: "home", "office" o "club". Desde un QR de Interpàdel se propone la recogida en el club. */
var deliv=CLUB&&/^qr-interpadel/.test(QS.get("ref")||"")?"club":"home";
function payUrl(id){var u=linksOf(dlvOf(deliv).id,freq);return u&&u[id]}
function checkoutLink(id){var u=payUrl(id);return PROMO?u+(u.indexOf("?")>-1?"&":"?")+"prefilled_promo_code="+encodeURIComponent(PROMO):u}
function planOf(id){return PLANS.filter(function(x){return x.id===id})[0]}
function drawCart(){
  cn.hidden=!cart;
  if(!cart){cb.innerHTML='<p>Tu cesta está vacía. Elige un pack para empezar.</p><a class="btn b1" style="width:100%;margin-top:12px" href="#planes" data-close>Ver packs</a>';return}
  var p=planOf(cart),d=dlvOf(deliv),ship=d.ship,DLV=dlvList();
  cb.innerHTML=freqHtml("fqc")+(DLV.length>1?'<fieldset class="dlv"><legend>¿Cómo quieres recibirlo?</legend>'+DLV.map(function(o){
    return '<label><input type="radio" name="dlv" value="'+o.id+'"'+(o.id===d.id?' checked':'')+'><span><strong>'+o.title+'</strong> · '+(o.ship?'+'+eur(o.ship)+' por caja':'gratis')+'<br>'+o.desc+'</span></label>'}).join('')+'</fieldset>':'')+
  '<div class="sum"><strong>'+p.name+'</strong><br>'+botes(p.cans)+' de pelotas + '+p.grips+' overgrips '+each(freq)+'<br><strong>'+eur(p.price)+' / '+per(freq)+'</strong>'+(ship?' + '+eur(ship)+' de '+d.what+' (se añade en el checkout)':', '+d.what+' sin gastos de envío')+'. IVA incluido.</div>'+
  '<p>Total a pagar hoy: <strong>'+eur(p.price+ship)+'</strong>'+(ship?' ('+eur(p.price)+' del pack + '+eur(ship)+' de envío)':' (sin gastos de envío)')+'. La suscripción se renueva '+each(freq)+' por el mismo importe hasta que la canceles.</p>'+
  '<div class="row"><label><input type="checkbox" id="k1"><span>He leído y acepto las <a href="#/condiciones" data-close>condiciones de contratación</a>, el <a href="#/aviso-legal" data-close>aviso legal</a> y la <a href="#/privacidad" data-close>política de privacidad</a>.</span></label>'+
  '<label><input type="checkbox" id="k2"><span>Entiendo que es una suscripción con renovación automática '+each(freq)+' y que tengo derecho de desistimiento según la ley.</span></label></div>'+
  (PROMO?'<p class="sum" style="margin-top:12px">Código <strong>'+PROMO+'</strong>: se aplicará automáticamente al pagar.</p>':'')+
  '<a class="btn b1" id="go" role="button" target="_blank" rel="noopener" aria-disabled="true" style="width:100%">Contratar y pagar · '+eur(p.price+ship)+'</a><p id="cm"></p><button class="lnk" id="rm">Quitar de la cesta</button>';
  var k1=document.getElementById("k1"),k2=document.getElementById("k2"),go=document.getElementById("go");
  k1.checked=!!drawCart.k1;k2.checked=!!drawCart.k2;
  function sync(){drawCart.k1=k1.checked;drawCart.k2=k2.checked;var ok=k1.checked&&k2.checked&&payUrl(cart);go.setAttribute("aria-disabled",ok?"false":"true");if(ok)go.href=checkoutLink(cart);else go.removeAttribute("href")}
  k1.onchange=k2.onchange=sync;sync();
  /* Cambiar la entrega redibuja el resumen y el total sin perder las casillas marcadas */
  [].forEach.call(cb.querySelectorAll('input[name="dlv"]'),function(r){r.onchange=function(){deliv=r.value;drawCart()}});
  [].forEach.call(cb.querySelectorAll('input[name="fqc"]'),function(r){r.onchange=function(){freq=+r.value;drawFreq();drawCart()}});
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
/* Mi cuenta: ventana propia que explica el acceso y lleva al portal de cliente de Stripe */
var acd=document.getElementById("acd");
function openAcc(){document.getElementById("lk").classList.remove("open");if(!acd.open)acd.showModal()}
if(CONFIG.portalUrl){var ac=document.getElementById("acc");ac.hidden=false;document.getElementById("ago").href=CONFIG.portalUrl;
ac.addEventListener("click",function(e){e.preventDefault();openAcc()});
acd.addEventListener("click",function(e){if(e.target===acd||e.target.closest("#ac"))acd.close()});
if(location.hash==="#mi-cuenta")openAcc()}
drawCart();
var bg=document.getElementById("bg"),lk=document.getElementById("lk");
bg.onclick=function(){var o=lk.classList.toggle("open");bg.setAttribute("aria-expanded",o)};
lk.addEventListener("click",function(e){if(e.target.tagName==="A"){lk.classList.remove("open");bg.setAttribute("aria-expanded","false")}});
var IP=CONFIG.interpadel;
document.getElementById("ip1").textContent=IP.subDiscount;
document.getElementById("ipt").textContent=IP.conditions||"Condiciones de la promoción por definir.";
function ipShow(){var pv=location.hash==="#preview-interpadel";document.getElementById("interpadel").hidden=!(IP.enabled||pv);document.getElementById("preview-interpadel").hidden=IP.enabled||!pv}
document.getElementById("ipform").addEventListener("submit",function(e){e.preventDefault();
  var v=document.getElementById("ipcode").value.trim().toUpperCase(),m=document.getElementById("ipm");
  if(!IP.codes.length){m.textContent="Las ofertas para socios se publicarán muy pronto."}
  else if(IP.codes.map(function(c){return c.toUpperCase()}).indexOf(v)>-1){m.textContent="Código válido. Introdúcelo en el campo de código promocional al pagar: "+v}
  else{m.textContent="Ese código no es válido. Revisa que esté bien escrito."}});
/* Puntos de recogida: elegir club en la lista o en el mapa; el mapa de Google solo se carga al pulsar el botón */
var mframe=document.getElementById("mframe"),mname=document.getElementById("mname"),gmap=null;
function pickClub(id){
  document.querySelectorAll(".clb").forEach(function(b){var on=b.dataset.club===id;b.classList.toggle("on",on);b.setAttribute("aria-pressed",on);if(on){mname.textContent=b.querySelector("b").textContent;if(gmap)gmap.src="https://www.google.com/maps?q="+b.dataset.q+"&output=embed"}});
  document.querySelectorAll(".mpin").forEach(function(p){p.classList.toggle("on",p.dataset.club===id)});
}
document.querySelectorAll(".clb").forEach(function(b){b.addEventListener("click",function(){pickClub(b.dataset.club)})});
document.querySelectorAll(".mpin").forEach(function(p){p.addEventListener("click",function(){pickClub(p.dataset.club)});p.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();pickClub(p.dataset.club)}})});
document.getElementById("mload").addEventListener("click",function(){
  var b=document.querySelector(".clb.on");
  if(!gmap){gmap=document.createElement("iframe");gmap.title="Mapa de Google del club seleccionado";gmap.loading="lazy";gmap.referrerPolicy="no-referrer-when-downgrade";gmap.setAttribute("allowfullscreen","");mframe.appendChild(gmap);document.getElementById("map").classList.add("live");this.querySelector("span").textContent="Mapa de Google cargado"}
  gmap.src="https://www.google.com/maps?q="+b.dataset.q+"&output=embed";
});
var T={condiciones:"Condiciones de contratación",privacidad:"Política de privacidad",cookies:"Política de cookies","aviso-legal":"Aviso legal"};
var HOME_TITLE=document.title;
function route(){ipShow();var h=location.hash,r=h.indexOf("#/")===0?h.slice(2):"",on=!!T[r],m=document.getElementById("top");
document.getElementById("legal").hidden=!on;m.hidden=on;
document.querySelectorAll("[data-r]").forEach(function(a){a.hidden=a.dataset.r!==r});
document.title=on?T[r]+" · PADEL DROP":HOME_TITLE;
if(on){scrollTo(0,0)}else if(h.length>1){var t=document.getElementById(h.slice(1));if(t)t.scrollIntoView()}}
addEventListener("hashchange",route);route();

/* Precio «desde» de la portada y de la barra fija: el pack más barato */
var from=eur(Math.min.apply(null,PLANS.map(function(p){return p.price})));
document.getElementById("hfrom").textContent=from;document.getElementById("sfrom").textContent=from;
