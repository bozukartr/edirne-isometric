/* Isometric Edirne v3 — live aerial photography and photo-textured 3D buildings. */
(function(){
'use strict';
const {normalize}=AtlasMath,S=SatelliteMath,$=id=>document.getElementById(id);
const assetRoot=new URL('./',document.currentScript.src),places=window.EDIRNE_PLACES;
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches,mobile=()=>innerWidth<=760;
const categoryNames={heritage:'TARİH & KÜLTÜR',bridges:'NEHİR KÖPRÜLERİ',nature:'DOĞA & PEYZAJ'};
let engine,miniBounds,selected=null,category='all',query='',quality='auto',night=false,markerVisible=true,labelVisible=false,filtered=places,raf=0,updates=0;
const labels=[];
function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('visible'),2400);}
function thumbnail(p,width=280,height=170){const f=Math.min(1,280/width);return S.imageURL(p.lon,p.lat,Math.round(width*f),Math.round(height*f),p.kind==='bridge'?450:p.id==='karaagac'?430:320);}
function hideHint(){$('navigation-hint').style.opacity='0';}
function requestUI(){if(!raf)raf=requestAnimationFrame(paintUI);}
function paintUI(){
 raf=0;if(!engine)return;const start=performance.now(),view=engine.getView();
 for(const p of places){const pos=engine.project(p.lon,p.lat),outside=pos[0]<-80||pos[0]>innerWidth+80||pos[1]<-80||pos[1]>innerHeight+80;p.pin.hidden=outside||!markerVisible||(!filtered.includes(p)&&p.id!==selected);p.pin.style.transform=`translate(${pos[0]}px,${pos[1]}px)`;}
 for(const l of labels){const p=engine.project(l.lon,l.lat);l.el.style.transform=`translate(${p[0]}px,${p[1]}px)`;}
 const m=view.zoom>17?50:view.zoom>15.2?100:500;$('scale-bar').style.width=engine.metresToPixels(m)+'px';$('scale-label').textContent=m+' m';$('zoom-in').disabled=view.zoom>=18.2;$('zoom-out').disabled=view.zoom<=12.5;
 $('pitch').value=Math.round(view.pitch);$('pitch-value').textContent=Math.round(view.pitch)+'°';$('mode-2d').setAttribute('aria-pressed',String(view.pitch<2));$('mode-3d').setAttribute('aria-pressed',String(view.pitch>=2));$('compass-arrow').style.transform=`rotate(${-view.bearing}deg)`;
 if(miniBounds){const b=engine.getBounds(),a=S.mercator(b.west,b.north),c=S.mercator(b.east,b.south),r=$('minimap').getBoundingClientRect(),pad=mobile()?3:4,w=r.width-pad*2,h=r.height-pad*2,dx=miniBounds.east-miniBounds.west,dy=miniBounds.south-miniBounds.north;const el=$('minimap-viewport');el.style.cssText=`left:${pad+(a[0]-miniBounds.west)/dx*w}px;top:${pad+(a[1]-miniBounds.north)/dy*h}px;width:${(c[0]-a[0])/dx*w}px;height:${(c[1]-a[1])/dy*h}px;`;}
 $('viewport').dataset.engine=engine.available3D?'webgl3d':'satellite2d';$('viewport').dataset.view=[view.zoom.toFixed(3),...view.center.map(x=>x.toFixed(6)),view.pitch.toFixed(1),view.bearing.toFixed(1)].join(',');$('viewport').dataset.updateMs=(performance.now()-start).toFixed(3);$('viewport').dataset.updates=String(++updates);
}
function status(s){
 if(s.engine){$('engine-notice').hidden=s.available3D;$('mode-3d').disabled=!s.available3D;$('pitch').disabled=!s.available3D;$('north').disabled=!s.available3D;$('navigation-hint').innerHTML=s.available3D?'Sürükle, keşfet. <span>Sağ tuşla açıyı değiştir.</span>':'Sürükle, keşfet. <span>Tekerlekle yakınlaş.</span>';}
 if(s.imageryReady){$('loading').hidden=true;$('error').hidden=true;clearTimeout(imageryTimeout);}
 if(s.modelsReady)$('viewport').dataset.chunks=String(s.activeChunks);
 if(s.modelsError){$('engine-notice').textContent='3D binalar yüklenemedi. Uydu haritasını kullanabilirsin.';$('engine-notice').hidden=false;$('engine-notice').classList.add('error-notice');}
}
function buildPlaces(){
 const cards=document.createDocumentFragment(),markers=document.createDocumentFragment();
 for(const p of places){
  const card=document.createElement('button');card.className='place-card';card.dataset.place=p.id;card.setAttribute('aria-label',p.name);card.innerHTML='<img alt="" loading="lazy"><span></span>';card.querySelector('img').src=thumbnail(p,210,134);card.querySelector('span').textContent=p.shortName||p.name;card.addEventListener('click',()=>selectPlace(p.id));cards.append(card);p.card=card;
  const pin=document.createElement('div');pin.className='place-marker';pin.innerHTML='<button class="pin-body"><span class="pin-dot"></span><span class="pin-name"></span></button>';pin.querySelector('button').setAttribute('aria-label',p.name+' hakkında bilgi');pin.querySelector('button').addEventListener('click',()=>selectPlace(p.id));pin.querySelector('.pin-name').textContent=p.name;markers.append(pin);p.pin=pin;
 }
 $('place-ribbon').replaceChildren(cards);$('markers').replaceChildren(markers);$('map-labels').replaceChildren();labels.length=0;
 for(const[name,lon,lat,river]of[['KALEİÇİ',26.5507,41.6733],['MERKEZ',26.566,41.676],['SARAYİÇİ',26.5577,41.6914],['YENİİMARET',26.5408,41.6873],['KARAAĞAÇ',26.5213,41.6542],['Tunca Nehri',26.546,41.6773,true],['Meriç Nehri',26.5486,41.6623,true]]){const el=document.createElement('span');el.className='map-label'+(river?' river':'');el.innerHTML='<span></span>';el.firstChild.textContent=name;$('map-labels').append(el);labels.push({el,lon,lat});}
 $('map-labels').hidden=!labelVisible;filter();
}
function filter(){
 filtered=places.filter(p=>(category==='all'||p.category===category)&&normalize(p.name+' '+p.subtitle+' '+p.neighborhood).includes(normalize(query)));
 const fragment=document.createDocumentFragment();for(const p of filtered){const b=document.createElement('button');b.className='search-result';b.setAttribute('aria-current',String(selected===p.id));b.innerHTML='<img class="result-thumb" alt="" loading="lazy"><span class="result-copy"><strong></strong><small></small></span><svg class="icon"><use href="#arrow-icon"/></svg>';b.querySelector('img').src=thumbnail(p,106,82);b.querySelector('strong').textContent=p.name;b.querySelector('small').textContent=p.subtitle;b.addEventListener('click',()=>selectPlace(p.id));fragment.append(b);}
 if(!filtered.length){const p=document.createElement('p');p.className='empty-search';p.textContent='Bir yer bulamadık. Farklı bir isim veya kategori deneyebilirsin.';fragment.append(p);}$('search-results').replaceChildren(fragment);
 for(const p of places){p.pin?.classList.toggle('selected',p.id===selected);p.card?.classList.toggle('active',p.id===selected);p.card?.setAttribute('aria-pressed',String(p.id===selected));}requestUI();
}
function searchOpen(open){$('search-panel').hidden=!open;$('search').setAttribute('aria-expanded',String(open));if(open){settingsOpen(false);filter();}}
function settingsOpen(open){$('settings-panel').hidden=!open;$('settings').setAttribute('aria-expanded',String(open));}
function selectPlace(id,changeHash=true){
 const p=places.find(p=>p.id===id);if(!p||!engine)return;selected=id;$('detail').hidden=false;document.body.classList.add('has-detail');$('detail-title').textContent=p.name;$('detail-description').textContent=p.description;$('detail-era').textContent=p.era;$('detail-neighborhood').textContent=p.neighborhood;$('detail-type').textContent=categoryNames[p.category];$('detail-image').src=thumbnail(p,570,266);$('detail-image').alt=p.name+' uydu görünümü';$('detail-osm').href=`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=18/${p.lat}/${p.lon}`;
 if(changeHash)history.replaceState(null,'','#'+id);searchOpen(false);filter();hideHint();
 const zoom=p.kind==='bridge'?16.5:p.kind==='tree'?16.1:17.1;
 // Offset the camera target to leave the selected place visible beside the detail card.
 const center=mobile()?[p.lon,p.lat-.0009]:[p.lon-.0007,p.lat];engine.setView({center,zoom});
}
function closeDetail(clearHash=true){selected=null;$('detail').hidden=true;document.body.classList.remove('has-detail');if(clearHash)history.replaceState(null,'',location.pathname+location.search);filter();}
function home(){closeDetail();engine?.home();}
function zoom(f){engine?.zoomBy(f);hideHint();}
async function share(){if(!engine)return;const url=new URL(location.href);if(!selected){const v=engine.getView();url.hash='view='+[v.zoom.toFixed(3),...v.center.map(x=>x.toFixed(6)),v.pitch.toFixed(1),v.bearing.toFixed(1)].join(',');history.replaceState(null,'',url.href);}try{await navigator.clipboard.writeText(url.href);toast('Bağlantı kopyalandı. Biraz Edirne paylaş.');}catch{toast('Paylaşmak için adres çubuğundaki bağlantıyı kopyalayabilirsin.');}}
function loadHash(){if(!engine)return;let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}if(places.some(p=>p.id===id)){selectPlace(id,false);return;}if(id.startsWith('view=')){const a=id.slice(5).split(',').map(Number);if(a.length===5&&a.every(Number.isFinite)){engine.setView({zoom:S.clamp(a[0],12.5,18.2),center:[S.clamp(a[1],26.46,26.66),S.clamp(a[2],41.61,41.74)],pitch:S.clamp(a[3],0,65),bearing:a[4]%360},false);return;}}if(selected)closeDetail(false);}
$('search').addEventListener('focus',()=>searchOpen(true));$('search').addEventListener('input',e=>{query=e.target.value;searchOpen(true);});$('search-close').addEventListener('click',()=>searchOpen(false));$('search').addEventListener('keydown',e=>{if(e.key==='Enter'&&filtered[0]){e.preventDefault();selectPlace(filtered[0].id);$('search').blur();}});
for(const b of $('filters').querySelectorAll('button'))b.addEventListener('click',()=>{category=b.dataset.category;for(const x of $('filters').querySelectorAll('button'))x.setAttribute('aria-pressed',String(x===b));filter();});
$('settings').addEventListener('click',()=>{const open=$('settings-panel').hidden;searchOpen(false);settingsOpen(open);});$('settings-close').addEventListener('click',()=>settingsOpen(false));
function light(value){night=value;document.body.classList.toggle('evening',night);$('day').setAttribute('aria-pressed',String(!night));$('evening').setAttribute('aria-pressed',String(night));engine?.setNight(night);try{localStorage.setItem('edirne-light-v3',night?'evening':'day');}catch{}}
$('day').addEventListener('click',()=>light(false));$('evening').addEventListener('click',()=>light(true));$('mode-2d').addEventListener('click',()=>engine?.set3D(false));$('mode-3d').addEventListener('click',()=>engine?.set3D(true));$('pitch').addEventListener('input',e=>engine?.setPitch(+e.target.value));$('north').addEventListener('click',()=>engine?.setNorth());
$('show-markers').addEventListener('change',e=>{markerVisible=e.target.checked;requestUI();});$('show-labels').addEventListener('change',e=>{labelVisible=e.target.checked;$('map-labels').hidden=!labelVisible;});$('quality').addEventListener('change',e=>{quality=e.target.value;engine?.setQuality(quality);});
$('zoom-in').addEventListener('click',()=>zoom(1.5));$('zoom-out').addEventListener('click',()=>zoom(1/1.5));$('home').addEventListener('click',home);$('detail-close').addEventListener('click',()=>closeDetail());$('share').addEventListener('click',share);$('detail-share').addEventListener('click',share);
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Bu tarayıcıda tam ekran açılamıyor.');}});
function about(){searchOpen(false);settingsOpen(false);$('about-dialog').showModal();}$('about').addEventListener('click',about);$('data-info').addEventListener('click',about);$('about-close').addEventListener('click',()=>$('about-dialog').close());$('about-dialog').addEventListener('click',e=>{if(e.target===$('about-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('previous').addEventListener('click',()=>$('place-ribbon').scrollBy({left:-330,behavior:reduceMotion?'instant':'smooth'}));$('next').addEventListener('click',()=>$('place-ribbon').scrollBy({left:330,behavior:reduceMotion?'instant':'smooth'}));
$('minimap').addEventListener('pointerdown',e=>{if(!engine||!miniBounds)return;e.preventDefault();const r=$('minimap').getBoundingClientRect(),pad=mobile()?3:4,x=S.clamp((e.clientX-r.left-pad)/(r.width-2*pad),0,1),y=S.clamp((e.clientY-r.top-pad)/(r.height-2*pad),0,1);engine.setView({center:S.lngLat(miniBounds.west+x*(miniBounds.east-miniBounds.west),miniBounds.north+y*(miniBounds.south-miniBounds.north))});hideHint();});$('minimap').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();home();}});
$('map-surface').addEventListener('pointerdown',()=>{hideHint();searchOpen(false);});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#search-wrap'))searchOpen(false);if(!e.target.closest('#settings-panel,#settings'))settingsOpen(false);});
document.addEventListener('keydown',e=>{if($('about-dialog').open)return;if(e.key==='Escape'){closeDetail();searchOpen(false);settingsOpen(false);$('search').blur();return;}if(e.target.matches('input,select,textarea')||e.ctrlKey||e.metaKey||e.altKey)return;if(e.key==='/'){e.preventDefault();$('search').focus();return;}if(e.key==='+'||e.key==='='){e.preventDefault();zoom(1.25);}else if(e.key==='-'){e.preventDefault();zoom(.8);}else if(e.key.toLowerCase()==='r')home();else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const step=e.shiftKey?130:50;engine?.panBy([e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0,e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0]);}});
window.addEventListener('hashchange',loadHash);window.addEventListener('resize',()=>{engine?.resize();requestUI();});
let imageryTimeout;
async function init(){
 $('error').hidden=true;$('loading').hidden=false;engine?.destroy();
 try{const module=await import(new URL('map-engine.mjs?v=3',assetRoot));miniBounds=module.overviewInfo();$('minimap-image').src=module.overviewURL(miniBounds);buildPlaces();engine=await module.createMapEngine($('map-surface'),{onMove:requestUI,onStatus:status,reducedMotion:reduceMotion});engine.setQuality(quality);try{light(localStorage.getItem('edirne-light-v3')==='evening');}catch{}loadHash();requestUI();imageryTimeout=setTimeout(()=>{if(!$('loading').hidden){$('loading').hidden=true;$('error').hidden=false;}},20000);}
 catch(error){console.error('Atlas initialization failed:',error);$('loading').hidden=true;$('error').hidden=false;}
}
$('retry').addEventListener('click',()=>location.reload());init();
})();
