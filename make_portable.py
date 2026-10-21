from pathlib import Path
import base64, json
R=Path(__file__).parent
html=(R/'index.html').read_text('utf8')
css=(R/'style.css').read_text('utf8').replace("@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800;900&display=swap');",'')
data=(R/'data.js').read_text('utf8')
app=(R/'app.js').read_text('utf8')
coach=(R/'coach.js').read_text('utf8')
images={d:{f.stem:'data:image/svg+xml;base64,'+base64.b64encode(f.read_bytes()).decode() for f in (R/'assets'/d).glob('*.svg')} for d in ('exercises','motion','motion-slow','still','frames/start','frames/finish')}
orig='const imageFor=(id)=>`assets/exercises/${encodeURIComponent(id)}.svg`;'
assert orig in app
app=app.replace(orig,f'const PORTABLE_IMAGES={json.dumps(images,separators=(',',':'))}; const imageFor=(id)=>PORTABLE_IMAGES.exercises[id];')
orig_demo="const demoFor=(id,mode='motion')=>`assets/${['motion','motion-slow','still'].includes(mode)?mode:'motion'}/${encodeURIComponent(id)}.svg`;"
assert orig_demo in app
app=app.replace(orig_demo,"const demoFor=(id,mode='motion')=>PORTABLE_IMAGES[['motion','motion-slow','still'].includes(mode)?mode:'motion'][id];")
orig_frame="const frameFor=(id,phase)=>`assets/frames/${phase==='finish'?'finish':'start'}/${encodeURIComponent(id)}.svg`;"
assert orig_frame in app
app=app.replace(orig_frame,"const frameFor=(id,phase)=>PORTABLE_IMAGES[phase==='finish'?'frames/finish':'frames/start'][id];")
html=html.replace('<link rel="icon" href="assets/favicon.svg" type="image/svg+xml"><link rel="manifest" href="manifest.webmanifest">','')
html=html.replace('<link rel="stylesheet" href="style.css">',f'<style>{css}</style>')
html=html.replace('<script src="data.js"></script><script src="app.js"></script><script src="coach.js"></script>',f'<script>{data}</script><script>{app}</script><script>{coach}</script>')
html=html.replace('TreinaPro — Seu personal digital','TreinaPro — Portátil (arquivo único)')
out=R.parent/'TreinaPro-v1.9.1-SEM-3D-PORTATIL.html'
out.write_text(html,'utf8')
print('Portable',out, 'bytes',out.stat().st_size)
