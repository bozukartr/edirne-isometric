#!/usr/bin/env python3
"""Merge a bounded Microsoft open-building extract into the OSM snapshot.
Usage: python3 scripts/merge-buildings.py extract.geojson.json
Microsoft source: GlobalMLBuildingFootprints (CDLA Permissive 2.0).
The combined derivative is distributed under ODbL, with both source notices.
"""
import json,math,pathlib,sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
p=ROOT/'dist/data/map.js';text=p.read_text();data=json.loads(text.split('window.EDIRNE_MAP=',1)[1].rstrip(';\n'))
ox,oy=data['meta']['origin'];mx=111320*math.cos(math.radians(oy));my=111320
bounds=data['meta']['bbox'];west,south,east,north=bounds
osm=[f for f in data['features'] if f['t']=='building' and f.get('s')!='microsoft']
features=[f for f in data['features'] if f.get('s')!='microsoft']
def bbox(ps):return [min(p[0] for p in ps),min(p[1] for p in ps),max(p[0] for p in ps),max(p[1] for p in ps)]
def area(b):return max(.01,(b[2]-b[0])*(b[3]-b[1]))
grid={}
for f in osm:
 b=bbox(f['p']);f['_bbox']=b
 for x in range(math.floor(b[0]/40),math.floor(b[2]/40)+1):
  for y in range(math.floor(b[1]/40),math.floor(b[3]/40)+1):grid.setdefault((x,y),[]).append(f)
added=0
for i,f in enumerate(json.load(open(sys.argv[1]))):
 if f.get('properties',{}).get('confidence',1)<.7:continue
 ring=f['geometry']['coordinates'][0]
 if not all(west<=a[0]<=east and south<=a[1]<=north for a in ring):continue
 ps=[[round((lon-ox)*mx,1),round((oy-lat)*my,1)] for lon,lat,*_ in ring]
 b=bbox(ps);a=area(b)
 if a<8 or a>20000:continue
 duplicate=False;seen=set()
 for x in range(math.floor(b[0]/40),math.floor(b[2]/40)+1):
  for y in range(math.floor(b[1]/40),math.floor(b[3]/40)+1):
   for o in grid.get((x,y),[]):
    if o['id'] in seen:continue
    seen.add(o['id']);c=o['_bbox'];over=max(0,min(b[2],c[2])-max(b[0],c[0]))*max(0,min(b[3],c[3])-max(b[1],c[1]))
    if over/min(a,area(c))>.35:duplicate=True;break
   if duplicate:break
  if duplicate:break
 if duplicate:continue
 record={'id':2000000000+i,'t':'building','k':'yes','s':'microsoft','p':ps}
 h=f.get('properties',{}).get('height',-1)
 if h>2:record['h']=round(h,1)
 features.append(record);added+=1
for f in osm:f.pop('_bbox',None)
data['features']=features;data['meta'].update(buildings=sum(f['t']=='building' for f in features),features=len(features),osmBuildings=len(osm),microsoftBuildings=added,microsoftSnapshot='2026-08-13',buildingSources=['OpenStreetMap contributors (ODbL-1.0)','Microsoft GlobalMLBuildingFootprints (CDLA-Permissive-2.0)'])
p.write_text('/* OpenStreetMap contributors · ODbL 1.0; Microsoft open building footprints · CDLA Permissive 2.0. See data/README.md */\nwindow.EDIRNE_MAP='+json.dumps(data,separators=(',',':'),ensure_ascii=False)+';\n')
print(json.dumps(data['meta']))
