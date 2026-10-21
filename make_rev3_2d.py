"""REV3 — quatro desenhos educacionais 2D autorais (SVG, sem dependências e sem fotos de terceiros).
Execute após make_illustrations.py, make_frames.py e make_animations.py.
Cada exercício recebe comparação, dois quadros estáticos, animação normal/lenta e pausa.
A geometria é ilustrativa, não uma certificação de técnica ou avaliação da postura.
"""
from pathlib import Path
from html import escape
import xml.etree.ElementTree as ET
R=Path(__file__).parent
OUT=R/'assets'
COLORS={'canvas':'#102630','back':'#15363b','steel':'#628e91','equip':'#75a09d','ghost':'#0a1f28','bone':'#d5e9de','limb':'#9cc7bf','limb2':'#b6d6d0','high':'#d2ff6a','hand':'#f0e9d2','outline':'#173840','hint':'#add6be'}
C=COLORS

# Esboço geométrico específico de cada modalidade, visto de perfil.
POSE={
'agachamento':[
 dict(head=(179,76),sh=(178,132),hip=(173,221),k1=(158,278),a1=(141,331),k2=(204,282),a2=(206,331),el1=(141,152),w1=(133,131),el2=(212,151),w2=(218,132)),
 dict(head=(166,100),sh=(169,155),hip=(139,258),k1=(200,270),a1=(141,331),k2=(225,277),a2=(206,331),el1=(140,173),w1=(135,155),el2=(199,178),w2=(218,154))],
'leg_press':[
 dict(head=(65,197),sh=(107,237),hip=(159,299),k1=(215,231),a1=(263,206),k2=(200,249),a2=(265,235),el1=(108,283),w1=(141,301),el2=(127,276),w2=(156,298)),
 dict(head=(65,197),sh=(107,237),hip=(159,299),k1=(266,189),a1=(309,145),k2=(263,216),a2=(314,176),el1=(108,283),w1=(141,301),el2=(127,276),w2=(156,298))],
'extensora':[
 dict(head=(102,85),sh=(113,137),hip=(128,231),k1=(228,241),a1=(225,318),k2=(211,250),a2=(206,316),el1=(111,199),w1=(151,238),el2=(132,188),w2=(167,239)),
 dict(head=(102,85),sh=(113,137),hip=(128,231),k1=(228,241),a1=(309,240),k2=(211,250),a2=(293,250),el1=(111,199),w1=(151,238),el2=(132,188),w2=(167,239))],
'supino':[
 dict(head=(70,230),sh=(113,243),hip=(196,243),k1=(255,264),a1=(267,340),k2=(235,274),a2=(233,340),el1=(147,203),w1=(169,165),el2=(173,216),w2=(189,165)),
 dict(head=(70,230),sh=(113,243),hip=(196,243),k1=(255,264),a1=(267,340),k2=(235,274),a2=(233,340),el1=(150,159),w1=(171,96),el2=(174,164),w2=(191,96))]
}
NAMES={'agachamento':'AGACHAMENTO LIVRE','leg_press':'LEG PRESS 45°','extensora':'CADEIRA EXTENSORA','supino':'SUPINO RETO COM BARRA'}
MUSCLES={'agachamento':'QUADRÍCEPS + GLÚTEOS','leg_press':'QUADRÍCEPS + GLÚTEOS','extensora':'QUADRÍCEPS','supino':'PEITO + TRÍCEPS'}
TIPS={'agachamento':'Pés apoiados • amplitude confortável','leg_press':'Costas apoiadas • não trave os joelhos','extensora':'Joelho alinhado • sem impulso','supino':'Pés firmes • barra sob controle'}

