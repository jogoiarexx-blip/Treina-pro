/* TreinaPro REV4: cache resiliente, sem travar o primeiro uso para baixar todas as ilustrações. */
const VERSION='treinapro-v2.0-rev4';
const SHELL=[ './', './index.html','./style.css','./pwa.css','./data.js','./storage.js','./app.js','./coach.js','./pwa.js','./manifest.webmanifest','./assets/icon-192.png','./assets/icon-512.png','./assets/favicon.svg'];
const IDS=['supino','supino_inclinado','crucifixo','elevacao_lateral','triceps_polia','triceps_frances','puxada_alta','remada_baixa','remada_unilateral','face_pull','rosca_direta','rosca_martelo','agachamento','leg_press','extensora','afundo','romeno','flexora','panturrilha','prancha','hip_thrust','abdutora','bulgaro','desenvolvimento','supino_maquina','agachamento_goblet','step_up','abdominal','coice_polia'];
const THUMBNAILS=IDS.map(id=>`./assets/exercises/${id}.svg`);
const FULL_DEMOS=IDS.flatMap(id=>[
 `./assets/motion/${id}.svg`,`./assets/motion-slow/${id}.svg`,`./assets/still/${id}.svg`,
 `./assets/frames/start/${id}.svg`,`./assets/frames/finish/${id}.svg`
]);
const scope=new URL(self.registration.scope);
const normalized=path=>new URL(path,scope).href;
const scoped=url=>{const u=new URL(url);return u.origin===scope.origin&&u.pathname.startsWith(scope.pathname);};
const isSuccess=response=>response&&response.ok&&response.type!=='opaque';
const cachedFirst=async request=>{const cache=await caches.open(VERSION);const found=await cache.match(request);if(found)return found;try{const response=await fetch(request);if(isSuccess(response))await cache.put(request,response.clone());return response;}catch{if(request.mode==='navigate')return cache.match(normalized('./index.html'));throw Error('Recurso indisponível offline');}};
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
   // Só o núcleo é obrigatório: uma animação com problema não impede instalar o app.
   const cache=await caches.open(VERSION);
   await cache.addAll(SHELL);
   // Na migração do SW antigo, permitir a ativação na próxima visita sem intervenção.
   // A página em uso não é recarregada automaticamente.
   const previous=(await caches.keys()).filter(name=>name.startsWith('treinapro-')&&name!==VERSION);
   if(previous.length)await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{
 const keys=(await caches.keys()).filter(k=>k.startsWith('treinapro-')&&k!==VERSION);
 if(keys.length){
   // Preservar todas as demonstrações que o usuário baixou nas versões anteriores.
   const current=await caches.open(VERSION),older=await Promise.all(keys.map(k=>caches.open(k)));
   const paths=[...THUMBNAILS,...FULL_DEMOS];let index=0;
   async function migrate(){while(index<paths.length){const path=paths[index++],url=normalized(path);
      try{if(await current.match(url))continue;
        for(const cache of older){const old=await cache.match(url);if(old&&isSuccess(old)){await current.put(url,old.clone());break;}}
      }catch{/* Falha em imagem opcional não impede ativação. */}
   }}
   await Promise.all(Array.from({length:6},migrate));
 }
 await Promise.all(keys.map(k=>caches.delete(k)));
 await self.clients.claim();
 })());});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||!scoped(request.url))return;
 if(request.mode==='navigate'){
   event.respondWith((async()=>{
     const cache=await caches.open(VERSION);
     // A navegação usa o HTML desta revisão e continua disponível sem rede.
     const saved=await cache.match(normalized('./index.html'));
     if(saved)return saved;
     try{return await fetch(request);}catch{return Response.error();}
   })());return;
 }
 // CSS, JS, SVG e manifest: cache primeiro. O SW novo renova o núcleo na instalação.
 event.respondWith(cachedFirst(request));
});
async function prepareOffline(port){
 const cache=await caches.open(VERSION);let done=0,failed=0;
 const files=[...THUMBNAILS,...FULL_DEMOS];const total=files.length;
 let index=0;
 async function worker(){while(index<files.length){const path=files[index++],url=normalized(path);
   try{
     const existing=await cache.match(url);
     if(!existing){
       // Podem existir imagens já baixadas pelas versões anteriores.
       const old=await caches.match(url);
       if(old&&isSuccess(old))await cache.put(url,old.clone());
       else{const response=await fetch(url);if(!isSuccess(response))throw Error('Falha HTTP');await cache.put(url,response.clone());}
     }
   }catch{failed++}finally{done++;if(done===total||done%12===0)port.postMessage({type:'PROGRESS',done,total,failed});}
 }}
 await Promise.all(Array.from({length:4},worker));
 port.postMessage({type:'DONE',done,total,failed});
}
self.addEventListener('message',event=>{
 if(event.data?.type==='ACTIVATE_UPDATE'){event.waitUntil(self.skipWaiting());return;}
 if(event.data?.type==='PREPARE_OFFLINE'&&event.ports?.[0]){
   const port=event.ports[0];event.waitUntil(prepareOffline(port).catch(error=>port.postMessage({type:'ERROR',error:String(error)})));
 }
});
