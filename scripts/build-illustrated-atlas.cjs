/* Package original illustrated region images into a fixed-angle WebP tile atlas. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const G=require('../dist/geometry.js'),root=path.resolve(__dirname,'..');
async function main(){
 const config=JSON.parse(fs.readFileSync(path.join(root,'assets/illustrations/regions.json'),'utf8')),regions=config.regions;
 const base=regions[0],bounds={minX:base.x,minY:base.y,maxX:base.x+base.w,maxY:base.y+base.h},width=Math.ceil(base.w),height=Math.ceil(base.h);
 const prepared=[];
 for(let i=0;i<regions.length;i++){
  const r=regions[i],img=await loadImage(path.join(root,'assets/illustrations',r.file));
  const source=createCanvas(img.width,img.height),p=source.getContext('2d');p.drawImage(img,0,0);
  if(i>0){
   const fx=110/r.w*img.width,fy=110/r.h*img.height,w=img.width,h=img.height;
   p.globalCompositeOperation='destination-in';let g=p.createLinearGradient(0,0,w,0);g.addColorStop(0,'#0000');g.addColorStop(fx/w,'#000');g.addColorStop(1-fx/w,'#000');g.addColorStop(1,'#0000');p.fillStyle=g;p.fillRect(0,0,w,h);
   g=p.createLinearGradient(0,0,0,h);g.addColorStop(0,'#0000');g.addColorStop(fy/h,'#000');g.addColorStop(1-fy/h,'#000');g.addColorStop(1,'#0000');p.fillStyle=g;p.fillRect(0,0,w,h);
  }
  prepared.push({...r,source});
 }
 const out=path.join(root,'dist/atlas-v4');fs.mkdirSync(out,{recursive:true});const TILE=1024,levels=[.125,.25,.5,1].map(scale=>({scale,cols:Math.ceil(base.w*scale/TILE),rows:Math.ceil(base.h*scale/TILE)}));
 // Reuse a tile-sized surface. Never allocate a full 9102-by-5120 city bitmap.
 const surface=createCanvas(TILE,TILE);
 function publish(file,x,y,w,h,scale,quality=88){
  const sw=Math.ceil(w*scale),sh=Math.ceil(h*scale);if(surface.width!==sw)surface.width=sw;if(surface.height!==sh)surface.height=sh;
  const p=surface.getContext('2d');p.setTransform(1,0,0,1,0,0);p.globalCompositeOperation='source-over';p.fillStyle='#b5b69f';p.fillRect(0,0,sw,sh);
  for(const r of prepared){if(r.x+r.w<x||r.x>x+w||r.y+r.h<y||r.y>y+h)continue;p.drawImage(r.source,(r.x-x)*scale,(r.y-y)*scale,r.w*scale,r.h*scale);}
  fs.writeFileSync(path.join(out,file),surface.toBuffer('image/webp',quality));
 }
 const overviewScale=Math.min(1400/base.w,900/base.h);publish('overview.webp',base.x,base.y,base.w,base.h,overviewScale,90);
 for(let l=0;l<levels.length;l++){const level=levels[l],span=TILE/level.scale;fs.mkdirSync(path.join(out,String(l)),{recursive:true});for(let y=0;y<level.rows;y++)for(let x=0;x<level.cols;x++)publish(l+'/'+x+'-'+y+'.webp',base.x+x*span,base.y+y*span,span,span,level.scale);console.log('Level '+l+': '+level.cols*level.rows+' tiles');}
 const c={window:{}};for(const f of ['dist/data/map.js','dist/data/places.js'])vm.runInNewContext(fs.readFileSync(path.join(root,f),'utf8'),c);
 const places=c.window.EDIRNE_PLACES;fs.mkdirSync(path.join(out,'thumbs'),{recursive:true});
 for(const p of places){const a=G.iso(...G.geo(p.lon,p.lat)),w=p.kind==='bridge'?460:320;publish('thumbs/'+p.id+'.webp',a[0]-w/2,a[1]-w*.4,w,w*.64,1,92);}
 const manifest={version:4,bounds,tileSize:TILE,levels,background:'#b5b69f',overview:'overview.webp',meta:c.window.EDIRNE_MAP.meta,illustration:{regions:regions.map(r=>r.id),projection:'fixed isometric',source:'Open-data scene render, artistically restyled using built-in image generation',accuracy:'Illustrative architectural detail; not a surveyed map'},renderStats:{sourceBuildings:c.window.EDIRNE_MAP.meta.buildings,regions:regions.length}};
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest));console.log(JSON.stringify({tiles:levels.reduce((s,l)=>s+l.cols*l.rows,0),regions:regions.length,width,height}));
}
main().catch(e=>{console.error(e);process.exit(1);});
