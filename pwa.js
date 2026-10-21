/* REV4 - instalar e preparar offline sem adicionar novas abas. */
(()=>{'use strict';
 let deferred=null, registration=null, busy=false, statusText='', available=false;
 const isFile=location.protocol==='file:';
 const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const standalone=()=>window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;
 const getRoot=()=>document.getElementById('pageContent');
 const safeText=el=>el?.textContent?.trim()||'';
 const info=()=>{
   if(isFile)return 'Arquivo portátil: já funciona sem internet, mas não pode ser instalado por aqui. Para instalar, abra o site publicado.';
   if(standalone())return 'O TreinaPro já está instalado neste dispositivo.';
   if(isIOS)return 'iPhone/iPad: no Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”.';
   if(deferred)return 'Instale o TreinaPro como aplicativo, diretamente pelo navegador.';
   return 'No navegador, abra o menu e procure “Instalar aplicativo” ou “Adicionar à tela inicial”.';
 };
 function getPanel(){return document.getElementById('installPanel');}
 function renderPanel(){
   const panel=getPanel();if(!panel)return;
   const install=panel.querySelector('[data-pwa="install"]');
   const offline=panel.querySelector('[data-pwa="offline"]');
   const update=panel.querySelector('[data-pwa="update"]');
   const message=panel.querySelector('#installInstructions');
   const status=panel.querySelector('#offlineStatus');
   if(message)message.textContent=info();
   if(install)install.hidden=!deferred||standalone()||isFile;
   if(offline){offline.hidden=isFile||!('serviceWorker'in navigator);offline.disabled=busy;offline.textContent=busy?'Preparando…':'Salvar exercícios para uso offline';}
   if(update)update.hidden=!registration?.waiting;
   if(status)status.textContent=statusText||(isFile?'Recursos incluídos no arquivo portátil.':available?'Recursos básicos disponíveis offline. Salve as demonstrações para treinar sem internet.':'Conecte-se uma vez para instalar os arquivos essenciais.');
 }
 function mountPanel(){
   const root=getRoot();if(!root||root.querySelector('#installPanel'))return;
   const headings=[...root.querySelectorAll('.section-head')];
   const target=headings.find(el=>safeText(el.querySelector('h2'))==='Dados e privacidade');
   if(!target)return;
   const panel=document.createElement('section');panel.id='installPanel';panel.className='install-panel';panel.setAttribute('aria-labelledby','installTitle');
   panel.innerHTML=`<div class="install-head"><span class="install-symbol" aria-hidden="true">⇩</span><div><h2 id="installTitle">Instalar e usar offline</h2><p id="installInstructions"></p></div></div><div class="install-buttons"><button type="button" class="btn btn-primary" data-pwa="install" hidden>Instalar no celular</button><button type="button" class="btn btn-dark" data-pwa="offline">Salvar exercícios para uso offline</button><button type="button" class="btn btn-dark" data-pwa="update" hidden>Atualizar aplicativo</button></div><p id="offlineStatus" class="install-status" role="status" aria-live="polite"></p>`;
   target.before(panel);renderPanel();
 }
 function setStatus(message){statusText=message;renderPanel();}
 function communicate(type,params={}){
   return new Promise(async(resolve,reject)=>{
     try{
       if(!('serviceWorker'in navigator))throw Error('Modo offline não disponível neste navegador.');
       const reg=registration||await navigator.serviceWorker.ready;
       const worker=reg.active||navigator.serviceWorker.controller;
       if(!worker)throw Error('O aplicativo ainda está preparando o modo offline. Atualize a página e tente novamente.');
       const ch=new MessageChannel();let ended=false;
       ch.port1.onmessage=event=>{
         const data=event.data||{};
         if(data.type==='PROGRESS'){setStatus(`Salvando demonstrações: ${data.done}/${data.total}${data.failed?` · ${data.failed} falharam`:''}`);return;}
         if(data.type==='DONE'||data.type==='STATUS'){ended=true;ch.port1.close();resolve(data);return;}
         if(data.type==='ERROR'){ended=true;ch.port1.close();reject(Error(data.error||'Falha ao preparar os arquivos.'));}
       };
       worker.postMessage({type,...params},[ch.port2]);
     }catch(e){reject(e);}
   });
 }
 async function prepareOffline(){if(busy)return;busy=true;setStatus('Preparando imagens e animações para treinar offline…');
   try{const result=await communicate('PREPARE_OFFLINE');
     setStatus(result.failed?`Salvos ${result.done} de ${result.total} arquivos. Verifique a conexão e tente novamente.`:`Pronto! ${result.total} demonstrações guardadas para funcionar offline.`);
   }catch(e){setStatus(e.message||'Não foi possível salvar todos os exercícios.');}
   finally{busy=false;renderPanel();}
 }
 async function install(){
   if(!deferred)return;
   const prompt=deferred;deferred=null;
   try{await prompt.prompt();await prompt.userChoice;}catch(e){setStatus('Instalação não disponível neste momento. Use o menu do navegador.');}
   renderPanel();
 }
 function updateApp(){
   if(registration?.waiting){window.dispatchEvent(new Event('treinapro-update-requested'));registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});setStatus('Aplicando atualização…');}
 }
 document.addEventListener('click',e=>{
   const target=e.target.closest('[data-pwa]');if(!target)return;
   if(target.dataset.pwa==='install')install();
   if(target.dataset.pwa==='offline')prepareOffline();
   if(target.dataset.pwa==='update')updateApp();
 });
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;renderPanel();});
 window.addEventListener('appinstalled',()=>{deferred=null;setStatus('TreinaPro instalado com sucesso.');});
 if('serviceWorker'in navigator&&!isFile){
   let requestedUpdate=false;window.addEventListener('treinapro-update-requested',()=>{requestedUpdate=true;});navigator.serviceWorker.addEventListener('controllerchange',()=>{if(requestedUpdate&&!window.__treinaReloadedForUpdate){window.__treinaReloadedForUpdate=true;location.reload();}});
   navigator.serviceWorker.ready.then(reg=>{registration=reg;available=!!reg.active;renderPanel();
     reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller){setStatus('Uma atualização está pronta. Toque em “Atualizar aplicativo” nas configurações.');renderPanel();}});});
   }).catch(()=>{setStatus('Não foi possível ativar o offline nesta visita.');});
 }
 const root=getRoot();if(root){const observer=new MutationObserver(mountPanel);observer.observe(root,{childList:true});mountPanel();}
})();
