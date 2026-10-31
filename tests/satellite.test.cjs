const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const S=require('../dist/satellite-core.js');
const root=path.resolve(__dirname,'..');
const close=(a,b,e=1e-7)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
test('satellite projection round trips and keeps north at the top',()=>{
 for(const lon of[26.511,26.555,26.595])for(const lat of[41.646,41.676,41.7]){
  const q=S.lngLat(...S.mercator(lon,lat));close(q[0],lon);close(q[1],lat);
  const r=S.fromLocal(...S.local(lon,lat));close(r[0],lon);close(r[1],lat);
 }
 assert.ok(S.local(26.555,41.7)[1]<0);assert.ok(S.local(26.595,41.676)[0]>0);
});
test('imagery tile coordinates use Esri z/row/column order and contain their target',()=>{
 for(const z of[12,17,18]){const t=S.tileFor(26.55935,41.67808,z),b=S.tileBounds(t.x,t.y,z);assert.ok(26.55935>=b.nw[0]&&26.55935<b.se[0]);assert.ok(41.67808<=b.nw[1]&&41.67808>b.se[1]);assert.ok(S.imageryURL(z,t.x,t.y).endsWith(`/tile/${z}/${t.y}/${t.x}`));}
});
test('aerial preview bounds are centered and preserve requested aspect ratio',()=>{
 const u=new URL(S.imageURL(26.555,41.676,280,170,320)),b=u.searchParams.get('bbox').split(',').map(Number),c=S.mercator(26.555,41.676);close((b[0]+b[2])/2,(c[0]-.5)*S.CIRCUMFERENCE);close((b[1]+b[3])/2,(.5-c[1])*S.CIRCUMFERENCE);close((b[2]-b[0])/(b[3]-b[1]),280/170);assert.equal(u.searchParams.get('bboxSR'),'3857');
});
test('building model matrix translates tile centers without losing meter-scale precision',()=>{
 const t=S.tileFor(26.555,41.676,17),o=[(t.x+.5)/2**17,(t.y+.5)/2**17],m=S.modelMatrix(...o);close(m[12],o[0],1e-15);close(m[13],o[1],1e-15);close(m[0],S.METER,1e-18);close(m[10],S.METER,1e-18);
 const camera=[1,0,0,0,0,1,0,0,0,0,1,0,-o[0],-o[1],0,1],combined=S.multiply(camera,m);close(combined[12],0,1e-12);close(combined[13],0,1e-12);close(combined[0],S.METER,1e-14);
});
const manifest=JSON.parse(fs.readFileSync(path.join(root,'dist/scene3d/manifest.json')));
const bytes=zlib.gunzipSync(fs.readFileSync(path.join(root,'dist/scene3d',manifest.data)));
test('compiled 3D chunks form a complete, contiguous triangle buffer',()=>{
 assert.equal(manifest.version,3);assert.equal(manifest.stride,12);assert.equal(bytes.length,manifest.byteLength);let offset=0;const ids=new Set();
 for(const c of manifest.chunks){assert.ok(!ids.has(c.id));ids.add(c.id);assert.equal(c.offset,offset);assert.equal(c.length,c.count*12);assert.equal(c.count%3,0);assert.ok(c.buildings>0);close(c.origin[0],(c.x+.5)/2**17,1e-15);close(c.origin[1],(c.y+.5)/2**17,1e-15);close(c.span,1/2**17/S.METER);offset+=c.length;}
 assert.equal(offset,bytes.length);assert.ok(ids.size>500);assert.equal(manifest.meta.buildings,16563);
});
test('all quantized 3D vertices have valid heights, unit normals, and materials',()=>{
 const materials=new Set();let maxHeight=0;
 for(let i=0;i<bytes.length;i+=12){const z=bytes.readInt16LE(i+4)/64,n=[6,7,8].map(k=>bytes.readInt8(i+k)/127),material=bytes[i+9];assert.ok(z>=0&&z<=90);assert.ok(Math.abs(Math.hypot(...n)-1)<.012);assert.ok(material<=4);materials.add(material);maxHeight=Math.max(maxHeight,z);}
 assert.equal(materials.size,5);assert.ok(maxHeight>=70);
});
test('3D vendor and module dependencies are present and source imagery is not bundled',()=>{
 for(const f of['map-engine.mjs','photo-buildings.mjs','satellite-core.js','vendor/maplibre/maplibre-gl.mjs','vendor/maplibre/maplibre-gl-worker.mjs','vendor/maplibre/maplibre-gl.css','vendor/maplibre/LICENSE.txt'])assert.ok(fs.statSync(path.join(root,'dist',f)).size>100,f);
 assert.deepEqual(fs.readdirSync(path.join(root,'dist/scene3d')).sort(),['buildings.bin.gz','manifest.json']);
 const engine=fs.readFileSync(path.join(root,'dist/map-engine.mjs'),'utf8');assert.ok(engine.includes('maxzoom:18'));assert.ok(!engine.includes('maxzoom:20'));
});
test('local recovery image has valid geographic bounds and a real WebP payload',()=>{
 const m=JSON.parse(fs.readFileSync(path.join(root,'dist/fallback/manifest.json'))),b=fs.readFileSync(path.join(root,'dist/fallback',m.image));assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');assert.ok(m.width>=2000);assert.ok(m.height>1500);const nw=S.local(m.bbox[0],m.bbox[3]),se=S.local(m.bbox[2],m.bbox[1]);close(m.nw[0],nw[0]);close(m.nw[1],nw[1]);close(m.se[0],se[0]);close(m.se[1],se[1]);
});
