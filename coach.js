/* TreinaPro v1.3 — orientação por etapas e áudio sob demanda.
 * O guia fala apenas após clique; não detecta nem avalia postura.
 */
(()=>{'use strict';
 let active=null,step=0,sequenceToken=0;
 const root=()=>document.querySelector('.coach-panel[data-coach-id]');
 const exercise=()=>window.TREINO_DATA.exercises.find(x=>x.id===root()?.dataset.coachId);
 const $=id=>document.getElementById(id);
 const haltSpeech=()=>{sequenceToken++;if('speechSynthesis' in window)try{speechSynthesis.cancel()}catch{}};
 function showStep(n){const ex=exercise(),r=root();if(!ex||!r)return;step=((n%ex.steps.length)+ex.steps.length)%ex.steps.length;const text=$('coachStepText'),meta=$('coachStepNum');if(text)text.textContent=ex.steps[step];if(meta)meta.textContent=`PASSO ${step+1} DE ${ex.steps.length}`;r.querySelectorAll('[data-coach="goto"]').forEach((b,i)=>{b.classList.toggle('active',i===step);b.setAttribute('aria-pressed',String(i===step));});}
 function status(msg){const el=$('coachStatus');if(el)el.textContent=msg;}
 function speakStep(index,token,continuous){if(token!==sequenceToken||!root())return;const ex=exercise();if(!ex)return;if(index>=ex.steps.length){status('Guia concluído. Faça as repetições no seu ritmo e sem dor.');return;}
  showStep(index);if(!('speechSynthesis'in window)||!('SpeechSynthesisUtterance'in window)){status('Seu navegador não oferece síntese de voz. Leia o passo exibido.');return;}
  const utter=new SpeechSynthesisUtterance(`Passo ${index+1}. ${ex.steps[index]}`);utter.lang='pt-BR';utter.rate=.88;utter.volume=1;
  const voices=speechSynthesis.getVoices?.()||[];const preferred=voices.find(v=>v.lang?.toLowerCase()==='pt-br')||voices.find(v=>v.lang?.toLowerCase().startsWith('pt'));if(preferred)utter.voice=preferred;
  utter.onend=()=>{if(token!==sequenceToken)return;if(continuous)speakStep(index+1,token,true);else status('Passo reproduzido. Continue quando estiver pronto(a).');};
  utter.onerror=()=>{if(token===sequenceToken)status('A voz não pôde ser reproduzida. Siga o texto na tela.');};
  try{speechSynthesis.speak(utter);status(continuous?`Guia em áudio — passo ${index+1} de ${ex.steps.length}.`:`Ouvindo o passo ${index+1}.`);}catch{status('Não foi possível iniciar a voz. Siga o texto na tela.');}
 }
 document.addEventListener('click',event=>{
   const button=event.target.closest('[data-coach]');if(!button)return;
   const action=button.dataset.coach;
   if(!root())return;
   haltSpeech();
   if(action==='next'){showStep(step+1);status('Selecione “Ouvir passo” para reproduzir a instrução.');}
   else if(action==='previous'){showStep(step-1);status('Passo anterior selecionado.');}
   else if(action==='goto'){showStep(Number(button.dataset.i)||0);status('Passo selecionado.');}
   else if(action==='read'){speakStep(step,sequenceToken,false);}
   else if(action==='all'){speakStep(0,sequenceToken,true);}
   else if(action==='stop'){status('Narração interrompida.');}
 });
 // New modal always begins with the first step when exercise ID changes.
 const observer=new MutationObserver(()=>{
  const id=root()?.dataset.coachId||null;
  if(id!==active){active=id;step=0;haltSpeech();}
 });
 observer.observe(document.getElementById('modalRoot'),{childList:true,subtree:false});
 window.TreinaProCoach={stop:haltSpeech};
})();
