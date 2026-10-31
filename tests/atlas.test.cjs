const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const M=require('../dist/geometry.js');
const root=path.resolve(__dirname,'..');
const near=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<e,`${a} ≠ ${b}`);
function load(file,key){const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),context);return context.window[key];}
const map=load('dist/data/map.js','EDIRNE_MAP');
const places=load('dist/data/places.js','EDIRNE_PLACES');
test('geographic coordinates round trip across all four coverage corners',()=>{
 for(const lon of[26.511,26.555,26.595])for(const lat of[41.646,41.676,41.700]){const p=M.geo(lon,lat),q=M.ungeo(...p);near(q[0],lon);near(q[1],lat);}
});
test('isometric ground projection is invertible',()=>{for(const p of[[0,0],[123,-456],[-3000,2000],[1600,2400]]){const q=M.uniso(...M.iso(...p));near(q[0],p[0]);near(q[1],p[1]);}});
test('zoom preserves the map point below the pointer, including limits',()=>{
 const c={x:140,y:-120,zoom:.53},origin={x:800,y:350},pointer=[515,275];
 for(const factor of[.00001,.7,1.4,1000]){
  const z=M.zoomAt(c,factor,...pointer,origin);
  near((pointer[0]-origin.x-c.x)/c.zoom,(pointer[0]-origin.x-z.x)/z.zoom);
  near((pointer[1]-origin.y-c.y)/c.zoom,(pointer[1]-origin.y-z.y)/z.zoom);
  assert.ok(z.zoom>=.09&&z.zoom<=3.5);
 }
});
test('Turkish search handles accents, uppercase I and dotted İ',()=>{assert.equal(M.normalize('ÜÇ ŞEREFELİ'),'uc serefeli');assert.equal(M.normalize('Karaağaç'),'karaagac');assert.equal(M.normalize('II. Bayezid'),'ii. bayezid');});
test('all landmark IDs are unique, source-linked, and inside the map',()=>{
 const ids=new Set();const[w,s,e,n]=map.meta.bbox;
 for(const p of places){assert.ok(!ids.has(p.id));ids.add(p.id);assert.ok(p.lon>=w&&p.lon<=e&&p.lat>=s&&p.lat<=n,p.id);assert.ok(p.source.startsWith('https://'));assert.ok(p.description.length>40);}
 assert.equal(places.length,12);
});
test('all map coordinates are finite, clipped and structurally valid',()=>{
 const[w,s,e,n]=map.meta.bbox,left=M.sourceGeo(w,s)[0]-.2,right=M.sourceGeo(e,s)[0]+.2,top=M.sourceGeo(w,n)[1]-.2,bottom=M.sourceGeo(w,s)[1]+.2;
 for(const f of map.features){assert.ok(['building','road','river','water','land'].includes(f.t));assert.ok(f.p.length>=2);
  for(const[x,y]of f.p){assert.ok(Number.isFinite(x)&&Number.isFinite(y));assert.ok(x>=left&&x<=right&&y>=top&&y<=bottom,`out of bounds ${f.id}`);}
  if(['building','water','land'].includes(f.t)){assert.ok(f.p.length>=4);assert.deepEqual(f.p[0],f.p.at(-1));}
 }
 assert.equal(map.meta.buildings,map.features.filter(f=>f.t==='building').length);assert.equal(map.meta.features,map.features.length);
});
test('HTML resource references exist and no QA harness is in the app',()=>{
 const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
 for(const match of html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g))assert.ok(fs.existsSync(path.join(root,'dist',match[1].split('?')[0])),match[1]);
 assert.ok(!html.includes('_qa.html'));
});
test('point-in-polygon handles inside and outside cases',()=>{const p=[[0,0],[10,0],[10,10],[0,10]];assert.ok(M.inPolygon(5,5,p));assert.ok(!M.inPolygon(-1,5,p));assert.ok(!M.inPolygon(50,50,p));});
const manifest=JSON.parse(fs.readFileSync(path.join(root,'dist/map-assets/manifest.json'),'utf8'));
test('local fallback overview and every place thumbnail exist',()=>{
 assert.equal(manifest.meta.buildings,map.meta.buildings);
 assert.equal(manifest.meta.microsoftBuildings+manifest.meta.osmBuildings,manifest.meta.buildings);
 for(const file of['overview.webp',...places.map(p=>'thumbs/'+p.id+'.webp')]){const bytes=fs.readFileSync(path.join(root,'dist/map-assets',file));assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');}
});
test('published root entry resolves the same application assets as dist',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 for(const match of html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g))assert.ok(fs.existsSync(path.join(root,match[1].split('?')[0])),match[1]);
 assert.ok(!html.includes('data/map.js'));assert.ok(!html.includes('_baseline'));
});
