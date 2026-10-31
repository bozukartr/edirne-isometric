const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const G=require('../dist/geometry.js'),S=require('../dist/satellite-core.js'),V=require('../dist/viewer-core.js');
const root=path.resolve(__dirname,'..'),c={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'dist/data/places.js'),'utf8'),c);const places=c.window.EDIRNE_PLACES;
const near=(a,b,epsilon=1e-5)=>assert.ok(Math.abs(a-b)<epsilon,`${a} != ${b}`);
// Independent OGC/XYZ calculation: don't derive the expected position with the same affine implementation.
function slippy(lon,lat,z){const n=2**z,s=Math.sin(lat*Math.PI/180);return [(lon+180)/360*n,(.5-Math.log((1+s)/(1-s))/(4*Math.PI))*n];}
test('all 12 landmark pins register to satellite pixels at every supported source zoom',()=>{
 for(const p of places)for(let z=12;z<=19;z++){
  const a=slippy(p.lon,p.lat,z),x=Math.floor(a[0]),y=Math.floor(a[1]);
  const pixel=S.tilePoint(z,x,y,(a[0]-x)*256,(a[1]-y)*256),pin=G.iso(...G.geo(p.lon,p.lat));
  near(pixel[0],pin[0]);near(pixel[1],pin[1]);
 }
});
test('adjacent tile edges have no gaps or geographic shifts at any scale',()=>{
 for(const z of[12,16,17,18,19]){const t=S.tileFor(26.555,41.676,z);
  for(const d of[0,32,128,232,256]){
   const right=S.tilePoint(z,t.x,t.y,256,d),left=S.tilePoint(z,t.x+1,t.y,0,d);near(right[0],left[0]);near(right[1],left[1]);
   const bottom=S.tilePoint(z,t.x,t.y,d,256),top=S.tilePoint(z,t.x,t.y+1,d,0);near(bottom[0],top[0]);near(bottom[1],top[1]);
  }
 }
});
test('pan and zoom preserve pin/photo registration in screen space',()=>{
 const o={x:680,y:450};let camera={x:123,y:-51,zoom:.65};
 for(const f of[1.8,.5,3,1.7,.2]){camera=G.zoomAt(camera,f,420,320,o);for(const p of places){const t=S.tileFor(p.lon,p.lat,18),a=slippy(p.lon,p.lat,18),r=S.tilePoint(18,t.x,t.y,(a[0]-t.x)*256,(a[1]-t.y)*256),pin=G.iso(...G.geo(p.lon,p.lat));near(o.x+camera.x+r[0]*camera.zoom,o.x+camera.x+pin[0]*camera.zoom);near(o.y+camera.y+r[1]*camera.zoom,o.y+camera.y+pin[1]*camera.zoom);}}
});
test('source equirectangular geometry is explicitly converted, never silently treated as Mercator',()=>{for(const lon of[26.511,26.555,26.595])for(const lat of[41.646,41.676,41.700]){const original=G.sourceGeo(lon,lat),converted=G.sourceToLocal(...original),expected=G.geo(lon,lat);near(converted[0],expected[0]);near(converted[1],expected[1]);}});
test('every viewport point is covered while image count stays within the request budget',()=>{
 for(const quality of['low','auto','high'])for(const zoom of[.11,.3,.65,1.6,2.6]){
  const view=V.worldView({x:130,y:-75,zoom},1363,936,{x:681.5,y:458.64}),tiles=S.selectTiles(view,zoom,2,quality),budget=quality==='high'?96:quality==='low'?36:64;
  assert.ok(tiles.length>0&&tiles.length<=budget,`${quality}/${zoom}: ${tiles.length}`);assert.equal(new Set(tiles.map(t=>t.key)).size,tiles.length);
  for(let row=0;row<=8;row++)for(let col=0;col<=8;col++){const x=view.left+(view.right-view.left)*col/8,y=view.top+(view.bottom-view.top)*row/8,ll=G.ungeo(...G.uniso(x,y)),t=S.tileFor(...ll,tiles[0].z);assert.ok(tiles.some(a=>a.x===t.x&&a.y===t.y),`uncovered ${x},${y}`);}
 }
});
test('export card images use the same provider and a bbox centered at their exact coordinates',()=>{for(const p of places){const u=new URL(S.imageURL(p.lon,p.lat)),box=u.searchParams.get('bbox').split(',').map(Number),ll=G.lngLat(((box[0]+box[2])/2)/G.CIRCUMFERENCE+.5,.5-((box[1]+box[3])/2)/G.CIRCUMFERENCE);near(ll[0],p.lon);near(ll[1],p.lat);assert.equal(u.origin,new URL(S.imageryURL(17,1,1)).origin);assert.equal(u.searchParams.get('bboxSR'),'3857');}});
test('the published app has no generated image or live 3D runtime',()=>{const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8'),app=fs.readFileSync(path.join(root,'dist/app.js'),'utf8');for(const s of['maplibre','map-engine.mjs','mode-3d','atlas-v5','illustrations/'])assert.ok(!html.includes(s)&&!app.includes(s),s);assert.ok(html.includes('imagery-status'));assert.ok(html.includes('imagery-retry'));assert.ok(!app.includes('p.projected[1]-'));assert.ok(!app.includes('getContext('));});
