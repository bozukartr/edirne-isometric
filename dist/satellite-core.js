/* Geographic camera and imagery math shared with the offline 3D compiler. */
(function(root){'use strict';
const CIRCUMFERENCE=40075016.68557849,ORIGIN=[26.555,41.676],MAX_LAT=85.05112878;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function mercator(lon,lat){const a=clamp(lat,-MAX_LAT,MAX_LAT)*Math.PI/180;return [(lon+180)/360,(1-Math.asinh(Math.tan(a))/Math.PI)/2];}
function lngLat(x,y){return [x*360-180,Math.atan(Math.sinh(Math.PI*(1-2*y)))*180/Math.PI];}
const ORIGIN_MERCATOR=mercator(...ORIGIN),METER=1/(CIRCUMFERENCE*Math.cos(ORIGIN[1]*Math.PI/180));
function local(lon,lat){const p=mercator(lon,lat);return [(p[0]-ORIGIN_MERCATOR[0])/METER,(p[1]-ORIGIN_MERCATOR[1])/METER];}
function fromLocal(x,y){return lngLat(ORIGIN_MERCATOR[0]+x*METER,ORIGIN_MERCATOR[1]+y*METER);}
function tileFor(lon,lat,z){const p=mercator(lon,lat),n=2**z;return {x:Math.floor(p[0]*n),y:Math.floor(p[1]*n),z};}
function tileBounds(x,y,z){const n=2**z;return {nw:lngLat(x/n,y/n),se:lngLat((x+1)/n,(y+1)/n)};}
function imageryURL(z,x,y){return `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;}
function imageURL(lon,lat,width=280,height=170,span=250){const p=mercator(lon,lat),mx=(p[0]-.5)*CIRCUMFERENCE,my=(.5-p[1])*CIRCUMFERENCE,metres=span/Math.cos(lat*Math.PI/180),h=metres*height/width;const q=new URLSearchParams({bbox:[mx-metres/2,my-h/2,mx+metres/2,my+h/2].join(','),bboxSR:'3857',imageSR:'3857',size:`${width},${height}`,format:'jpg',f:'image'});return 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?'+q;}
function multiply(a,b){const out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let v=0;for(let k=0;k<4;k++)v+=a[k*4+r]*b[c*4+k];out[c*4+r]=v;}return out;}
function modelMatrix(x,y){return new Float64Array([METER,0,0,0,0,METER,0,0,0,0,METER,0,x,y,0,1]);}
const api={CIRCUMFERENCE,ORIGIN,ORIGIN_MERCATOR,METER,clamp,mercator,lngLat,local,fromLocal,tileFor,tileBounds,imageryURL,imageURL,multiply,modelMatrix};root.SatelliteMath=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
