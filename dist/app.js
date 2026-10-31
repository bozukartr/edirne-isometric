/* Isometric Edirne v5. Illustrated image atlas + compositor transforms.
 * No city geometry, canvas drawing, or permanent animation loop on the main thread. */
(function(){
'use strict';
const {geo,iso,normalize,clamp,zoomAt:baseZoomAt}=AtlasMath;
const cameraLimits=()=>manifest?.camera||{minZoom:.09,maxZoom:.3674};
const zoomAt=(c,f,x,y,o)=>baseZoomAt(c,clamp(c.zoom*f,cameraLimits().minZoom,cameraLimits().maxZoom)/c.zoom,x,y,o);
const {levelFor,tileRange,worldView,constrain}=AtlasViewer;
const $=id=>document.getElementById(id),viewport=$('viewport'),world=$('world');
const assets=new URL('./atlas-v5/',document.currentScript.src),places=window.EDIRNE_PLACES;
const initialHash=location.hash.slice(1),reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile=()=>innerWidth<=760;
let manifest=null,W=innerWidth,H=innerHeight,origin={x:W/2,y:H*.49},camera={x:0,y:0,zoom:.15};
let selected=null,category='all',query='',quality='auto',night=false,ready=false;
let raf=0,animation=null,inertia=null,tileTimer=0,tileLevel=-1,tileGeneration=0;
let markerVisible=true,labelVisible=false,filtered=places;
const tiles=new Map(),pointers=new Map(),metrics={updates:0,updateTimes:[],tileRequests:0,idleFrames:0};
let drag=null,pinch=null,frameTimestamp=0,wantedTiles=new Set();
const categoryNames={heritage:'TARİH & KÜLTÜR',bridges:'NEHİR KÖPRÜLERİ',nature:'DOĞA & PEYZAJ'};
for(const p of places)p.projected=iso(...geo(p.lon,p.lat));
function asset(path){return new URL(path,assets).href;}
function requestPaint(){if(!raf)raf=requestAnimationFrame(paint);}
function currentView(){return worldView(camera,W,H,origin);}
function limitCamera(){if(manifest)camera=constrain(camera,manifest.bounds,W,H);}
function scheduleTiles(immediate=false){
 if(!manifest)return;
 if(immediate){clearTimeout(tileTimer);tileTimer=0;ensureTiles();}
 else if(!tileTimer)tileTimer=setTimeout(()=>{tileTimer=0;ensureTiles();},100);
}
function ensureTiles(){
 const level=levelFor(manifest.levels,camera.zoom,devicePixelRatio||1,quality),view=currentView();
 // A narrow margin avoids loading invisible map regions on mobile.
 const pad=80/camera.zoom;
 const wanted=tileRange(manifest,level,{left:view.left-pad,right:view.right+pad,top:view.top-pad,bottom:view.bottom+pad});
 const keep=new Set(wanted.map(t=>t.key));wantedTiles=keep;
 if(level!==tileLevel){tileLevel=level;tileGeneration++;}
 const generation=tileGeneration;
 for(const t of wanted){
  if(tiles.has(t.key))continue;
  const img=new Image();img.className='map-tile';img.alt='';img.draggable=false;img.decoding='async';
  img.style.cssText=`left:${t.x}px;top:${t.y}px;width:${t.span+.3}px;height:${t.span+.3}px;`;
  img.onload=()=>{img.classList.add('ready');pruneTiles();};
  img.onerror=()=>{img.remove();tiles.delete(t.key);};
  img.src=asset(t.key+'.webp');tiles.set(t.key,{img,level});$('tiles').append(img);metrics.tileRequests++;
 }
 // Keep the previous resolution until every tile in the new viewport has arrived.
 pruneTiles();
}
function pruneTiles(){
 const keep=wantedTiles;
 const complete=[...keep].every(k=>tiles.get(k)?.img.complete&&tiles.get(k).img.naturalWidth>0);
 for(const [key,t]of tiles){if(!keep.has(key)&&(t.level===tileLevel||complete||tiles.size>24)){t.img.remove();tiles.delete(key);}}
}
function paint(now){
 raf=0;const start=performance.now(),elapsed=frameTimestamp?Math.min(32,now-frameTimestamp):16;frameTimestamp=now;
 if(animation){const t=clamp((now-animation.start)/animation.duration,0,1),e=1-Math.pow(1-t,3);camera={x:animation.from.x+(animation.to.x-animation.from.x)*e,y:animation.from.y+(animation.to.y-animation.from.y)*e,zoom:animation.from.zoom+(animation.to.zoom-animation.from.zoom)*e};if(t===1)animation=null;}
 if(inertia&&!animation){camera.x+=inertia.x*elapsed/16;camera.y+=inertia.y*elapsed/16;const friction=Math.pow(.86,elapsed/16);inertia.x*=friction;inertia.y*=friction;if(Math.abs(inertia.x)+Math.abs(inertia.y)<.3)inertia=null;limitCamera();}
 world.style.transform=`translate3d(${origin.x+camera.x}px,${origin.y+camera.y}px,0) scale(${camera.zoom})`;
 world.style.setProperty('--inv',String(1/camera.zoom));
 updateMinimap();updateScale();scheduleTiles();
 const cost=performance.now()-start;metrics.updates++;metrics.updateTimes.push(cost);if(metrics.updateTimes.length>180)metrics.updateTimes.shift();
 viewport.dataset.updateMs=cost.toFixed(3);viewport.dataset.updates=String(metrics.updates);viewport.dataset.tiles=String(tiles.size);
 if(animation||inertia)requestPaint();else frameTimestamp=0;
}
function updateMinimap(){if(!manifest)return;const b=manifest.bounds,v=currentView(),width=b.maxX-b.minX,height=b.maxY-b.minY,el=$('minimap-viewport');el.style.left=`${4+(v.left-b.minX)/width*124}px`;el.style.top=`${4+(v.top-b.minY)/height*77}px`;
 // Use percentages so the same math works with the smaller mobile minimap.
 el.style.left=`calc(4px + ${(v.left-b.minX)/width*100}% - ${(v.left-b.minX)/width*8}px)`;
 el.style.top=`calc(4px + ${(v.top-b.minY)/height*100}% - ${(v.top-b.minY)/height*8}px)`;
 el.style.width=`calc(${(v.right-v.left)/width*100}% - ${(v.right-v.left)/width*8}px)`;
 el.style.height=`calc(${(v.bottom-v.top)/height*100}% - ${(v.bottom-v.top)/height*8}px)`;
}
function updateScale(){const m=camera.zoom>1.4?50:camera.zoom>.45?100:500;$('scale-bar').style.width=m*camera.zoom+'px';$('scale-label').textContent=m+' m';$('zoom-in').disabled=camera.zoom>=cameraLimits().maxZoom-.00001;$('zoom-out').disabled=camera.zoom<=cameraLimits().minZoom+.00001;}
function fly(to,duration=650){inertia=null;animation=null;if(reduceMotion){camera=to;limitCamera();requestPaint();scheduleTiles(true);return;}animation={from:{...camera},to,start:performance.now(),duration};requestPaint();}
function moveTo(point,z=cameraLimits().maxZoom){z=clamp(z,cameraLimits().minZoom,cameraLimits().maxZoom);fly({x:-point[0]*z,y:-point[1]*z,zoom:z});}
function home(){const p=iso(...geo(26.5553,41.6763));closeDetail();moveTo(p,mobile()?.24:Math.min(.15,W/9500));}
function zoom(f,x=W/2,y=H/2){animation=null;inertia=null;camera=zoomAt(camera,f,x,y,origin);limitCamera();requestPaint();hideHint();}
function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('visible'),2400);}
function hideHint(){$('navigation-hint').style.opacity='0';}
function thumbnail(p){return asset('thumbs/'+p.id+'.webp');}
function buildPlaces(){
 const fragment=document.createDocumentFragment(),markers=document.createDocumentFragment();
 for(const p of places){
  const card=document.createElement('button');card.className='place-card';card.dataset.place=p.id;card.setAttribute('aria-label',p.name);card.innerHTML='<img alt="" loading="lazy"><span></span>';card.querySelector('img').src=thumbnail(p);card.querySelector('span').textContent=p.shortName||p.name;card.addEventListener('click',()=>selectPlace(p.id));fragment.append(card);p.card=card;
  const pin=document.createElement('div');pin.className='place-marker';const z=p.model==='selimiye'?40:p.kind==='mosque'?25:p.model==='station'?20:p.model==='tower'?25:4;
  pin.style.transform=`translate(${p.projected[0]}px,${p.projected[1]-z*.95}px)`;
  pin.innerHTML='<button class="pin-body"><span class="pin-dot"></span><span class="pin-name"></span></button>';const button=pin.querySelector('button');button.setAttribute('aria-label',p.name+' hakkında bilgi');button.tabIndex=-1;button.addEventListener('click',()=>selectPlace(p.id));pin.querySelector('.pin-name').textContent=p.name;markers.append(pin);p.pin=pin;
 }
 $('place-ribbon').append(fragment);$('markers').append(markers);
 const labels=[['KALEİÇİ',26.5507,41.6733,-20],['MERKEZ',26.566,41.676,-20],['SARAYİÇİ',26.5577,41.6914,-20],['YENİİMARET',26.5408,41.6873,-20],['KARAAĞAÇ',26.5213,41.6542,-20],['Tunca Nehri',26.546,41.6773,-63,true],['Meriç Nehri',26.5486,41.6623,5,true]];
 for(const [name,lon,lat,angle,river]of labels){const el=document.createElement('span'),p=iso(...geo(lon,lat));el.className='map-label'+(river?' river':'');el.innerHTML='<span></span>';el.firstChild.textContent=name;el.style.transform=`translate(${p[0]}px,${p[1]}px) rotate(${angle}deg)`;$('map-labels').append(el);}
 $('map-labels').hidden=!labelVisible;
}
function filter(){
 filtered=places.filter(p=>(category==='all'||p.category===category)&&normalize(p.name+' '+p.subtitle+' '+p.neighborhood).includes(normalize(query)));
 const fragment=document.createDocumentFragment();
 for(const p of filtered){const b=document.createElement('button');b.className='search-result';b.setAttribute('aria-current',String(selected===p.id));b.innerHTML='<img class="result-thumb" alt="" loading="lazy"><span class="result-copy"><strong></strong><small></small></span><svg class="icon"><use href="#arrow-icon"/></svg>';b.querySelector('img').src=thumbnail(p);b.querySelector('strong').textContent=p.name;b.querySelector('small').textContent=p.subtitle;b.addEventListener('click',()=>selectPlace(p.id));fragment.append(b);}
 if(!filtered.length){const p=document.createElement('p');p.className='empty-search';p.textContent='Bir yer bulamadık. Farklı bir isim veya kategori deneyebilirsin.';fragment.append(p);}
 $('search-results').replaceChildren(fragment);
 for(const p of places){if(p.pin){p.pin.hidden=!markerVisible||(!filtered.includes(p)&&p.id!==selected);p.pin.classList.toggle('selected',p.id===selected);}p.card?.classList.toggle('active',p.id===selected);p.card?.setAttribute('aria-pressed',String(p.id===selected));}
}
function searchOpen(open){$('search-panel').hidden=!open;$('search').setAttribute('aria-expanded',String(open));if(open){$('settings-panel').hidden=true;$('settings').setAttribute('aria-expanded','false');filter();}}
function selectPlace(id,changeHash=true){
 const p=places.find(p=>p.id===id);if(!p||!ready)return;
 selected=id;$('detail').hidden=false;document.body.classList.add('has-detail');$('detail-title').textContent=p.name;$('detail-description').textContent=p.description;$('detail-era').textContent=p.era;$('detail-neighborhood').textContent=p.neighborhood;$('detail-type').textContent=categoryNames[p.category];$('detail-image').src=thumbnail(p);$('detail-image').alt=p.name+' izometrik görünümü';$('detail-osm').href=`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=18/${p.lat}/${p.lon}`;
 if(changeHash)history.replaceState(null,'','#'+id);searchOpen(false);filter();
 const z=manifest.camera.placeZoom;
 const desiredX=mobile()?W*.5:W*.56,desiredY=mobile()?H*.31:H*.47;
 fly({zoom:z,x:desiredX-origin.x-p.projected[0]*z,y:desiredY-origin.y-p.projected[1]*z});
}
function closeDetail(clearHash=true){selected=null;$('detail').hidden=true;document.body.classList.remove('has-detail');if(clearHash)history.replaceState(null,'',location.pathname+location.search);for(const p of places){p.pin?.classList.remove('selected');p.card?.classList.remove('active');p.card?.setAttribute('aria-pressed','false');}}
async function share(){const url=new URL(location.href);if(!selected){const v=currentView();url.hash='view='+[camera.zoom.toFixed(3),((v.left+v.right)/2).toFixed(1),((v.top+v.bottom)/2).toFixed(1)].join(',');history.replaceState(null,'',url.href);}
 try{await navigator.clipboard.writeText(url.href);toast('Bağlantı kopyalandı. Biraz Edirne paylaş.');}catch{toast('Paylaşmak için adres çubuğundaki bağlantıyı kopyalayabilirsin.');}}
