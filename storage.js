/* Espelho local TreinaPro IndexedDB: transações serializadas, sem dependências. */
(()=>{'use strict';
const NAME='treinapro-dados',STORE='profiles',KEY='current';let openPromise=null,chain=Promise.resolve();
function open(){if(openPromise)return openPromise;openPromise=new Promise((resolve,reject)=>{
 if(!('indexedDB'in window)){reject(Error('IndexedDB indisponível'));return;}
 const req=indexedDB.open(NAME,1);
 req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);};
 req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('IndexedDB falhou'));req.onblocked=()=>reject(Error('Banco bloqueado'));
}).catch(err=>{openPromise=null;throw err});return openPromise;}
async function load(){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const req=tx.objectStore(STORE).get(KEY);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);});}
function persist(record){const copy=JSON.parse(JSON.stringify(record));chain=chain.catch(()=>{}).then(async()=>{const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(copy,KEY);tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error||Error('Falha ao salvar'));tx.onabort=()=>reject(tx.error||Error('Gravação cancelada'));});});return chain;}
window.TreinaProStore={load,persist};
})();