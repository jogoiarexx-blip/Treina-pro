"""Gerador de ilustrações vetoriais originais: duas fases de cada exercício.
Executar: python make_illustrations.py
"""
import json,re,os
from pathlib import Path
ROOT=Path(__file__).parent
src=(ROOT/'data.js').read_text()
ids=re.findall(r"\{id:'([^']+)',name:'([^']+)',muscle:'([^']+)',equip:'[^']+',type:'([^']+)'",src)
OUT=ROOT/'assets'/'exercises';OUT.mkdir(exist_ok=True)
BODY='#c4d5d7';BODY2='#91b0b4';ACC='#c6f65b';W='#587a80'
def line(a,b,w=12,col=BODY):
 return f'<line x1="{a[0]}" y1="{a[1]}" x2="{b[0]}" y2="{b[1]}" stroke="{col}" stroke-width="{w}" stroke-linecap="round"/>'
def circle(c,r=13,col=BODY):
 return f'<circle cx="{c[0]}" cy="{c[1]}" r="{r}" fill="{col}"/>'
def path(d,w=12,col=BODY):return f'<path d="{d}" stroke="{col}" stroke-width="{w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
def equip_line(a,b,w=5,col=W):return line(a,b,w,col)
def fig(head,shoulder,hip,el1,ha1,el2,ha2,kn1,fo1,kn2,fo2,muscle,face=False):
 # Body built from visible simple joints and connective bones.
 s=''
 s+=line(shoulder,hip,22,BODY2)
 s+=line(hip,kn1,17,ACC if muscle in ('Quadríceps','Posterior','Glúteos') else BODY)
 s+=line(kn1,fo1,13,BODY)
 s+=line(hip,kn2,17,ACC if muscle in ('Quadríceps','Posterior','Glúteos') else BODY)
 s+=line(kn2,fo2,13,BODY)
 s+=line(shoulder,el1,15,ACC if muscle in ('Ombros','Tríceps','Bíceps','Peito','Costas') else BODY)
 s+=line(el1,ha1,12,BODY)
 s+=line(shoulder,el2,15,ACC if muscle in ('Ombros','Tríceps','Bíceps','Peito','Costas') else BODY)
 s+=line(el2,ha2,12,BODY)
 s+=circle(head,19,BODY)
 for p in (el1,el2,kn1,kn2): s+=circle(p,5,BODY2)
 for p in (ha1,ha2):s+=circle(p,8,'#e6f8e4')
 s+=line((fo1[0]-7,fo1[1]),(fo1[0]+14,fo1[1]),5,'#d8e5e3')
 s+=line((fo2[0]-7,fo2[1]),(fo2[0]+14,fo2[1]),5,'#d8e5e3')
 return s

