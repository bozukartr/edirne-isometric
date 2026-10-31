/* Recreate the open-data composition references used for the illustrated map. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.argv[2]||path.join(root,'tmp/illustration-guides')),c={window:{}};
for(const f of['dist/data/map.js','dist/data/places.js'])vm.runInNewContext(fs.readFileSync(path.join(root,f),'utf8'),c);
const scene=require('./lib/render-scene.cjs')(c.window.EDIRNE_MAP,c.window.EDIRNE_PLACES),regions=JSON.parse(fs.readFileSync(path.join(root,'assets/illustrations/regions.json'),'utf8')).regions;
fs.mkdirSync(out,{recursive:true});for(const r of regions){const canvas=createCanvas(3840,2160);scene.render(canvas.getContext('2d'),r.x,r.y,r.w,r.h,3840/r.w);fs.writeFileSync(path.join(out,r.id+'.png'),canvas.toBuffer('image/png'));}console.log('Composition guides written to '+out);
