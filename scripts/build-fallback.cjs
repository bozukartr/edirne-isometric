/* An original, local plan-view backup from the open footprint database.
 * No satellite or other provider imagery is downloaded or copied. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas}=require('@napi-rs/canvas'),G=require('../dist/geometry.js'),S=require('../dist/satellite-core.js');
const root=path.resolve(__dirname,'..'),context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'dist/data/map.js'),'utf8'),context);
const data=context.window.EDIRNE_MAP,[west,south,east,north]=data.meta.bbox;
const nw=S.local(west,north),se=S.local(east,south),width=2400,height=Math.round(width*(se[1]-nw[1])/(se[0]-nw[0])),scale=width/(se[0]-nw[0]);
const canvas=createCanvas(width,height),ctx=canvas.getContext('2d');
ctx.fillStyle='#cfd1c4';ctx.fillRect(0,0,width,height);ctx.lineCap='round';ctx.lineJoin='round';
function project(p){const q=S.local(...G.ungeo(...p));return[(q[0]-nw[0])*scale,(q[1]-nw[1])*scale];}
function trace(f){ctx.beginPath();for(let i=0;i<f.p.length;i++){const p=project(f.p[i]);i?ctx.lineTo(...p):ctx.moveTo(...p);}}
for(const f of data.features)if(f.t==='land'){trace(f);ctx.fillStyle=/park|forest|wood|grass|meadow|garden|recreation/.test(f.k)?'#a0b29a':'#c7c8bb';ctx.fill();}
for(const f of data.features)if(f.t==='water'||f.t==='river'){trace(f);ctx.fillStyle='#89a5a5';ctx.strokeStyle='#89a5a5';if(f.t==='water'){ctx.closePath();ctx.fill();}else{ctx.lineWidth=(f.k==='river'?48:13)*scale;ctx.stroke();}}
const roads=data.features.filter(f=>f.t==='road');
for(const pass of[0,1])for(const f of roads){trace(f);const w=/primary|trunk/.test(f.k)?13:/secondary|tertiary/.test(f.k)?10:/foot|path|pedestrian/.test(f.k)?3.5:6;ctx.lineWidth=(w+(pass?0:2))*scale;ctx.strokeStyle=pass?(/primary|trunk/.test(f.k)?'#e7ddc0':'#f0eee4'):'#b5b9af';ctx.stroke();}
for(const f of data.features)if(f.t==='building'){trace(f);ctx.closePath();ctx.fillStyle=f.k==='mosque'?'#727f7a':'#b0a297';ctx.fill();if(scale>.3){ctx.lineWidth=.6;ctx.strokeStyle='#837f7466';ctx.stroke();}}
const out=path.join(root,'dist/fallback');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'map.webp'),canvas.toBuffer('image/webp',85));
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({version:1,image:'map.webp',bbox:[west,south,east,north],nw,se,width,height,source:'© OpenStreetMap contributors; Microsoft GlobalMLBuildingFootprints',description:'Local plan-view emergency map from open geometry. No satellite imagery.'}));
console.log(JSON.stringify({width,height,bytes:fs.statSync(path.join(out,'map.webp')).size}));