def portrait(phase,muscle,variant):
 # Panels are drawn on a 260x330 local canvas. phase 0 = start, 1 = main phase.
 h=(130,78);s=(127,123);hip=(132,202);k1=(105,263);f1=(103,311);k2=(158,264);f2=(160,312)
 el1=(95,175);ha1=(96,229);el2=(164,178);ha2=(164,226)
 equipment=''
 if variant=='squat':
  if phase: h=(132,109);s=(132,153);hip=(136,228);k1=(73,258);k2=(188,260);f1=(67,310);f2=(194,310);el1=(111,178);ha1=(134,176);el2=(163,179);ha2=(145,177)
  else:el1=(102,151);ha1=(131,152);el2=(162,152);ha2=(136,150)
  equipment+=equip_line((37,314),(214,314),3)
 elif variant=='lunge':
  if phase: h=(133,118);s=(132,157);hip=(130,227);k1=(90,259);f1=(75,312);k2=(184,291);f2=(202,312)
  else:k1=(113,262);f1=(108,312);k2=(169,262);f2=(169,312)
  equipment+=equip_line((37,315),(221,315),3)
 elif variant=='hinge':
  if phase: h=(82,160);s=(108,193);hip=(165,206);k1=(158,255);f1=(156,311);k2=(184,258);f2=(188,311);el1=(119,228);ha1=(135,288);el2=(155,226);ha2=(172,287)
  else:hip=(137,202);el1=(100,177);ha1=(103,229);el2=(164,178);ha2=(167,229)
  equipment+=equip_line((72,288),(199,288),5)+circle((72,288),13,'#40666a')+circle((199,288),13,'#40666a')
 elif variant=='lateral':
  if phase:el1=(73,145);ha1=(34,134);el2=(188,145);ha2=(223,134)
  equipment+=circle(ha1,12,'#83b59c')+circle(ha2,12,'#83b59c')
 elif variant=='curl':
  if phase:el1=(93,177);ha1=(112,136);el2=(166,177);ha2=(151,137)
  equipment+=circle(ha1,11,'#83b59c')+circle(ha2,11,'#83b59c')
 elif variant=='overhead':
  el1=(99,135);el2=(161,135)
  if phase:ha1=(103,54);ha2=(157,54)
  else:ha1=(100,98);ha2=(158,99)
  equipment+=circle(ha1,10,'#79bda0')+circle(ha2,10,'#79bda0')
 elif variant=='pushdown':
  el1=(105,168);el2=(153,168)
  if phase:ha1=(109,244);ha2=(150,244)
  else:ha1=(110,184);ha2=(151,184)
  equipment+=equip_line((126,24),(126,141),3)+equip_line((90,148),(170,148),6,'#82aaaf')
 elif variant=='pulldown':
  if phase:el1=(87,125);ha1=(88,108);el2=(170,125);ha2=(171,108)
  else:el1=(95,86);ha1=(88,40);el2=(162,86);ha2=(172,40)
  equipment+=equip_line((63,40),(195,40),8,'#82aaaf')+equip_line((129,16),(129,40),4)+equip_line((83,310),(175,310),4)
 elif variant=='calf':
  if phase:f1=(101,299);f2=(156,299);hip=(132,190);k1=(105,254);k2=(155,254)
  equipment+=equip_line((65,312),(200,312),6)+equip_line((65,318),(200,318),5,'#263c48')
 elif variant=='abduction':
  # seated front view with knees moving apart
  hip=(130,202);h=(130,72);s=(130,121);k1=(95 if phase else 111,247);f1=(58 if phase else 96,302);k2=(163 if phase else 149,247);f2=(204 if phase else 164,302);el1=(103,175);ha1=(110,208);el2=(154,175);ha2=(150,208)
  equipment+=equip_line((85,215),(178,215),8)+equip_line((92,218),(88,311),5)+equip_line((173,218),(178,311),5)
 elif variant=='crunch':
  # custom horizontal figure on floor
  equipment+=equip_line((29,283),(227,283),4)
  if phase: return equipment+fig((62,166),(88,187),(139,242),(78,207),(95,183),(109,218),(118,194),(177,241),(188,278),(193,246),(206,278),muscle)
  return equipment+fig((56,246),(94,241),(146,249),(94,218),(112,219),(109,241),(130,223),(173,241),(186,280),(188,250),(205,280),muscle)
 elif variant=='plank':
  equipment+=equip_line((26,278),(232,278),4)
  return equipment+fig((44,173),(81,186),(172 if phase else 164,184 if phase else 211),(73,224),(61,269),(93,224),(75,269),(197,217),(221,270),(202,218),(223,270),muscle)
 else:
  pass
 return equipment+fig(h,s,hip,el1,ha1,el2,ha2,k1,f1,k2,f2,muscle)

