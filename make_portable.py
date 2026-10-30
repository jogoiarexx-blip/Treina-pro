from pathlib import Path
import base64, json
R=Path(__file__).resolve().parent
html=(R/'index.html').read_text('utf8')
css=(R/'style.css').read_text('utf8')+'\n'+(R/'pwa.css').read_text('utf8')
data=(R/'data.js').read_text('utf8')
app=(R/'app.js').read_text('utf8')
storage=(R/'storage.js').read_text('utf8')
coach=(R/'coach.js').read_text('utf8')
pwa=(R/'pwa.js').read_text('utf8')
tick=chr(96)

def uri(file):
    mime='image/webp' if file.suffix.lower()=='.webp' else 'image/svg+xml'
    return 'data:'+mime+';base64,'+base64.b64encode(file.read_bytes()).decode('ascii')

images={}
for group in ('exercises','still','frames/start','frames/finish','motion','motion-slow'):
    folder=R/'assets'/('webp/'+group if group not in ('motion','motion-slow') else group)
    original=R/'assets'/group
    ids={p.stem for p in original.glob('*.svg')}
    if len(ids)!=29:raise RuntimeError('Missing SVG assets in '+group)
    images[group]={}
    for id in ids:
        preferred=folder/(id+('.svg' if group in ('motion','motion-slow') else '.webp'))
        file=preferred if preferred.exists() else original/(id+'.svg')
        images[group][id]=uri(file)

old='const imageFor=(id)=>'+tick+'assets/webp/exercises/${encodeURIComponent(id)}.webp'+tick+';'
assert old in app
app=app.replace(old,'const PORTABLE_IMAGES='+json.dumps(images,separators=(',',':'))+'; const imageFor=(id)=>PORTABLE_IMAGES.exercises[id];')
old="const demoFor=(id,mode='motion')=>mode==='still'?"+tick+"assets/webp/still/${encodeURIComponent(id)}.webp"+tick+":"+tick+"assets/${['motion','motion-slow'].includes(mode)?mode:'motion'}/${encodeURIComponent(id)}.svg"+tick+";"
assert old in app
app=app.replace(old,"const demoFor=(id,mode='motion')=>PORTABLE_IMAGES[['motion','motion-slow','still'].includes(mode)?mode:'motion'][id];")
old="const frameFor=(id,phase)=>"+tick+"assets/webp/frames/${phase==='finish'?'finish':'start'}/${encodeURIComponent(id)}.webp"+tick+";"
assert old in app
app=app.replace(old,"const frameFor=(id,phase)=>PORTABLE_IMAGES[phase==='finish'?'frames/finish':'frames/start'][id];")

for name in ('brand','hero-workout','empty-history','library','offline'):
    file=R/'assets'/'webp'/'ui'/(name+'.webp')
    if file.exists():
        original='assets/webp/ui/'+name+'.webp'
        target=uri(file)
        html=html.replace(original,target)
        app=app.replace(original,target)
        pwa=pwa.replace(original,target)

# Embed the original featured WebP drawings in the single-file edition.
for name in ('supino_maquina','leg_press','desenvolvimento','face_pull'):
    preferred=R/'assets'/'featured'/(name+'.webp')
    fallback=R/'assets'/'featured'/'svg'/(name+'.svg')
    if not preferred.exists() and not fallback.exists():
        raise RuntimeError('Original featured art missing: '+name)
    url=uri(preferred if preferred.exists() else fallback)
    target='assets/featured/'+name+'.webp'
    app=app.replace(target,url)
    html=html.replace(target,url)


html=html.replace('<link rel="icon" href="assets/favicon.svg" type="image/svg+xml"><link rel="manifest" href="manifest.webmanifest">','')
html=html.replace('<link rel="stylesheet" href="style.css"><link rel="stylesheet" href="pwa.css">','<style>'+css+'</style>')
scripts='<script src="data.js"></script><script src="storage.js"></script><script src="app.js"></script><script src="coach.js"></script><script src="pwa.js"></script>'
assert scripts in html
html=html.replace(scripts,'<script>'+data+'</script><script>'+storage+'</script><script>'+app+'</script><script>'+coach+'</script><script>'+pwa+'</script>')
html=html.replace('TreinaPro — Seu personal digital','TreinaPro — Portátil (arquivo único)')
out=R.parent/'TreinaPro-v2.5-REV13-PORTATIL.html'
out.write_text(html,'utf8')
print('Portable written',out,'bytes',out.stat().st_size)
