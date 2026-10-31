import {withDeadline,waitForMapReady,createModeController,assertMapViewport} from './engine-lifecycle.mjs?v=3.2';
const S=window.SatelliteMath;
const DEFAULT_VIEW={center:[26.5565,41.6776],zoom:16.15,pitch:52,bearing:-28};
const attribution='Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community';
export function overviewInfo(){const a=S.mercator(26.511,41.700),b=S.mercator(26.595,41.646),cx=(a[0]+b[0])/2,cy=(a[1]+b[1])/2,h=b[1]-a[1],w=Math.max(b[0]-a[0],h*132/85),hh=Math.max(h,w*85/132);return {west:cx-w/2,east:cx+w/2,north:cy-hh/2,south:cy+hh/2};}
export function overviewURL(bounds,width=264,height=170){const c=S.CIRCUMFERENCE,bbox=[(bounds.west-.5)*c,(.5-bounds.south)*c,(bounds.east-.5)*c,(.5-bounds.north)*c];const q=new URLSearchParams({bbox:bbox.join(','),bboxSR:'3857',imageSR:'3857',size:`${width},${height}`,format:'jpg',f:'image'});return 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?'+q;}
function require3D(){
 let gl;
 try{gl=document.createElement('canvas').getContext('webgl2');}catch{}
 if(!gl){const error=new Error('WebGL 2 çizim bağlamı başlatılamadı. 3D bu tarayıcı oturumunda kullanılamıyor.');error.code='WEBGL_CONTEXT';throw error;}
 gl.getExtension('WEBGL_lose_context')?.loseContext();
 if(!window.DecompressionStream){const error=new Error('Bu tarayıcı 3D bina verisini açmak için gereken DecompressionStream özelliğini sunmuyor.');error.code='DECOMPRESSION_UNAVAILABLE';throw error;}
}
export function createMapEngine(container,{onMove=()=>{},onStatus=()=>{},reducedMotion=false,mode='2d',imageryURLs=S.imageryURLs}={}){
 const plane=document.createElement('div');plane.className='map-plane satellite-plane';container.replaceChildren(plane);
 let controller;
 const moved=()=>onMove(controller),fallback=createFallback(plane,{onMove:moved,onStatus,reducedMotion,imageryURLs});
 controller=createModeController(fallback,async(view,signal)=>{view.bearing=view.bearing||DEFAULT_VIEW.bearing;
  require3D();
  const stage=document.createElement('div');stage.className='map-plane maplibre-surface';stage.style.opacity='0';stage.style.pointerEvents='none';container.append(stage);
  try{return await createWebGL(stage,{view,signal,onMove:moved,onStatus:s=>{if(!signal.aborted)onStatus(s);},reducedMotion});}catch(error){stage.remove();throw error;}
 },{onMode:s=>{onStatus(s);moved();}});
 // A working 2D viewer is returned immediately. 3D never blocks its controls.
 if(mode==='3d')queueMicrotask(()=>controller.start3D());
 return controller;
}
async function createWebGL(container,{view,signal,onMove,onStatus,reducedMotion}){
 let map;
 try{
   const L=await withDeadline(import('./vendor/maplibre/maplibre-gl.mjs'),6000,'3D motoru',signal);if(signal.aborted)throw Error('İşlem iptal edildi');L.setWorkerUrl(new URL('./vendor/maplibre/maplibre-gl-worker.mjs',import.meta.url).href);L.setMaxParallelImageRequests(10);
   const surface=container;
   map=new L.Map({keyboard:false,container:surface,center:view.center,zoom:view.zoom,pitch:view.pitch,bearing:view.bearing,maxPitch:68,minZoom:12.5,maxZoom:18.2,maxBounds:[[26.46,41.61],[26.66,41.74]],pixelRatio:Math.min(devicePixelRatio||1,1.5),attributionControl:false,renderWorldCopies:false,fadeDuration:150,style:{version:8,projection:{type:'mercator'},sources:{satellite:{type:'raster',tiles:[S.imageryURL('{z}','{x}','{y}')],tileSize:256,maxzoom:18,attribution}},layers:[{id:'satellite',type:'raster',source:'satellite',paint:{'raster-fade-duration':150,'raster-resampling':'linear'}}]}});
   assertMapViewport(container);
   await waitForMapReady(map,8000,signal);
   assertMapViewport(container);
   const {createBuildingLayer}=await withDeadline(import('./photo-buildings.mjs?v=3.2'),5000,'Bina katmanı',signal);const layer=createBuildingLayer(new URL('./scene3d/',import.meta.url),{onStatus});if(signal.aborted)throw Error('İşlem iptal edildi');map.addLayer(layer);
   const adapter={available3D:true,
    getView(){const c=map.getCenter();return {center:[c.lng,c.lat],zoom:map.getZoom(),pitch:map.getPitch(),bearing:map.getBearing()};},
    setView(v,animate=true){const state={...v,duration:reducedMotion||!animate?0:700,essential:false};map.easeTo(state);},
    home(){this.setView(DEFAULT_VIEW);},zoomBy(f,point){const options={duration:reducedMotion?0:220};if(point)options.around=map.unproject(point);map.easeTo({zoom:S.clamp(map.getZoom()+Math.log2(f),12.5,18.2),...options});},
    panBy(p){map.panBy(p,{duration:reducedMotion?0:130});},project(lon,lat){const p=map.project([lon,lat]);return [p.x,p.y];},
    getBounds(){const b=map.getBounds();return {west:b.getWest(),east:b.getEast(),north:b.getNorth(),south:b.getSouth()};},
    metresToPixels(m){const c=map.getCenter();return 512*2**map.getZoom()*m/(S.CIRCUMFERENCE*Math.cos(c.lat*Math.PI/180));},
    set3D(v){this.setView({pitch:v?52:0});},setPitch(p){this.setView({pitch:p},false);},setNorth(){this.setView({bearing:0});},
    setQuality(v){map.setPixelRatio(v==='low'?1:Math.min(devicePixelRatio||1,v==='high'?2:1.5));layer.setQuality(v);},setNight(v){layer.setNight(v);},
    show(v){container.style.opacity=v?'1':'0';container.style.pointerEvents=v?'auto':'none';if(v){map.resize();assertMapViewport(container);}},resize(){map.resize();},destroy(){map.remove();container.remove();}
   };map.on('move',()=>onMove(adapter));map.on('idle',()=>onStatus({imageryReady:true}));return adapter;
 }catch(error){map?.remove();throw error;}
}
function createFallback(container,{onMove,onStatus,reducedMotion,imageryURLs}){
 let backupPromise=null,backupImage=null,hasLiveImagery=false;
 const world=document.createElement('div');world.className='satellite-world';container.replaceChildren(world);
 let view={...DEFAULT_VIEW,pitch:0,bearing:0,center:[...DEFAULT_VIEW.center]},W=container.clientWidth,H=container.clientHeight,raf=0,timer=0,animation=null,drag=null,pinch=null,wantedTiles=new Set(),tileZoom=-1,quality='auto',destroyed=false;const removers=[];const listen=(type,fn,options)=>{container.addEventListener(type,fn,options);removers.push(()=>container.removeEventListener(type,fn,options));};const images=new Map(),pointers=new Map();
 async function showBackup(){
  if(backupPromise)return backupPromise;
  backupPromise=(async()=>{try{
   const response=await fetch(new URL('./fallback/manifest.json',import.meta.url));if(!response.ok)throw Error('Local map metadata unavailable');const m=await response.json();
   const image=new Image();image.alt='Edirne yerel şehir haritası';image.className='local-fallback-map';image.src=new URL('./fallback/'+m.image,import.meta.url).href;await image.decode();if(destroyed)return;
   image.style.cssText=`left:${m.nw[0]}px;top:${m.nw[1]}px;width:${m.se[0]-m.nw[0]}px;height:${m.se[1]-m.nw[1]}px;`;world.prepend(image);backupImage=image;if(!hasLiveImagery)onStatus({localMapReady:true,imageryError:true});
  }catch(error){onStatus({imageryError:true,localMapError:true});}})();return backupPromise;
 }
 function scale(){return 512*2**view.zoom*S.METER;}
 function clampCenter(){view.center=[S.clamp(view.center[0],26.46,26.66),S.clamp(view.center[1],41.61,41.74)];}
 function request(){if(destroyed)return;if(!raf)raf=requestAnimationFrame(paint);}
 function paint(now){raf=0;if(animation){const t=S.clamp((now-animation.start)/animation.duration,0,1),e=1-(1-t)**3;view.center=[animation.a.center[0]+(animation.b.center[0]-animation.a.center[0])*e,animation.a.center[1]+(animation.b.center[1]-animation.a.center[1])*e];view.zoom=animation.a.zoom+(animation.b.zoom-animation.a.zoom)*e;if(t===1)animation=null;}
  const c=S.local(...view.center),s=scale();world.style.transform=`translate3d(${W/2-c[0]*s}px,${H/2-c[1]*s}px,0) scale(${s})`;if(!timer)timer=setTimeout(()=>{timer=0;tiles();},80);onMove(adapter);if(animation)request();
 }
 function tiles(){
  const z=S.clamp(Math.round(view.zoom+(quality==='low'?0:1)),12,18),n=2**z,c=S.mercator(...view.center),s=scale(),mx=W/2/s*S.METER,my=H/2/s*S.METER;
  const c0=Math.floor((c[0]-mx)*n),c1=Math.floor((c[0]+mx)*n),r0=Math.floor((c[1]-my)*n),r1=Math.floor((c[1]+my)*n),wanted=new Set();wantedTiles=wanted;tileZoom=z;
  for(let y=r0;y<=r1;y++)for(let x=c0;x<=c1;x++){
   const key=`${z}/${x}/${y}`;wanted.add(key);if(images.has(key))continue;
   const p=[(x/n-S.ORIGIN_MERCATOR[0])/S.METER,(y/n-S.ORIGIN_MERCATOR[1])/S.METER],span=1/n/S.METER,img=new Image();img.alt='';img.draggable=false;img.className='satellite-tile';img.style.cssText=`left:${p[0]}px;top:${p[1]}px;width:${span+.2}px;height:${span+.2}px;`;const item={img,z};images.set(key,item);world.append(img);item.cancel=ImageryLoader.loadInto(img,imageryURLs(z,x,y),{timeout:6000,onLoad:()=>{if(destroyed)return;hasLiveImagery=true;img.classList.add('ready');onStatus({imageryReady:true});prune();},onError:()=>{if(destroyed)return;img.remove();images.delete(key);showBackup();}});
  }prune();
 }
 function prune(){const wanted=wantedTiles,z=tileZoom,complete=[...wanted].every(k=>images.get(k)?.img.complete&&images.get(k)?.img.naturalWidth);for(const[k,i]of images)if(!wanted.has(k)&&(i.z===z||complete||images.size>60)){i.cancel?.();i.img.remove();images.delete(k);}}
 const adapter={available3D:false,
  getView(){return {...view,center:[...view.center]};},setView(v,animate=true){const target={...view,...v,pitch:0,bearing:0,center:v.center||view.center};if(animate&&!reducedMotion){animation={a:{...view,center:[...view.center]},b:target,start:performance.now(),duration:500};}else{view=target;clampCenter();}request();},home(){this.setView({...DEFAULT_VIEW,pitch:0});},
  zoomBy(f,point){animation=null;const before=point?this.unproject(point):null;view.zoom=S.clamp(view.zoom+Math.log2(f),12.5,18.2);if(before){const c=S.local(...before),s=scale();view.center=S.fromLocal(c[0]-(point[0]-W/2)/s,c[1]-(point[1]-H/2)/s);}clampCenter();request();},
  panBy(p){const c=S.local(...view.center),s=scale();this.setView({center:S.fromLocal(c[0]+p[0]/s,c[1]+p[1]/s)});},project(lon,lat){const p=S.local(lon,lat),c=S.local(...view.center),s=scale();return [W/2+(p[0]-c[0])*s,H/2+(p[1]-c[1])*s];},unproject(p){const c=S.local(...view.center),s=scale();return S.fromLocal(c[0]+(p[0]-W/2)/s,c[1]+(p[1]-H/2)/s);},
  getBounds(){const nw=this.unproject([0,0]),se=this.unproject([W,H]);return {west:nw[0],east:se[0],north:nw[1],south:se[1]};},metresToPixels(m){return m*scale();},set3D(){},setPitch(){},setNorth(){},setNight(){},setQuality(v){quality=v;tiles();},show(v){container.style.opacity=v?'1':'0';container.style.pointerEvents=v?'auto':'none';},resize(){W=container.clientWidth;H=container.clientHeight;request();},destroy(){destroyed=true;cancelAnimationFrame(raf);clearTimeout(timer);for(const remove of removers)remove();for(const item of images.values())item.cancel?.();images.clear();container.remove();}
 };
 listen('pointerdown',e=>{container.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);animation=null;container.classList.add('dragging');if(pointers.size===1)drag={p:[e.clientX,e.clientY],center:S.local(...view.center)};if(pointers.size===2){const[a,b]=[...pointers.values()];pinch={distance:Math.hypot(a[0]-b[0],a[1]-b[1])};drag=null;}});
 listen('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===2&&pinch){const[a,b]=[...pointers.values()],distance=Math.hypot(a[0]-b[0],a[1]-b[1]);adapter.zoomBy(distance/pinch.distance,[(a[0]+b[0])/2,(a[1]+b[1])/2]);pinch={distance};}else if(drag){const s=scale();view.center=S.fromLocal(drag.center[0]-(e.clientX-drag.p[0])/s,drag.center[1]-(e.clientY-drag.p[1])/s);clampCenter();request();}});
 function end(e){pointers.delete(e.pointerId);if(!pointers.size){drag=null;pinch=null;container.classList.remove('dragging');tiles();}else if(pointers.size===1){const p=[...pointers.values()][0];drag={p,center:S.local(...view.center)};pinch=null;}}
 listen('pointerup',end);listen('pointercancel',end);listen('lostpointercapture',e=>{if(pointers.has(e.pointerId))end(e);});listen('wheel',e=>{e.preventDefault();adapter.zoomBy(Math.exp(-S.clamp(e.deltaY,-180,180)*.0017),[e.clientX,e.clientY]);},{passive:false});listen('dblclick',e=>adapter.zoomBy(1.6,[e.clientX,e.clientY]));request();tiles();return adapter;
}