class Drawing:
 def __init__(self,animated=False,duration=4.6):self.nodes=[];self.animate=animated;self.duration=duration
 def node(self,kind,a,b,**style):
  self.nodes.append((kind,a,b,style))
 def line(self,x1,y1,x2,y2,w,color,xx=None,opacity=None):
  base=(x1,y1,x2,y2)
  self.node('line',base,xx or base,stroke=color,**{'stroke-width':str(w),'stroke-linecap':'round'},**({'opacity':str(opacity)} if opacity else {}))
 def circle(self,x,y,r,color,xx=None,stroke=None,sw=0):
  base=(x,y,r);style={'fill':color};
  if stroke:style.update(stroke=stroke,**{'stroke-width':str(sw)})
  self.node('circle',base,xx or base,**style)
 def seg(self,a,b,p,q,w,primary):
  self.line(*a,*b,w+5,C['outline'],(*p,*q))
  self.line(*a,*b,w,primary,(*p,*q))
  self.line(*a,*b,max(3,w*.25),'#f3fff2',(*p,*q),opacity='.18')
 def static_line(self,a,b,w,color,opacity=None):self.line(*a,*b,w,color,opacity=opacity)
 def emit(self):
  out=[]
  tags={'line':['x1','y1','x2','y2'],'circle':['cx','cy','r']}
  for kind,a,b,style in self.nodes:
   attrs=' '.join(f'{key}="{value}"' for key,value in style.items())
   vals=tags[kind]
   coords=' '.join(f'{k}="{v:.2f}"' for k,v in zip(vals,a))
   ani=''
   if self.animate:
    for k,v,w in zip(vals,a,b):
     if abs(v-w)>.001:
      ani+=f'<animate attributeName="{k}" values="{v:.2f};{v:.2f};{w:.2f};{w:.2f};{v:.2f};{v:.2f}" keyTimes="0;0.12;0.43;0.59;0.9;1" dur="{self.duration}s" repeatCount="indefinite"/>'
   out.append(f'<{kind} {coords} {attrs}>{ani}</{kind}>')
  return ''.join(out)

def machine(d,ex,s,t):
 # Elementos estruturais estacionários e equipamento móvel nas máquinas.
 dark='#456b70';iron='#82a6a9';lime=C['high']
 if ex=='agachamento':
  d.static_line((33,356),(336,356),3,'#5c8382')
  # barra sobre o trapézio/ombros, conserva deslocamento do tronco
  for start,end in [((s['sh'][0]-64,s['sh'][1]-13),(t['sh'][0]-64,t['sh'][1]-13)),((s['sh'][0]+67,s['sh'][1]-13),(t['sh'][0]+67,t['sh'][1]-13))]:pass
  v=(s['sh'][0],s['sh'][1]-13);w=(t['sh'][0],t['sh'][1]-13)
  d.line(v[0]-65,v[1],v[0]+67,v[1],7,iron,(w[0]-65,w[1],w[0]+67,w[1]))
  for off in [-54,55]:d.circle(v[0]+off,v[1],11,dark,(w[0]+off,w[1],11),stroke=iron,sw=2)
  d.static_line((129,350),(147,350),7,'#81a9a5')
 elif ex=='leg_press':
  d.static_line((20,327),(341,74),8,dark)
  d.static_line((45,352),(351,105),4,iron)
  d.static_line((58,319),(145,246),23,'#507777') # banco inclinado
  d.static_line((85,316),(169,319),13,iron)
  d.static_line((69,315),(65,353),7,dark)
  d.static_line((115,320),(119,350),7,dark)
  # plataforma desloca em diagonal com o pé
  p=(s['a1'][0]+7,s['a1'][1]-30);q=(t['a1'][0]+7,t['a1'][1]-30)
  d.line(p[0]-17,p[1]-40,p[0]+31,p[1]+41,17,'#203f48',(q[0]-17,q[1]-40,q[0]+31,q[1]+41))
  d.line(p[0]-18,p[1]-40,p[0]+31,p[1]+41,8,iron,(q[0]-18,q[1]-40,q[0]+31,q[1]+41))
  d.circle(p[0]+8,p[1],12,C['high'],(q[0]+8,q[1],12),stroke=C['outline'],sw=3)
 elif ex=='extensora':
  d.static_line((87,130),(83,251),15,dark) # encosto
  d.static_line((91,245),(222,245),19,iron) # assento
  d.static_line((118,250),(111,351),8,dark)
  d.static_line((190,250),(194,351),8,dark)
  d.static_line((214,244),(214,329),7,dark)
  # articulação e alavanca com rolo acompanhando tornozelo
  d.circle(228,243,13,iron,stroke='#193742',sw=5)
  d.line(228,243,s['a1'][0],s['a1'][1],7,dark,(228,243,t['a1'][0],t['a1'][1]))
  d.circle(s['a1'][0],s['a1'][1],16,C['high'],(t['a1'][0],t['a1'][1],16),stroke=C['outline'],sw=4)
 elif ex=='supino':
  d.static_line((36,257),(250,257),17,iron) # banco
  d.static_line((64,258),(61,348),9,dark)
  d.static_line((222,258),(222,348),9,dark)
  d.static_line((36,353),(333,353),3,'#6f8f8b')
  d.static_line((260,53),(260,358),7,dark) # suporte à direita
  d.static_line((252,168),(281,168),7,iron) # gancho
  p=s['w1'][1]-10;q=t['w1'][1]-10
  d.line(90,p,270,p,8,iron,(90,q,270,q))
  for x,r in ((99,17),(259,17),(119,10),(239,10)):
   d.circle(x,p,r,dark,(x,q,r),stroke=iron,sw=3)

