#!/usr/bin/env python3
"""Download and compile a bounded OpenStreetMap snapshot (ODbL).
Usage: python3 scripts/prepare-data.py [path/to/snapshot.osm]
No third-party packages. No API keys. Existing data is overwritten only after
successful parsing. Coordinates are local meters, rounded to 0.1 m.
"""
import json, math, sys, pathlib, datetime, urllib.request, xml.etree.ElementTree as ET
ROOT=pathlib.Path(__file__).resolve().parents[1]
BBOX=(26.511,41.646,26.595,41.700)
ORIGIN=(26.555,41.676)
MX=111320*math.cos(math.radians(ORIGIN[1])); MY=111320
MINX=(BBOX[0]-ORIGIN[0])*MX; MAXX=(BBOX[2]-ORIGIN[0])*MX
MINY=(ORIGIN[1]-BBOX[3])*MY; MAXY=(ORIGIN[1]-BBOX[1])*MY

def point(lon,lat):return [round((float(lon)-ORIGIN[0])*MX,1),round((ORIGIN[1]-float(lat))*MY,1)]
def tags(e):return {t.get('k'):t.get('v') for t in e.findall('tag')}
def clip_poly(points):
    result=points[:-1] if points[0]==points[-1] else points
    for axis,bound,sign in [(0,MINX,1),(0,MAXX,-1),(1,MINY,1),(1,MAXY,-1)]:
        old=result;result=[]
        if not old:return []
        prev=old[-1];pi=sign*(prev[axis]-bound)>=0
        for cur in old:
            ci=sign*(cur[axis]-bound)>=0
            if ci!=pi:
                t=(bound-prev[axis])/(cur[axis]-prev[axis]);result.append([round(prev[0]+t*(cur[0]-prev[0]),1),round(prev[1]+t*(cur[1]-prev[1]),1)])
            if ci:result.append(cur)
            prev=cur;pi=ci
    if len(result)>2:result.append(result[0])
    return result

def clip_line(points):
    # Liang–Barsky clipping keeps out-of-bounds river and road geometry bounded.
    parts=[];current=[]
    for a,b in zip(points,points[1:]):
        dx=b[0]-a[0];dy=b[1]-a[1];lo=0;hi=1;valid=True
        for p,q in [(-dx,a[0]-MINX),(dx,MAXX-a[0]),(-dy,a[1]-MINY),(dy,MAXY-a[1])]:
            if p==0:
                if q<0:valid=False;break
            else:
                r=q/p
                if p<0:lo=max(lo,r)
                else:hi=min(hi,r)
        if not valid or lo>hi:
            if len(current)>1:parts.append(current)
            current=[];continue
        aa=[round(a[0]+lo*dx,1),round(a[1]+lo*dy,1)];bb=[round(a[0]+hi*dx,1),round(a[1]+hi*dy,1)]
        if current and current[-1]!=aa:
            if len(current)>1:parts.append(current)
            current=[]
        if not current:current.append(aa)
        if bb!=current[-1]:current.append(bb)
    if len(current)>1:parts.append(current)
    return parts

def join_rings(segments):
    segments=[s[:] for s in segments if len(s)>1];rings=[]
    while segments:
        ring=segments.pop()
        while ring[0]!=ring[-1]:
            found=False
            for i,s in enumerate(segments):
                if ring[-1]==s[0]:ring.extend(s[1:])
                elif ring[-1]==s[-1]:ring.extend(s[-2::-1])
                elif ring[0]==s[-1]:ring=s[:-1]+ring
                elif ring[0]==s[0]:ring=s[:0:-1]+ring
                else:continue
                segments.pop(i);found=True;break
            if not found:break
        if ring[0]==ring[-1]:rings.append(ring)
    return rings

def main():
    if len(sys.argv)>1:source=pathlib.Path(sys.argv[1]).read_bytes()
    else:
        url='https://api.openstreetmap.org/api/0.6/map?bbox='+','.join(map(str,BBOX))
        req=urllib.request.Request(url,headers={'User-Agent':'EdirneIsometricAtlas/1.0 (ODbL offline snapshot)'})
        with urllib.request.urlopen(req,timeout=90) as response:source=response.read()
    xml=ET.fromstring(source)
    nodes={n.get('id'):point(n.get('lon'),n.get('lat')) for n in xml.findall('node')}
    ways={}
    for w in xml.findall('way'):
        ps=[nodes[n.get('ref')] for n in w.findall('nd') if n.get('ref') in nodes]
        if len(ps)>1:ways[w.get('id')]={'id':int(w.get('id')),'p':ps,'tags':tags(w)}
    features=[];relation_outers=set()
    def append(w,t=None):
        t=t or w['tags'];p=w['p'];f={'id':w['id']}
        if t.get('building') and t['building']!='no':
            f.update(t='building',k=t['building'])
            try:f['h']=round(min(90,float(t.get('height','').replace(' m',''))),1)
            except ValueError:
                try:f['h']=min(75,float(t.get('building:levels',''))*3)
                except ValueError:pass
        elif t.get('highway'):
            if t['highway'] in ['construction','proposed']:return
            f.update(t='road',k=t['highway'])
            if t.get('bridge') and t.get('bridge')!='no':f['b']=True
        elif t.get('waterway') in ['river','stream','canal','drain']:
            f.update(t='river',w=150 if t.get('name')=='Meriç' else 32 if t.get('name')=='Tunca' else 5)
        elif t.get('natural')=='water' or t.get('waterway')=='riverbank':f.update(t='water',k='water')
        elif t.get('landuse') in ['residential','commercial','retail','industrial','forest','grass','meadow','farmland','farmyard','orchard','cemetery','recreation_ground']:f.update(t='land',k=t['landuse'])
        elif t.get('leisure') in ['park','garden','nature_reserve','recreation_ground']:f.update(t='land',k='park')
        elif t.get('natural') in ['wood','grassland']:f.update(t='land',k='wood' if t['natural']=='wood' else 'grass')
        else:return
        if f['t'] in ['road','river']:
            for part in clip_line(p):features.append(dict(f,p=part))
        else:
            if p[0]!=p[-1]:return
            p=clip_poly(p)
            if len(p)>3:features.append(dict(f,p=p))
    for r in xml.findall('relation'):
        t=tags(r)
        if not ('building' in t or t.get('natural')=='water' or t.get('landuse') in ['forest','residential','farmland']):continue
        outer=[m.get('ref') for m in r.findall('member') if m.get('type')=='way' and m.get('role')=='outer']
        rings=join_rings([ways[k]['p'] for k in outer if k in ways])
        for index,ring in enumerate(rings):append({'id':-int(r.get('id'))-index,'p':ring,'tags':t})
        if rings:relation_outers.update(outer)
    for k,w in ways.items():
        if k not in relation_outers:append(w)
    snapshot_date=datetime.datetime.now(datetime.timezone.utc).date().isoformat()
    meta={'date':snapshot_date,'source':'OpenStreetMap contributors','license':'ODbL-1.0','bbox':BBOX,'origin':ORIGIN,'buildings':sum(f['t']=='building' for f in features),'features':len(features)}
    body='/* OpenStreetMap contributors · ODbL 1.0 · see data/README.md */\nwindow.EDIRNE_MAP='+json.dumps({'meta':meta,'features':features},separators=(',',':'),ensure_ascii=False)+';\n'
    dest=ROOT/'dist/data/map.js';temp=dest.with_suffix('.tmp');temp.write_text(body);temp.replace(dest)
    print(json.dumps(meta));print(f'{dest}: {len(body):,} bytes')
if __name__=='__main__':main()