def horizontal(muscle,variant,phase):
 # side-view for machine and bench exercises; hand-drawn joints.
 eq=''
 if variant in ('bench','fly'):
  eq+=equip_line((42,227),(210,227),8)+equip_line((63,229),(49,309),5)+equip_line((194,229),(207,309),5)
  head=(41,193);shoulder=(78,211);hip=(163,212);k1=(196,247);f1=(210,302);k2=(168,248);f2=(165,305)
  if variant=='fly':
   if phase:el1=(102,142);ha1=(127,98);el2=(119,141);ha2=(144,98)
   else:el1=(69,168);ha1=(51,147);el2=(114,175);ha2=(137,150)
  else:
   if phase:el1=(86,139);ha1=(94,81);el2=(129,139);ha2=(135,81)
   else:el1=(90,170);ha1=(105,136);el2=(133,173);ha2=(144,139)
  eq+=equip_line((65,ha1[1]),(167,ha1[1]),5,'#85b5bb')+circle((65,ha1[1]),11,'#42646b')+circle((167,ha1[1]),11,'#42646b')
 elif variant=='row':
  head=(72,108);shoulder=(86,142);hip=(108,234);k1=(177,246);f1=(190,299);k2=(159,256);f2=(167,302)
  el1=(132 if phase else 145,169);ha1=(149 if phase else 205,169)
  el2=(129 if phase else 148,190);ha2=(150 if phase else 202,190)
  eq+=equip_line((59,241),(127,241),7)+equip_line((81,244),(82,305),5)+equip_line((221,85),(221,305),4)+equip_line((210,165),(240,165),4)
 elif variant=='legpress':
  head=(59,137);shoulder=(75,176);hip=(119,241);k1=(170 if phase else 170,186 if phase else 232);f1=(230,108 if phase else 153);k2=(190 if phase else 167,194 if phase else 248);f2=(239,147 if phase else 184)
  el1=(68,207);ha1=(93,238);el2=(102,208);ha2=(114,238)
  eq+=equip_line((29,190),(116,273),9)+equip_line((186,89),(244,136),9)+equip_line((205,86),(251,138),3,'#779ca1')
 elif variant=='extension':
  head=(90,100);shoulder=(99,145);hip=(111,232);k1=(177,243);f1=(223 if phase else 178,251 if phase else 299);k2=(166,240);f2=(217 if phase else 167,252 if phase else 299)
  el1=(97,199);ha1=(125,235);el2=(120,194);ha2=(146,229)
  eq+=equip_line((80,239),(183,239),8)+equip_line((95,240),(95,313),5)
 elif variant=='curlleg':
  head=(43,193);shoulder=(74,213);hip=(159,216);k1=(187,217);f1=(199,153 if phase else 273);k2=(175,221);f2=(182,157 if phase else 272)
  el1=(69,241);ha1=(82,260);el2=(102,235);ha2=(115,258)
  eq+=equip_line((35,235),(209,235),8)+equip_line((45,237),(47,308),5)+equip_line((207,237),(209,308),5)
 elif variant=='hip':
  head=(48,182);shoulder=(75,203);hip=(152,202 if phase else 245);k1=(200,203 if phase else 231);f1=(216,295);k2=(184,199 if phase else 235);f2=(184,295)
  el1=(66,224);ha1=(93,238);el2=(99,217);ha2=(117,238)
  eq+=equip_line((34,225),(106,225),8)+equip_line((52,230),(52,310),6)+equip_line((165,303),(243,303),4)
 else:
  return portrait(phase,muscle,variant)
 return eq+fig(head,shoulder,hip,el1,ha1,el2,ha2,k1,f1,k2,f2,muscle)

for id,name,muscle,variant in ids:
 label=name.upper();label=label[:29]+('…' if len(label)>29 else '')
 parts=[]
 for phase,x in enumerate([7,287]):
  drawing=horizontal(muscle,variant,phase) if variant in ('bench','fly','row','legpress','extension','curlleg','hip') else portrait(phase,muscle,variant)
  parts.append(f'<g transform="translate({x} 24) scale(.96 1.02)">{drawing}</g>')
 content=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 360" role="img" aria-labelledby="title desc"><title id="title">{name}</title><desc id="desc">Ilustração vetorial simplificada das posições de início e movimento. Confira também as instruções escritas.</desc>
 <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#1b3a3a"/><stop offset="1" stop-color="#10232c"/></linearGradient><pattern id="grid" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M26 0H0V26" stroke="#527477" opacity=".13" fill="none"/></pattern></defs>
 <rect width="560" height="360" rx="18" fill="url(#bg)"/><rect width="560" height="360" rx="18" fill="url(#grid)"/><path d="M280 35V315" stroke="#709297" stroke-dasharray="4 8" opacity=".25"/>
 <rect x="20" y="14" rx="12" width="91" height="23" fill="#294943"/><text x="65" y="29" fill="#d3f7be" text-anchor="middle" font-size="10" font-family="sans-serif" font-weight="bold">INÍCIO</text>
 <rect x="300" y="14" rx="12" width="108" height="23" fill="#335d49"/><text x="354" y="29" fill="#e8ffd0" text-anchor="middle" font-size="10" font-family="sans-serif" font-weight="bold">MOVIMENTO</text>
 {''.join(parts)}
 <rect x="0" y="329" width="560" height="31" fill="#101d27"/><text x="17" y="350" font-size="12" font-family="DejaVu Sans, sans-serif" font-weight="700" fill="#c8edbc">{label.replace('&','&amp;')}</text><text x="541" y="350" font-size="11" font-family="sans-serif" text-anchor="end" fill="#82b9aa">TREINAPRO</text>
 </svg>'''
 (OUT/f'{id}.svg').write_text(content,encoding='utf8')
print('Generated',len(ids),'exercise illustrations: ',','.join(x[0] for x in ids))
