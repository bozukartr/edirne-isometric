/* Edirne Isometric Atlas — vanilla Canvas 2D, no runtime services or API keys. */
(function () {
'use strict';
const {geo,ungeo,iso,uniso,clamp,normalize,zoomAt,hash,inPolygon}=AtlasMath;
const $=id=>document.getElementById(id);
const canvas=$('map'),ctx=canvas.getContext('2d',{alpha:false});
const data=window.EDIRNE_MAP,places=window.EDIRNE_PLACES;
const initialHash=decodeURIComponent(location.hash.slice(1));
const mobile=()=>window.innerWidth<=800;
let W=0,H=0,DPR=1,dirty=true,night=false,threeD=true,showPins=true,showLabels=true;
let activeCategory='all',query='',selected=null,animation=null,tourIndex=-1;
let camera={x:0,y:0,zoom:.53},origin={x:0,y:0},visiblePlaces=places;
const ground=[],roads=[],buildings=[],trees=[],models=[];
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const colors={
 day:{bg:'#e9e9dc',residential:'#e2dfce',commercial:'#dedac9',farmland:'#dce2c5',forest:'#b6c596',park:'#ccd7b1',grass:'#d2dcb9',water:'#aacbc0',waterEdge:'#92b7a6',road:'#f4f0df',roadEdge:'#d1ceba',path:'#d7d4bd',roof:['#bd7956','#c58c65','#c79a72','#c09570','#cdab83','#ad785a','#d0a177'],wall:['#ede3cb','#d7c8a7','#c5b28d'],tree:['#8ea570','#9bb77e','#819d66','#a9bb82'],dome:'#a3b2a2',domeDark:'#8d9e8d',stone:'#e9dfc4',stoneDark:'#bdae8d'},
 night:{bg:'#283d34',residential:'#344537',commercial:'#394837',farmland:'#3e5039',forest:'#29482f',park:'#3b5537',grass:'#42573b',water:'#426e67',waterEdge:'#355b53',road:'#8a8a64',roadEdge:'#546249',path:'#5f6d4e',roof:['#8b6651','#977558','#907753','#7a6b4e','#9e825b','#7e6651','#a1875d'],wall:['#a3946b','#7f7c5a','#676b4c'],tree:['#536c43','#5d7c4c','#47673d','#6d8052'],dome:'#788d78',domeDark:'#5c735f',stone:'#b5aa7e',stoneDark:'#7a8060'}
};
let pal=colors.day;
function path(points,close=true){const p=new Path2D();points.forEach((v,i)=>i?p.lineTo(v[0],v[1]):p.moveTo(v[0],v[1]));if(close)p.closePath();return p;}
function polygon(points,fill,stroke,width=.6){ctx.beginPath();points.forEach((v,i)=>i?ctx.lineTo(v[0],v[1]):ctx.moveTo(v[0],v[1]));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function p3(x,y,z=0){return iso(x,y,threeD?z:0);}
function line3(points,color,width=1){ctx.beginPath();points.forEach((v,i)=>{const p=p3(...v);i?ctx.lineTo(...p):ctx.moveTo(...p);});ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function prepare(){
 for(const f of data.features){
  const points=f.p.map(p=>iso(...p));
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const b={minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
  if(f.t==='building'){
   if(f.p.length<3)continue;
   const c=f.p.reduce((a,p)=>[a[0]+p[0]/f.p.length,a[1]+p[1]/f.p.length],[0,0]);
   if(places.some(l=>l.model&&l.model!=='bridge'&&Math.hypot(c[0]-l.world[0],c[1]-l.world[1])<(l.id==='selimiye'?45:l.id==='bayezid'?36:l.id==='karaagac'?45:l.id==='synagogue'?24:l.id==='makedonya'?12:l.id==='uc-serefeli'?39:28)))continue;
   const h=f.h||6+Math.floor(hash(f.id)*3)*3;
   buildings.push({...b,path:path(points),points,world:f.p,h,r:Math.floor(hash(f.id)*7),depth:iso(...c)[1],id:f.id,mosque:f.k==='mosque'});
  }else if(f.t==='road'){
   const widths={motorway:20,trunk:18,primary:13,secondary:10,tertiary:8,residential:5.5,living_street:5,service:4,unclassified:5,pedestrian:5,footway:1.8,path:1.5,cycleway:2,steps:1.4,track:2};
   roads.push({...b,path:path(points,false),w:widths[f.k]||4,bridge:f.b,kind:f.k});
  }else if(f.t==='river'){
   ground.push({...b,path:path(points,false),kind:'river',w:f.w||30});
  }else{
   ground.push({...b,path:path(points),kind:f.k||f.t});
   if(['forest','wood','park','recreation_ground','orchard'].includes(f.k)){
    const raw=f.p,bx=raw.map(p=>p[0]),by=raw.map(p=>p[1]),minX=Math.min(...bx),maxX=Math.max(...bx),minY=Math.min(...by),maxY=Math.max(...by);
    const area=(maxX-minX)*(maxY-minY),n=Math.min(700,Math.floor(area/(f.k==='park'?370:170)));
    for(let i=0;i<n;i++){
     const x=minX+hash(f.id+i*17)*(maxX-minX),y=minY+hash(f.id+i*37+3)*(maxY-minY);
     if(inPolygon(x,y,raw)){const p=iso(x,y);trees.push({x:p[0],y:p[1],r:3+hash(i+f.id)*4,shade:i%4,depth:p[1]});}
    }
   }
  }
 }
 buildings.sort((a,b)=>a.depth-b.depth);
 for(const l of places){if(l.model)models.push({...l,depth:iso(...l.world)[1]});}
}
function viewBounds(){return {left:(-origin.x-camera.x)/camera.zoom-120,right:(W-origin.x-camera.x)/camera.zoom+120,top:(-origin.y-camera.y)/camera.zoom-200,bottom:(H-origin.y-camera.y)/camera.zoom+200};}
function visible(b,v){return b.maxX>=v.left&&b.minX<=v.right&&b.maxY>=v.top&&b.minY-150<=v.bottom;}
function drawGround(v){
 const order=['farmland','farmyard','meadow','grass','forest','wood','orchard','residential','commercial','retail','industrial','cemetery','recreation_ground','park','water'];
 for(const kind of order){for(const g of ground){if(g.kind!==kind||!visible(g,v))continue;
   ctx.fillStyle=pal[kind]||({wood:pal.forest,meadow:pal.grass,orchard:pal.forest,cemetery:pal.park,recreation_ground:pal.park,retail:pal.commercial,industrial:pal.commercial,farmyard:pal.farmland}[kind])||pal.grass;
   ctx.fill(g.path);
   if(kind==='water'){ctx.strokeStyle=pal.waterEdge;ctx.lineWidth=3;ctx.stroke(g.path);}
 }}
 ctx.lineCap='round';ctx.lineJoin='round';
 for(const g of ground){if(g.kind!=='river'||!visible(g,v))continue;ctx.strokeStyle=pal.waterEdge;ctx.lineWidth=g.w+5;ctx.stroke(g.path);ctx.strokeStyle=pal.water;ctx.lineWidth=g.w;ctx.stroke(g.path);}
 // Fine ripples retain the rivers' geography while adding a little texture.
 for(const g of ground){if(g.kind!=='river'||g.w<20||!visible(g,v))continue;ctx.setLineDash([9,45,4,80]);ctx.strokeStyle=night?'#66948a55':'#d9e8d599';ctx.lineWidth=.9;ctx.stroke(g.path);ctx.setLineDash([]);}
 for(const r of roads){if(!visible(r,v))continue;ctx.strokeStyle=r.bridge?pal.stoneDark:pal.roadEdge;ctx.lineWidth=r.w+(r.bridge?4:1.6);ctx.stroke(r.path);}
 for(const r of roads){if(!visible(r,v))continue;ctx.strokeStyle=['footway','path','track','cycleway','steps'].includes(r.kind)?pal.path:pal.road;ctx.lineWidth=r.w;ctx.stroke(r.path);}
}
function drawBuilding(b){
 const h=threeD?b.h*1.5:0,pts=b.points;
 if(threeD){ctx.save();ctx.translate(5,5);ctx.fillStyle=night?'#172b2540':'#827b5632';ctx.fill(b.path);ctx.restore();
  for(let i=0;i<pts.length-1;i++){
   const a=pts[i],c=pts[i+1];
   // Only faces facing the viewer need to be painted.
   const color=(c[0]-a[0])*(c[1]-a[1])>0?pal.wall[1]:pal.wall[2];
   polygon([a,c,[c[0],c[1]-h],[a[0],a[1]-h]],color,pal.wall[2],.4);
   if(camera.zoom>.8&&Math.hypot(c[0]-a[0],c[1]-a[1])>9&&h>7){
    const len=Math.hypot(c[0]-a[0],c[1]-a[1]),n=Math.floor(len/5);
    for(let k=1;k<n;k++){const t=k/n,x=a[0]+(c[0]-a[0])*t,y=a[1]+(c[1]-a[1])*t-h*.50;ctx.fillStyle=night?'#c5b27c':'#897c5b88';ctx.fillRect(x,y,1.2,2.1);}
   }
  }
 }
 ctx.save();ctx.translate(0,-h);ctx.fillStyle=b.mosque?pal.dome:pal.roof[b.r];ctx.fill(b.path);ctx.strokeStyle=night?'#655e4740':'#946e4f65';ctx.lineWidth=.6;ctx.stroke(b.path);
 if(threeD&&camera.zoom>.43&&pts.length<=9){
  const cx=(b.minX+b.maxX)/2,cy=(b.minY+b.maxY)/2;
  ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);ctx.lineTo(cx,cy-1.5);ctx.lineTo(pts[Math.floor(pts.length/2)][0],pts[Math.floor(pts.length/2)][1]);ctx.strokeStyle=night?'#c4a77d40':'#f1c79980';ctx.lineWidth=.8;ctx.stroke();
 }
 ctx.restore();
}
function drawTree(t){
 const h=threeD?7:0;
 ctx.fillStyle=night?'#19312533':'#6f845527';ctx.beginPath();ctx.ellipse(t.x+3,t.y+2,t.r*1.2,t.r*.55,0,0,Math.PI*2);ctx.fill();
 if(threeD){ctx.strokeStyle=pal.stoneDark;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(t.x,t.y);ctx.lineTo(t.x,t.y-h);ctx.stroke();}
 ctx.fillStyle=pal.tree[t.shade];ctx.beginPath();ctx.ellipse(t.x,t.y-h,t.r*.83,t.r*1.1,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle=night?'#8a9c663b':'#d1dea03b';ctx.beginPath();ctx.ellipse(t.x-t.r*.24,t.y-h-t.r*.3,t.r*.47,t.r*.66,-.3,0,Math.PI*2);ctx.fill();
}
function prism(x,y,w,d,h,z=0,roof=pal.stone){
 const a=p3(x-w/2,y-d/2,z),b=p3(x+w/2,y-d/2,z),c=p3(x+w/2,y+d/2,z),d0=p3(x-w/2,y+d/2,z);
 const aa=p3(x-w/2,y-d/2,z+h),bb=p3(x+w/2,y-d/2,z+h),cc=p3(x+w/2,y+d/2,z+h),dd=p3(x-w/2,y+d/2,z+h);
 polygon([b,c,cc,bb],pal.stoneDark,pal.stoneDark,.6);polygon([c,d0,dd,cc],pal.stone,pal.stoneDark,.6);polygon([aa,bb,cc,dd],roof,pal.stoneDark,.6);
 // Small arched-window suggestions on the front facade.
 if(threeD&&h>6){for(let i=0;i<Math.floor(w/7);i++){const q=p3(x-w/2+5+i*7,y+d/2,z+h*.45);ctx.fillStyle=night?'#d9c28a':'#7a846e';ctx.beginPath();ctx.roundRect(q[0]-1.1,q[1]-2,2.2,4,1);ctx.fill();}}
}
function dome(x,y,z,r,height){
 const center=p3(x,y,z),rr=r,hh=threeD?height:0;
 ctx.fillStyle=pal.domeDark;ctx.beginPath();ctx.ellipse(center[0],center[1],rr,rr*.58,0,0,Math.PI*2);ctx.fill();
 if(!threeD)return;
 const rings=5,slices=16,faces=[];
 for(let j=0;j<rings;j++)for(let i=0;i<slices;i++){
  const p=[];for(const [u,v]of [[j,i],[j,i+1],[j+1,i+1],[j+1,i]]){const t=u/rings*Math.PI/2,a=v/slices*Math.PI*2;const rad=Math.cos(t)*r;p.push(p3(x+Math.cos(a)*rad,y+Math.sin(a)*rad,z+Math.sin(t)*height));}
  const light=Math.cos(i/slices*Math.PI*2+1),fill=light>.2?pal.dome:light<-.4?pal.domeDark:(night?'#6c826c':'#aebcab');
  faces.push({p,fill,depth:Math.sin((i+.5)/slices*Math.PI*2)*Math.cos((j+.5)/rings*Math.PI/2)});
 }
 faces.sort((a,b)=>a.depth-b.depth);for(const f of faces)polygon(f.p,f.fill,night?'#59745b22':'#82998230',.25);
 line3([[x,y,z+height],[x,y,z+height+4]],night?'#c3b36f':'#a58d50',.8);
}
function minaret(x,y,h=65,balconies=3){
 prism(x,y,4,4,7,0,pal.stone);
 const a=p3(x,y,7),b=p3(x,y,h-11);
 ctx.lineWidth=3.8;ctx.strokeStyle=pal.stoneDark;ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();
 ctx.lineWidth=2;ctx.strokeStyle=pal.stone;ctx.beginPath();ctx.moveTo(a[0]-.6,a[1]);ctx.lineTo(b[0]-.6,b[1]);ctx.stroke();
 for(let i=0;i<balconies;i++){const c=p3(x,y,h*.35+i*h*.16);ctx.fillStyle=pal.stone;ctx.beginPath();ctx.ellipse(...c,3.3,1.4,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=pal.stoneDark;ctx.lineWidth=.5;ctx.stroke();}
 const c=p3(x,y,h-11),tip=p3(x,y,h);polygon([[c[0]-2.6,c[1]],[c[0]+2.6,c[1]],tip],pal.domeDark);
}
function modelMosque(l){
 const [x,y]=l.world;
 const large=l.model==='selimiye',old=l.model==='eski',bay=l.model==='bayezid';
 const w=large?52:old?43:bay?36:48,d=large?48:old?43:bay?35:32,h=large?19:old?12:bay?14:15;
 const courty=old?0:-d*.95,cy=y+courty;
 if(!old){
  prism(x,cy,w+15,d+10,.5,0,night?'#84916d':'#e5dfc4');
  prism(x,cy-d/2,w+14,7,6,0,pal.dome);prism(x-w/2-4,cy,7,d,6,0,pal.dome);prism(x+w/2+4,cy,7,d,6,0,pal.dome);
  for(let i=-2;i<=2;i++)dome(x+i*(w/5),cy-d/2,6,4.1,3.2);
  const f=p3(x,cy);ctx.fillStyle=pal.dome;ctx.beginPath();ctx.ellipse(...f,3,2,0,0,Math.PI*2);ctx.fill();
 }
 const corners=old?[[x-w/2,y-d/2,44],[x+w/2,y+d/2,49]]:[[x-w/2-4,y-d/2-5,large?71:62],[x+w/2+4,y-d/2-5,large?71:50],[x-w/2-4,cy-d/2,large?71:46],[x+w/2+4,cy-d/2,large?71:52]];
 corners.sort((a,b)=>iso(a[0],a[1])[1]-iso(b[0],b[1])[1]);
 for(const c of corners.filter(c=>iso(c[0],c[1])[1]<iso(x,y)[1]))minaret(...c,large?3:2);
 prism(x,y,w,d,h,0,pal.dome);
 if(old){for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++)dome(x+i*14,y+j*14,h,6.6,6);}
 else{for(let i=-1;i<=1;i+=2){dome(x+i*w*.34,y,h,large?9:7,large?8:6);}dome(x,y,h+2,large?17:bay?13:13,large?18:12);}
 for(const c of corners.filter(c=>iso(c[0],c[1])[1]>=iso(x,y)[1]))minaret(...c,large?3:2);
}
function modelBuilding(l){
 const[x,y]=l.world;
 if(['selimiye','uc-serefeli','eski','bayezid'].includes(l.model)){modelMosque(l);return;}
 if(l.model==='station'){
  prism(x,y,95,18,9,0,pal.roof[1]);prism(x,y,25,24,15,0,pal.roof[0]);
  for(const dx of[-38,38]){prism(x+dx,y,12,21,16,0,pal.roof[1]);dome(x+dx,y,16,7,8);}
  return;
 }
 if(l.model==='synagogue'){prism(x,y,26,37,17,0,pal.roof[1]);prism(x,y+18,30,8,20,0,pal.stone);for(const dx of[-12,12])dome(x+dx,y+18,20,3.5,5);return;}
 if(l.model==='tower'){prism(x,y,13,13,23,0,pal.stone);for(const dx of[-5,0,5])for(const dy of[-5,5])prism(x+dx,y+dy,2.5,2.5,3,23,pal.stone);return;}
 // Bridge surfaces are sourced from OSM roads, rather than invented spans.
}
function drawSelection(){if(!selected)return;const l=places.find(p=>p.id===selected),p=iso(...l.world);ctx.beginPath();ctx.ellipse(...p,60,35,0,0,Math.PI*2);ctx.strokeStyle=night?'#e6b88e88':'#bd6c4666';ctx.lineWidth=1.5/camera.zoom;ctx.setLineDash([5/camera.zoom,6/camera.zoom]);ctx.stroke();ctx.setLineDash([]);}
function draw(){
 dirty=false;ctx.setTransform(DPR,0,0,DPR,0,0);ctx.fillStyle=pal.bg;ctx.fillRect(0,0,W,H);
 ctx.translate(origin.x+camera.x,origin.y+camera.y);ctx.scale(camera.zoom,camera.zoom);
 const v=viewBounds();drawGround(v);drawSelection();
 const objects=[];
 for(const b of buildings)if(visible(b,v))objects.push({depth:b.depth,type:'building',o:b});
 for(const t of trees)if(t.x>v.left&&t.x<v.right&&t.y>v.top&&t.y<v.bottom)objects.push({depth:t.depth,type:'tree',o:t});
 for(const l of models){const p=iso(...l.world);if(p[0]>v.left&&p[0]<v.right&&p[1]>v.top&&p[1]<v.bottom)objects.push({depth:l.depth,type:'model',o:l});}
 objects.sort((a,b)=>a.depth-b.depth);
 for(const item of objects){if(item.type==='building')drawBuilding(item.o);else if(item.type==='tree')drawTree(item.o);else modelBuilding(item.o);}
 updateOverlays();
 $('zoom-level').textContent=Math.round(camera.zoom/.53*100)+'%';
 $('zoom-in').disabled=camera.zoom>=3.5;$('zoom-out').disabled=camera.zoom<=.09;
 const metres=camera.zoom>.8?50:camera.zoom>.3?100:500;
 $('scale-text').textContent=metres+' m';$('scale-bar').style.width=(metres*camera.zoom)+'px';
}
function screen(world,z=0){const p=iso(...world,threeD?z:0);return [origin.x+camera.x+p[0]*camera.zoom,origin.y+camera.y+p[1]*camera.zoom];}
function updateOverlays(){
 for(const l of places){const p=screen(l.world,l.model==='selimiye'?44:l.kind==='mosque'?26:l.model==='station'?25:l.model==='tower'?28:6),pin=l.pin;
  pin.style.transform=`translate(${p[0]-7}px,${p[1]-7}px)`;
  const panelOccludes=mobile()?(p[0]<285&&p[1]<210):(p[0]<380&&p[1]<H-70);
  pin.hidden=!showPins||panelOccludes||!visiblePlaces.includes(l)||p[0]<-150||p[0]>W-20||p[1]<-20||p[1]>H-40;
  pin.classList.toggle('selected',selected===l.id);
  pin.setAttribute('aria-pressed',selected===l.id?'true':'false');
 }
 for(const l of mapLabels){const p=screen(l.world);l.el.style.transform=`translate(${p[0]}px,${p[1]}px) rotate(${l.rotation||0}deg)`;l.el.hidden=!showLabels||camera.zoom>1.6;}
}
const mapLabels=[];
function addLabels(){
 const labels=[['KALEİÇİ',26.5507,41.6733,-20],['MERKEZ',26.5632,41.6752,-20],['SARAYİÇİ',26.5577,41.6914,-20],['YENİİMARET',26.5408,41.6873,-20],['KARAAĞAÇ',26.5213,41.6542,-20],['Tunca Nehri',26.5460,41.6773,-63,true],['Meriç Nehri',26.5486,41.6623,5,true]];
 for(const [text,lon,lat,rotation,river]of labels){const el=document.createElement('span');el.className='map-label'+(river?' river':'');el.textContent=text;$('map-labels').append(el);mapLabels.push({el,world:geo(lon,lat),rotation});}
}
const iconPaths={mosque:'<path d="M5 21V11h14v10M4 11h16M8 10a4 4 0 0 1 8 0M12 4V2M2 21V7l1-3 1 3v14M20 21V7l1-3 1 3v14M9 21v-4a3 3 0 0 1 6 0v4"/>',bridge:'<path d="M2 10h20M2 13h20M3 10V7m18 3V7M5 20v-7m14 7v-7M8 20v-3a4 4 0 0 1 8 0v3M1 22h22"/>',tree:'<path d="M12 21v-7M7 17h10M12 2 5 11h3l-4 6h16l-4-6h3Z"/>',synagogue:'<path d="M4 22V9l8-6 8 6v13M8 22v-8h8v8M2 22h20"/><circle cx="12" cy="9" r="2"/>',station:'<path d="M2 21V9h20v12M8 9V4h8v5M5 13v4m5-4v4m4-4v4m5-4v4M1 21h22"/>',market:'<path d="M3 21V10h18v11M2 10l3-6h14l3 6M7 10v11m10-11v11M2 21h20"/>',tower:'<path d="M5 22V6h14v16M4 6V2h4v4m2 0V2h4v4m2 0V2h4v4M9 22v-6h6v6M1 22h22M9 10h2m2 0h2"/>'};
function icon(kind){return `<svg viewBox="0 0 24 24" aria-hidden="true">${iconPaths[kind]||iconPaths.mosque}</svg>`;}
function createPins(){for(const l of places){const button=document.createElement('button');button.className='map-pin'+(l.featured?' featured':'');button.dataset.category=l.category;button.setAttribute('aria-label','Explore '+l.name);button.innerHTML='<span class="pin-dot"></span><span class="pin-name"></span>';button.querySelector('.pin-name').textContent=l.name;button.addEventListener('click',()=>selectPlace(l.id));$('pins').append(button);l.pin=button;}}
function filter(){
 visiblePlaces=places.filter(l=>(activeCategory==='all'||l.category===activeCategory)&&normalize(l.name+' '+l.subtitle+' '+l.neighborhood).includes(normalize(query)));
 $('place-count').textContent=String(visiblePlaces.length).padStart(2,'0');
 $('place-list').replaceChildren();
 for(const l of visiblePlaces){const button=document.createElement('button');button.className='place-row'+(l.id===selected?' selected':'');button.dataset.place=l.id;button.innerHTML=`<span class="place-icon">${icon(l.kind)}</span><span class="place-copy"><span class="place-name"></span><span class="place-subtitle"></span></span><svg class="icon"><use href="#i-arrow"/></svg>`;button.querySelector('.place-name').textContent=l.name;button.querySelector('.place-subtitle').textContent=l.subtitle;button.addEventListener('click',()=>selectPlace(l.id));$('place-list').append(button);}
 if(!visiblePlaces.length){const p=document.createElement('p');p.className='empty-state';p.textContent='No places found. Try “Selimiye”, “Karaağaç”, or another category.';$('place-list').append(p);}
 dirty=true;
}
function flyTo(l,zoom){
 const p=iso(...l.world),targetX=mobile()?W*.48:W*.57,targetY=mobile()?H*.30:H*.43;
 const z=zoom||Math.max(camera.zoom,mobile()?.8:.95);
 animateCamera({zoom:z,x:targetX-origin.x-p[0]*z,y:targetY-origin.y-p[1]*z});
}
function animateCamera(to){if(reduceMotion){camera=to;dirty=true;return;}animation={from:{...camera},to,start:performance.now(),duration:700};}
function illustration(l){
 const stone='#e7dcc0',shade='#baa980',roof='#95a58c',edge='#7a8e76';
 const background='<ellipse cx="157" cy="126" rx="93" ry="13" fill="#bac5a5" opacity=".5"/>';
 if(l.kind==='mosque')return background+`<g stroke="${edge}" stroke-width=".8"><path d="m96 98 65-24 67 24-66 27Z" fill="${shade}"/><path d="m110 81 48-20 47 20v27l-47 19-48-20Z" fill="${stone}"/><path d="m158 61 47 20-47 20-48-20Z" fill="${roof}"/><path d="M133 76a25 27 0 0 1 50 0q-25 19-50 0" fill="${roof}"/><path d="M158 47V38"/><path d="M110 105V30h5v78m85 0V27h5v78m-95-75 2-13 3 13m85-3 2-14 3 14" fill="${stone}"/><path d="M106 54h13m77-3h13M106 67h13m77-3h13M147 122v-14q10-13 20 0v11" fill="none"/></g>`;
 if(l.kind==='bridge')return '<path d="m45 113 95-40 126 34-96 36Z" fill="#a6c7b4"/>'+`<g stroke="${edge}"><path d="m53 96 116-40 89 23-116 46Z" fill="${stone}"/><path d="m53 96 89 29v13l-89-28Z" fill="${shade}"/><path d="m142 125 116-46v14l-116 46Z" fill="${stone}"/><path d="m154 127 3-8q5-9 10-4v8m14-6 3-8q5-9 10-4v8m14-6 3-8q5-9 10-4v8m14-6 3-8q5-9 10-4v8" fill="none"/></g>`;
 if(l.kind==='tree')return background+Array.from({length:9},(_,i)=>{const x=80+(i%5)*33,y=85+Math.floor(i/5)*28;return `<path d="M${x} ${y+32}v-25" stroke="${shade}" stroke-width="2"/><ellipse cx="${x}" cy="${y}" rx="14" ry="22" fill="${i%2?roof:'#afbc93'}"/>`;}).join('');
 return background+`<g stroke="${edge}" stroke-width=".8"><path d="m79 85 83-29 65 23v35l-82 27-66-23Z" fill="${stone}"/><path d="m79 85 83-29 65 23-82 29Z" fill="#bd8764"/><path d="m145 108 82-29v35l-82 27Z" fill="${shade}"/><path d="M160 132v-17l12-4v17m12-21v-13l10-4v13m11-19v-13l10-4v13M93 94v13m15-7v13m15-7v13" fill="none"/></g>`;
}
function selectPlace(id,{move=true,updateHash=true}={}){
 const l=places.find(p=>p.id===id);if(!l)return;
 selected=id;$('detail').hidden=false;$('detail-number').textContent=String(places.indexOf(l)+1).padStart(2,'0');$('detail-category').textContent=l.category.toUpperCase()+' / EDİRNE';$('detail-title').textContent=l.name;$('detail-description').textContent=l.description;$('detail-date').textContent=l.era;$('detail-neighborhood').textContent=l.neighborhood;$('detail-osm').href=`https://www.openstreetmap.org/?mlat=${l.lat}&mlon=${l.lon}#map=18/${l.lat}/${l.lon}`;$('detail-illustration').innerHTML=illustration(l);
 if(updateHash)history.replaceState(null,'','#'+id);
 $('explorer').classList.remove('open');$('mobile-explore').setAttribute('aria-expanded','false');
 filter();if(move)flyTo(l);dirty=true;
}
function closeDetail(){selected=null;$('detail').hidden=true;history.replaceState(null,'',location.pathname+location.search);filter();}
function home(){animation=null;inertia=false;const z=mobile()?.42:.53;const center=iso(...geo(26.5535,41.6748));animateCamera({zoom:z,x:-center[0]*z,y:-center[1]*z});closeDetail();tourIndex=-1;$('tour').querySelector('small').textContent='A little tour of the city';}
function zoom(f,x=W/2,y=H/2){animation=null;camera=zoomAt(camera,f,x,y,origin);constrain();dirty=true;}
function constrain(){camera.x=clamp(camera.x,-4500*camera.zoom,4500*camera.zoom);camera.y=clamp(camera.y,-4000*camera.zoom,4000*camera.zoom);}
function resize(){const rect=canvas.getBoundingClientRect();W=rect.width;H=rect.height;DPR=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);origin={x:mobile()?W*.5:(W+350)/2,y:H*.47};dirty=true;}
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('visible'),2600);}
function hideHint(){$('hint').style.opacity='0';}
let pointers=new Map(),drag=null,pinch=null,velocity={x:0,y:0},inertia=false;
canvas.addEventListener('pointerdown',e=>{
 animation=null;inertia=false;canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.classList.add('dragging');
 if(pointers.size===1)drag={x:e.clientX,y:e.clientY,ox:camera.x,oy:camera.y,time:performance.now(),moved:false};
 if(pointers.size===2){const[a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),x:(a.x+b.x)/2,y:(a.y+b.y)/2};drag=null;}
 hideHint();
});
canvas.addEventListener('pointermove',e=>{
 if(!pointers.has(e.pointerId))return;
 const previous=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pointers.size===2&&pinch){const[a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y),x=(a.x+b.x)/2,y=(a.y+b.y)/2,rect=canvas.getBoundingClientRect();zoom(distance/pinch.distance,x-rect.left,y-rect.top);camera.x+=x-pinch.x;camera.y+=y-pinch.y;pinch={distance,x,y};}
 else if(drag&&pointers.size===1){camera.x=drag.ox+e.clientX-drag.x;camera.y=drag.oy+e.clientY-drag.y;const elapsed=Math.max(8,performance.now()-drag.time);velocity={x:(e.clientX-previous.x)/elapsed*16,y:(e.clientY-previous.y)/elapsed*16};drag.time=performance.now();drag.moved=drag.moved||Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>4;}
 constrain();dirty=true;
});
function endPointer(e){pointers.delete(e.pointerId);if(!pointers.size){canvas.classList.remove('dragging');if(drag?.moved&&!reduceMotion&&performance.now()-drag.time<80){inertia=true;}drag=null;pinch=null;}else if(pointers.size===1){const a=[...pointers.values()][0];drag={x:a.x,y:a.y,ox:camera.x,oy:camera.y,time:performance.now(),moved:false};pinch=null;}}
canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',e=>{endPointer(e);inertia=false;});canvas.addEventListener('lostpointercapture',e=>{if(pointers.has(e.pointerId))endPointer(e);});
canvas.addEventListener('wheel',e=>{e.preventDefault();const rect=canvas.getBoundingClientRect();zoom(Math.exp(-e.deltaY*.0015),e.clientX-rect.left,e.clientY-rect.top);hideHint();},{passive:false});
canvas.addEventListener('dblclick',e=>{const rect=canvas.getBoundingClientRect();zoom(1.5,e.clientX-rect.left,e.clientY-rect.top);});
$('search').addEventListener('input',e=>{query=e.target.value;filter();});
for(const tab of document.querySelectorAll('.category'))tab.addEventListener('click',()=>{activeCategory=tab.dataset.category;for(const b of document.querySelectorAll('.category')){const a=b===tab;b.classList.toggle('active',a);b.setAttribute('aria-pressed',a?'true':'false');}filter();});
$('detail-close').addEventListener('click',closeDetail);$('zoom-in').addEventListener('click',()=>zoom(1.3));$('zoom-out').addEventListener('click',()=>zoom(1/1.3));$('reset').addEventListener('click',home);
$('theme').addEventListener('click',()=>{night=!night;pal=night?colors.night:colors.day;document.body.classList.toggle('evening',night);$('theme').querySelector('use').setAttribute('href',night?'#i-moon':'#i-sun');$('theme').setAttribute('aria-label',night?'Switch to daylight':'Switch to evening light');dirty=true;try{localStorage.setItem('edirne-light',night?'evening':'day');}catch{}});
$('layers').addEventListener('click',()=>{const open=$('layers-panel').hidden;$('layers-panel').hidden=!open;$('layers').setAttribute('aria-expanded',String(open));});
$('toggle-pins').addEventListener('change',e=>{showPins=e.target.checked;dirty=true;});$('toggle-labels').addEventListener('change',e=>{showLabels=e.target.checked;dirty=true;});$('toggle-3d').addEventListener('change',e=>{threeD=e.target.checked;dirty=true;});
function about(){$('about-dialog').showModal();}
$('about-open').addEventListener('click',about);$('data-info').addEventListener('click',about);$('about-close').addEventListener('click',()=>$('about-dialog').close());$('about-dialog').addEventListener('click',e=>{if(e.target===$('about-dialog')){const b=e.target.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)e.target.close();}});
$('mobile-explore').setAttribute('aria-expanded','false');$('mobile-explore').addEventListener('click',()=>{const open=$('explorer').classList.toggle('open');$('mobile-explore').setAttribute('aria-expanded',String(open));if(open){$('detail').hidden=true;$('search').focus();}});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('Fullscreen is not supported by this browser.');}catch{toast('Fullscreen is not available in this preview.');}});
$('share-place').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);toast('Link copied. Share a little Edirne.');}catch{toast('Copy this page’s address to share this place.');}});
const tourStops=['selimiye','eski-cami','uc-serefeli','makedonya','synagogue','tunca','meric','karaagac','bayezid','sarayici'];
$('tour').addEventListener('click',()=>{tourIndex=(tourIndex+1)%tourStops.length;selectPlace(tourStops[tourIndex]);$('tour').querySelector('small').textContent=`Stop ${tourIndex+1} of ${tourStops.length} · Click for the next place`;$('tour').querySelector('span:nth-child(2)').firstChild.textContent='Continue the scenic route';});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){if($('about-dialog').open)return;closeDetail();$('layers-panel').hidden=true;$('layers').setAttribute('aria-expanded','false');$('explorer').classList.remove('open');$('mobile-explore').setAttribute('aria-expanded','false');return;}
 if(e.target.matches('input,textarea')||$('about-dialog').open||e.metaKey||e.ctrlKey||e.altKey)return;
 if(e.key==='/'){e.preventDefault();if(mobile()){$('explorer').classList.add('open');$('mobile-explore').setAttribute('aria-expanded','true');}$('search').focus();return;}
 if(e.key==='+'||e.key==='='){e.preventDefault();zoom(1.25);}else if(e.key==='-'){e.preventDefault();zoom(.8);}else if(e.key.toLowerCase()==='r')home();
 else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();animation=null;const step=e.shiftKey?120:45;camera.x+=e.key==='ArrowLeft'?step:e.key==='ArrowRight'?-step:0;camera.y+=e.key==='ArrowUp'?step:e.key==='ArrowDown'?-step:0;constrain();dirty=true;}
});
window.addEventListener('hashchange',()=>{const id=decodeURIComponent(location.hash.slice(1));if(places.some(p=>p.id===id))selectPlace(id,{updateHash:false});else closeDetail();});
window.addEventListener('resize',resize);
function frame(now){
 if(animation){const t=clamp((now-animation.start)/animation.duration,0,1),e=1-Math.pow(1-t,3);camera={x:animation.from.x+(animation.to.x-animation.from.x)*e,y:animation.from.y+(animation.to.y-animation.from.y)*e,zoom:animation.from.zoom+(animation.to.zoom-animation.from.zoom)*e};dirty=true;if(t===1)animation=null;}
 if(inertia){camera.x+=velocity.x;camera.y+=velocity.y;velocity.x*=.89;velocity.y*=.89;constrain();dirty=true;if(Math.abs(velocity.x)+Math.abs(velocity.y)<.25)inertia=false;}
 if(dirty)draw();requestAnimationFrame(frame);
}
for(const l of places)l.world=geo(l.lon,l.lat);
prepare();createPins();addLabels();filter();resize();home();
$('data-description').textContent=`Built from ${data.meta.buildings.toLocaleString()} OpenStreetMap building footprints, real street lines, waterways, and land-use polygons. The downloaded urban-area snapshot covers Karaağaç, the old town, Sarayiçi, and the surrounding city, rather than the entire rural Merkez district. Data snapshot: ${data.meta.date}.`;
try{if(localStorage.getItem('edirne-light')==='evening')$('theme').click();}catch{}
if(places.some(p=>p.id===initialHash))selectPlace(initialHash);
requestAnimationFrame(frame);requestAnimationFrame(()=>{$('loading').classList.add('done');setTimeout(()=>$('loading').hidden=true,650);});
// Read-only diagnostics for maintainers and smoke tests.
Object.defineProperty(window,'edirneAtlas',{value:{getState:()=>({camera:{...camera},selected,category:activeCategory,visiblePlaces:visiblePlaces.length,threeD,night,buildings:buildings.length,roads:roads.length,trees:trees.length}),project:(lon,lat)=>screen(geo(lon,lat)),selectPlace,reset:home}});
})();
