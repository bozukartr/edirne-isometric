#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas}=require('@napi-rs/canvas');
const {geo,iso}=require('../dist/geometry.js');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist/atlas');
const context={window:{}};
for(const f of['dist/data/map.js','dist/data/places.js'])vm.runInNewContext(fs.readFileSync(path.join(root,f),'utf8'),context);
const data=context.window.EDIRNE_MAP,places=context.window.EDIRNE_PLACES;
const createScene=require('./lib/render-scene.cjs');
const scene=createScene(data,places),box=data.meta.bbox,corners=[[box[0],box[1]],[box[0],box[3]],[box[2],box[1]],[box[2],box[3]]].map(p=>iso(...geo(...p)));
const bounds={minX:Math.floor(Math.min(...corners.map(p=>p[0])))-100,minY:Math.floor(Math.min(...corners.map(p=>p[1])))-120,maxX:Math.ceil(Math.max(...corners.map(p=>p[0])))+100,maxY:Math.ceil(Math.max(...corners.map(p=>p[1])))+60};
const width=bounds.maxX-bounds.minX,height=bounds.maxY-bounds.minY,TILE=1536;
fs.mkdirSync(out,{recursive:true});
function image(file,x,y,w,h,r,quality=83){const c=createCanvas(Math.ceil(w*r),Math.ceil(h*r));scene.render(c.getContext('2d'),x,y,w,h,r);fs.writeFileSync(path.join(out,file),c.toBuffer('image/webp',quality));}
const overviewScale=Math.min(1400/width,900/height);
image('overview.webp',bounds.minX,bounds.minY,width,height,overviewScale,84);
const levels=[.25,.5,1,2].map(scale=>({scale,cols:Math.ceil(width*scale/TILE),rows:Math.ceil(height*scale/TILE)}));
const manifest={version:2,bounds,tileSize:TILE,levels,background:scene.background,overview:'overview.webp',meta:data.meta,renderStats:scene.stats};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest));
console.log(JSON.stringify({bounds,levels,stats:scene.stats}));
for(let l=0;l<levels.length;l++){
 const {scale,cols,rows}=levels[l];fs.mkdirSync(path.join(out,String(l)),{recursive:true});
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
  const x=bounds.minX+col*TILE/scale,y=bounds.minY+row*TILE/scale;
  image(`${l}/${col}-${row}.webp`,x,y,TILE/scale,TILE/scale,scale,82);
 }
 console.log(`Level ${l} (${scale} px/m): ${cols*rows} tiles complete`);
}
fs.mkdirSync(path.join(out,'thumbs'),{recursive:true});
for(const p of places){const a=iso(...geo(p.lon,p.lat)),w=p.model==='bridge'?380:250;image(`thumbs/${p.id}.webp`,a[0]-w/2,a[1]-w*.36,w,w*.64,1,85);}
console.log(`Atlas complete: ${fs.readdirSync(out).length} directories/files`);
