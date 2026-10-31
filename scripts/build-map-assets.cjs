/* Deterministic, ground-only fallback from source geometry. No satellite pixels are copied. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas,Path2D}=require('@napi-rs/canvas'),G=require('../dist/geometry.js');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist/map-assets'),c={window:{}};
for(const f of ['dist/data/map.js','dist/data/places.js'])vm.runInNewContext(fs.readFileSync(path.join(root,f),'utf8'),c);
const data=c.window.EDIRNE_MAP,places=c.window.EDIRNE_PLACES,[w,s,e,n]=data.meta.bbox;
const corners=[[w,n],[e,n],[e,s],[w,s]].map(p=>G.iso(...G.geo(...p)));
const bounds={minX:Math.floor(Math.min(...corners.map(p=>p[0])))-20,minY:Math.floor(Math.min(...corners.map(p=>p[1])))-20,maxX:Math.ceil(Math.max(...corners.map(p=>p[0])))+20,maxY:Math.ceil(Math.max(...corners.map(p=>p[1])))+20};
const bg='#303a32',land={residential:'#4b5046',commercial:'#55534b',industrial:'#565851',retail:'#55534b',farmland:'#556146',farmyard:'#555944',meadow:'#4c6047',grass:'#4b6047',forest:'#354b39',wood:'#354b39',park:'#41634c',orchard:'#3f5740',cemetery:'#43543e',recreation_ground:'#496149',water:'#466e76'};
const features=data.features.map(f=>{const points=f.p.map(p=>G.iso(...G.sourceToLocal(...p))),p=new Path2D();points.forEach((q,i)=>i?p.lineTo(...q):p.moveTo(...q));if(['building','water','land'].includes(f.t))p.closePath();return {...f,path:p};});
function render(x,y,width,height,scale){const canvas=createCanvas(Math.ceil(width*scale),Math.ceil(height*scale)),p=canvas.getContext('2d');p.fillStyle=bg;p.fillRect(0,0,canvas.width,canvas.height);p.setTransform(scale,0,0,scale,-x*scale,-y*scale);p.lineJoin='round';p.lineCap='round';
 for(const f of features){if(f.t==='land'||f.t==='water'){p.fillStyle=land[f.k]||land[f.t]||'#4b5945';p.fill(f.path);}}
 for(const f of features){if(f.t==='river'){p.strokeStyle='#466e76';p.lineWidth=f.w||30;p.stroke(f.path);}}
 const widths={motorway:20,trunk:18,primary:13,secondary:10,tertiary:8,residential:5.5,living_street:5,service:4,unclassified:5,pedestrian:5,footway:1.8,path:1.5,cycleway:2,steps:1.4,track:2};
 for(const f of features){if(f.t==='road'){p.strokeStyle=f.b?'#a8a693':'#8c907d';p.lineWidth=widths[f.k]||4;p.stroke(f.path);}}
 for(const f of features){if(f.t==='building'){p.fillStyle='#b79b7a';p.fill(f.path);p.strokeStyle='#dcc9a044';p.lineWidth=.4;p.stroke(f.path);}}
 return canvas;
}
fs.mkdirSync(out,{recursive:true});const bw=bounds.maxX-bounds.minX,bh=bounds.maxY-bounds.minY;
fs.writeFileSync(path.join(out,'overview.webp'),render(bounds.minX,bounds.minY,bw,bh,2048/bw).toBuffer('image/webp',91));
fs.mkdirSync(path.join(out,'thumbs'),{recursive:true});
for(const p of places){const q=G.iso(...G.geo(p.lon,p.lat)),span=380;fs.writeFileSync(path.join(out,'thumbs',p.id+'.webp'),render(q[0]-span/2,q[1]-span*.3125,span,span*.625,320/span).toBuffer('image/webp',91));}
const manifest={version:6,bounds,bbox:data.meta.bbox,background:bg,overview:'overview.webp',camera:{minZoom:.11,maxZoom:2.6,homeZoom:.65,placeZoom:1.6},meta:data.meta,projection:{crs:'EPSG:3857',origin:G.ORIGIN,angle:G.ANGLE,tilt:G.TILT,registration:'All imagery and pins share the same exact affine Mercator-to-isometric transform.'},imagery:{provider:'Esri World Imagery',attribution:'Esri, Vantor, Earthstar Geographics, and the GIS User Community',delivery:'Direct provider requests for visible imagery; no imagery bundled, generation, warping by hand or synthetic detail.'},fallback:{source:'OSM and Microsoft footprint geometry, ground-only deterministic drawing',accuracy:'Source data may be incomplete or dated; fallback is clearly identified and contains no invented roofs, models, heights or terrain.'}};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest));console.log(JSON.stringify({features:features.length,buildings:data.meta.buildings,bounds}));
