/* Exact Web Mercator registration, then one invertible fixed-angle projection. */
(function(root){
 'use strict';
 const ORIGIN=[26.555,41.676],CIRCUMFERENCE=40075016.68557849;
 // Source snapshot coordinates used this equirectangular compiler; never reinterpret them as Mercator.
 const MX=111320*Math.cos(ORIGIN[1]*Math.PI/180),MY=111320;
 const ANGLE=-Math.PI/7,TILT=.58,C=Math.cos(ANGLE),S=Math.sin(ANGLE);
 function clamp(n,min,max){return Math.min(max,Math.max(min,n));}
 function mercator(lon,lat){const phi=clamp(lat,-85.05112878,85.05112878)*Math.PI/180;return [(lon+180)/360,(1-Math.asinh(Math.tan(phi))/Math.PI)/2];}
 function lngLat(x,y){return [x*360-180,Math.atan(Math.sinh(Math.PI*(1-2*y)))*180/Math.PI];}
 const originMercator=mercator(...ORIGIN),metresPerWorld=CIRCUMFERENCE*Math.cos(ORIGIN[1]*Math.PI/180);
 function geo(lon,lat){const p=mercator(lon,lat);return [(p[0]-originMercator[0])*metresPerWorld,(p[1]-originMercator[1])*metresPerWorld];}
 function ungeo(x,y){return lngLat(originMercator[0]+x/metresPerWorld,originMercator[1]+y/metresPerWorld);}
 function sourceGeo(lon,lat){return [(lon-ORIGIN[0])*MX,(ORIGIN[1]-lat)*MY];}
 function sourceToLocal(x,y){return geo(ORIGIN[0]+x/MX,ORIGIN[1]-y/MY);}
 function iso(x,y){return [C*x-S*y,(S*x+C*y)*TILT];}
 function uniso(x,y){return [C*x+S*y/TILT,-S*x+C*y/TILT];}
 function normalize(s){return s.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');}
 function zoomAt(camera,factor,x,y,origin){const z=clamp(camera.zoom*factor,.09,3.5),ratio=z/camera.zoom;return {...camera,zoom:z,x:x-origin.x-(x-origin.x-camera.x)*ratio,y:y-origin.y-(y-origin.y-camera.y)*ratio};}
 function hash(n){n=Math.imul(n^(n>>>16),0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return ((n^(n>>>16))>>>0)/4294967296;}
 function inPolygon(x,y,p){let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if(((a[1]>y)!==(b[1]>y))&&(x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]))inside=!inside;}return inside;}
 const api={ORIGIN,MX,MY,ANGLE,TILT,CIRCUMFERENCE,originMercator,metresPerWorld,mercator,lngLat,geo,ungeo,sourceGeo,sourceToLocal,iso,uniso,clamp,normalize,zoomAt,hash,inPolygon};
 root.AtlasMath=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
