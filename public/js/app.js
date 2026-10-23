var eur=function(n){return new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"}).format(n)};
var pl=document.getElementById("pl");
PLANS.forEach(function(p){
  var d=document.createElement("article");d.className="plan rv"+(p.featured?" f":"");
  d.innerHTML=(p.featured?'<span class="badge">RECOMENDADO - MÁS VENDIDO</span>':'')+
  '<h3>'+p.name+'</h3>'+(p.who?'<p class="who">'+p.who+'</p>':'')+
  '<div class="price">'+eur(p.price)+' <small>/ mes</small></div>'+
  '<p class="eq">'+p.eq+'</p>'+
  '<ul><li>'+p.cans+' botes de pelotas de pádel al mes</li><li>'+p.grips+' overgrips incluidos al mes</li><li>Envío mensual a domicilio</li><li>Renovación automática sin permanencia</li></ul>'+
  '<button class="btn b1" data-id="'+p.id+'">Suscribirme a '+p.name.split(" ")[2]+'</button>';
  pl.appendChild(d);
});
document.getElementById("pn").textContent=CONFIG.shippingNote;
var dlg=document.getElementById("dlg"),cb=document.getElementById("cb"),cn=document.getElementById("cn"),cart=null;
function planOf(id){return PLANS.filter(function(x){return x.id===id})[0]}
function drawCart(){
  cn.hidden=!cart;
  if(!cart){cb.innerHTML='<p>Tu cesta está vacía. Elige un pack para empezar.</p><a class="btn b1" style="width:100%;margin-top:12px" href="#planes" data-close>Ver packs</a>';return}
  var p=planOf(cart);
  cb.innerHTML='<div class="sum"><strong>'+p.name+'</strong><br>'+p.cans+' botes de pelotas + '+p.grips+' grips cada mes<br><strong>'+eur(p.price)+' / mes</strong> + '+eur(CONFIG.shipping)+' de envío al mes (se añade en el checkout). IVA incluido.</div>'+
  '<p>Total a pagar hoy: <strong>'+eur(p.price+CONFIG.shipping)+'</strong> ('+eur(p.price)+' del pack + '+eur(CONFIG.shipping)+' de envío). La suscripción se renueva cada mes por el mismo importe hasta que la canceles.</p>'+
  '<div class="row"><label><input type="checkbox" id="k1"><span>He leído y acepto las <a href="#/condiciones" data-close>condiciones de contratación</a>, el <a href="#/aviso-legal" data-close>aviso legal</a> y la <a href="#/privacidad" data-close>política de privacidad</a>.</span></label>'+
  '<label><input type="checkbox" id="k2"><span>Entiendo que es una suscripción con renovación automática mensual y que tengo derecho de desistimiento según la ley.</span></label></div>'+
  '<a class="btn b1" id="go" role="button" target="_blank" rel="noopener" aria-disabled="true" style="width:100%">Contratar y pagar · '+eur(p.price+CONFIG.shipping)+'</a><p id="cm"></p><button class="lnk" id="rm">Quitar de la cesta</button>';
  var k1=document.getElementById("k1"),k2=document.getElementById("k2"),go=document.getElementById("go");
  function sync(){var ok=k1.checked&&k2.checked&&CONFIG.checkoutUrl[cart];go.setAttribute("aria-disabled",ok?"false":"true");if(ok)go.href=CONFIG.checkoutUrl[cart];else go.removeAttribute("href")}
  k1.onchange=k2.onchange=sync;
  go.onclick=function(e){var m=document.getElementById("cm");
    if(!(k1.checked&&k2.checked)){e.preventDefault();m.textContent="Marca las dos casillas para continuar."}
    else if(!CONFIG.checkoutUrl[cart]){e.preventDefault();m.textContent="El pago de este pack aún no está activado. No se ha hecho ningún cargo."}
    else m.textContent="Se abre el pago seguro de Stripe en una pestaña nueva."};
}
function openCart(){drawCart();if(!dlg.open)dlg.showModal()}
pl.addEventListener("click",function(e){var b=e.target.closest("button[data-id]");if(!b)return;cart=b.dataset.id;openCart()});
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
var T={condiciones:"Condiciones de contratación",privacidad:"Política de privacidad",cookies:"Política de cookies","aviso-legal":"Aviso legal"};
function route(){ipShow();var h=location.hash,r=h.indexOf("#/")===0?h.slice(2):"",on=!!T[r],m=document.getElementById("top");
document.getElementById("legal").hidden=!on;m.hidden=on;
document.querySelectorAll("[data-r]").forEach(function(a){a.hidden=a.dataset.r!==r});
document.title=on?T[r]+" · PADEL DROP":"PADEL DROP · Suscripción mensual de grips y pelotas de pádel";
if(on){scrollTo(0,0)}else if(h.length>1){var t=document.getElementById(h.slice(1));if(t)t.scrollIntoView()}}
addEventListener("hashchange",route);route();
