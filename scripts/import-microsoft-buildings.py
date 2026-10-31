#!/usr/bin/env python3
"""Download the pinned Microsoft partition, crop it, and merge into map.js.
Standard library only. Source: Microsoft GlobalMLBuildingFootprints,
CDLA Permissive 2.0. See dist/data/README.md and the included license.
"""
import csv,gzip,io,json,pathlib,subprocess,sys,tempfile,urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]
INDEX='https://bfppub.blob.core.windows.net/%24web/2026-08-13/dataset-links.csv'
def main():
    with urllib.request.urlopen(INDEX,timeout=60) as r:rows=csv.DictReader(io.StringIO(r.read().decode()))
    partition=next(r for r in rows if r['Location']=='Turkey' and r['QuadKey']=='120322321')
    with urllib.request.urlopen(partition['Url'],timeout=120) as r:raw=r.read()
    features=[]
    for line in gzip.decompress(raw).decode().splitlines():
        f=json.loads(line);ps=f['geometry']['coordinates'][0]
        lon=sum(p[0] for p in ps)/len(ps);lat=sum(p[1] for p in ps)/len(ps)
        if 26.511<=lon<=26.595 and 41.646<=lat<=41.700:features.append(f)
    with tempfile.TemporaryDirectory(prefix='edirne-buildings-') as d:
        p=pathlib.Path(d)/'extract.json';p.write_text(json.dumps(features))
        subprocess.run([sys.executable,str(ROOT/'scripts/merge-buildings.py'),str(p)],check=True)
if __name__=='__main__':main()
