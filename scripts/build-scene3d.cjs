#!/usr/bin/env node
/* Compile open building geometry once. Aerial imagery is streamed live and is
 * never downloaded into or redistributed with the repository. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),zlib=require('node:zlib');
const G=require('../dist/geometry.js'),S=require('../dist/satellite-core.js');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist/scene3d');
async function main(){
const {default:earcut}=await import('earcut');const context={window:{}};
for(const f of ['dist/data/map.js','dist/data/places.js'])vm.runInNewContext(fs.readFileSync(path.join(root,f),'utf8'),context);
const data=context.window.EDIRNE_MAP,places=context.window.EDIRNE_PLACES,chunks=new Map(),Z=17,Q=64;
function chunkAt(lon,lat){const t=S.tileFor(lon,lat,Z),id=`${t.x}-${t.y}`;if(!chunks.has(id)){const n=2**Z,origin=[(t.x+.5)/n,(t.y+.5)/n];chunks.set(id,{id,x:t.x,y:t.y,origin,span:1/n/S.METER,vertices:[],buildings:0});}return chunks.get(id);}
function vertex(c,p,n,material,seed){const x=(p[0]-c.origin[0])/S.METER,y=(p[1]-c.origin[1])/S.METER;if(Math.abs(x*Q)>32760||Math.abs(y*Q)>32760)throw Error('Mesh coordinate outside quantization range');c.vertices.push(Math.round(x*Q),Math.round(y*Q),Math.round(p[2]*Q),...n.map(v=>Math.round(v*127)),material,seed);}
function triangle(c,a,b,d,n,material,seed){for(const p of[a,b,d])vertex(c,p,n,material,seed);}
function face(c,ps,n,material=1,seed=100){for(let i=1;i<ps.length-1;i++)triangle(c,ps[0],ps[i],ps[i+1],n,material,seed);}
function position(lon,lat,z=0){return [...S.mercator(lon,lat),z];}
function prism(c,ps,h,seed=100,top=true){
 let winding=0;for(let i=0;i<ps.length;i++){const a=ps[i],b=ps[(i+1)%ps.length];winding+=a[0]*b[1]-b[0]*a[1];}const sign=winding>0?1:-1;
 for(let i=0;i<ps.length;i++){const a=ps[i],b=ps[(i+1)%ps.length],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);if(len<1e-12)continue;face(c,[[...a,0],[...b,0],[...b,h],[...a,h]],[dy/len*sign,-dx/len*sign,0],0,seed);}
 if(top){const xy=ps.flat(),indices=earcut(xy);for(let i=0;i<indices.length;i+=3)triangle(c,[...ps[indices[i]],h],[...ps[indices[i+1]],h],[...ps[indices[i+2]],h],[0,0,1],1,seed);}
}
const custom=places.filter(p=>['selimiye','uc-serefeli','eski-cami'].includes(p.id));
for(const f of data.features){if(f.t!=='building')continue;
 let ps=f.p.slice(0,-1);if(ps.length<3)continue;
 const center=ps.reduce((a,p)=>[a[0]+p[0]/ps.length,a[1]+p[1]/ps.length],[0,0]),ll=G.ungeo(...center);
 if(custom.some(p=>{const q=G.geo(p.lon,p.lat);return Math.hypot(q[0]-center[0],q[1]-center[1])<(p.id==='selimiye'?58:p.id==='uc-serefeli'?43:32);} ))continue;
 const c=chunkAt(...ll),seed=Math.floor(G.hash(f.id)*255),h=f.h||5.5+Math.floor(G.hash(f.id+1)*4)*2.4;
 ps=ps.map(p=>S.mercator(...G.ungeo(...p)));prism(c,ps,Math.min(90,h),seed);c.buildings++;
}
function addMosque(p){
 const c=chunkAt(p.lon,p.lat),center=G.geo(p.lon,p.lat),angle=-Math.PI*.235,cos=Math.cos(angle),sin=Math.sin(angle);
 // Main mosque footprints face southeast; courtyards extend toward the northwest.
 function at(x,y,z=0){return position(...G.ungeo(center[0]+cos*x-sin*y,center[1]+sin*x+cos*y),z);}
 function box(x,y,w,d,h){prism(c,[at(x-w/2,y-d/2).slice(0,2),at(x+w/2,y-d/2).slice(0,2),at(x+w/2,y+d/2).slice(0,2),at(x-w/2,y+d/2).slice(0,2)],h,123);}
 function dome(x,y,z,r,h){const rings=10,slices=24;for(let j=0;j<rings;j++)for(let i=0;i<slices;i++){
  const points=[],normals=[];for(const[u,v]of[[j,i],[j,i+1],[j+1,i+1],[j+1,i]]){const t=u/rings*Math.PI/2,a=v/slices*Math.PI*2,n=[Math.cos(a)*Math.cos(t),Math.sin(a)*Math.cos(t),Math.sin(t)];points.push(at(x+n[0]*r,y+n[1]*r,z+n[2]*h));normals.push([cos*n[0]-sin*n[1],sin*n[0]+cos*n[1],n[2]]);}
  for(const ids of[[0,1,2],[0,2,3]])for(const k of ids)vertex(c,points[k],normals[k],2,123);
 }}
 function minaret(x,y,h,balconies){const slices=12,r=1.8;for(let i=0;i<slices;i++){const a=i/slices*Math.PI*2,b=(i+1)/slices*Math.PI*2,n=[Math.cos((a+b)/2),Math.sin((a+b)/2),0],normal=[cos*n[0]-sin*n[1],sin*n[0]+cos*n[1],0];face(c,[at(x+Math.cos(a)*r,y+Math.sin(a)*r,0),at(x+Math.cos(b)*r,y+Math.sin(b)*r,0),at(x+Math.cos(b)*r,y+Math.sin(b)*r,h-9),at(x+Math.cos(a)*r,y+Math.sin(a)*r,h-9)],normal,3,150);face(c,[at(x+Math.cos(a)*r,y+Math.sin(a)*r,h-9),at(x+Math.cos(b)*r,y+Math.sin(b)*r,h-9),at(x,y,h)],normal,4,120);}
  for(let j=0;j<balconies;j++){const z=h*.36+j*h*.16;for(let i=0;i<slices;i++){const a=i/slices*Math.PI*2,b=(i+1)/slices*Math.PI*2;face(c,[at(x,y,z),at(x+Math.cos(a)*3,y+Math.sin(a)*3,z),at(x+Math.cos(b)*3,y+Math.sin(b)*3,z)],[0,0,1],3,160);}}
 }
 if(p.id==='selimiye'){box(0,0,53,49,22);dome(0,0,24,15.7,17);for(const x of[-18,18])for(const y of[-14,14])dome(x,y,22,6,4.5);for(const x of[-28,28])for(const y of[-25,25])minaret(x,y,70.9,3);box(0,-57,62,5,5);for(const x of[-29,29])box(x,-36,5,42,5);}
 else if(p.id==='eski-cami'){box(0,0,45,45,11);for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++)dome(i*14,j*14,11,6.7,6);minaret(-24,-22,44,1);minaret(24,21,48,2);}
 else{box(0,0,58,37,15);dome(0,0,16,12,12);for(const x of[-21,21])for(const y of[-8,8])dome(x,y,15,7,6);box(0,-60,60,5,6);for(const x of[-28,28])box(x,-39,5,40,6);minaret(-30,-17,67.6,3);minaret(30,-17,50,2);minaret(-30,-63,42,1);minaret(30,-63,44,1);}
 c.buildings++;
}
for(const p of custom)addMosque(p);
const list=[...chunks.values()].sort((a,b)=>a.id.localeCompare(b.id));let offset=0;const buffers=[],records=[];
for(const c of list){const v=c.vertices,vertexCount=v.length/8,bytes=Buffer.alloc(vertexCount*12);for(let i=0;i<vertexCount;i++){const a=i*8,b=i*12;bytes.writeInt16LE(v[a],b);bytes.writeInt16LE(v[a+1],b+2);bytes.writeInt16LE(v[a+2],b+4);for(let k=0;k<3;k++)bytes.writeInt8(v[a+3+k],b+6+k);bytes[b+9]=v[a+6];bytes[b+10]=v[a+7];}
 buffers.push(bytes);records.push({id:c.id,x:c.x,y:c.y,origin:c.origin,span:c.span,offset,length:bytes.length,count:vertexCount,buildings:c.buildings});offset+=bytes.length;}
const combined=Buffer.concat(buffers);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'buildings.bin.gz'),zlib.gzipSync(combined,{level:9}));
const manifest={version:3,projection:'WebMercator',meshZoom:Z,stride:12,quantization:Q,byteLength:combined.length,data:'buildings.bin.gz',meta:data.meta,chunks:records};fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest));console.log(JSON.stringify({chunks:records.length,vertices:combined.length/12,bytes:combined.length,gzip:fs.statSync(path.join(out,'buildings.bin.gz')).size}));
}
main().catch(e=>{console.error(e);process.exit(1);});
