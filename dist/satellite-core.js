/* Public XYZ image tiles, geographically registered without a GPU or canvas. */
(function(root){
 'use strict';
 const G=typeof module!=='undefined'&&module.exports?require('./geometry.js'):root.AtlasMath;
 const SERVICE='https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer';
 function tileFor(lon,lat,z){const p=G.mercator(lon,lat),n=2**z;return {x:Math.floor(p[0]*n),y:Math.floor(p[1]*n),z};}
 function tileMatrix(z,x,y){
  const n=2**z,s=G.metresPerWorld/n;
  const o=G.iso((x/n-G.originMercator[0])*G.metresPerWorld,(y/n-G.originMercator[1])*G.metresPerWorld),a=G.iso(s/256,0),b=G.iso(0,s/256);
  return [a[0],a[1],b[0],b[1],o[0],o[1]];
 }
 function tilePoint(z,x,y,px,py){const m=tileMatrix(z,x,y);return [m[0]*px+m[2]*py+m[4],m[1]*px+m[3]*py+m[5]];}
 function candidates(z,view){
  const corners=[[view.left,view.top],[view.right,view.top],[view.right,view.bottom],[view.left,view.bottom]].map(p=>G.uniso(...p));
  const n=2**z,xs=corners.map(p=>(G.originMercator[0]+p[0]/G.metresPerWorld)*n),ys=corners.map(p=>(G.originMercator[1]+p[1]/G.metresPerWorld)*n);
  const tiles=[],loX=Math.max(0,Math.floor(Math.min(...xs))),hiX=Math.min(n-1,Math.floor(Math.max(...xs))),loY=Math.max(0,Math.floor(Math.min(...ys))),hiY=Math.min(n-1,Math.floor(Math.max(...ys)));
  if((hiX-loX+1)*(hiY-loY+1)>1500)return [];
  for(let y=loY;y<=hiY;y++)for(let x=loX;x<=hiX;x++){
   const p=[[0,0],[256,0],[256,256],[0,256]].map(q=>tilePoint(z,x,y,...q));
   if(Math.max(...p.map(q=>q[0]))<view.left||Math.min(...p.map(q=>q[0]))>view.right||Math.max(...p.map(q=>q[1]))<view.top||Math.min(...p.map(q=>q[1]))>view.bottom)continue;
   tiles.push({key:`${z}/${y}/${x}`,z,x,y,matrix:tileMatrix(z,x,y)});
  }
  const cx=(view.left+view.right)/2,cy=(view.top+view.bottom)/2;
  return tiles.sort((a,b)=>{const pa=tilePoint(z,a.x,a.y,128,128),pb=tilePoint(z,b.x,b.y,128,128);return Math.hypot(pa[0]-cx,pa[1]-cy)-Math.hypot(pb[0]-cx,pb[1]-cy);});
 }
 function selectTiles(view,zoom,dpr=1,quality='auto',maxOverride){
  const density=quality==='low'?.65:quality==='high'?Math.min(dpr,2):Math.min(dpr,1.25),budget=maxOverride||(quality==='high'?96:quality==='low'?36:64);
  let z=G.clamp(Math.ceil(Math.log2(G.metresPerWorld/256*zoom*density)),12,19),tiles;
  do{tiles=candidates(z,view);if(tiles.length&&tiles.length<=budget)break;z--;}while(z>=10);
  return tiles||[];
 }
 function imageryURL(z,x,y){return `${SERVICE}/tile/${z}/${y}/${x}`;}
 function imageURL(lon,lat,width=320,height=200,span=350){
  const p=G.mercator(lon,lat),cx=(p[0]-.5)*G.CIRCUMFERENCE,cy=(.5-p[1])*G.CIRCUMFERENCE,w=span/Math.cos(lat*Math.PI/180),h=w*height/width;
  const query=new URLSearchParams({bbox:[cx-w/2,cy-h/2,cx+w/2,cy+h/2].join(','),bboxSR:'3857',imageSR:'3857',size:`${width},${height}`,format:'jpg',f:'image'});
  return `${SERVICE}/export?${query}`;
 }
 const api={SERVICE,tileFor,tileMatrix,tilePoint,candidates,selectTiles,imageryURL,imageURL};root.SatelliteMath=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
