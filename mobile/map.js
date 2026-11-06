/* Map tab: soil map (vector tiles) over the Dutch government basemap, tap or GPS to find the map unit and its typical profile.
   Needs MapLibre GL JS + pmtiles (vendor/) and the tile file; without them window.NLBM_MAP.ready stays false and the page has no map tab. */
(function(){
  if(typeof maplibregl==="undefined"||typeof pmtiles==="undefined"){window.NLBM_MAP={ready:false};return}
  const CFG=window.NLBM_CONFIG||{};
  const TILES=CFG.tilesUrl||"data/soil.pmtiles";
  const BASEMAP=CFG.basemapUrl||"https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png";
  // main soil class colours (keys = MAIN_CLASSES in profiles_data.js; index order is used by the tile property mc)
  const COLORS={"Brikgronden":"#c0793d","Dikke eerdgronden":"#8c6d31","Gedefinieerde associaties":"#9e9e9e","Kalkhoudende zandgronden":"#e6c35c","Kalkloze zandgronden":"#f2e394","Kalksteen verweringsgronden":"#cfcfcf","Keileemgronden":"#a1887f","Leemgronden":"#d9a066","Moerige gronden":"#6d4c41","Niet-gerijpte minerale gronden":"#8e9e82","Oude rivierkleigronden":"#c9785d","Podzolgronden":"#9575cd","Rivierkleigronden":"#a5c63b","Veengronden":"#4e342e","Zeekleigronden":"#2e9e50","Zeer oude fluviatiele afzettingen":"#5d9b8a","Zeer oude mariene afzettingen":"#5c6bc0"};   // no blue for land soils: the basemap's water is blue
  const NL_BOUNDS=[[2.9,50.6],[7.4,53.7]];     // generous box around the Netherlands (lng/lat)
  const $=id=>document.getElementById(id);
  const esc=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  let map=null, marker=null, current=null;       // current = last lookup {lngLat, source, acc, code, pid, base, neighbours}

  function style(){
    const match=["match",["get","mc"]];
    MAIN_CLASSES.forEach((c,i)=>match.push(i,COLORS[c]||"#bbbbbb"));
    match.push("#cccccc");
    return {version:8,
      sources:{
        base:{type:"raster",tiles:[BASEMAP],tileSize:256,maxzoom:19,attribution:"Basemap: Kadaster (BRT Achtergrondkaart)"},
        soil:{type:"vector",url:"pmtiles://"+new URL(TILES,location.href).href,attribution:"Soil map: BRO / Wageningen Environmental Research (CC0)"}},
      layers:[
        {id:"bg",type:"background",paint:{"background-color":"#e9ecef"}},
        {id:"base",type:"raster",source:"base"},
        {id:"soil-fill",type:"fill",source:"soil","source-layer":"soil",paint:{"fill-color":match,"fill-opacity":0.55}},
        {id:"soil-line",type:"line",source:"soil","source-layer":"soil",minzoom:9,paint:{"line-color":"#222","line-opacity":0.35,"line-width":0.6}},
        {id:"soil-sel",type:"line",source:"soil","source-layer":"soil",filter:["==",["get","i"],-1],paint:{"line-color":"#e0245e","line-width":3}}]};
  }

  function init(){
    if(map) return;
    maplibregl.addProtocol("pmtiles",new pmtiles.Protocol().tile);
    map=new maplibregl.Map({container:"map",style:style(),center:[5.3,52.15],zoom:7,minZoom:6,maxZoom:18,maxBounds:NL_BOUNDS,attributionControl:{compact:true}});
    map.addControl(new maplibregl.NavigationControl({showCompass:false}),"bottom-right");
    map.on("click",e=>lookup(e.lngLat,"tap"));
    map.on("error",e=>{ if(e&&e.error&&/pmtiles|soil|Failed to fetch/i.test(String(e.error.message||""))) message("The soil map tiles could not be loaded. Check your internet connection.") });
    $("locBtn").onclick=locate;
    $("maplegend").innerHTML='<details><summary>Legend</summary><ul class="lg">'+MAIN_CLASSES.map(c=>`<li><span class="lgs" style="background:${COLORS[c]||"#ccc"}"></span>${esc(MAIN_EN[c]||c)}</li>`).join("")+'</ul></details>';
  }

  function message(html){const c=$("mapcard");c.innerHTML=`<p>${html}</p>`;c.hidden=false}
  const metresPerPixel=(lat,z)=>78271.517*Math.cos(lat*Math.PI/180)/Math.pow(2,z);
  const unique=fs=>{const seen=new Set();return fs.filter(f=>{const k=f.properties.i;if(seen.has(k))return false;seen.add(k);return true})};

  /* find the polygon under a point (after the map has loaded the tiles there) and publish the result */
  // map calls that throw while the style is still loading are treated as "nothing found yet"
  const rendered=(geom)=>{try{return map.queryRenderedFeatures(geom,{layers:["soil-fill"]})}catch(e){return []}};
  const select=i=>{try{map.setFilter("soil-sel",["==",["get","i"],i])}catch(e){}};
  function resolve(lngLat,source,acc,quiet){
    const pt=map.project(lngLat);
    const hit=rendered(pt);
    if(!hit.length){
      if(!quiet){
        current=null; select(-1);
        message("<b>No soil map data at this spot.</b> The Bodemkaart has no unit here (for example built-up areas or open water), or the map tiles are slow to load. Check your connection and try again.");
      }
      return false;
    }
    const p=hit[0].properties, code=p.sc, ci=CODES[code];
    if(!ci){message(`Map code <b>${esc(code)}</b> is not in the profile data.`);return false}
    const R=100, r=R/metresPerPixel(lngLat.lat,map.getZoom());
    const near=unique(rendered([[pt.x-r,pt.y-r],[pt.x+r,pt.y+r]]));
    const others=[...new Set(near.map(f=>f.properties.sc).filter(sc=>sc!==code))];
    select(p.i);
    if(!marker) marker=new maplibregl.Marker({color:"#e0245e"});
    marker.setLngLat(lngLat).addTo(map);
    current={lngLat,source,acc,code,pid:p.pid,base:ci.u,neighbours:others,radius:R};
    const u=UNITS[ci.u];
    $("mapcard").hidden=false;
    $("mapcard").innerHTML=`<p><b>${esc(code)}</b> ${esc(MAIN_EN[u.main]||u.main)}<br><span class="small">${esc(u.name)}</span></p>`+
      (others.length?`<p class="small">Near a boundary: ${others.slice(0,4).map(esc).join(", ")} also occur within about ${R} m.</p>`:"")+
      `<button type="button" class="linkbtn" id="seeProfile">See typical profile</button>`;
    $("seeProfile").onclick=()=>publish(true);
    return true;
  }
  function publish(switchView){
    if(!current) return;
    window.nlbmShow(current.base,current.pid,current.code,{source:current.source,acc:current.acc,neighbours:current.neighbours,radius:current.radius});
    if(switchView) window.nlbmSetView("profile");
  }

  /* move to a point, then keep trying the lookup until the soil tiles there have been drawn (the basemap does not matter).
     A newer lookup cancels an older one. Only after about 5 s without a hit do we say there is no soil data. */
  let lookupId=0;
  function goAndResolve(lngLat,zoom,source,acc,thenShow){
    const id=++lookupId;
    const needMove=Math.abs(map.getZoom()-zoom)>0.4||map.project(lngLat).dist(map.project(map.getCenter()))>20;
    let tries=0;
    const inView=()=>{const p=map.project(lngLat),c=map.getCanvas();return p.x>=0&&p.y>=0&&p.x<=c.clientWidth&&p.y<=c.clientHeight};
    const attempt=()=>{
      if(id!==lookupId) return;
      if(inView()&&!map.isMoving()&&resolve(lngLat,source,acc,true)){ if(thenShow) publish(true); return }
      if(++tries<26){ setTimeout(attempt,250); return }
      resolve(lngLat,source,acc,false);                         // shows the "no soil map data" message
    };
    if(needMove) map.flyTo({center:lngLat,zoom,duration:700,essential:true});
    setTimeout(attempt,needMove?800:0);
  }
  function lookup(lngLat,source){
    message("Looking up the soil map...");
    goAndResolve(lngLat,Math.max(map.getZoom(),12),source,null,false);
  }

  function locate(){
    if(!navigator.geolocation){message("This browser cannot give your location.");return}
    message("Finding your location...");
    navigator.geolocation.getCurrentPosition(pos=>{
      const lng=pos.coords.longitude, lat=pos.coords.latitude;
      if(lng<NL_BOUNDS[0][0]||lng>NL_BOUNDS[1][0]||lat<NL_BOUNDS[0][1]||lat>NL_BOUNDS[1][1]){message("Your location is outside the area of the Dutch soil map.");return}
      goAndResolve(new maplibregl.LngLat(lng,lat),14,"gps",pos.coords.accuracy,true);
    },err=>{
      const why=err&&err.code===1?"Location access was denied. Allow it for this site in your browser or phone settings, or tap the map instead.":err&&err.code===3?"Finding your location took too long. Try again, or tap the map.":"Your location is not available. Tap the map instead.";
      message(why);
    },{enableHighAccuracy:true,timeout:20000,maximumAge:30000});
  }

  window.NLBM_MAP={ready:true,
    open(){init();setTimeout(()=>{map.resize();if(current)map.jumpTo({center:current.lngLat})},0)},
    locate(){window.nlbmSetView("map");init();setTimeout(()=>{map.resize();locate()},50)},
    lookupAt(lng,lat){window.nlbmSetView("map");init();setTimeout(()=>{map.resize();goAndResolve(new maplibregl.LngLat(lng,lat),14,"tap",null,true)},50)}};   // lookupAt: for tests
})();
