"""Gera quadros legíveis (início e movimento) para os 29 exercícios.
Vetores esquemáticos originais, não representam captura de movimento biomecânica.
"""
from pathlib import Path
from xml.etree import ElementTree as ET
import importlib.util, html
ROOT=Path(__file__).parent
spec=importlib.util.spec_from_file_location('treina_illustrations', ROOT/'make_illustrations.py')
art=importlib.util.module_from_spec(spec);spec.loader.exec_module(art)
# Personagem ilustrativo exclusivo do modo ampliado: torso com volume,
# braços/pernas em camadas, articulações, calçados e destaque muscular.
# As coordenadas das poses são reaproveitadas da v1.6 para compatibilidade.
import math

def styled_figure(head,shoulder,hip,el1,ha1,el2,ha2,kn1,fo1,kn2,fo2,muscle,face=False):
 def segment(a,b,r,color,outline='#122c34'):
  return (f'<line x1="{a[0]}" y1="{a[1]}" x2="{b[0]}" y2="{b[1]}" stroke="{outline}" stroke-width="{r+4}" stroke-linecap="round"/>'
          f'<line x1="{a[0]}" y1="{a[1]}" x2="{b[0]}" y2="{b[1]}" stroke="{color}" stroke-width="{r}" stroke-linecap="round"/>')
 def joint(a,r,color):return f'<circle cx="{a[0]}" cy="{a[1]}" r="{r}" fill="{color}" stroke="#214149" stroke-width="2"/>'
 def foot(a):return f'<path d="M{a[0]-8} {a[1]-4} Q{a[0]+1} {a[1]-11} {a[0]+21} {a[1]-1} Q{a[0]+23} {a[1]+6} {a[0]-8} {a[1]+5}Z" fill="#a6c4bb" stroke="#243c40" stroke-width="2"/>'
 base='#8cbcb9';limb='#adcdd0';skin='#d9ebe0';lime='#d7ff75';slate='#466a75'
 # Cor muscular destaque apenas nas regiões selecionadas.
 thigh=lime if muscle in ('Quadríceps','Posterior') else base
 lower=lime if muscle=='Panturrilhas' else limb
 upper=lime if muscle in ('Bíceps','Tríceps') else base
 trunk=lime if muscle in ('Abdômen','Peito','Costas') else slate
 s=''
 # Sombras e anatomia dos membros inferiores.
 for knee,ankle in [(kn1,fo1),(kn2,fo2)]:
  s+=segment(hip,knee,19,thigh)+segment(knee,ankle,13,lower)
  s+=joint(knee,7,'#a0c5bb')+foot(ankle)
 # Torso orientado para poses laterais, inclinações e exercícios deitados.
 x1,y1=shoulder;x2,y2=hip
 length=math.hypot(x2-x1,y2-y1)
 angle=math.degrees(math.atan2(y2-y1,x2-x1))-90
 cx=(x1+x2)/2;cy=(y1+y2)/2
 s+=f'<ellipse cx="{cx}" cy="{cy}" rx="17.5" ry="{length/2+7:.2f}" transform="rotate({angle:.2f} {cx} {cy})" fill="{trunk}" stroke="#18333b" stroke-width="3"/>'
 s+=f'<ellipse cx="{cx-2}" cy="{cy}" rx="5.5" ry="{length/2-7:.2f}" transform="rotate({angle:.2f} {cx} {cy})" fill="#deefe3" opacity=".2"/>'
 # Tronco possui pelve e peitoral destacados para orientar grupo muscular.
 s+=joint(hip,15, lime if muscle=='Glúteos' else '#779b9c')
 s+=joint(shoulder,16, lime if muscle=='Ombros' else '#6f9ca1')
 # Braços, cotovelos e mãos de tamanhos distintos.
 for elbow,hand in [(el1,ha1),(el2,ha2)]:
  s+=segment(shoulder,elbow,15,upper)
  s+=joint(elbow,7,'#91bbba')
  s+=segment(elbow,hand,10,skin)
  s+=joint(hand,8,skin)
 # Cabeça, pescoço e sombra de rosto; sem atributos de gênero.
 s+=segment(shoulder,head,10,skin)
 s+=f'<circle cx="{head[0]}" cy="{head[1]}" r="20" fill="{skin}" stroke="#2a4a4e" stroke-width="3"/>'
 s+=f'<path d="M{head[0]-7} {head[1]-5} Q{head[0]} {head[1]-11} {head[0]+8} {head[1]-5}" fill="none" stroke="#82a8aa" stroke-width="2" opacity=".6"/>'
 return s

art.fig=styled_figure
for phase,dir_name in [(0,'start'),(1,'finish')]:
 target=ROOT/'assets'/'frames'/dir_name
 target.mkdir(parents=True,exist_ok=True)
 for id,name,muscle,variant in art.ids:
  drawing=art.horizontal(muscle,variant,phase) if variant in ('bench','fly','row','legpress','extension','curlleg','hip') else art.portrait(phase,muscle,variant)
  label=html.escape(name)
  # Spacious portrait card with clear body and single pose; outer glow increases contrast on smaller screens.
  phase_title='POSIÇÃO INICIAL' if phase==0 else 'FASE PRINCIPAL'
  content=f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 430" role="img" aria-labelledby="title desc">
<title id="title">{label} — {phase_title}</title><desc id="desc">Ilustração esquemática original mostrando uma posição do exercício. Não representa técnica perfeita.</desc>
<defs><radialGradient id="bg" cx=".53" cy=".44" r=".78"><stop stop-color="#254b49"/><stop offset="1" stop-color="#0e222d"/></radialGradient>
<pattern id="grid" width="35" height="35" patternUnits="userSpaceOnUse"><path d="M35 0H0V35" stroke="#bddcb8" stroke-opacity=".07" fill="none"/></pattern>
<filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000" flood-opacity=".40"/></filter></defs>
<rect width="360" height="430" rx="22" fill="url(#bg)"/><rect width="360" height="430" rx="22" fill="url(#grid)"/>
<ellipse cx="180" cy="354" rx="112" ry="13" fill="#0b1820" opacity=".50"/>
<circle cx="180" cy="185" r="145" fill="none" stroke="#b5ef80" stroke-opacity=".12" stroke-width="2"/>
<rect x="18" y="15" width="164" height="31" rx="11" fill="#264839" stroke="#548861"/>
<text x="100" y="35" text-anchor="middle" fill="#e3ffd8" font-family="sans-serif" font-size="12" font-weight="bold">{phase_title}</text>
<g transform="translate(37 49) scale(1.1 .98)" filter="url(#glow)">{drawing}</g>
<rect x="0" y="379" width="360" height="51" fill="#0c2029"/>
<rect x="17" y="391" width="6" height="26" rx="3" fill="#c6f65b"/>
<text x="34" y="405" fill="#f0fbe8" font-family="sans-serif" font-size="13" font-weight="bold">{html.escape(name[:35])}</text>
<text x="34" y="420" fill="#91b9aa" font-family="sans-serif" font-size="10">ILUSTRAÇÃO EDUCATIVA • TREINAPRO</text>
</svg>"""
  ET.fromstring(content)
  (target/f'{id}.svg').write_text(content,'utf8')
print('Quadros gerados:',len(art.ids)*2)
