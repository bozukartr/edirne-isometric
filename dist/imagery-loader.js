/* Timed live image requests with an alternate official imagery host. */
(function(root){'use strict';
function loadInto(image,urls,{timeout=6000,onLoad=()=>{},onError=()=>{}}={}){
 let index=0,timer=0,finished=false;
 function cleanup(){clearTimeout(timer);image.onload=null;image.onerror=null;}
 function attempt(){
  if(finished)return;cleanup();
  if(index>=urls.length){finished=true;onError(new Error('Görüntü sunucularına ulaşılamadı'));return;}
  const url=urls[index++];image.onload=()=>{if(finished)return;finished=true;cleanup();try{root.SatelliteMath?.setImageryHost(new URL(image.currentSrc||url).hostname);}catch{}onLoad(image);};
  image.onerror=attempt;timer=setTimeout(attempt,timeout);image.src=url;
 }
 attempt();return ()=>{finished=true;cleanup();};
}
function image(urls,{crossOrigin,timeout=6000}={}){return new Promise((resolve,reject)=>{const img=new Image();if(crossOrigin)img.crossOrigin=crossOrigin;loadInto(img,urls,{timeout,onLoad:()=>resolve(img),onError:reject});});}
const api={loadInto,image};root.ImageryLoader=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
