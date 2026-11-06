/* NL_BodeMapp phone page: unit picker, map-code variants with captions, profile view, optional map tab (see map.js). */
const APP_VERSION="0.5-mobile";
const $=id=>document.getElementById(id);
const esc=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const mainEn=u=>MAIN_EN[u.main]||u.main;
const ORDER=Object.values(UNITS).sort((a,b)=>mainEn(a).localeCompare(mainEn(b))||a.code.localeCompare(b.code));
// map codes grouped by base unit, most frequent first
const BASE_CODES={};
Object.keys(CODES).forEach(c=>(BASE_CODES[CODES[c].u]=BASE_CODES[CODES[c].u]||[]).push(c));
Object.values(BASE_CODES).forEach(a=>a.sort((x,y)=>CODES[y].n-CODES[x].n));
const defaultCode=base=>CODES[base]?base:(BASE_CODES[base]||[base])[0];
const state={base:null,code:null,pid:null,found:null};

function store(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
function parseCode(t){ // a map code or a base unit code -> {base, code}
  if(CODES[t]) return {base:CODES[t].u,code:t};
  if(UNITS[t]) return {base:t,code:defaultCode(t)};
  return null;
}
const fromHash=()=>parseCode((location.hash||"").slice(1));

/* show one profile. base = legend unit; code = map code (base + extra letters); pid = profile id; found = info about a location lookup */
function show(base,pid,code,found){
  const u=UNITS[base]; if(!u) return;
  code=(code&&CODES[code]&&CODES[code].u===base)?code:defaultCode(base);
  const ci=CODES[code];
  pid=(pid&&ci.v.some(v=>v[0]===pid))?pid:ci.v[0][0];
  Object.assign(state,{base,code,pid,found:found||null});
  const p=PROFILES[pid], d=drawProfile(p), lu=p.landuse.map(l=>LU_EN[l]||l).join(", ");
  $("uCode").textContent=code; $("uName").textContent=u.name;
  $("svgWrap").innerHTML=d.svg;
  $("hzlist").innerHTML=horizonListHTML(d,"hz");
  $("chips").innerHTML=`<span class="chip"><b>${esc(mainEn(u))}</b></span>`+(lu?`<span class="chip">typical for: ${esc(lu)}</span>`:"")+`<span class="chip">${ci.n.toLocaleString("en")} map polygons with this code</span>`;
  // map code variants of this unit (letters before/after the base code)
  const variants=BASE_CODES[base]||[];
  $("codeWrap").hidden=variants.length<2;
  $("codeSel").innerHTML=variants.map(c=>`<option value="${esc(c)}"${c===code?" selected":""}>${esc(c)}${c===base?" (plain unit)":""} - ${CODES[c].n.toLocaleString("en")} polygons</option>`).join("");
  $("codecap").innerHTML=codeCaptionHTML(code);
  $("ver").innerHTML=ci.v.map(v=>{const q=PROFILES[v[0]],l=q.landuse.map(x=>LU_EN[x]||x).join(", ");
    return `<option value="${v[0]}"${v[0]===pid?" selected":""}>${esc((l||"all land uses")+" - "+q.unit+(q.region?", "+q.region:"")+" ("+v[1]+" polygons)")}</option>`}).join("");
  const deps=p.layers.map(l=>`${Math.round(l.top)}-${Math.round(l.bot)} cm: ${esc(DEP_EN[l.dep]||l.dep)}`).join("<br>");
  $("facts").innerHTML=`<div><dt>Soil unit</dt><dd><span class="nl">${esc(u.name)}</span><br>${esc(mainEn(u))}${MAIN_EN[u.main]?` (${esc(u.main)})`:""}</dd></div>`+
    `<div><dt>Parent material</dt><dd>${deps||"n/a"}</dd></div>`;
  $("tbl").innerHTML=`<table><tr><th>Hz</th><th>cm</th><th>OM %</th><th>Lutum %</th><th>Munsell (est.)</th></tr>`+
    d.hz.map((h,i)=>`<tr><td>${esc(h.n)}</td><td>${h.top}-${h.bot}</td><td>${h.om}</td><td>${h.lut_min}-${h.lut_max}</td><td><span class="sw" style="background:${d.col[i].hex}"></span>${d.col[i].munsell}</td></tr>`).join("")+`</table>`;
  renderFound();
  store("nlbm_code",code);
  try{history.replaceState(null,"","#"+code)}catch(e){}
  document.title="NL BodeMapp";
}
window.nlbmShow=show;

/* banner shown when the profile comes from a location lookup */
function renderFound(){
  const f=state.found, el=$("found"); if(!f){el.hidden=true;el.innerHTML="";return}
  const how=f.source==="gps"?("your GPS position"+(f.acc?` (accuracy about ${Math.round(f.acc)} m)`:"")):"the spot you tapped";
  const nb=(f.neighbours&&f.neighbours.length)?`<p class="nb">Near a boundary: ${f.neighbours.map(esc).join(", ")} also occur within about ${f.radius||100} m, so the neighbouring profile may fit better.</p>`:"";
  el.innerHTML=`<p><b>Soil map at ${how}</b>: map unit <b>${esc(state.code)}</b>.</p>${nb}<p class="small">The 1:50,000 map is generalised; at a single spot the real soil can differ from this typical profile.</p><button type="button" id="toMap" class="linkbtn">Show on map</button>`;
  el.hidden=false;
  const b=$("toMap"); if(b) b.onclick=()=>setView("map");
}

function step(dir){const i=ORDER.findIndex(u=>u.code===state.base);const n=ORDER[(i+dir+ORDER.length)%ORDER.length].code;show(n)}

/* ---- unit search sheet (base units; a typed search also finds map codes with extra letters) ---- */
function renderList(q){
  q=q.trim().toLowerCase(); const out=[]; let last=null;
  const items=ORDER.filter(u=>!q||u.code.toLowerCase().includes(q)||u.name.toLowerCase().includes(q)||mainEn(u).toLowerCase().includes(q)||u.main.toLowerCase().includes(q));
  const variants=q?Object.keys(CODES).filter(c=>CODES[c].u!==c&&c.toLowerCase().includes(q)).sort((a,b)=>CODES[b].n-CODES[a].n):[];
  if(!items.length&&!variants.length){$("list").innerHTML='<div class="empty">No soil unit or map code matches that search.</div>';return}
  items.slice(0,q?60:400).forEach(u=>{
    if(!q&&mainEn(u)!==last){last=mainEn(u);out.push(`<h3>${esc(last)}</h3>`)}
    out.push(`<button type="button" role="option" data-code="${esc(u.code)}"${u.code===state.code?' aria-current="true"':""}><span class="c">${esc(u.code)}</span><span class="n">${esc(u.name)}</span></button>`);
  });
  if(variants.length){
    out.push("<h3>Map codes with extra letters</h3>");
    variants.slice(0,40).forEach(c=>out.push(`<button type="button" role="option" data-code="${esc(c)}"${c===state.code?' aria-current="true"':""}><span class="c">${esc(c)}</span><span class="n">variant of ${esc(CODES[c].u)}: ${esc(UNITS[CODES[c].u].name)}</span></button>`));
    if(variants.length>40) out.push(`<div class="empty">Showing 40 of ${variants.length} map codes. Type more to narrow.</div>`);
  }
  if(q&&items.length>60) out.push(`<div class="empty">Showing 60 of ${items.length}. Type more to narrow.</div>`);
  $("list").innerHTML=out.join("");
}
function openSheet(){$("sheet").hidden=false;$("q").value="";renderList("");document.body.style.overflow="hidden";setTimeout(()=>$("q").focus(),30);
  const cur=$("list").querySelector('[aria-current="true"]'); if(cur) cur.scrollIntoView({block:"center"})}
function closeSheet(){$("sheet").hidden=true;document.body.style.overflow="";$("open").focus()}
$("open").onclick=openSheet; $("close").onclick=closeSheet;
$("q").oninput=e=>renderList(e.target.value);
$("list").onclick=e=>{const b=e.target.closest("button[data-code]");if(b){const t=parseCode(b.dataset.code);if(t)show(t.base,null,t.code);closeSheet()}};
document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&!$("sheet").hidden) closeSheet();
  else if($("sheet").hidden&&$("viewProfile")&&!$("viewProfile").hidden&&!/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)){ if(e.key==="ArrowRight")step(1); if(e.key==="ArrowLeft")step(-1) } });
