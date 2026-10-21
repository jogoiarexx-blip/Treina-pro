/* TreinaPro REV4 — núcleo leve, cache offline opt-in, atualizações seguras. */
const VERSION='treinapro-v2.0-rev4';
const SHELL=['./','./index.html','./style.css','./pwa.css','./data.js','./storage.js','./app.js','./coach.js','./pwa.js','./manifest.webmanifest','./assets/icon-192.png','./assets/icon-512.png','./assets/favicon.svg'];
const IDS=["supino","supino_inclinado","crucifixo","elevacao_lateral","triceps_polia","triceps_frances","puxada_alta","remada_baixa","remada_unilateral","face_pull","rosca_direta","rosca_martelo","agachamento","leg_press","extensora","afundo","romeno","flexora","panturrilha","prancha","hip_thrust","abdutora","bulgaro","desenvolvimento","supino_maquina","agachamento_goblet","step_up","abdominal","coice_polia"];
const THUMBNAILS=IDS.map(id=>'./assets/exercises/'+id+'.svg');
const FULL_DEMOS=IDS.flatMap(id=>['./assets/motion/'+id+'.svg','./assets/motion-slow/'+id+'.svg','./assets/still/'+id+'.svg','./assets/frames/start/'+id+'.svg','./assets/frames/finish/'+id+'.svg']);
const scope=new URL(self.registration.scope);
const normalized=path=>new URL(path,scope).href;
const scoped=url=>{const u=new URL(url);return u.origin===scope.origin&&u.pathname.startsWith(scope.pathname);};
const isSuccess=response=>response&&response.ok&&response.type!=='opaque';
const cachedFirst=async request=>{const cache=await caches.open(VERSION);const hit=await cache.match(request);if(hit)return hit;const response=await fetch(request);if(isSuccess(response))await cache.put(request,response.clone());return response;};
self.addEventListener('install',event=>{event.waitUntil((async()=>{const cache=await caches.open(VERSION);await cache.addAll(SHELL);const previous=(await caches.keys()).filter(k=>k.startsWith('treinapro-')&&k!==VERSION);if(previous.length)await self.skipWaiting();})());});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{
const keys=(await caches.keys()).filter(k=>k.startsWith('treinapro-')&&k!==VERSION);
if(keys.length){const target=await caches.open(VERSION),older=await Promise.all(keys.map(k=>caches.open(k)));const paths=[...THUMBNAILS,...FULL_DEMOS];let i=0;
async function migrate(){while(i<paths.length){const url=normalized(paths[i++]);try{if(await target.match(url))continue;for(const oldCache of older){const old=await oldCache.match(url);if(old&&isSuccess(old)){await target.put(url,old.clone());break;}}}catch{}}}
await Promise.all(Array.from({length:6},migrate));}
await Promise.all(keys.map(k=>caches.delete(k)));await self.clients.claim();
})());});
self.addEventListener('fetch',event=>{const request=event.request;
if(request.method!=='GET'||!scoped(request.url))return;
if(request.mode==='navigate'){event.respondWith((async()=>{const cache=await caches.open(VERSION),page=await cache.match(normalized('./index.html'));if(page)return page;try{return await fetch(request);}catch{return Response.error();}})());return;}
event.respondWith(cachedFirst(request));});
async function prepareOffline(port){const cache=await caches.open(VERSION),files=[...THUMBNAILS,...FULL_DEMOS];let i=0,done=0,failed=0;const total=files.length;
async function worker(){while(i<files.length){const url=normalized(files[i++]);try{if(!await cache.match(url)){const old=await caches.match(url);if(old&&isSuccess(old))await cache.put(url,old.clone());else{const response=await fetch(url);if(!isSuccess(response))throw Error('HTTP');await cache.put(url,response.clone());}}}catch{failed++;}finally{done++;if(done===total||done%12===0)port.postMessage({type:'PROGRESS',done,total,failed});}}}
await Promise.all(Array.from({length:4},worker));port.postMessage({type:'DONE',done,total,failed});}
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE'){event.waitUntil(self.skipWaiting());return;}
if(event.data?.type==='PREPARE_OFFLINE'&&event.ports?.[0]){const port=event.ports[0];event.waitUntil(prepareOffline(port).catch(err=>port.postMessage({type:'ERROR',error:String(err)})));}});
