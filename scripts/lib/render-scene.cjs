/* Offline cartographic renderer. No geometry rendering runs in the browser. */
'use strict';
const {geo,iso,hash,inPolygon}=require('../../dist/geometry.js');
const {Path2D}=require('@napi-rs/canvas');
module.exports=function createScene(data,places){
let ctx;const threeD=true,night=false,camera={zoom:2};
const ground=[],roads=[],buildings=[],trees=[],models=[];
const pal={bg:'#b9b69d',residential:'#c6bdab',commercial:'#bcb4a1',farmland:'#a8ae83',forest:'#6d855e',park:'#91a175',grass:'#a5af83',water:'#347783',waterEdge:'#7b9c83',road:'#a49c8c',roadEdge:'#d7cfba',path:'#d0c5ab',roof:['#b56949','#b85c41','#b77b57','#b7815c','#c7966c','#a16d53','#c5ad87'],wall:['#eddfc6','#d5c1a0','#ab9b81'],tree:['#617e48','#789355','#526f40','#8a9e62'],dome:'#81908a',domeDark:'#5c716d',stone:'#e1d4b5',stoneDark:'#a9a084'};
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
 const h=b.h*1.35,pts=b.points;
 ctx.save();ctx.translate(6,5);ctx.fillStyle='#35492f42';ctx.fill(b.path);ctx.restore();
 // Derive front-facing wall normals from the polygon's actual winding.
 let winding=0;for(let i=0;i<b.world.length-1;i++){const a=b.world[i],c=b.world[i+1];winding+=a[0]*c[1]-c[0]*a[1];}
 const sign=winding>0?1:-1,faces=[];
 for(let i=0;i<pts.length-1;i++){
  const a=pts[i],c=pts[i+1],wa=b.world[i],wc=b.world[i+1];
  const nx=(wc[1]-wa[1])*sign,ny=-(wc[0]-wa[0])*sign;
  if(nx*Math.sin(-Math.PI/7)+ny*Math.cos(-Math.PI/7)<=0)continue;
  faces.push({i,depth:(a[1]+c[1])/2});
 }
 faces.sort((a,b)=>a.depth-b.depth);
 for(const f of faces){const a=pts[f.i],c=pts[f.i+1],len=Math.hypot(c[0]-a[0],c[1]-a[1]);
  polygon([a,c,[c[0],c[1]-h],[a[0],a[1]-h]],c[0]>a[0]?pal.wall[1]:pal.wall[0],pal.wall[2],.36);
  const windows=Math.min(18,Math.floor(len/4.5)),floors=Math.max(1,Math.floor(h/4.6));
  for(let floor=0;floor<floors;floor++)for(let k=1;k<windows;k++){
   const t=k/windows,x=a[0]+(c[0]-a[0])*t,y=a[1]+(c[1]-a[1])*t-3.1-floor*4.4;
   ctx.fillStyle=k%4===0?'#9ba5a2':'#627274';ctx.fillRect(x-.6,y-1.8,1.35,2.05);
   ctx.fillStyle='#eadbc2';ctx.fillRect(x-.8,y+.3,1.8,.35);
  }
 }
 const top=pts.map(p=>[p[0],p[1]-h]),base=pal.roof[b.r];
 polygon(top,b.mosque?pal.dome:base,'#6e675558',.4);
 if(pts.length===5&&!b.mosque&&b.r!==6){
  const a=top[0],c=top[1],d=top[2],e=top[3];
  const wide=Math.hypot(a[0]-c[0],a[1]-c[1])>Math.hypot(c[0]-d[0],c[1]-d[1]);
  const q=wide?[a,c,d,e]:[c,d,e,a];
  const m0=[(q[0][0]+q[3][0])/2,(q[0][1]+q[3][1])/2],m1=[(q[1][0]+q[2][0])/2,(q[1][1]+q[2][1])/2];
  const r0=[m0[0]*.8+m1[0]*.2,m0[1]*.8+m1[1]*.2-2.5],r1=[m0[0]*.2+m1[0]*.8,m0[1]*.2+m1[1]*.8-2.5];
  polygon([q[0],q[1],r1,r0],base,'#794c3855',.35);
  polygon([q[1],q[2],r1],pal.roof[(b.r+2)%6],'#794c3855',.35);
  polygon([q[2],q[3],r0,r1],pal.roof[(b.r+1)%6],'#794c3855',.35);
  polygon([q[3],q[0],r0],base,'#794c3855',.35);
  ctx.beginPath();ctx.moveTo(...r0);ctx.lineTo(...r1);ctx.strokeStyle='#e0ad7d';ctx.lineWidth=.65;ctx.stroke();
 }else if(!b.mosque&&b.maxX-b.minX>18&&b.maxY-b.minY>12){
  ctx.fillStyle='#b5b6a4';const x=(b.minX+b.maxX)/2,y=(b.minY+b.maxY)/2-h;ctx.fillRect(x-2,y-2,4,3);ctx.fillStyle='#737e7a';ctx.fillRect(x-2,y-2,4,1);
 }
 // Fine roof courses are baked once, rather than repeated during movement.
 ctx.save();ctx.translate(0,-h);ctx.clip(b.path);ctx.strokeStyle='#e6b17d33';ctx.lineWidth=.45;
 for(let y=b.minY;y<b.maxY;y+=2){ctx.beginPath();ctx.moveTo(b.minX,y);ctx.lineTo(b.maxX,y-2);ctx.stroke();}
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
 const corners=large?[[x-w/2-3,y-d/2-3,71],[x+w/2+3,y-d/2-3,71],[x-w/2-3,y+d/2+3,71],[x+w/2+3,y+d/2+3,71]]:old?[[x-w/2,y-d/2,44],[x+w/2,y+d/2,49]]:[[x-w/2-4,y-d/2-5,large?71:62],[x+w/2+4,y-d/2-5,large?71:50],[x-w/2-4,cy-d/2,large?71:46],[x+w/2+4,cy-d/2,large?71:52]];
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

for(const p of places)p.world=geo(p.lon,p.lat);
prepare();
const objects=[...buildings.map(o=>({type:'building',depth:o.depth,o})),...trees.map(o=>({type:'tree',depth:o.depth,o})),...models.map(o=>({type:'model',depth:o.depth,o}))].sort((a,b)=>a.depth-b.depth);
function render(target,x,y,width,height,scale){
 ctx=target;ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=pal.bg;ctx.fillRect(0,0,Math.ceil(width*scale),Math.ceil(height*scale));
 ctx.setTransform(scale,0,0,scale,-x*scale,-y*scale);
 const v={left:x-100,right:x+width+100,top:y-100,bottom:y+height+150};
 drawGround(v);
 for(const {type,o}of objects){
  if(type==='building'){if(visible(o,v))drawBuilding(o);}
  else if(type==='tree'){if(o.x>v.left&&o.x<v.right&&o.y>v.top&&o.y<v.bottom)drawTree(o);}
  else{const p=iso(...o.world);if(p[0]>v.left&&p[0]<v.right&&p[1]>v.top&&p[1]<v.bottom)modelBuilding(o);}
 }
}
return {render,background:pal.bg,stats:{buildings:buildings.length,trees:trees.length,roads:roads.length}};
};
