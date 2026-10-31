/* Bounded DOM image loader. Failed imagery is reported, never replaced with invented imagery. */
(function(root){
 'use strict';
 const SatelliteMath=typeof module!=='undefined'&&module.exports?require('./satellite-core.js'):root.SatelliteMath;
 class ImageryLayer{
  constructor(container,options={}){this.container=container;this.options=options;this.entries=new Map();this.wanted=new Set();this.descriptors=[];this.active=0;this.limit=options.maxConcurrent||8;this.maxTiles=options.maxTiles||160;this.createImage=options.createImage||(()=>new Image());this.onStatus=options.onStatus||(()=>{});}
  setView(view,zoom,dpr=1,quality='auto',budget){this.setTiles(SatelliteMath.selectTiles(view,zoom,dpr,quality,budget));}
  setTiles(descriptors){
   this.descriptors=descriptors;this.wanted=new Set(descriptors.map(t=>t.key));
   // Cancel obsolete queued/in-flight work immediately after a pan or zoom.
   for(const [key,e]of this.entries)if(!this.wanted.has(key)&&e.status!=='loaded')this.remove(key,e);
   for(const t of descriptors){if(this.entries.has(t.key))continue;
    const img=this.createImage();img.className='map-tile satellite-tile';img.alt='';img.draggable=false;img.decoding='async';img.fetchPriority=this.options.priority||'auto';
    img.style.cssText=`left:0;top:0;width:256px;height:256px;transform-origin:0 0;transform:matrix(${t.matrix.join(',')});z-index:${t.z};`;
    this.entries.set(t.key,{img,t,status:'queued',active:false,timer:0});this.container.append(img);
   }
   this.prune();this.pump();this.report();
  }
  pump(){
   for(const t of this.descriptors){if(this.active>=this.limit)break;const e=this.entries.get(t.key);if(!e||e.status!=='queued')continue;
    e.status='loading';e.active=true;this.active++;
    const finish=state=>{if(!e.active)return;e.active=false;this.active--;clearTimeout(e.timer);e.img.onload=null;e.img.onerror=null;e.status=state;if(state==='loaded')e.img.classList.add('ready');else{e.img.classList.remove('ready');e.img.removeAttribute('src');}this.prune();this.pump();this.report();};
    e.img.onload=()=>finish(e.img.naturalWidth>0?'loaded':'failed');e.img.onerror=()=>finish('failed');e.timer=setTimeout(()=>finish('failed'),this.options.timeoutMs||14000);
    e.img.src=SatelliteMath.imageryURL(t.z,t.x,t.y);
   }
  }
  prune(){
   const settled=[...this.wanted].every(k=>['loaded','failed'].includes(this.entries.get(k)?.status));
   for(const [key,e]of this.entries)if(!this.wanted.has(key)&&(settled||this.entries.size>this.maxTiles))this.remove(key,e);
  }
  remove(key,e){clearTimeout(e.timer);e.img.onload=null;e.img.onerror=null;if(e.active){e.active=false;this.active--;e.img.removeAttribute('src');}e.img.remove();this.entries.delete(key);}
  retry(){for(const [key,e]of this.entries)if(e.status==='failed')this.remove(key,e);this.setTiles(this.descriptors);}
  report(){const states=[...this.wanted].map(k=>this.entries.get(k)?.status);this.onStatus({total:states.length,loaded:states.filter(s=>s==='loaded').length,failed:states.filter(s=>s==='failed').length,pending:states.filter(s=>s==='loading'||s==='queued').length,active:this.active,retained:this.entries.size});}
  destroy(){for(const [key,e]of this.entries)this.remove(key,e);this.wanted.clear();this.descriptors=[];}
 }
 root.ImageryLayer=ImageryLayer;if(typeof module!=='undefined'&&module.exports)module.exports=ImageryLayer;
})(typeof window!=='undefined'?window:globalThis);
