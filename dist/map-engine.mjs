const S=window.SatelliteMath;
const DEFAULT_VIEW={center:[26.5565,41.6776],zoom:16.15,pitch:52,bearing:-28};
const attribution='Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community';
export function overviewInfo(){const a=S.mercator(26.511,41.700),b=S.mercator(26.595,41.646),cx=(a[0]+b[0])/2,cy=(a[1]+b[1])/2,h=b[1]-a[1],w=Math.max(b[0]-a[0],h*132/85),hh=Math.max(h,w*85/132);return {west:cx-w/2,east:cx+w/2,north:cy-hh/2,south:cy+hh/2};}
export function overviewURL(bounds,width=264,height=170){const c=S.CIRCUMFERENCE,bbox=[(bounds.west-.5)*c,(.5-bounds.south)*c,(bounds.east-.5)*c,(.5-bounds.north)*c];const q=new URLSearchParams({bbox:bbox.join(','),bboxSR:'3857',imageSR:'3857',size:`${width},${height}`,format:'jpg',f:'image'});return 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?'+q;}
function canUse3D(){if(!window.DecompressionStream)return false;try{const c=document.createElement('canvas'),gl=c.getContext('webgl2');if(!gl)return false;gl.getExtension('WEBGL_lose_context')?.loseContext();return true;}catch{return false;}}
export async function createMapEngine(container,{onMove=()=>{},onStatus=()=>{},reducedMotion=false}={}){
 if(canUse3D()){
  let map;
  try{
   const L=await import('./vendor/maplibre/maplibre-gl.mjs');L.setWorkerUrl(new URL('./vendor/maplibre/maplibre-gl-worker.mjs',import.meta.url).href);L.setMaxParallelImageRequests(10);
   const surface=document.createElement('div');surface.className='maplibre-surface';container.replaceChildren(surface);
   map=new L.Map({keyboard:false,container:surface,center:DEFAULT_VIEW.center,zoom:DEFAULT_VIEW.zoom,pitch:DEFAULT_VIEW.pitch,bearing:DEFAULT_VIEW.bearing,maxPitch:68,minZoom:12.5,maxZoom:18.2,maxBounds:[[26.46,41.61],[26.66,41.74]],pixelRatio:Math.min(devicePixelRatio||1,1.5),attributionControl:false,renderWorldCopies:false,fadeDuration:150,style:{version:8,projection:{type:'mercator'},sources:{satellite:{type:'raster',tiles:['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:18,attribution}},layers:[{id:'satellite',type:'raster',source:'satellite',paint:{'raster-fade-duration':150,'raster-resampling':'linear'}}]}});
   await new Promise((resolve,reject)=>{map.once('load',resolve);map.once('error',e=>{if(!map.loaded())reject(e.error);});setTimeout(()=>{if(!map.isStyleLoaded())reject(Error('Map initialization timed out'));},18000);});
   const {createBuildingLayer}=await import('./photo-buildings.mjs');const layer=createBuildingLayer(new URL('./scene3d/',import.meta.url),{onStatus});map.addLayer(layer);
   const adapter={available3D:true,
    getView(){const c=map.getCenter();return {center:[c.lng,c.lat],zoom:map.getZoom(),pitch:map.getPitch(),bearing:map.getBearing()};},
    setView(v,animate=true){const state={...v,duration:reducedMotion||!animate?0:700,essential:false};map.easeTo(state);},
    home(){this.setView(DEFAULT_VIEW);},zoomBy(f,point){const options={duration:reducedMotion?0:220};if(point)options.around=map.unproject(point);map.easeTo({zoom:S.clamp(map.getZoom()+Math.log2(f),12.5,18.2),...options});},
    panBy(p){map.panBy(p,{duration:reducedMotion?0:130});},project(lon,lat){const p=map.project([lon,lat]);return [p.x,p.y];},
    getBounds(){const b=map.getBounds();return {west:b.getWest(),east:b.getEast(),north:b.getNorth(),south:b.getSouth()};},
    metresToPixels(m){const c=map.getCenter();return 512*2**map.getZoom()*m/(S.CIRCUMFERENCE*Math.cos(c.lat*Math.PI/180));},
    set3D(v){this.setView({pitch:v?52:0});},setPitch(p){this.setView({pitch:p},false);},setNorth(){this.setView({bearing:0});},
    setQuality(v){map.setPixelRatio(v==='low'?1:Math.min(devicePixelRatio||1,v==='high'?2:1.5));layer.setQuality(v);},setNight(v){layer.setNight(v);},
    resize(){map.resize();},destroy(){map.remove();}
   };map.on('move',()=>onMove(adapter));map.on('idle',()=>onStatus({imageryReady:true}));onStatus({engine:'webgl3d',available3D:true});return adapter;
  }catch(error){map?.remove();console.warn('Using 2D satellite fallback:',error);}
 }
 onStatus({engine:'satellite2d',available3D:false});return createFallback(container,{onMove,onStatus,reducedMotion});
}
function createFallback(container,{onMove,onStatus,reducedMotion}){
 const world=document.createElement('div');world.className='satellite-world';container.replaceChildren(world);
 let view={...DEFAULT_VIEW,pitch:0,bearing:0,center:[...DEFAULT_VIEW.center]},W=container.clientWidth,H=container.clientHeight,raf=0,timer=0,animation=null,drag=null,pinch=null,wantedTiles=new Set(),tileZoom=-1,quality='auto';const images=new Map(),pointers=new Map();
 function scale(){return 512*2**view.zoom*S.METER;}
 function clampCenter(){view.center=[S.clamp(view.center[0],26.46,26.66),S.clamp(view.center[1],41.61,41.74)];}
 function request(){if(!raf)raf=requestAnimationFrame(paint);}
 function paint(now){raf=0;if(animation){const t=S.clamp((now-animation.start)/animation.duration,0,1),e=1-(1-t)**3;view.center=[animation.a.center[0]+(animation.b.center[0]-animation.a.center[0])*e,animation.a.center[1]+(animation.b.center[1]-animation.a.center[1])*e];view.zoom=animation.a.zoom+(animation.b.zoom-animation.a.zoom)*e;if(t===1)animation=null;}
  const c=S.local(...view.center),s=scale();world.style.transform=`translate3d(${W/2-c[0]*s}px,${H/2-c[1]*s}px,0) scale(${s})`;if(!timer)timer=setTimeout(()=>{timer=0;tiles();},80);onMove(adapter);if(animation)request();
 }
 function tiles(){
  const z=S.clamp(Math.round(view.zoom+(quality==='low'?0:1)),12,18),n=2**z,c=S.mercator(...view.center),s=scale(),mx=W/2/s*S.METER,my=H/2/s*S.METER;
  const c0=Math.floor((c[0]-mx)*n),c1=Math.floor((c[0]+mx)*n),r0=Math.floor((c[1]-my)*n),r1=Math.floor((c[1]+my)*n),wanted=new Set();wantedTiles=wanted;tileZoom=z;
  for(let y=r0;y<=r1;y++)for(let x=c0;x<=c1;x++){
   const key=`${z}/${x}/${y}`;wanted.add(key);if(images.has(key))continue;
   const p=[(x/n-S.ORIGIN_MERCATOR[0])/S.METER,(y/n-S.ORIGIN_MERCATOR[1])/S.METER],span=1/n/S.METER,img=new Image();img.alt='';img.draggable=false;img.className='satellite-tile';img.style.cssText=`left:${p[0]}px;top:${p[1]}px;width:${span+.2}px;height:${span+.2}px;`;img.onload=()=>{img.classList.add('ready');onStatus({imageryReady:true});prune();};img.onerror=()=>{img.remove();images.delete(key);};img.src=S.imageryURL(z,x,y);images.set(key,{img,z});world.append(img);
  }prune();
 }
 function prune(){const wanted=wantedTiles,z=tileZoom,complete=[...wanted].every(k=>images.get(k)?.img.complete&&images.get(k)?.img.naturalWidth);for(const[k,i]of images)if(!wanted.has(k)&&(i.z===z||complete||images.size>60)){i.img.remove();images.delete(k);}}
 const adapter={available3D:false,
  getView(){return {...view,center:[...view.center]};},setView(v,animate=true){const target={...view,...v,pitch:0,bearing:0,center:v.center||view.center};if(animate&&!reducedMotion){animation={a:{...view,center:[...view.center]},b:target,start:performance.now(),duration:500};}else{view=target;clampCenter();}request();},home(){this.setView({...DEFAULT_VIEW,pitch:0});},
  zoomBy(f,point){animation=null;const before=point?this.unproject(point):null;view.zoom=S.clamp(view.zoom+Math.log2(f),12.5,18.2);if(before){const c=S.local(...before),s=scale();view.center=S.fromLocal(c[0]-(point[0]-W/2)/s,c[1]-(point[1]-H/2)/s);}clampCenter();request();},
  panBy(p){const c=S.local(...view.center),s=scale();this.setView({center:S.fromLocal(c[0]+p[0]/s,c[1]+p[1]/s)});},project(lon,lat){const p=S.local(lon,lat),c=S.local(...view.center),s=scale();return [W/2+(p[0]-c[0])*s,H/2+(p[1]-c[1])*s];},unproject(p){const c=S.local(...view.center),s=scale();return S.fromLocal(c[0]+(p[0]-W/2)/s,c[1]+(p[1]-H/2)/s);},
  getBounds(){const nw=this.unproject([0,0]),se=this.unproject([W,H]);return {west:nw[0],east:se[0],north:nw[1],south:se[1]};},metresToPixels(m){return m*scale();},set3D(){},setPitch(){},setNorth(){},setNight(){},setQuality(v){quality=v;tiles();},resize(){W=container.clientWidth;H=container.clientHeight;request();},destroy(){cancelAnimationFrame(raf);clearTimeout(timer);}
 };
 container.addEventListener('pointerdown',e=>{container.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);animation=null;container.classList.add('dragging');if(pointers.size===1)drag={p:[e.clientX,e.clientY],center:S.local(...view.center)};if(pointers.size===2){const[a,b]=[...pointers.values()];pinch={distance:Math.hypot(a[0]-b[0],a[1]-b[1])};drag=null;}});
 container.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===2&&pinch){const[a,b]=[...pointers.values()],distance=Math.hypot(a[0]-b[0],a[1]-b[1]);adapter.zoomBy(distance/pinch.distance,[(a[0]+b[0])/2,(a[1]+b[1])/2]);pinch={distance};}else if(drag){const s=scale();view.center=S.fromLocal(drag.center[0]-(e.clientX-drag.p[0])/s,drag.center[1]-(e.clientY-drag.p[1])/s);clampCenter();request();}});
 function end(e){pointers.delete(e.pointerId);if(!pointers.size){drag=null;pinch=null;container.classList.remove('dragging');tiles();}else if(pointers.size===1){const p=[...pointers.values()][0];drag={p,center:S.local(...view.center)};pinch=null;}}
 container.addEventListener('pointerup',end);container.addEventListener('pointercancel',end);container.addEventListener('lostpointercapture',e=>{if(pointers.has(e.pointerId))end(e);});container.addEventListener('wheel',e=>{e.preventDefault();adapter.zoomBy(Math.exp(-S.clamp(e.deltaY,-180,180)*.0017),[e.clientX,e.clientY]);},{passive:false});container.addEventListener('dblclick',e=>adapter.zoomBy(1.6,[e.clientX,e.clientY]));request();tiles();return adapter;
}