def model(d,ex,s,t):
 # Segmentos anatômicos volumosos (cores por região), sem confundir com forma clínica exata.
 # Ordenação mantém os braços aparentando segurar barras.
 for key1,key2,width,color in [
  ('hip','k2',25,C['limb']),('k2','a2',17,C['bone']),
  ('hip','k1',28,C['high'] if ex!='supino' else C['limb']),('k1','a1',18,C['bone']),
  ('sh','hip',42,C['limb2']),
  ('sh','el2',20,C['limb']),('el2','w2',15,C['bone']),
  ('sh','el1',23,C['high'] if ex=='supino' else C['limb']),('el1','w1',16,C['bone'])]:
  d.seg(s[key1],s[key2],t[key1],t[key2],width,color)
 for name,r,col in [('hip',20,C['high'] if ex=='agachamento' else C['limb']),('sh',21,C['limb2']),('k1',11,C['bone']),('k2',10,C['limb']),('el1',10,C['limb']),('el2',9,C['bone']),('w1',8,C['hand']),('w2',8,C['hand'])]:
  d.circle(*s[name],r,col,(*t[name],r),stroke=C['outline'],sw=2.5)
 d.seg(s['sh'],s['head'],t['sh'],t['head'],14,C['bone'])
 d.circle(*s['head'],22,C['hand'],(*t['head'],22),stroke=C['outline'],sw=3)
 # olhos/rosto visíveis acompanham cabeça, para leitura da direção
 d.circle(s['head'][0]+8,s['head'][1]-3,2.8,C['outline'],(t['head'][0]+8,t['head'][1]-3,2.8))
 for ankle in ('a1','a2'):
  x,y=s[ankle];xx,yy=t[ankle];d.line(x-6,y,x+19,y,9,'#e2f3df',(xx-6,yy,xx+19,yy))

def illustration(ex,phase=None,anim=False,duration=4.6):
 s,t=POSE[ex];
 if not anim and phase==1:s=t
 d=Drawing(anim,duration)
 # Leg press e cadeira extensora: alguns suportes aparecem atrás da figura.
 # Estrutura frontal de máquina no mesmo plano para leitura rápida.
 machine(d,ex,s,t)
 model(d,ex,s,t)
 return d.emit()

def surround(ex,content,mode,phase=0):
 label=NAMES[ex];muscle=MUSCLES[ex];tip=TIPS[ex];static=mode in ('start','finish','still')
 tag='PREPARE' if phase==0 else 'EXECUTE'
 name=escape(label)
 subtitle=escape(muscle)
 header='ILUSTRAÇÃO • FASE INICIAL' if mode in ('start','still') else 'ILUSTRAÇÃO • FASE PRINCIPAL' if mode=='finish' else 'MOVIMENTO 2D • REPETIÇÃO GUIADA'
 return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 430" role="img" aria-labelledby="title desc">
