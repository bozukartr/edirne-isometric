/* Slice every zoom level, overview and card from ONE immutable city image. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const G=require('../dist/geometry.js'),root=path.resolve(__dirname,'..');
async function main(){
 const config=JSON.parse(fs.readFileSync(path.join(root,'assets/illustrations/regions.json'),'utf8'));
 if(config.regions.length!==1)throw Error('A continuous atlas requires exactly one master image; independent region overlays are forbidden.');
 const base=config.regions[0],sourcePath=path.join(root,'assets/illustrations',base.file),source=await loadImage(sourcePath);
 const bounds={minX:base.x,minY:base.y,maxX:base.x+base.w,maxY:base.y+base.h},nativeScale=source.width/base.w;
 const out=path.join(root,'dist/atlas-v5');fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
 // Never encode detail above the source's real resolution.
 const TILE=1024,levels=[.0625,.125,nativeScale].map(scale=>({scale,cols:Math.ceil(base.w*scale/TILE),rows:Math.ceil(base.h*scale/TILE)}));
 const surface=createCanvas(TILE,TILE);
 function publish(file,x,y,w,h,scale){
  const sw=Math.ceil(w*scale),sh=Math.ceil(h*scale);if(surface.width!==sw)surface.width=sw;if(surface.height!==sh)surface.height=sh;
  const p=surface.getContext('2d');p.setTransform(1,0,0,1,0,0);p.fillStyle='#b5b69f';p.fillRect(0,0,sw,sh);
  p.imageSmoothingEnabled=true;p.imageSmoothingQuality='high';
  p.drawImage(source,(base.x-x)*scale,(base.y-y)*scale,base.w*scale,base.h*scale);
  fs.writeFileSync(path.join(out,file),surface.toBuffer('image/webp',94));
 }
 publish('overview.webp',base.x,base.y,base.w,base.h,Math.min(1400/base.w,nativeScale));
 for(let l=0;l<levels.length;l++){const level=levels[l],span=TILE/level.scale;fs.mkdirSync(path.join(out,String(l)),{recursive:true});for(let y=0;y<level.rows;y++)for(let x=0;x<level.cols;x++)publish(l+'/'+x+'-'+y+'.webp',base.x+x*span,base.y+y*span,span,span,level.scale);console.log('Level '+l+': '+level.cols*level.rows+' tiles');}
 const c={window:{}};for(const f of ['dist/data/map.js','dist/data/places.js'])vm.runInNewContext(fs.readFileSync(path.join(root,f),'utf8'),c);
 fs.mkdirSync(path.join(out,'thumbs'),{recursive:true});
 for(const place of c.window.EDIRNE_PLACES){const a=G.iso(...G.geo(place.lon,place.lat)),w=750;publish('thumbs/'+place.id+'.webp',a[0]-w/2,a[1]-w*.4,w,w*.64,256/w);}
 const manifest={version:5,bounds,tileSize:TILE,levels,background:'#b5b69f',overview:'overview.webp',meta:c.window.EDIRNE_MAP.meta,camera:{minZoom:.09,maxZoom:nativeScale*2,homeZoom:.15,placeZoom:nativeScale*2},illustration:{regions:[base.id],master:base.file,sourcePixels:[source.width,source.height],nativeScale,sha256:crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex'),projection:'fixed isometric',source:'One original whole-city illustration; deterministic crops at every scale',accuracy:'Artistically interpreted geography and architecture; not surveyed or navigational imagery'},renderStats:{sourceBuildings:c.window.EDIRNE_MAP.meta.buildings,regions:1}};
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest));console.log(JSON.stringify({tiles:levels.reduce((s,l)=>s+l.cols*l.rows,0),sourcePixels:manifest.illustration.sourcePixels,maxZoom:manifest.camera.maxZoom}));
}
main().catch(e=>{console.error(e);process.exit(1);});
