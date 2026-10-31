/* Shared coordinate and camera math; dependency-free and testable in Node. */
(function(root){
  'use strict';
  const ORIGIN = [26.555,41.676];
  const MX = 111320*Math.cos(ORIGIN[1]*Math.PI/180), MY=111320;
  const ANGLE=-Math.PI/7, TILT=.58, C=Math.cos(ANGLE), S=Math.sin(ANGLE);
  function geo(lon,lat){return [(lon-ORIGIN[0])*MX,(ORIGIN[1]-lat)*MY];}
  function ungeo(x,y){return [ORIGIN[0]+x/MX,ORIGIN[1]-y/MY];}
  function iso(x,y,z=0){return [C*x-S*y,(S*x+C*y)*TILT-z*.95];}
  function uniso(x,y){return [C*x+S*y/TILT,-S*x+C*y/TILT];}
  function clamp(n,min,max){return Math.min(max,Math.max(min,n));}
  function normalize(s){return s.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');}
  function zoomAt(camera,factor,x,y,origin){
    const z=clamp(camera.zoom*factor,.09,3.5),ratio=z/camera.zoom;
    return {...camera,zoom:z,x:x-origin.x-(x-origin.x-camera.x)*ratio,y:y-origin.y-(y-origin.y-camera.y)*ratio};
  }
  function hash(n){n=Math.imul(n^(n>>>16),0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return ((n^(n>>>16))>>>0)/4294967296;}
  function inPolygon(x,y,p){let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if(((a[1]>y)!==(b[1]>y))&&(x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]))inside=!inside;}return inside;}
  const api={ORIGIN,MX,MY,ANGLE,TILT,geo,ungeo,iso,uniso,clamp,normalize,zoomAt,hash,inPolygon};
  root.AtlasMath=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