function loadHash(){const id=decodeURIComponent(location.hash.slice(1));if(places.some(p=>p.id===id)){selectPlace(id,false);return;}
 if(id.startsWith('view=')){const a=id.slice(5).split(',').map(Number);if(a.length===3&&a.every(Number.isFinite)){const z=clamp(a[0],cameraLimits().minZoom,cameraLimits().maxZoom);camera={zoom:z,x:-a[1]*z,y:-a[2]*z};limitCamera();requestPaint();return;}}
 if(selected)closeDetail(false);
}
viewport.addEventListener('pointerdown',e=>{
 if(!ready||e.target.closest('button'))return;
 viewport.setPointerCapture(e.pointerId);animation=null;inertia=null;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});viewport.classList.add('dragging');hideHint();searchOpen(false);
 if(pointers.size===1)drag={x:e.clientX,y:e.clientY,cx:camera.x,cy:camera.y,lastX:e.clientX,lastY:e.clientY,time:performance.now(),vx:0,vy:0,moved:false};
 if(pointers.size===2){const[a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),x:(a.x+b.x)/2,y:(a.y+b.y)/2};drag=null;}
});
viewport.addEventListener('pointermove',e=>{
 if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pointers.size===2&&pinch){const[a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y),x=(a.x+b.x)/2,y=(a.y+b.y)/2;camera=zoomAt(camera,distance/pinch.distance,x,y,origin);camera.x+=x-pinch.x;camera.y+=y-pinch.y;pinch={distance,x,y};}
 else if(drag){const now=performance.now(),dt=Math.max(8,now-drag.time);drag.vx=(e.clientX-drag.lastX)/dt*16;drag.vy=(e.clientY-drag.lastY)/dt*16;camera.x=drag.cx+e.clientX-drag.x;camera.y=drag.cy+e.clientY-drag.y;drag.moved=drag.moved||Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>4;drag.lastX=e.clientX;drag.lastY=e.clientY;drag.time=now;}
 limitCamera();requestPaint();
});
function endPointer(e){pointers.delete(e.pointerId);if(!pointers.size){viewport.classList.remove('dragging');if(drag?.moved&&!reduceMotion&&performance.now()-drag.time<80){inertia={x:clamp(drag.vx,-45,45),y:clamp(drag.vy,-45,45)};requestPaint();}drag=null;pinch=null;scheduleTiles(true);}else if(pointers.size===1){const p=[...pointers.values()][0];pinch=null;drag={x:p.x,y:p.y,cx:camera.x,cy:camera.y,lastX:p.x,lastY:p.y,time:performance.now(),vx:0,vy:0,moved:false};}}
viewport.addEventListener('pointerup',endPointer);viewport.addEventListener('pointercancel',e=>{endPointer(e);inertia=null;});viewport.addEventListener('lostpointercapture',e=>{if(pointers.has(e.pointerId))endPointer(e);});
viewport.addEventListener('wheel',e=>{if(!ready)return;e.preventDefault();zoom(Math.exp(-clamp(e.deltaY,-180,180)*.0018),e.clientX,e.clientY);},{passive:false});
viewport.addEventListener('dblclick',e=>{if(!e.target.closest('button'))zoom(1.5,e.clientX,e.clientY);});
$('search').addEventListener('focus',()=>searchOpen(true));$('search').addEventListener('input',e=>{query=e.target.value;searchOpen(true);filter();});$('search-close').addEventListener('click',()=>searchOpen(false));
$('search').addEventListener('keydown',e=>{if(e.key==='Enter'&&filtered[0]){e.preventDefault();selectPlace(filtered[0].id);$('search').blur();}});
for(const button of $('filters').querySelectorAll('button'))button.addEventListener('click',()=>{category=button.dataset.category;for(const b of $('filters').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b===button));filter();});
$('settings').addEventListener('click',()=>{const open=$('settings-panel').hidden;searchOpen(false);$('settings-panel').hidden=!open;$('settings').setAttribute('aria-expanded',String(open));});$('settings-close').addEventListener('click',()=>{$('settings-panel').hidden=true;$('settings').setAttribute('aria-expanded','false');});
function light(value){night=value;document.body.classList.toggle('evening',night);$('day').setAttribute('aria-pressed',String(!night));$('evening').setAttribute('aria-pressed',String(night));try{localStorage.setItem('edirne-light-v4',night?'evening':'day');}catch{}}
$('day').addEventListener('click',()=>light(false));$('evening').addEventListener('click',()=>light(true));$('show-markers').addEventListener('change',e=>{markerVisible=e.target.checked;filter();});$('show-labels').addEventListener('change',e=>{labelVisible=e.target.checked;$('map-labels').hidden=!labelVisible;});$('quality').addEventListener('change',e=>{quality=e.target.value;scheduleTiles(true);});
$('zoom-in').addEventListener('click',()=>zoom(1.35));$('zoom-out').addEventListener('click',()=>zoom(1/1.35));$('home').addEventListener('click',home);document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();home();});$('detail-close').addEventListener('click',()=>closeDetail());$('share').addEventListener('click',share);$('detail-share').addEventListener('click',share);
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Bu tarayıcıda tam ekran açılamıyor.');}});
function about(){searchOpen(false);$('settings-panel').hidden=true;$('settings').setAttribute('aria-expanded','false');$('about-dialog').showModal();}
$('about').addEventListener('click',about);$('data-info').addEventListener('click',about);$('about-close').addEventListener('click',()=>$('about-dialog').close());$('about-dialog').addEventListener('click',e=>{if(e.target===$('about-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('previous').addEventListener('click',()=>$('place-ribbon').scrollBy({left:-330,behavior:reduceMotion?'instant':'smooth'}));$('next').addEventListener('click',()=>$('place-ribbon').scrollBy({left:330,behavior:reduceMotion?'instant':'smooth'}));
function minimapPoint(e){if(!manifest)return;const r=$('minimap').getBoundingClientRect(),b=manifest.bounds,fx=clamp((e.clientX-r.left-4)/(r.width-8),0,1),fy=clamp((e.clientY-r.top-4)/(r.height-8),0,1);moveTo([b.minX+fx*(b.maxX-b.minX),b.minY+fy*(b.maxY-b.minY)],camera.zoom);}
$('minimap').addEventListener('pointerdown',e=>{e.preventDefault();minimapPoint(e);});$('minimap').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();home();}});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#search-wrap'))searchOpen(false);if(!e.target.closest('#settings-panel,#settings')){$('settings-panel').hidden=true;$('settings').setAttribute('aria-expanded','false');}});
document.addEventListener('keydown',e=>{if($('about-dialog').open)return;if(e.key==='Escape'){closeDetail();searchOpen(false);$('settings-panel').hidden=true;$('settings').setAttribute('aria-expanded','false');$('search').blur();return;}if(e.target.matches('input,select,textarea')||e.ctrlKey||e.metaKey||e.altKey)return;
 if(e.key==='/'){e.preventDefault();$('search').focus();return;}
 if(e.key==='+'||e.key==='='){e.preventDefault();zoom(1.25);}else if(e.key==='-'){e.preventDefault();zoom(.8);}else if(e.key.toLowerCase()==='r')home();else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();animation=null;inertia=null;const step=e.shiftKey?130:50;camera.x+=e.key==='ArrowLeft'?step:e.key==='ArrowRight'?-step:0;camera.y+=e.key==='ArrowUp'?step:e.key==='ArrowDown'?-step:0;limitCamera();requestPaint();}
});
window.addEventListener('hashchange',loadHash);window.addEventListener('resize',()=>{W=innerWidth;H=innerHeight;origin={x:W/2,y:H*.49};limitCamera();requestPaint();scheduleTiles(true);});
function benchmark(){
 const saved={...camera};animation=null;inertia=null;if(raf){cancelAnimationFrame(raf);raf=0;}
 metrics.updateTimes=[];
 for(let i=0;i<60;i++){camera={zoom:.15,x:saved.x+Math.sin(i*.12)*160,y:saved.y};paint(performance.now());}
 const times=metrics.updateTimes.slice(5).sort((a,b)=>a-b);
 const result={frames:times.length,p95Ms:times[Math.floor(times.length*.95)],medianMs:times[Math.floor(times.length*.5)],maxMs:Math.max(...times),tiles:tiles.size,geometryDrawsPerFrame:0,measurement:'synchronous main-thread update cost; not GPU frame time'};
 $('performance-report').textContent=JSON.stringify(result);viewport.dataset.benchmark='complete';camera=saved;requestPaint();
}
async function init(){
 $('error').hidden=true;$('loading').hidden=false;
 try{
  const response=await fetch(asset('manifest.json?v=5'));if(!response.ok)throw Error('manifest '+response.status);manifest=await response.json();viewport.style.background=manifest.background;
  const b=manifest.bounds,overview=$('overview');overview.src=asset(manifest.overview);overview.style.cssText=`left:${b.minX}px;top:${b.minY}px;width:${b.maxX-b.minX}px;height:${b.maxY-b.minY}px;`;$('minimap-image').src=overview.src;
  await overview.decode().catch(()=>{});buildPlaces();filter();ready=true;home();if(initialHash){history.replaceState(null,'','#'+initialHash);loadHash();}
  try{if(localStorage.getItem('edirne-light-v4')==='evening')light(true);}catch{}
  $('loading').hidden=true;scheduleTiles(true);
  viewport.dataset.benchmark=String(new URLSearchParams(location.search).has('benchmark'));if(new URLSearchParams(location.search).has('benchmark'))benchmark();
 }catch(error){console.error('Atlas initialization failed:',error);$('loading').hidden=true;$('error').hidden=false;}
}
$('retry').addEventListener('click',init);
Object.defineProperty(window,'edirneAtlas',{value:{getState:()=>({camera:{...camera},selected,category,quality,tiles:tiles.size,geometryDrawsPerFrame:0,updates:metrics.updates,pendingAnimation:!!raf,buildingCount:manifest?.meta.buildings}),getPerformance:()=>({...metrics,updateTimes:[...metrics.updateTimes]})}});
init();
})();