$("prev").onclick=()=>step(-1); $("next").onclick=()=>step(1);
$("svgWrap").addEventListener("click",e=>{const t=e.target.closest(".hzl");if(!t)return;const el=$("hz-"+t.dataset.hz);if(!el)return;el.open=true;el.classList.add("flash");el.scrollIntoView({block:"center",behavior:"smooth"});setTimeout(()=>el.classList.remove("flash"),1600)});
$("codeSel").onchange=e=>show(state.base,null,e.target.value);
$("ver").onchange=e=>show(state.base,Number(e.target.value),state.code,state.found);
$("rules").innerHTML=RULES.map(r=>"<li>"+esc(r)+"</li>").join("");
$("trnote").textContent=translationNote();
$("ver2").textContent="NL_BodeMapp v"+APP_VERSION;
window.addEventListener("hashchange",()=>{const t=fromHash(); if(t&&t.code!==state.code) show(t.base,null,t.code)});

/* ---- views: profile / map (the map tab only exists when map.js and the map libraries are present) ---- */
function setView(v){
  const map=(v==="map")&&window.NLBM_MAP&&window.NLBM_MAP.ready;
  $("viewProfile").hidden=!!map; $("viewMap").hidden=!map;
  $("tabProfile").setAttribute("aria-pressed",String(!map)); $("tabMap").setAttribute("aria-pressed",String(!!map));
  if(map) window.NLBM_MAP.open(state);
  window.scrollTo(0,0);
}
window.nlbmSetView=setView;
function layoutTop(){document.documentElement.style.setProperty("--topH",$("top").offsetHeight+"px")}
if(window.NLBM_MAP&&window.NLBM_MAP.ready){
  $("tabs").hidden=false;
  $("tabProfile").onclick=()=>setView("profile"); $("tabMap").onclick=()=>setView("map");
  window.addEventListener("resize",layoutTop); layoutTop();
  const row=document.createElement("div"); row.id="locRow";
  row.innerHTML='<button type="button" id="locProfile" class="linkbtn">Find the soil at my location</button>';
  document.querySelector("#viewProfile .picker").after(row);
  $("locProfile").onclick=()=>window.NLBM_MAP.locate();
  document.querySelector("#viewProfile .foot").insertAdjacentHTML("beforeend","<p>Your location stays on your device. Loading the map tells the tile servers (the host of this app, and PDOK/Kadaster for the basemap) which area you are looking at.</p>");
}

const start=fromHash()||parseCode(store("nlbm_code"))||{base:"pZg23",code:"pZg23"};
show(start.base,null,start.code);
{const n=$("needjs"); if(n) n.remove();}
showSelfTest();
