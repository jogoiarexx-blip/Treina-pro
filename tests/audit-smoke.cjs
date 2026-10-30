'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));
const scripts=['data.js','storage.js','app.js','coach.js','pwa.js','sw.js'];
for(const f of scripts){new vm.Script(read(f),{filename:f});}
const sandbox={window:{}};
vm.runInNewContext(read('data.js'),sandbox,{filename:'data.js'});
const data=sandbox.window.TREINO_DATA;
assert.ok(data&&Array.isArray(data.exercises),'O catálogo não carregou');
assert.equal(data.exercises.length,29,'A biblioteca precisa manter os 29 exercícios');
assert.equal(new Set(data.exercises.map(e=>e.id)).size,29,'IDs duplicados no catálogo');
for(const ex of data.exercises){
  assert.ok(ex.id&&ex.name&&ex.muscle&&ex.equip,'Metadados incompletos: '+ex.id);
  assert.equal(ex.steps.length,3,'Orientação em 3 etapas: '+ex.id);
  for(const folder of ['assets/exercises','assets/motion','assets/motion-slow','assets/still','assets/frames/start','assets/frames/finish']){
    const file=`${folder}/${ex.id}.svg`;
    assert.ok(exists(file),'Ilustração ausente: '+file);
    const source=read(file);
    assert.match(source,/<svg\b/i,'Formato SVG inválido: '+file);
  }
  for(const folder of ['assets/webp/exercises','assets/webp/still','assets/webp/frames/start','assets/webp/frames/finish']){
    const file=`${folder}/${ex.id}.webp`;
    assert.ok(exists(file),'Imagem WebP ausente: '+file);
    const binary=fs.readFileSync(path.join(root,file));
    assert.equal(binary.subarray(0,4).toString('ascii'),'RIFF',file);
    assert.equal(binary.subarray(8,12).toString('ascii'),'WEBP',file);
  }
}
for(const [pid,plan] of Object.entries(data.plans)){
 assert.ok(plan.days.length>=3,'Plano inválido '+pid);
 for(const day of plan.days)for(const id of day.ex)assert.ok(data.exercises.some(e=>e.id===id),'Exercício ausente no plano '+pid+': '+id);
}
const app=read('app.js'),sw=read('sw.js'),html=read('index.html'),pwa=read('pwa.js');
for(const fragment of ['treinapro-personal-v1','hasPendingWorkout','confirmChangeWorkout','restoreFromDatabase','modalReturnSelector','progress-window','[7,30,90]','importData','exportData','jump-to-sets']){
 assert.ok(app.includes(fragment),'Regressão funcional: '+fragment);
}
assert.ok(sw.includes("const VERSION='treinapro-v2.8-audit1'"));
assert.ok(sw.includes("OFFLINE_STATUS")&&sw.includes("PREPARE_OFFLINE"));
assert.ok(pwa.includes("offlineCoverage")&&pwa.includes("refreshOfflineCoverage"));
for(const file of ['assets/treinapro-icon.svg','assets/treinapro-logo.svg','assets/icon-192.png','assets/icon-512.png'])assert.ok(exists(file),'Marca ausente: '+file);
assert.ok(html.includes('manifest.webmanifest')&&html.includes('treinapro-icon.svg'));
const manifest=JSON.parse(read('manifest.webmanifest'));
assert.equal(manifest.short_name,'TreinaPro');
console.log('OK: scripts sintaticamente válidos, 29 exercícios, 290 assets visuais, planos, histórico, acessibilidade e PWA.');
