#!/usr/bin/env python3
"""Generate all TreinaPro static WebP assets from the maintained SVG drawings.

SVG motion animations intentionally remain SVG. Requires Pillow and CairoSVG.
"""
from pathlib import Path
from collections import Counter
import io, json
import cairosvg
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'assets'/'webp'
GROUPS=[('exercises','exercises'),('frames/start','frames/start'),('frames/finish','frames/finish'),('still','still')]
LIME='#c6f65b'

def save(im,path,quality=82):
    path.parent.mkdir(parents=True,exist_ok=True)
    im.convert('RGB').save(path,'WEBP',quality=quality,method=6)
    b=path.read_bytes()
    if b[:4]!=b'RIFF' or b[8:12]!=b'WEBP':raise RuntimeError('Invalid WebP '+str(path))
    return {'path':path.relative_to(ROOT).as_posix(),'bytes':len(b)}

def canvas(w,h):
    image=Image.new('RGB',(w,h))
    pixels=image.load()
    for y in range(h):
        yy=y/max(1,h-1)
        for x in range(w):
            xx=x/max(1,w-1)
            pixels[x,y]=(int(12+14*xx+5*yy),int(35+20*xx+5*yy),int(45+14*xx+4*yy))
    return image

def roundrect(d,b,r,fill,outline=None,width=2):
    d.rounded_rectangle(b,radius=r,fill=fill,outline=outline,width=width)

def make_ui():
    folder=OUT/'ui';results=[]
    im=canvas(256,256);d=ImageDraw.Draw(im)
    roundrect(d,(23,23,232,232),51,LIME)
    d.line([(80,77),(181,77)],fill='#10232c',width=18)
    d.line([(131,78),(131,189)],fill='#10232c',width=21)
    d.line([(167,140),(219,140)],fill='#10232c',width=14)
    d.line([(193,114),(193,166)],fill='#10232c',width=14)
    results.append(save(im,folder/'brand.webp',84))
    im=canvas(900,530);d=ImageDraw.Draw(im)
    for r in (260,212,164):
        d.ellipse((450-r,257-r,450+r,257+r),outline=(70,118,108),width=3)
    d.ellipse((213,464,684,502),fill='#0a2730')
    for p,q,width,color in [
        ((435,330),(366,439),57,'#92bbb0'),((455,329),(544,442),57,'#92bbb0'),
        ((364,439),(315,465),25,'#d4eadd'),((543,444),(597,465),25,'#d4eadd'),
        ((435,185),(444,320),92,'#8ac3aa'),((399,191),(340,242),45,'#bfe67d'),
        ((340,242),(280,170),34,'#c7e2d0'),((489,192),(550,239),45,'#bfe67d'),
        ((550,239),(605,170),34,'#c7e2d0')]:
        d.line([p,q],fill=color,width=width)
    d.ellipse((398,86,492,180),fill='#e8dcc7',outline='#9dbaae',width=5)
    for x in (268,593):
        d.line([(x-32,159),(x+32,159)],fill='#a9cdc3',width=22)
        for off in (-32,32):roundrect(d,(x+off-8,127,x+off+8,190),5,LIME)
    results.append(save(im,folder/'hero-workout.webp',85))
    im=canvas(640,400);d=ImageDraw.Draw(im)
    roundrect(d,(152,62,486,349),27,'#254551','#779e95',5)
    for i in range(5):
        y=101+i*47
        d.line([(200,y),(440,y)],fill='#507a75',width=3)
        d.ellipse((192,y-12,217,y+13),fill=LIME if i<3 else '#547471')
        if i<3:d.line([(198,y),(205,y+8),(217,y-7)],fill='#142e36',width=4)
    results.append(save(im,folder/'empty-history.webp'))
    im=canvas(640,400);d=ImageDraw.Draw(im)
    for x in (68,259,450):
        roundrect(d,(x,77,x+137,322),22,'#24444d','#5d8b7c',3)
        d.ellipse((x+47,100,x+93,146),fill='#d3e6d8')
        for a,b,c in [((x+69,147),(x+69,252),'#91bcb2'),
                      ((x+70,184),(x+36,229),'#b8ec78'),((x+71,185),(x+108,226),'#b8ec78'),
                      ((x+69,252),(x+44,295),'#d6e7d9'),((x+70,252),(x+96,295),'#d6e7d9')]:
            d.line([a,b],fill=c,width=14)
    results.append(save(im,folder/'library.webp'))
    im=canvas(640,400);d=ImageDraw.Draw(im)
    d.arc((151,51,484,342),205,335,fill=LIME,width=23)
    d.arc((215,117,422,284),205,335,fill='#8daea5',width=22)
    d.ellipse((300,226,345,271),fill=LIME)
    roundrect(d,(251,291,394,348),15,'#204c41','#9bc6a4',3)
    d.line([(274,317),(307,330),(369,307)],fill=LIME,width=8)
    results.append(save(im,folder/'offline.webp'))
    return results

def build():
    assets=[];ids=None
    for directory,target in GROUPS:
        files=sorted((ROOT/'assets'/directory).glob('*.svg'))
        current={f.stem for f in files}
        if ids is None:ids=current
        if len(files)!=29 or current!=ids:
            raise RuntimeError('Expected 29 matching SVG exercise IDs in '+directory)
        for f in files:
            png=cairosvg.svg2png(url=str(f),output_width=480)
            im=Image.open(io.BytesIO(png))
            assets.append(save(im,OUT/target/(f.stem+'.webp')))
    assets.extend(make_ui())
    # New authored exercise artwork, not just another encoding of the old thumbnails.
    featured=ROOT/'assets'/'featured'/'svg'
    featured_files=sorted(featured.glob('*.svg'))
    if {f.stem for f in featured_files}!={'supino_maquina','leg_press','desenvolvimento','face_pull'}:
        raise RuntimeError('Expected four original featured illustrations')
    for f in featured_files:
        png=cairosvg.svg2png(url=str(f),output_width=800)
        im=Image.open(io.BytesIO(png))
        assets.append(save(im,ROOT/'assets'/'featured'/(f.stem+'.webp'),86))
    if len(assets)!=125:raise RuntimeError('Wrong number of assets')
    summary={'version':'treinapro-v2.6-rev14','assets':assets,'total_bytes':sum(e['bytes'] for e in assets),
             'by_folder':dict(Counter(str(Path(e['path']).parent) for e in assets))}
    (OUT/'manifest.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf8')
    print('WebP: '+str(len(assets))+' assets, '+str(summary['total_bytes'])+' bytes')
    return summary

if __name__=='__main__':build()