<title id="title">{name} — {escape(header)}</title><desc id="desc">Desenho 2D educativo original. {escape(tip)}. Não avalia postura nem representa técnica perfeita.</desc>
<defs><radialGradient id="back" cx="45%" cy="43%" r="78%"><stop stop-color="#234b4a"/><stop offset="1" stop-color="#0d222e"/></radialGradient>
<pattern id="gr" patternUnits="userSpaceOnUse" width="24" height="24"><path d="M24 0H0V24" fill="none" stroke="#bbd4cb" stroke-opacity=".09"/></pattern></defs>
<rect width="360" height="430" rx="22" fill="url(#back)"/><rect width="360" height="430" rx="22" fill="url(#gr)"/>
<rect x="15" y="16" rx="11" width="330" height="39" fill="#17353c" stroke="#456f63"/>
<text x="27" y="32" fill="#c7fb74" font-size="11" font-weight="800" font-family="Arial,sans-serif">{name}</text><text x="27" y="46" fill="#b7d8ce" font-size="9" font-family="Arial,sans-serif">{subtitle}</text>
<g transform="translate(0 -2)">{content}</g>
<rect x="0" y="370" width="360" height="60" fill="#0c202b"/>
<rect x="17" y="381" width="4" height="37" rx="2" fill="#c6f65b"/>
<text x="31" y="393" fill="#d6f69c" font-size="11" font-family="Arial,sans-serif" font-weight="800">{escape(header)}</text>
<text x="31" y="412" fill="#c2d9d1" font-size="10" font-family="Arial,sans-serif">{escape(tip)}</text>
</svg>'''

# Todos os arquivos a seguir são originais e contêm a mesma geometria de pose.
for ex in POSE:
 for phase,label in [(0,'start'),(1,'finish')]:
  root=surround(ex,illustration(ex,phase,False),label,phase)
  path=OUT/'frames'/label/f'{ex}.svg';path.parent.mkdir(parents=True,exist_ok=True);ET.fromstring(root);path.write_text(root,'utf8')
 for mode,duration in [('motion',4.5),('motion-slow',7.5),('still',None)]:
  content=surround(ex,illustration(ex,anim=duration is not None,duration=duration or 4.5),mode)
  path=OUT/mode/f'{ex}.svg';path.parent.mkdir(parents=True,exist_ok=True);ET.fromstring(content);path.write_text(content,'utf8')
 # Comparativo de duas fases para miniaturas no catálogo.
 a=illustration(ex,phase=0,anim=False)
 # Deve emitir a pose final, não a inicial.
 b=illustration(ex,phase=1,anim=False)
 # Uma função anterior usa a geometria inicial sem animação; substitui pela pose final explicitamente.
 def fixed_pose(ex,finish):
  p=POSE[ex][1 if finish else 0];d=Drawing();machine(d,ex,p,p);model(d,ex,p,p);return d.emit()
 left=fixed_pose(ex,False);right=fixed_pose(ex,True)
 content=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 360" role="img" aria-labelledby="title desc">
<title id="title">{escape(NAMES[ex])}: início e execução</title><desc id="desc">Demonstração ilustrativa original. Consulte o guia por etapas.</desc>
<rect width="560" height="360" rx="20" fill="#112b33"/><path d="M280 12V343" stroke="#547c7a" stroke-opacity=".5" stroke-dasharray="5 7"/>
<rect x="13" y="10" width="110" height="25" rx="9" fill="#34594c"/><text x="68" y="27" fill="#dcf5ba" font-size="12" font-weight="bold" font-family="Arial,sans-serif" text-anchor="middle">INÍCIO</text>
<rect x="294" y="10" width="135" height="25" rx="9" fill="#34594c"/><text x="361" y="27" fill="#dcf5ba" font-size="12" font-weight="bold" font-family="Arial,sans-serif" text-anchor="middle">MOVIMENTO</text>
<g transform="translate(6 23) scale(.75 .84)">{left}</g>
<g transform="translate(286 23) scale(.75 .84)">{right}</g>
<rect x="0" y="329" width="560" height="31" fill="#0d202a"/><text x="16" y="349" fill="#d5f7b5" font-size="12" font-weight="bold" font-family="Arial,sans-serif">{escape(NAMES[ex])}</text><text x="543" y="349" fill="#9cbdad" text-anchor="end" font-size="11" font-family="Arial,sans-serif">TREINAPRO</text></svg>'''
 path=OUT/'exercises'/f'{ex}.svg';ET.fromstring(content);path.write_text(content,'utf8')
 print(ex,'6 arquivos SVG')
print('REV3: 24 desenhos 2D gerados.')
