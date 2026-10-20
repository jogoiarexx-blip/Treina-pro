"""Gera vetores animados autorais para cada exercicio a partir das duas poses do desenho original.
Cada junta e segmento e interpolado entre pontos-chave; e uma demonstracao esquematica,
nao uma reconstrucao biomecanica 3D nem um video filmado.
"""
from pathlib import Path
from xml.etree import ElementTree as ET
import importlib.util, html
ROOT=Path(__file__).parent
spec=importlib.util.spec_from_file_location('treina_draw', ROOT/'make_illustrations.py')
art=importlib.util.module_from_spec(spec)
spec.loader.exec_module(art)
svgns='http://www.w3.org/2000/svg'
attrnames=('x1','y1','x2','y2','cx','cy','r')
outdirs={k:ROOT/'assets'/k for k in ['motion','motion-slow','still']}
for p in outdirs.values():p.mkdir(exist_ok=True,parents=True)
count=0
for id,name,muscle,variant in art.ids:
    portraits=[]
    for phase in (0,1):
        raw=(art.horizontal(muscle,variant,phase) if variant in ('bench','fly','row','legpress','extension','curlleg','hip') else art.portrait(phase,muscle,variant))
        portraits.append(list(ET.fromstring(f'<root>{raw}</root>')))
    a,b=portraits
    assert len(a)==len(b),(id,len(a),len(b))
    for ix,(p,q) in enumerate(zip(a,b)):
        assert p.tag==q.tag,(id,ix,p.tag,q.tag)
    for mode in ('motion','motion-slow','still'):
        duration=4.8 if mode=='motion' else 7.2
        objs=[]
        for p,q in zip(a,b):
            x=ET.fromstring(ET.tostring(p,encoding='unicode'))
            if mode!='still':
                for key in attrnames:
                    aa=p.attrib.get(key);bb=q.attrib.get(key)
                    if aa is None or bb is None or aa==bb:continue
                    an=ET.SubElement(x,'animate',{'attributeName':key,'values':f'{aa};{aa};{bb};{bb};{aa};{aa}',
                      'keyTimes':'0;0.12;0.42;0.57;0.88;1', 'dur':f'{duration}s','repeatCount':'indefinite','calcMode':'linear'})
            objs.append(ET.tostring(x,encoding='unicode',short_empty_elements=True))
        title=html.escape(name)
        label=html.escape(name.upper()[:28])
        graphic=''.join(objs)
        note='MOVIMENTO ILUSTRATIVO • NÃO É CORREÇÃO DE POSTURA'
        content=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 430" role="img" aria-labelledby="title desc">
<title id="title">{title} • demonstração ilustrada</title><desc id="desc">Silhueta articulada que transita entre a postura inicial e principal do exercício. Esquema simplificado; consulte as instruções.</desc>
<defs><radialGradient id="bg"><stop stop-color="#214442"/><stop offset="1" stop-color="#10202a"/></radialGradient><pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" stroke="#729290" stroke-opacity=".095" fill="none"/></pattern></defs>
<rect width="520" height="430" rx="24" fill="url(#bg)"/><rect width="520" height="430" rx="24" fill="url(#grid)"/>
<circle cx="260" cy="195" r="172" fill="none" stroke="#c6f65b" opacity=".11" stroke-width="2"/><circle cx="260" cy="195" r="126" fill="none" stroke="#c6f65b" opacity=".13" stroke-width="1.5"/>
<rect x="18" y="15" rx="12" width="114" height="27" fill="#29483c"/><text x="75" y="33" fill="#d8f6b6" text-anchor="middle" font-size="12" font-weight="bold" font-family="sans-serif">TREINAPRO</text>
<rect x="375" y="15" rx="12" width="125" height="27" fill="#29483c"/><text x="437" y="33" fill="#d8f6b6" text-anchor="middle" font-size="11" font-weight="bold" font-family="sans-serif">{'PAUSADO' if mode=='still' else 'GUIA ANIMADO'}</text>
<g transform="translate(61 15) scale(1.52 1.10)">{graphic}</g>
<rect x="0" y="358" width="520" height="72" fill="#0d1d25"/><text x="22" y="381" fill="#d2f5ad" font-size="14" font-family="sans-serif" font-weight="bold">{label}</text><text x="22" y="405" fill="#94b9ad" font-size="10" font-family="sans-serif">{note}</text>
</svg>'''
        # generated from only supported SVG primitives; empty tags and namespaces remain safe
        ET.fromstring(content)
        (outdirs[mode]/f'{id}.svg').write_text(content,encoding='utf8')
    count+=1
print(f'Gerados: {count} exercicios x 3 modos = {3*count} arquivos SVG.')
