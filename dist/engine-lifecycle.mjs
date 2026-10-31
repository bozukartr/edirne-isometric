export function assertMapViewport(container){
 const width=container.clientWidth,height=container.clientHeight;
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1){const error=new Error('3D harita alanının boyutu sıfır. Sayfayı yeniden yükle.');error.code='VIEWPORT_SIZE';throw error;}
 return {width,height};
}
/* Deadlines and independent 2D/3D switching. No DOM or GPU dependency. */
export function withDeadline(promise,ms,label='İşlem',signal){
 return new Promise((resolve,reject)=>{
  let done=false;
  const finish=(fn,value)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',aborted);fn(value);};
  const aborted=()=>finish(reject,new Error('İşlem iptal edildi'));
  const timer=setTimeout(()=>finish(reject,new Error(label+' zaman aşımına uğradı')),ms);
  if(signal?.aborted){aborted();return;}signal?.addEventListener('abort',aborted,{once:true});
  Promise.resolve(promise).then(value=>finish(resolve,value),error=>finish(reject,error));
 });
}
export function waitForMapReady(map,ms=8000,signal){
 return new Promise((resolve,reject)=>{
  let done=false;
  const finish=error=>{if(done)return;done=true;clearTimeout(timer);map.off('load',loaded);map.off('error',failed);signal?.removeEventListener('abort',aborted);error?reject(error):resolve();};
  const loaded=()=>finish(),failed=e=>finish(e.error||new Error('3D harita yüklenemedi')),aborted=()=>finish(new Error('İşlem iptal edildi'));
  // A deadline always settles, even if isStyleLoaded() is true but load never fires.
  const timer=setTimeout(()=>finish(new Error('3D harita zaman aşımına uğradı')),ms);
  map.on('load',loaded);map.on('error',failed);signal?.addEventListener('abort',aborted,{once:true});
  if(signal?.aborted)aborted();else if(map.loaded())loaded();
 });
}
export function createModeController(fallback,create3D,{onMode=()=>{},timeout=18000}={}){
 let active=fallback,gpu=null,pending=null,abort=null,generation=0,destroyed=false,quality='auto',night=false;
 function report(extra={}){onMode({engine:active===fallback?'satellite2d':'webgl3d',available3D:active!==fallback,...extra});}
 function switch2D(){generation++;abort?.abort();abort=null;pending=null;const view=active.getView();if(active!==fallback)fallback.setView({...view,pitch:0,bearing:0},false);active=fallback;gpu?.destroy();gpu=null;fallback.show?.(true);report();}
 async function switch3D(){
  if(destroyed)return false;if(active!==fallback){active.set3D(true);return true;}if(pending)return pending;
  const id=++generation;abort=new AbortController();const signal=abort.signal,view=fallback.getView();report({modeLoading:true});
  const work=Promise.resolve().then(()=>create3D({...view,pitch:52},signal));
  // Dispose a late result after a timeout, user cancellation, or destruction.
  work.then(candidate=>{if(destroyed||id!==generation)candidate.destroy();},()=>{});
  pending=(async()=>{try{
   const candidate=await withDeadline(work,timeout,'3D görünüm',signal);
   if(destroyed||id!==generation)return false;
   gpu=candidate;gpu.setQuality(quality);gpu.setNight(night);active=gpu;gpu.show?.(true);fallback.show?.(false);report({modeLoading:false});return true;
  }catch(error){
   if(id!==generation||destroyed)return false;
   generation++;abort?.abort();pending=null;abort=null;gpu?.destroy();gpu=null;active=fallback;fallback.show?.(true);report({modeLoading:false,modeError:error.message});return false;
  }finally{if(id===generation){pending=null;abort=null;}}})();
  return pending;
 }
 const controller={
  get available3D(){return active!==fallback;},
  getView:()=>active.getView(),setView:(...args)=>active.setView(...args),home:()=>active.home(),zoomBy:(...args)=>active.zoomBy(...args),panBy:(...args)=>active.panBy(...args),project:(...args)=>active.project(...args),getBounds:()=>active.getBounds(),metresToPixels:m=>active.metresToPixels(m),
  set3D(value){return value?switch3D():switch2D();},setPitch(p){if(active!==fallback)active.setPitch(p);},setNorth(){active.setNorth();},
  setQuality(v){quality=v;fallback.setQuality(v);gpu?.setQuality(v);},setNight(v){night=v;fallback.setNight(v);gpu?.setNight(v);},
  resize(){fallback.resize();gpu?.resize();},destroy(){destroyed=true;generation++;abort?.abort();gpu?.destroy();fallback.destroy();},
  start3D:switch3D
 };
 report();return controller;
}
