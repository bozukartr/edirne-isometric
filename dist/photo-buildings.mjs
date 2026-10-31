/* GPU building layer with geographically aligned live aerial roof textures.
 * All imagery remains a live Esri service response; no imagery is stored here. */
const S=window.SatelliteMath;
const vertexSource=`#version 300 es
precision highp float;
in vec3 a_pos;
in vec3 a_normal;
in vec2 a_material;
uniform mat4 u_matrix;
uniform float u_span;
out vec2 v_uv;
out vec3 v_normal;
out vec3 v_position;
flat out vec2 v_material;
void main(){vec3 p=a_pos/64.0;v_position=p;v_uv=p.xy/u_span+0.5;v_normal=a_normal;v_material=a_material;gl_Position=u_matrix*vec4(p,1.0);}`;
const fragmentSource=`#version 300 es
precision highp float;
uniform sampler2D u_photo;
uniform float u_night;
in vec2 v_uv;
in vec3 v_normal;
in vec3 v_position;
flat in vec2 v_material;
out vec4 color;
float random(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
 vec3 n=normalize(v_normal),photo=texture(u_photo,clamp(v_uv,vec2(.001),vec2(.999))).rgb;
 float type=v_material.x,seed=v_material.y/255.0;
 float sunlight=.65+.35*max(0.0,dot(n,normalize(vec3(-.45,-.65,.85))));
 vec3 c=photo;
 if(type<.5){
  vec3 plaster=mix(vec3(.64,.62,.56),vec3(.81,.80,.75),seed);
  plaster=mix(plaster,photo,.12);
  vec2 tangent=vec2(-n.y,n.x);float across=dot(v_position.xy,tangent);
  vec2 grid=fract(vec2(across/3.5+seed,v_position.z/3.1));
  float window=step(.23,grid.x)*step(grid.x,.68)*step(.23,grid.y)*step(grid.y,.68)*step(2.0,v_position.z);
  vec3 glass=mix(vec3(.13,.16,.17),vec3(.22,.26,.26),random(floor(vec2(across/3.5,v_position.z/3.1))+seed));
  c=mix(plaster,glass,window*.88)*sunlight;
  c+=(random(floor(v_position.xy*14.0)+v_position.z)-.5)*.024;
 }else if(type>1.5&&type<2.5){c=photo*(.71+.29*max(0.0,dot(n,normalize(vec3(-.45,-.65,.85)))));}
 else if(type>2.5&&type<3.5){c=vec3(.80,.78,.70)*sunlight;}
 else if(type>3.5){c=vec3(.27,.31,.31)*sunlight;}
 c*=1.0-u_night*.22;color=vec4(c,1.0);
}`;
function compile(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
const images=new Map();let activeImages=0;const imageQueue=[];
function queueImage(url){if(images.has(url))return images.get(url);const result=new Promise((resolve,reject)=>{imageQueue.push({url,resolve,reject});pump();});images.set(url,result);if(images.size>180)images.delete(images.keys().next().value);return result;}
function pump(){while(activeImages<6&&imageQueue.length){const job=imageQueue.shift();activeImages++;const img=new Image();img.crossOrigin='anonymous';img.onload=()=>{activeImages--;job.resolve(img);pump();};img.onerror=()=>{activeImages--;images.delete(job.url);job.reject(Error('Imagery unavailable'));pump();};img.src=job.url;}}
async function textureCanvas(chunk,detail){const n=2**detail,size=256*n,c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d');await Promise.all(Array.from({length:n*n},async(_,i)=>{const x=i%n,y=Math.floor(i/n);const image=await queueImage(S.imageryURL(17+detail,chunk.x*n+x,chunk.y*n+y));ctx.drawImage(image,x*256,y*256,256,256);}));return c;}
async function unpack(response){const b=new Uint8Array(await response.arrayBuffer());if(b[0]===31&&b[1]===139){const stream=new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'));return new Uint8Array(await new Response(stream).arrayBuffer());}return b;}
export function createBuildingLayer(baseURL,{onStatus=()=>{}}={}){
 let map,gl,program,manifest,bytes,locations,night=0,quality='auto',timer=0,removed=false,wanted=new Set();
 const active=new Map(),loading=new Map(),ready=[],failed=new Map();
 function free(item){gl.deleteBuffer(item.buffer);gl.deleteTexture(item.texture);gl.deleteVertexArray(item.vao);}
 async function loadChunk(c,detail){
  const key=c.id+':'+detail;if((failed.get(key)||0)>Date.now())return;if(loading.has(key)||active.has(key)||ready.some(v=>v.key===key))return;loading.set(key,true);
  try{
   const photo=await textureCanvas(c,detail);if(removed||!wanted.has(key))return;
   ready.push({c,photo,key});map.triggerRepaint();
  }catch(error){failed.set(key,Date.now()+20000);console.warn('Building texture unavailable',c.id);}
  finally{loading.delete(key);if(!removed)changed();}
 }
 function uploadReady(){
  let uploaded=0;
  while(ready.length&&uploaded<2){const{c,photo,key}=ready.shift();if(!wanted.has(key)||removed)continue;
   const vao=gl.createVertexArray();gl.bindVertexArray(vao);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,bytes.subarray(c.offset,c.offset+c.length),gl.STATIC_DRAW);
   gl.enableVertexAttribArray(locations.position);gl.vertexAttribPointer(locations.position,3,gl.SHORT,false,12,0);
   gl.enableVertexAttribArray(locations.normal);gl.vertexAttribPointer(locations.normal,3,gl.BYTE,true,12,6);
   gl.enableVertexAttribArray(locations.material);gl.vertexAttribPointer(locations.material,2,gl.UNSIGNED_BYTE,false,12,9);gl.bindVertexArray(null);
   const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.pixelStorei(gl.UNPACK_ALIGNMENT,4);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,photo);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   for(const[k,old]of active)if(old.chunk.id===c.id){free(old);active.delete(k);}
   active.set(key,{chunk:c,buffer,texture,vao});uploaded++;onStatus({modelsReady:true,activeChunks:active.size});
  }
  if(ready.length)map.triggerRepaint();
 }
 function update(){
  timer=0;if(!manifest||!bytes||removed)return;
  if(map.getPitch()<2||map.getZoom()<14.8){wanted.clear();for(const[k,item]of active){free(item);active.delete(k);}map.triggerRepaint();return;}
  const center=S.mercator(map.getCenter().lng,map.getCenter().lat),b=map.getBounds(),nw=S.mercator(b.getWest(),b.getNorth()),se=S.mercator(b.getEast(),b.getSouth()),n=2**manifest.meshZoom;
  const detail=quality==='low'?0:1;
  const cap=quality==='low'?12:(innerWidth<760?16:28);
  const candidates=manifest.chunks.filter(c=>(c.x+1)/n>=nw[0]&&c.x/n<=se[0]&&(c.y+1)/n>=nw[1]&&c.y/n<=se[1]).map(c=>({c,d:Math.hypot(c.origin[0]-center[0],c.origin[1]-center[1])})).sort((a,b)=>a.d-b.d).slice(0,cap);
  wanted=new Set(candidates.map(v=>v.c.id+':'+detail));const wantedIDs=new Set(candidates.map(v=>v.c.id));
  for(const[k,item]of active)if(!wantedIDs.has(item.chunk.id)){free(item);active.delete(k);}
  for(const{c}of candidates){if(loading.size>=4)break;loadChunk(c,detail);}
 }
 const changed=()=>{if(!timer)timer=setTimeout(update,140);};
 return {id:'photo-buildings',type:'custom',renderingMode:'3d',
  async onAdd(m,g){map=m;gl=g;try{program=gl.createProgram();const vs=compile(gl,gl.VERTEX_SHADER,vertexSource),fs=compile(gl,gl.FRAGMENT_SHADER,fragmentSource);gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
   locations={position:gl.getAttribLocation(program,'a_pos'),normal:gl.getAttribLocation(program,'a_normal'),material:gl.getAttribLocation(program,'a_material'),matrix:gl.getUniformLocation(program,'u_matrix'),span:gl.getUniformLocation(program,'u_span'),photo:gl.getUniformLocation(program,'u_photo'),night:gl.getUniformLocation(program,'u_night')};
   manifest=await(await fetch(new URL('manifest.json',baseURL))).json();bytes=await unpack(await fetch(new URL(manifest.data,baseURL)));if(bytes.length!==manifest.byteLength)throw Error('Building buffer size mismatch');if(removed)return;map.on('move',changed);map.on('moveend',changed);update();onStatus({modelsLoaded:true,buildingCount:manifest.meta.buildings});
  }catch(error){if(program)gl.deleteProgram(program);program=null;console.error('3D buildings unavailable:',error);onStatus({modelsError:true});}},
  render(g,options){if(!program)return;uploadReady();if(!active.size)return;g.useProgram(program);g.enable(g.DEPTH_TEST);g.depthFunc(g.LEQUAL);g.depthMask(true);g.disable(g.BLEND);g.disable(g.CULL_FACE);g.activeTexture(g.TEXTURE0);g.uniform1i(locations.photo,0);g.uniform1f(locations.night,night);
   for(const item of active.values()){const c=item.chunk,model=S.modelMatrix(...c.origin),matrix=S.multiply(options.defaultProjectionData.mainMatrix,model);g.uniformMatrix4fv(locations.matrix,false,matrix);g.uniform1f(locations.span,c.span);g.bindTexture(g.TEXTURE_2D,item.texture);g.bindVertexArray(item.vao);g.drawArrays(g.TRIANGLES,0,c.count);}g.bindVertexArray(null);
  },
  onRemove(){removed=true;ready.length=0;clearTimeout(timer);map?.off('move',changed);map?.off('moveend',changed);for(const item of active.values())free(item);active.clear();if(program)gl.deleteProgram(program);},
  setNight(v){night=v?1:0;map?.triggerRepaint();},setQuality(v){quality=v;changed();}
 };
}
