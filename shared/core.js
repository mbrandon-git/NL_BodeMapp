// Shared logic for all NL_BodeMapp pages: glosses, Munsell->hex, colour rules, SVG profile drawing.
// Needs window.MUNSELL (munsell_lookup.js), window.PROFILES / window.UNITS (profiles_data.js) and window.TRANSLATIONS (translations.js) loaded first.
/* ---------- English glosses: read from translations.js (built from translations.csv, which experts can edit) ---------- */
const MAIN_EN=TRANSLATIONS.main_class, DEP_EN=TRANSLATIONS.parent_material, LU_EN=TRANSLATIONS.land_use, PEAT_EN=TRANSLATIONS.peat_type;
function translationNote(){const m=TRANSLATIONS_META; return "English translations of Dutch terms: "+m.reviewed+" of "+m.total+" reviewed by an expert, the rest are drafts (see shared/translations.csv).";}

/* ---------- Munsell -> hex (interpolates between chips of the renotation table) ---------- */
function hex2rgb(h){return [1,3,5].map(i=>parseInt(h.slice(i,i+2),16))}
function rgb2hex(c){return "#"+c.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")).join("")}
function lerp(a,b,t){return a.map((v,i)=>v+(b[i]-v)*t)}
function chromaColour(T,v,c){ // T = window.MUNSELL[hue]; v integer value
  const row=T[v]||T[Math.min(9,Math.max(1,v))]; const keys=Object.keys(row).map(Number).sort((a,b)=>a-b);
  const cc=Math.min(c,keys[keys.length-1]); let lo=keys[0],hi=keys[keys.length-1];
  for(const k of keys){ if(k<=cc) lo=k; if(k>=cc){hi=k;break} }
  const a=hex2rgb(row[lo]),b=hex2rgb(row[hi]); return hi===lo?a:lerp(a,b,(cc-lo)/(hi-lo));
}
function munsellHex(hue,V,C){
  const T=window.MUNSELL[hue]||window.MUNSELL["10YR"]; V=Math.max(1,Math.min(9,V)); C=Math.max(0,C);
  const v0=Math.floor(V),v1=Math.min(9,v0+1);
  return rgb2hex(lerp(chromaColour(T,v0,C),chromaColour(T,v1,C),V-v0));
}
const shade=(hex,f)=>rgb2hex(hex2rgb(hex).map(v=>v*f));

/* ---------- Colour estimation rules (shared by all profiles; approximate, for expert review) ---------- */
const RULES=[
 "Peat (organic matter >= 35%): by peat type. Sphagnum peat 7.5YR 3/3; forest peat 5YR 2/2; sedge peat 7.5YR 2/2; weathered or slumped peat 10YR 2/1.",
 "Peaty (organic matter 15-35%): 10YR 2/1.5.",
 "Mineral horizons: Munsell value = 6.2 - 1.55 x ln(1 + organic matter %) - 0.02 x mean lutum %, kept between 2 and 7 (darker with more organic matter and clay; log shape follows published value-vs-organic-carbon relations).",
 "Mineral horizon hue and chroma: 10YR; chroma 3 for A horizons with < 10% organic matter, 2 for A horizons with >= 10%, 4 for B/C horizons (3 if organic matter >= 2%).",
 "Gleyic horizons (g in the notation): hue 2.5Y, chroma 2, plus rusty mottles (7.5YR 5/8) when organic matter < 15%. Reduced horizons (r): hue 5Y, chroma 1.",
 "Podzol B horizons: Bh = 7.5YR 2/2; Bhs = 5YR 3/3; Bs = 7.5YR 4/6; Bhe (humus, bleached) = 10YR 3/2. Eluvial E horizons: value + 1, chroma 1-2.",
 "Lime (calcic content >= 5): value + 0.5 and chroma - 0.5.",
 "Texture marks: peat gets fibre strokes; horizons with lutum <= 10% get sand speckles."
];
function estimate(h){
  const L=h.n||"", master=L[0], suf=L.slice(1).replace(/[0-9]/g,"");
  const om=h.om!=null?h.om:((h.om_min+h.om_max)/2), lut=(h.lut_min+h.lut_max)/2/**/;
  const gley=suf.includes("g"), red=/^C?r/.test(suf)&&master==="C"||suf.startsWith("r");
  let hue="10YR",V,C,why="", mottle=false, kind="mineral";
  if(om>=35){
    kind="peat"; const pt=h.peat||"";
    if(pt==="veenmosveen"){hue="7.5YR";V=3;C=3} else if(pt==="bosveen"){hue="5YR";V=2;C=2}
    else if(pt==="zeggeveen"){hue="7.5YR";V=2;C=2} else {hue="10YR";V=2;C=1}
    why="peat ("+om+"% OM"+(pt?", "+pt:"")+")";
  } else if(om>=15){hue="10YR";V=2;C=1.5;kind="peat";why="peaty ("+om+"% OM)"}
  else {
    V=6.2-1.55*Math.log(1+om)-0.02*lut; C=master==="A"?(om>=10?2:3):(om>=2?3:4); why="value from "+om+"% OM, lutum "+h.lut_min+"-"+h.lut_max+"%";
    if(master==="B"){
      const hh=suf.includes("h"),ss=suf.includes("s"),ee=suf.includes("e");
      if(hh&&ss){hue="5YR";V=3;C=3;why="Bhs"} else if(hh&&ee){hue="10YR";V=3;C=2;why="Bhe"}
      else if(hh){hue="7.5YR";V=2;C=2;why="Bh"} else if(ss){hue="7.5YR";V=4;C=6;why="Bs"}
    }
    if(master==="E"){V+=1;C=Math.min(C,2);why="E horizon: value + 1"}
    if(gley){hue="2.5Y";C=2;mottle=om<15;why+="; gleyic"}
    if(red){hue="5Y";C=1;why+="; reduced"}
    if(h.ca>=5){V+=0.5;C=Math.max(0,C-0.5);why+="; calcareous"}
    V=Math.max(2,Math.min(7,V));
  }
  const m=hue+" "+(Math.round(V*10)/10)+"/"+(Math.round(C*10)/10);
  return {hex:munsellHex(hue,V,C),munsell:m,why,mottle,kind,sandy:kind==="mineral"&&h.lut_max<=10};
}

/* ---------- SVG profile ---------- */
function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function drawProfile(p){
  const hz=p.hz.slice().sort((a,b)=>a.top-b.top), depth=Math.max(...hz.map(h=>h.bot)), S=2.7;
  const X=96,W=84,DX=16,DY=9,TOP=26, H=depth*S, Hsvg=TOP+H+30, Wsvg=X+W+DX+56;
  const col=hz.map(estimate), wave=(x,i)=>i===0?0:2.2*Math.sin(x/11+i*1.7);
  let s=`<svg viewBox="0 0 ${Wsvg} ${Hsvg}" width="${Wsvg}" height="${Hsvg}" role="img" aria-label="Schematic soil profile ${p.unit}">`;
  const path=(i,dx,dy)=>{ // horizon polygon (front face when dx=0)
    const y0=TOP+hz[i].top*S, y1=TOP+hz[i].bot*S, pts=[], n=12;
    for(let k=0;k<=n;k++){const x=W*k/n;pts.push([X+x,y0+wave(x,i)])}
    for(let k=n;k>=0;k--){const x=W*k/n;pts.push([X+x,y1+wave(x,i+1<hz.length?i+1:99)*(i+1<hz.length?1:0)])}
    return "M"+pts.map(q=>q[0].toFixed(1)+","+q[1].toFixed(1)).join("L")+"Z";
  };
  const clip=`<clipPath id="c${p.id}"><rect x="${X}" y="${TOP-4}" width="${W}" height="${H+8}"/></clipPath>`;
  s+="<defs>"+clip+"</defs>";
  hz.forEach((h,i)=>{
    const y0=TOP+h.top*S,y1=TOP+h.bot*S,c=col[i],yo=wave(W,i),yb=i+1<hz.length?wave(W,i+1):0;
    s+=`<path d="M${X+W},${y0+yo}L${X+W+DX},${y0+yo-DY}L${X+W+DX},${y1+yb-DY}L${X+W},${y1+yb}Z" fill="${shade(c.hex,.72)}" stroke="#0003" stroke-width=".5"/>`;
  });
  s+=`<path d="M${X},${TOP}L${X+DX},${TOP-DY}L${X+W+DX},${TOP-DY}L${X+W},${TOP}Z" fill="${shade(col[0].hex,1.12)}" stroke="#0003" stroke-width=".5"/>`;
  hz.forEach((h,i)=>{
    const c=col[i], r=rng(p.id*31+i*7); let ex="";
    const y0=TOP+h.top*S,y1=TOP+h.bot*S, area=(y1-y0)*W;
    if(c.mottle){const n=Math.round(area/260);for(let k=0;k<n;k++)ex+=`<ellipse cx="${X+4+r()*(W-8)}" cy="${y0+3+r()*(y1-y0-6)}" rx="${1.5+r()*2.5}" ry="${1+r()*1.5}" fill="${munsellHex("7.5YR",5,8)}" opacity=".75"/>`}
    if(c.sandy){const n=Math.round(area/60);for(let k=0;k<n;k++)ex+=`<circle cx="${X+2+r()*(W-4)}" cy="${y0+2+r()*(y1-y0-4)}" r=".7" fill="${shade(c.hex,r()>.5?1.25:.8)}"/>`}
    if(c.kind==="peat"){const n=Math.round(area/120);for(let k=0;k<n;k++){const x=X+3+r()*(W-6),y=y0+3+r()*(y1-y0-6);ex+=`<path d="M${x},${y}l${3+r()*4},${r()*2-1}" stroke="${shade(c.hex,1.5)}" stroke-width=".8" opacity=".6"/>`}}
    s+=`<path d="${path(i)}" fill="${c.hex}" stroke="#0004" stroke-width=".6"/><g clip-path="url(#c${p.id})">${ex}</g>`;
  });
  s+=`<rect x="${X}" y="${TOP}" width="${W}" height="${H}" fill="none" stroke="#0005" stroke-width="1"/>`;
  // labels left (horizon notation), nudged apart; depth ticks right
  let lastY=-99; hz.forEach((h,i)=>{
    let y=TOP+((h.top+h.bot)/2)*S+4; if(y<lastY+12) y=lastY+12; lastY=y;
    s+=`<text class="hzl" data-hz="${i}" x="${X-8}" y="${y}" text-anchor="end" style="cursor:pointer">${h.n}</text>`;
  });
  s+=`<text class="tick" x="${X+W+DX+6}" y="${TOP-DY+4}">0 cm</text>`;
  hz.forEach(h=>{const y=TOP+h.bot*S; s+=`<line x1="${X+W+DX-2}" x2="${X+W+DX+4}" y1="${y-DY}" y2="${y-DY}" stroke="#888"/><text class="tick" x="${X+W+DX+6}" y="${y-DY+4}">${h.bot} cm</text>`});
  return {svg:s+"</svg>",col,hz};
}


/* ---------- Horizon codes: what each letter and digit means (text comes from translations.csv, handbook section 2.2) ---------- */
const escapeHtml=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function explainHorizon(code){
  const T=TRANSLATIONS, S=window.TRANSLATIONS_SHORT||{}, hm=T.horizon_master||{}, hs=T.horizon_suffix||{}, hd=T.horizon_digit||{}, sm=S.horizon_master||{}, ss=S.horizon_suffix||{}, sd=S.horizon_digit||{};
  const m=/^(\d*)([A-Z]+)([a-z]*)(\d*)$/.exec(code||"");
  if(!m) return {parts:[{token:code,text:"notation not recognised"}],summary:""};
  const lead=m[1], mas=m[2], suf=m[3], trail=m[4], parts=[], short=[], letters=mas.split("");
  if(lead){parts.push({token:lead,text:hd["cijfer voor de hoofdhorizont"]||""});short.push(sd["cijfer voor de hoofdhorizont"]||"parent-material change")}
  if(letters.length===1){parts.push({token:mas,text:hm[mas]||"no definition found"});short.push(sm[mas]||mas)}
  else{
    const nm=l=>(sm[l]||l)+" ("+l+")";
    parts.push({token:mas,text:"transition horizon between "+letters.map(nm).join(" and ")+", with features of both"});
    short.push("transition "+letters.map(l=>sm[l]||l).join(" / "));
  }
  for(const ch of suf){
    const per=letters.map(l=>[l,hs[l+"+"+ch],ss[l+"+"+ch]]).filter(x=>x[1]);
    let text,sh;
    if(per.length){
      const uniq=[...new Set(per.map(x=>x[1]))];
      text=uniq.length===1?uniq[0]:per.map(x=>x[0]+": "+x[1]).join("; ");
      sh=[...new Set(per.map(x=>x[2]).filter(Boolean))].join(" / ");
    } else if(hs["*+"+ch]){text=hs["*+"+ch];sh=ss["*+"+ch]||""}
    else {text="no definition found in the handbook";sh=ch}
    parts.push({token:ch,text});short.push(sh||ch);
  }
  if(trail){parts.push({token:trail,text:hd["cijfer achter de kleine-lettertoevoeging"]||""});short.push((sd["cijfer achter de kleine-lettertoevoeging"]||"sub-layer")+" "+trail)}
  return {parts,summary:short.join(" · ")};
}
function horizonListHTML(d,prefix){
  return d.hz.map((h,i)=>{const ex=explainHorizon(h.n);
    return `<details class="hzx" id="${prefix}-${i}"><summary><span class="sw" style="background:${d.col[i].hex}"></span><b class="hzc">${escapeHtml(h.n)}</b> <span class="hzd">${h.top}-${h.bot} cm</span> <span class="hzs">${escapeHtml(ex.summary)}</span></summary><ul>${ex.parts.map(p=>`<li><b>${escapeHtml(p.token)}</b> ${escapeHtml(p.text)}</li>`).join("")}</ul></details>`}).join("");
}

/* ---------- Map codes: extra letters before / after the base unit (top-layer and bottom-layer additions) ---------- */
function codeCaptionHTML(code){
  const c=window.CODES&&CODES[code]; if(!c||(!c.p&&!c.s)) return "";
  const T=TRANSLATIONS, C=window.TRANSLATIONS_CONF||{}, top=T.top_addition||{}, bot=T.bottom_addition||{}, ct=C.top_addition||{}, cb=C.bottom_addition||{};
  const flag=k=>k==="low"?' <span class="lowc" title="Low-confidence translation: needs expert review">?</span>':"";
  const li=(ch,where,dict,conf)=>`<li><b>${escapeHtml(ch)}</b> <span class="ccw">${where}</span> ${escapeHtml(dict[ch]||"no definition found")}${flag(conf[ch])}</li>`;
  const items=c.p.split("").map(ch=>li(ch,"top layer",top,ct)).concat(c.s.split("").map(ch=>li(ch,"bottom layer",bot,cb)));
  return `<div class="codecap"><p class="cch">Map code <b>${escapeHtml(code)}</b> = base unit <b>${escapeHtml(c.u)}</b> plus extra letters</p><ul>${items.join("")}</ul><p class="ccn">Letters in front describe the top layer (to about 40 to 50 cm), letters behind it the bottom layer (40 to 120 cm). A "?" marks a translation that still needs an expert check.</p></div>`;
}

/* ---------- Self-test: draws every profile once (open any page with ?selftest) ---------- */
function runSelfTest(){
  let ok=0,bad=[],hexbad=0,mot=0;const kinds={},dep=[];
  for(const id in PROFILES){try{const d=drawProfile(PROFILES[id]);ok++;dep.push(Math.max(...PROFILES[id].hz.map(h=>h.bot)));d.col.forEach(c=>{if(!/^#[0-9a-f]{6}$/.test(c.hex))hexbad++;if(c.mottle)mot++;kinds[c.kind]=(kinds[c.kind]||0)+1})}catch(e){bad.push(id+": "+e.message)}}
  return {drawn:ok,errors:bad.slice(0,5),badHex:hexbad,mottled:mot,kinds,depthMin:Math.min(...dep),depthMax:Math.max(...dep),noHorizons:Object.values(PROFILES).filter(p=>!p.hz.length).length};
}
function showSelfTest(){ if(!location.search.includes("selftest")) return; const pre=document.createElement("pre");pre.id="selftest";pre.style.whiteSpace="pre-wrap";pre.style.wordBreak="break-all";pre.textContent=JSON.stringify(runSelfTest());document.body.append(pre); }
