/* Pure tile and viewport math. Shared by the viewer and Node tests. */
(function(root){
'use strict';
function levelFor(levels,zoom,dpr=1,quality='auto'){
 const target=zoom*(quality==='low'?.6:quality==='high'?Math.min(dpr,1.75):Math.min(dpr,1.25));
 const index=levels.findIndex(l=>l.scale>=target*.9);return index<0?levels.length-1:index;
}
function tileRange(manifest,level,view){
 const {bounds,tileSize,levels}=manifest,l=levels[level],span=tileSize/l.scale;
 if(view.right<bounds.minX||view.left>bounds.maxX||view.bottom<bounds.minY||view.top>bounds.maxY)return [];
 const c0=Math.max(0,Math.floor((view.left-bounds.minX)/span)),r0=Math.max(0,Math.floor((view.top-bounds.minY)/span));
 const c1=Math.min(l.cols-1,Math.floor((view.right-bounds.minX)/span)),r1=Math.min(l.rows-1,Math.floor((view.bottom-bounds.minY)/span));
 const tiles=[];
 for(let row=r0;row<=r1;row++)for(let col=c0;col<=c1;col++)tiles.push({key:`${level}/${col}-${row}`,x:bounds.minX+col*span,y:bounds.minY+row*span,span,level,col,row});
 return tiles;
}
function worldView(camera,width,height,origin){return {left:(-origin.x-camera.x)/camera.zoom,top:(-origin.y-camera.y)/camera.zoom,right:(width-origin.x-camera.x)/camera.zoom,bottom:(height-origin.y-camera.y)/camera.zoom};}
function constrain(camera,bounds,width,height){
 const x0=-bounds.maxX*camera.zoom+width*.1,x1=-bounds.minX*camera.zoom-width*.1;
 const y0=-bounds.maxY*camera.zoom+height*.1,y1=-bounds.minY*camera.zoom-height*.1;
 return {...camera,x:Math.max(x0,Math.min(x1,camera.x)),y:Math.max(y0,Math.min(y1,camera.y))};
}
const api={levelFor,tileRange,worldView,constrain};root.AtlasViewer=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
