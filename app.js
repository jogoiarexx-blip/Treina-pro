(() => {
 'use strict';
 const DATA = window.TREINO_DATA;
 const exById = Object.fromEntries(DATA.exercises.map(ex=>[ex.id,ex]));
 const LS = 'treinapro-personal-v1';
 // Manter a mesma chave para preservar o histórico das versões 1.0–1.3.
 const defaults = () => ({ plan:'abc',level:'iniciante',goal:'hipertrofia',photo:'',name:'',next:{abc:0,quad:0},selected:{abc:0,quad:0},sessions:{},history:[],customWorkouts:{},workoutTargets:{},settings:{speech:true}});
 let state;
 try {state={...defaults(),...JSON.parse(localStorage.getItem(LS) || '{}')};} catch { state=defaults(); }
 if(!DATA.plans[state.plan]) state.plan='abc';
 if(!['iniciante','intermediario','avancado'].includes(state.level)) state.level='iniciante';
 if(!['hipertrofia','emagrecimento','condicionamento'].includes(state.goal)) state.goal='hipertrofia';
 if(typeof state.photo!=='string'||!/^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(state.photo)||state.photo.length>220000)state.photo='';
 if(!Array.isArray(state.history)) state.history=[];
 if(!state.sessions || typeof state.sessions!=='object') state.sessions={};
 if(!state.customWorkouts||typeof state.customWorkouts!=='object'||Array.isArray(state.customWorkouts))state.customWorkouts={};
 if(!state.workoutTargets||typeof state.workoutTargets!=='object'||Array.isArray(state.workoutTargets))state.workoutTargets={};
 if(!state.next || typeof state.next!=='object') state.next={abc:0,quad:0};
 if(!state.selected || typeof state.selected!=='object') state.selected={abc:0,quad:0};
 // Perfis existentes com nome preenchido migram sem interromper os treinos.
 // Um perfil sem nome vê as perguntas iniciais, mantendo séries e histórico.
 const needsWelcome = () => !(state.profileComplete === true || (typeof state.name==='string' && state.name.trim().length >= 2));
 let draftWelcomePhoto=state.photo||'', page='inicio', search='', muscle='todos', equipment='todos', activeModal=null, restTimer=null, toastTimer=null, progressExercise='agachamento', progressWindow=30, modalReturnElement=null, modalReturnSelector='', swapOrigin=null, planEditorMode='', planEditorTarget=null;
 const $ = id => document.getElementById(id);
 const safe = s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 const localDateKey=(d)=>{const dt=d instanceof Date?d:new Date(d);return Number.isFinite(dt.getTime())?`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`:'';};
 const GOALS={
  hipertrofia:{icon:'💪',name:'Hipertrofia',description:'Fortalecer e desenvolver músculos',tip:'Priorize execução controlada e evolução gradual de cargas; mais peso não é obrigatório a cada treino.'},
  emagrecimento:{icon:'🔥',name:'Emagrecimento',description:'Musculação + movimento e hábitos sustentáveis',tip:'A musculação ajuda a preservar força; resultados de peso dependem de vários fatores. Inclua caminhadas se estiver confortável.'},
  condicionamento:{icon:'⚡',name:'Condicionamento',description:'Resistência, técnica e regularidade',tip:'Comece numa intensidade em que consiga executar bem e recupere a respiração antes da série seguinte.'}
 };
 const goalInfo=()=>GOALS[state.goal]||GOALS.hipertrofia;
 function avatarMarkup(size='md'){
  if(state.photo)return `<img class="profile-avatar profile-avatar-${size}" src="${safe(state.photo)}" alt="Foto de perfil de ${safe(state.name||'usuário')}"/>`;
  const initials=String(state.name||'Você').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toLocaleUpperCase('pt-BR');
  return `<span class="profile-avatar profile-avatar-${size} profile-avatar-fallback" aria-label="Avatar com as iniciais de ${safe(state.name||'Você')}">${safe(initials)}</span>`;
 }
 function repsFor(ex){
  const override=exerciseTarget(ex);
  if(override?.reps)return override.reps;
  if(/\/|\bs\b|seg|lado/i.test(ex.reps))return ex.reps;
  if(state.goal==='condicionamento')return '12–15';
  if(state.goal==='emagrecimento')return '10–15';
  return ex.reps;
 }
 function restFor(ex){
  // Reduções mínimas: movimentos exigentes mantêm tempo suficiente para segurança.
  if(state.goal==='condicionamento'&&!['squat','hinge','legpress','bench'].includes(ex.type))return Math.max(60,ex.rest-15);
  return ex.rest;
 }
 function goalsMarkup(prefix){return Object.entries(GOALS).map(([key,g])=>`<label class="goal-option"><input type="radio" name="${prefix}" value="${key}" ${state.goal===key?'checked':''}><span class="goal-option-body"><span class="goal-emoji">${g.icon}</span><strong>${g.name}</strong><small>${g.description}</small></span></label>`).join('');}
 function profilePanel(){const g=goalInfo();return `<div class="profile-summary"><div class="profile-summary-head">${avatarMarkup('md')}<div><small>SEU PERFIL</small><strong>${safe(state.name||'Atleta')}</strong><span>${safe(g.name)} · ${safe(({iniciante:'Iniciante',intermediario:'Intermediário',avancado:'Avançado'})[state.level])}</span></div></div><p>${safe(g.tip)}</p><button class="text-button" data-page="ajustes">Editar meu perfil →</button></div>`;}
 async function compressProfilePhoto(file){
   if(!file)return null;
   if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw Error('Escolha foto JPG, PNG ou WebP com até 5 MB.');
   return await new Promise((resolve,reject)=>{
     const url=URL.createObjectURL(file),img=new Image();
     img.onload=()=>{try{
       const side=256,canvas=document.createElement('canvas');canvas.width=side;canvas.height=side;
       const ctx=canvas.getContext('2d');if(!ctx)throw Error('Não foi possível processar a imagem.');
       const scale=Math.max(side/img.naturalWidth,side/img.naturalHeight),w=img.naturalWidth*scale,h=img.naturalHeight*scale;
       ctx.fillStyle='#0c252d';ctx.fillRect(0,0,side,side);ctx.drawImage(img,(side-w)/2,(side-h)/2,w,h);
       const data=canvas.toDataURL('image/jpeg',.72);
       if(data.length>220000)throw Error('Imagem muito grande para salvar.');
       resolve(data);
     }catch(e){reject(e);}finally{URL.revokeObjectURL(url);}};
     img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Não foi possível abrir esta imagem.'));};
     img.src=url;
   });
 }
 async function handleProfilePhoto(file,source){if(!file)return;try{
   const photo=await compressProfilePhoto(file);
   if(source==='welcome'){draftWelcomePhoto=photo;const preview=$('welcomeAvatarPreview');if(preview)preview.innerHTML=`<img src="${safe(photo)}" alt="Prévia da sua foto">`;}
   else {const draft=$('displayName')?.value;state.photo=photo;save();render();if(draft!==undefined&&$('displayName'))$('displayName').value=draft;notify('Foto adicionada ao seu perfil.');}
 }catch(error){notify(error.message||'Não foi possível usar a foto.');}}
 // O localStorage mantém compatibilidade com versões antigas e o IndexedDB é o segundo armazenamento.
 let storageErrorShown=false;
 const save=()=>{
   state._savedAt=Math.max(Date.now(),Number(state._savedAt||0)+1);
   const snapshot=JSON.stringify(state);
   let localOK=false;
   try{localStorage.setItem(LS,snapshot);localOK=true;}catch{}
   if(window.TreinaProStore){window.TreinaProStore.persist({savedAt:state._savedAt,state:JSON.parse(snapshot)})
       .catch(()=>{if(!localOK&&!storageErrorShown){storageErrorShown=true;notify('Armazenamento bloqueado. Faça um backup antes de sair.');}});
   }else if(!localOK&&!storageErrorShown){storageErrorShown=true;notify('Não foi possível salvar. Exporte seu backup.');}
 };
 async function restoreFromDatabase(){
   if(!window.TreinaProStore)return;
   try{
     const snapshot=await window.TreinaProStore.load();
     if(snapshot?.state&&typeof snapshot.state==='object' && Array.isArray(snapshot.state.history)
        && Number(snapshot.savedAt)>Number(state._savedAt||0)){
       state={...defaults(),...snapshot.state};
       if(!DATA.plans[state.plan])state.plan='abc';
       if(!state.sessions||typeof state.sessions!=='object')state.sessions={};
       if(!Array.isArray(state.history))state.history=[];
       if(!state.selected||typeof state.selected!=='object')state.selected={abc:0,quad:0};
       if(!state.next||typeof state.next!=='object')state.next={abc:0,quad:0};
       // Um navegador fechado à força não pode contabilizar horas fora do treino.
       freezeOrphanedTimers();
       render();if(needsWelcome())renderWelcome();else $('welcomeRoot').innerHTML='';
     }else if(!snapshot && Number(state._savedAt||0)===0){
       // Migração única de registros antigos, sem remover a cópia existente.
       save();
     }else if(!snapshot){save();}
   }catch{ /* IndexedDB indisponível: armazenamento anterior continua funcional. */ }
 }

 const plan =()=>DATA.plans[state.plan];
 const currentDayIndex=()=>Math.max(0,Math.min(plan().days.length-1,Number(state.selected[state.plan])||0));
 const selectedDay=()=>plan().days[currentDayIndex()];
 const sessionKey=(pid,dayid)=>`${pid}:${dayid}`;
 // Um treino interrompido continua salvo até ser finalizado; não gerar sessões vazias para conferir o status.
 function hasPendingWorkout(pid=state.plan,dayid=selectedDay().id){
   const entry=state.sessions?.[sessionKey(pid,dayid)];
   if(!entry||typeof entry!=='object')return false;
   return !!entry._timer||Object.values(entry).some(item=>Array.isArray(item?.sets)&&item.sets.some(s=>s&&(s.done||String(s.kg??'').trim()||String(s.reps??'').trim())));
 }
 function confirmChangeWorkout(pid=state.plan,dayid=selectedDay().id){
   return !hasPendingWorkout(pid,dayid)||confirm('Você tem um treino em andamento. Suas séries e cargas serão preservadas. Deseja abrir outro treino?');
 }
 const workoutBaseIds=(day=selectedDay())=>{const custom=state.customWorkouts?.[state.plan]?.[day.id];return Array.isArray(custom)&&custom.length>0&&custom.length<=10&&new Set(custom).size===custom.length&&custom.every(id=>typeof id==='string'&&Object.hasOwn(exById,id))?custom.slice():day.ex.slice();};
 const sessionFor=(pid=state.plan,dayId=selectedDay().id)=>{const k=sessionKey(pid,dayId); return state.sessions[k] || (state.sessions[k]={});};

 // Alternativas editoriais com músculos semelhantes; movimentos não são necessariamente idênticos.
 const SWAP_ALTERNATIVES={
  supino:['supino_maquina','supino_inclinado'],supino_inclinado:['supino_maquina','supino'],
  triceps_polia:['triceps_frances'],triceps_frances:['triceps_polia'],
  puxada_alta:['remada_baixa','remada_unilateral'],remada_baixa:['remada_unilateral','puxada_alta'],remada_unilateral:['remada_baixa'],
  rosca_direta:['rosca_martelo'],rosca_martelo:['rosca_direta'],
  agachamento:['agachamento_goblet','leg_press'],agachamento_goblet:['agachamento','leg_press'],
  leg_press:['agachamento_goblet','agachamento'],extensora:['leg_press','agachamento_goblet'],
  afundo:['bulgaro','step_up'],bulgaro:['afundo','step_up'],step_up:['afundo','bulgaro'],
  romeno:['flexora'],flexora:['romeno'],hip_thrust:['coice_polia'],coice_polia:['hip_thrust'],
  supino_maquina:['supino','supino_inclinado']
 };
 const activeExerciseId=(original,day=selectedDay())=>{
  const alt=day===selectedDay()?sessionFor()._swaps?.[original]:null;
  const permitted=typeof alt==='string'&&Object.hasOwn(exById,alt)&&alt!==original&&((SWAP_ALTERNATIVES[original]||[]).includes(alt)||exById[original]?.muscle===exById[alt].muscle);
  return permitted?alt:original;
 };
 const exerciseSlots=(day=selectedDay())=>workoutBaseIds(day).map(original=>({original,id:activeExerciseId(original,day)}));
 const baseSetsFor=(ex)=>state.level==='iniciante'?2:state.goal==='condicionamento'?Math.min(3,ex.sets):state.level==='avancado'&&(ex.muscle==='Quadríceps'||ex.muscle==='Costas'||ex.muscle==='Peito'||ex.muscle==='Glúteos')?4:ex.sets;
 // Preserva o número de séries planejadas para a vaga original.
 function validRepTarget(value){
 const v=String(value??'').trim();
 const match=v.match(/^(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?(?:\s*(?:\/\s*lado|por\s+lado|s|seg))?$/i);
 return !!match&&Number(match[1])>=1&&Number(match[1])<=180&&(!match[2]||(Number(match[2])>=Number(match[1])&&Number(match[2])<=180));
}

 const exerciseTarget=(ex,day=selectedDay())=>{
  const slot=exerciseSlots(day).find(item=>item.id===ex.id||item.original===ex.id);
  const key=slot?.original||ex.id;
  const t=state.workoutTargets?.[state.plan]?.[day.id]?.[key];
  return t&&Number.isInteger(t.sets)&&t.sets>=1&&t.sets<=8&&typeof t.reps==='string'&&validRepTarget(t.reps)?t:null;
 };
 const setsFor=(ex)=>{
  const target=exerciseTarget(ex);
  if(target)return target.sets;
  const slot=exerciseSlots().find(item=>item.id===ex.id);
  return baseSetsFor(slot?exById[slot.original]:ex);
 };
 const getSetEntries=(ex)=>{const ses=sessionFor(), entry=ses[ex.id]||{sets:[]};const total=setsFor(ex);return Array.from({length:total},(_,i)=>entry.sets?.[i] || {done:false,kg:'',reps:''});};
 const doneCount=(day=selectedDay())=>exerciseSlots(day).reduce((sum,slot)=>sum+getSetEntries(exById[slot.id]).filter(s=>s.done).length,0);
 const totalCount=(day=selectedDay())=>exerciseSlots(day).reduce((sum,slot)=>sum+setsFor(exById[slot.id]),0);
 const dateString=(d=new Date())=>d.toLocaleDateString('pt-BR',{day:'numeric',month:'short',year:'numeric'});
 const formatTime=(sec)=>`${Math.floor(sec/60).toString().padStart(2,'0')}:${(sec%60).toString().padStart(2,'0')}`;
 function notify(message){const t=$('toast');t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3200);}
 // Garante que modais não permitam foco fora da janela e devolve o foco ao botão de origem.
 function rememberDialogTrigger(el=document.activeElement){
   if(!el||el.closest?.('#modalRoot'))return;
   modalReturnElement=el;const trigger=el.closest?.('[data-action]');
   modalReturnSelector='';
   if(trigger){
     const action=trigger.dataset.action;
     if(/^[a-z-]+$/.test(action)){
       modalReturnSelector=`[data-action="${action}"]`;
       for(const key of ['id','origin','index']){const value=trigger.dataset[key];if(value&&/^[a-zA-Z0-9_-]+$/.test(value))modalReturnSelector+=`[data-${key}="${value}"]`;}
     }
   }
 }
 function activateDialogFocus(){
   const dialog=$('modalRoot')?.querySelector('[role="dialog"]');
   if(!dialog)return;
   $('app').inert=true;document.querySelector('.mobile-nav').inert=true;
   dialog.querySelector('.close-btn')?.focus();
 }
 function restoreDialogFocus(){
   $('app').inert=false;document.querySelector('.mobile-nav').inert=false;
   const target=modalReturnElement?.isConnected?modalReturnElement:modalReturnSelector?document.querySelector(modalReturnSelector):null;
   (target||document.querySelector('[data-page="inicio"]'))?.focus?.();
   modalReturnElement=null;modalReturnSelector='';
 }
 function setPage(next){page=next;search='';muscle='todos';equipment='todos';closeModal();render();window.scrollTo({top:0,behavior:'smooth'});}
 function pill(text){return `<span class="chip">✦ ${safe(text)}</span>`;}
 const featuredIds=['supino_maquina','leg_press','desenvolvimento','face_pull'];
 const featuredFor=(id)=>`assets/featured/${encodeURIComponent(id)}.webp`;
 const imageFor=(id)=>`assets/webp/exercises/${encodeURIComponent(id)}.webp`;
 const demoFor=(id,mode='motion')=>mode==='still'?`assets/webp/still/${encodeURIComponent(id)}.webp`:`assets/${['motion','motion-slow'].includes(mode)?mode:'motion'}/${encodeURIComponent(id)}.svg`;
 const frameFor=(id,phase)=>`assets/webp/frames/${phase==='finish'?'finish':'start'}/${encodeURIComponent(id)}.webp`;
 const muscleConnections={Peito:'Tríceps e ombros',Costas:'Bíceps e região posterior dos ombros',Quadríceps:'Glúteos e estabilizadores',Posterior:'Glúteos e panturrilhas',Glúteos:'Posterior e quadríceps',Panturrilhas:'Músculos da perna',Ombros:'Tríceps e estabilizadores',Tríceps:'Peito e ombros',Bíceps:'Antebraços e costas',Abdômen:'Músculos estabilizadores do tronco'};
 function muscleDiagram(muscle){
   const back=['Costas','Posterior','Glúteos','Panturrilhas','Tríceps'].includes(muscle);
   const frontZones={Peito:'<path d="M60 78 Q74 65 84 84 L82 104 L60 105Z"/><path d="M86 84 Q97 66 111 78 L111 105 L88 104Z"/>',Ombros:'<path d="M55 75 Q41 82 42 101L51 110L62 85Z"/><path d="M114 75 Q126 82 129 101L120 110L110 85Z"/>',Bíceps:'<path d="M45 108L54 108L47 137L39 135Z"/><path d="M121 108L130 108L137 135L129 137Z"/>',Quadríceps:'<path d="M63 167L83 167L78 216L59 213Z"/><path d="M88 167L108 167L112 213L93 216Z"/>',Abdômen:'<path d="M68 111L106 111L100 158L75 158Z"/>'};
   const backZones={Costas:'<path d="M63 80L111 80L104 153L88 163L68 152Z"/>',Posterior:'<path d="M62 172L82 172L78 216L57 215Z"/><path d="M90 172L110 172L115 215L93 216Z"/>',Glúteos:'<path d="M65 150L87 156L82 180L61 179Z"/><path d="M89 156L110 150L115 179L94 180Z"/>',Panturrilhas:'<path d="M61 223L80 223L77 258L63 262Z"/><path d="M92 223L111 223L109 262L95 258Z"/>',Tríceps:'<path d="M42 105L51 110L44 139L35 133Z"/><path d="M124 110L133 105L142 133L133 139Z"/>'};
   const glow=(back?backZones:frontZones)[muscle]||frontZones.Peito;
   return `<section class="muscle-focus" aria-label="Região muscular principal"><div><span class="eyebrow">MAPA MUSCULAR</span><h3>${safe(muscle)}</h3><p>Área principal destacada em verde. Outras regiões também participam.</p><small>Auxiliares: ${safe(muscleConnections[muscle]||'Estabilizadores')}</small></div><svg viewBox="0 0 170 310" role="img" aria-label="Silhueta ${back?'posterior':'frontal'} com região de ${safe(muscle)} destacada"><defs><linearGradient id="bodyShade" x2="0.5" y2="1"><stop stop-color="#9eb5b5"/><stop offset="1" stop-color="#62868b"/></linearGradient></defs><circle cx="85" cy="32" r="19" fill="url(#bodyShade)"/><path d="M67 52L58 76L61 109L66 154L62 172L56 225L61 279L78 279L83 220L87 185L92 220L99 279L115 279L118 225L112 172L107 154L113 109L115 76L104 52Z" fill="url(#bodyShade)"/><path d="M60 72L41 82L30 140L44 145L57 113Z" fill="#79989b"/><path d="M111 72L131 82L145 140L131 145L118 113Z" fill="#79989b"/><g fill="#c6f65b" stroke="#dfffaa" stroke-width="1.5">${glow}</g><path d="M85 82V154" stroke="#19353c" stroke-opacity=".25" stroke-width="2"/></svg><span class="muscle-view">Vista ${back?'posterior':'frontal'} • esquema</span></section>`;
 }

 function renderWelcome(){
   const root=$('welcomeRoot');
   if(!root)return;
   document.body.classList.add('welcome-open');
   $('app').inert=true;
   document.querySelector('.mobile-nav').inert=true;
   root.innerHTML=`<div class="welcome-overlay">
      <section class="welcome-dialog" role="dialog" aria-modal="true" aria-labelledby="welcomeTitle" aria-describedby="welcomeDescription">
       <div class="welcome-decor decor-one" aria-hidden="true"></div><div class="welcome-decor decor-two" aria-hidden="true"></div>
       <div class="welcome-content">
        <div class="welcome-brand"><span class="brand-mark"><img class="brand-webp" src="assets/treinapro-icon.svg" alt="" decoding="async">T<span>+</span></span><div><b>treina<span>pro</span></b><small>SEU PERSONAL DIGITAL</small></div><span class="welcome-stage">SEU PRIMEIRO PASSO</span></div>
        <div class="welcome-header"><span class="eyebrow">✦ BEM-VINDO(A) AO TREINAPRO</span><h1 id="welcomeTitle">Vamos montar o <em>seu treino.</em></h1><p id="welcomeDescription">Diga como podemos chamar você e selecione o programa que prefere. Leva menos de um minuto.</p></div>
        <form id="welcomeForm" class="welcome-form">
         <div class="welcome-name"><label for="welcomeName"><span class="welcome-number">01</span> Qual é o seu nome?</label><input id="welcomeName" name="name" class="welcome-input" autocomplete="given-name" placeholder="Digite seu nome" type="text" minlength="2" maxlength="35" required value="${safe(state.name||'')}"><small>O personal vai usar seu nome para personalizar o aplicativo.</small></div>
         <fieldset class="welcome-plan-field"><legend><span class="welcome-number">02</span> Qual treino você deseja?</legend><div class="welcome-plan-grid">
          <label class="welcome-choice"><input type="radio" name="welcomePlan" value="abc" required><span class="welcome-choice-body"><span class="welcome-choice-top"><span class="welcome-choice-icon">🏋️</span><span class="welcome-select-circle" aria-hidden="true">✓</span></span><span class="welcome-choice-tag">DIVISÃO EM 3 DIAS</span><strong>Treino <span>ABC</span></strong><small>Peito, ombros e tríceps → Costas e bíceps → Pernas e abdômen</small><span class="welcome-frequency">◷ 3 treinos na sequência</span></span></label>
          <label class="welcome-choice"><input type="radio" name="welcomePlan" value="quad" required><span class="welcome-choice-body"><span class="welcome-choice-top"><span class="welcome-choice-icon">⚡</span><span class="welcome-select-circle" aria-hidden="true">✓</span></span><span class="welcome-choice-tag">DIVISÃO EM 4 DIAS</span><strong>Treino <span>Pernas + Braços</span></strong><small>Quadríceps e glúteos → Superiores → Posterior e glúteos → Superiores</small><span class="welcome-frequency">◷ 4 treinos na sequência</span></span></label>
         </div></fieldset>
         <div class="welcome-extra"><div class="welcome-extra-title"><span class="welcome-number">03</span><strong>Qual é seu objetivo?</strong></div><div class="goal-option-grid">${goalsMarkup('welcomeGoal')}</div>
         <details class="welcome-optional"><summary>Personalizar mais <span>Nível e foto • opcional</span></summary><div class="welcome-optional-body"><div class="welcome-level-row"><label for="welcomeLevel">Qual é seu nível de experiência?</label><select id="welcomeLevel" class="profile-select">${[['iniciante','Iniciante — estou começando'],['intermediario','Intermediário — já treino'],['avancado','Avançado — tenho experiência']].map(([v,t])=>`<option value="${v}" ${v===state.level?'selected':''}>${t}</option>`).join('')}</select></div>
         <div class="welcome-photo-row"><div class="welcome-avatar" id="welcomeAvatarPreview">${draftWelcomePhoto?`<img src="${safe(draftWelcomePhoto)}" alt="Prévia da sua foto">`:avatarMarkup('md')}</div><div><strong>Foto de perfil <small>(opcional)</small></strong><label class="photo-upload" for="welcomePhotoFile">📷 Escolher foto</label><input type="file" id="welcomePhotoFile" accept="image/jpeg,image/png,image/webp" class="visually-hidden-file"><small>Imagem fica somente neste navegador.</small></div></div></div></details></div>
         <button class="welcome-start" type="submit">Começar meu treinamento <span aria-hidden="true">→</span></button>
         <p class="welcome-privacy">🔒 Nome e escolha ficam salvos neste navegador. Você poderá mudar seu plano e nome em Configurações.</p>
         <p class="welcome-disclaimer">As divisões são opções de programa: qualquer pessoa pode escolher a que melhor se adapta aos seus objetivos.</p>
        </form>
       </div>
      </section>
     </div>`;
 }
 function dismissWelcome(){
   $('welcomeRoot').replaceChildren();
   $('app').inert=false;
   document.querySelector('.mobile-nav').inert=false;
   document.body.classList.remove('welcome-open');
 }
 function welcomeSubmit(event){
   event.preventDefault();
   const form=event.target;
   const name=form.elements.namedItem('name')?.value?.trim().replace(/\s+/g,' ');
   const selected=form.querySelector('input[name="welcomePlan"]:checked')?.value;
   if(!name || name.length < 2){ const input=$('welcomeName'); input.setCustomValidity('Digite seu nome com pelo menos 2 caracteres.'); input.reportValidity(); return; }
   if(!DATA.plans[selected]){form.querySelector('input[name="welcomePlan"]').reportValidity();return;}
   state.name=name.slice(0,35);
   state.plan=selected;
   state.goal=GOALS[form.querySelector('input[name="welcomeGoal"]:checked')?.value]?form.querySelector('input[name="welcomeGoal"]:checked').value:'hipertrofia';
   state.level=['iniciante','intermediario','avancado'].includes($('welcomeLevel')?.value)?$('welcomeLevel').value:'iniciante';
   state.photo=draftWelcomePhoto;
   state.profileComplete=true;
   state.selected[selected]=Number(state.selected[selected])||0;
   save();
   dismissWelcome();
   page='inicio';render();
   notify(`Boas-vindas, ${state.name.split(' ')[0]}! Seu programa está pronto.`);
 }
 function render(){document.title=`TreinaPro — ${({'inicio':'Início','treinos':'Meus treinos','biblioteca':'Exercícios','progresso':'Evolução','ajustes':'Configurações'})[page]||'Personal digital'}`;
   $('dateLabel').textContent=dateString();$('breadcrumb').textContent=({'inicio':'SEU PAINEL','treinos':'SEUS TREINOS','biblioteca':'BIBLIOTECA DE EXERCÍCIOS','progresso':'SEU PROGRESSO','ajustes':'PERSONALIZAÇÃO'})[page];
   document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('selected',b.dataset.page===page));
   document.querySelectorAll('.mobile-nav [data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
   $('pageContent').innerHTML=({inicio:renderHome,treinos:renderTreinos,biblioteca:renderLibrary,progresso:renderProgress,ajustes:renderSettings})[page]();refreshWorkoutClock();
 }
 function heroIllustration(){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 270 225" aria-hidden="true"><circle cx="154" cy="107" r="96" fill="#c6f65b" opacity=".07"/><circle cx="154" cy="107" r="74" fill="none" stroke="#c6f65b" opacity=".25" stroke-width="2"/><g stroke="#d0f68c" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M150 87L136 135L169 165"/><path d="M139 135L107 170L97 204"/><path d="M166 165L192 202"/><path d="M150 99L105 115L89 87"/><path d="M150 100L187 119L212 101"/></g><g fill="#e6ffd1"><circle cx="151" cy="64" r="22"/><circle cx="89" cy="83" r="10"/><circle cx="216" cy="96" r="10"/></g><g stroke="#b9e56e" stroke-width="5"><path d="M62 83h48M195 96h48"/><path d="M61 72v22M243 85v22"/></g><path d="M85 211h129" stroke="#86bd73" opacity=".7" stroke-width="4" stroke-linecap="round"/></svg>`;}
 function renderHome(){const paused=hasPendingWorkout(),day=selectedDay(),completed=state.history.length,progress=Math.round(doneCount()/totalCount()*100),nextSessions=state.history.filter(l=>l.plan===state.plan).length;
 return `<section class="intro"><div><div class="eyebrow" style="margin-bottom:9px">TRANSFORME SEU MOVIMENTO</div><h1>${state.name?`Olá, ${safe(state.name.split(/\s+/)[0])}!`:"Seu ritmo."}<br><span class="headline-name">Sua evolução.</span></h1><p>Seu personal digital com orientação em cada repetição.</p></div><div class="intro-person">${avatarMarkup("lg")}<div>${pill(plan().audience)}<span class="intro-goal">${safe(goalInfo().icon+" "+goalInfo().name)} · ${safe(state.level)}</span></div></div></section>
 <section class="hero"><div class="hero-body"><div class="eyebrow">✦ SEU PRÓXIMO TREINO</div><h2>${safe(day.title)}</h2><p>${safe(day.focus)}. Acompanhe a execução ilustrada, registre sua carga e evolua no seu ritmo.</p><div class="hero-meta"><span>◷ ${day.min} min estimados</span><span>▤ ${workoutBaseIds(day).length} exercícios</span><span>◉ ${totalCount()} séries</span></div><button class="btn btn-primary" data-action="start-workout">${paused?'▶ Retomar treino salvo':'▶ Começar treino'} <span>↗</span></button><span style="margin-left:10px" class="pill-outline">Treino ${day.letter}</span>${paused?'<p class="saved-workout-hint">Seu treino parcial está salvo neste navegador. Retome de onde parou.</p>':''}</div><div class="hero-visual"><img class="hero-webp" src="assets/featured/supino_maquina.webp" loading="eager" decoding="async" alt="Nova ilustração detalhada de supino em máquina, com banco, alças e torre de pesos">${heroIllustration()}</div></section>
 <section class="featured-showcase" aria-labelledby="featuredTitle">
 <div class="featured-heading"><div><span class="eyebrow">NOVA IDENTIDADE VISUAL • 2D</span><h2 id="featuredTitle">Movimentos em destaque</h2><p>Artes novas com atletas e equipamentos de academia. Toque para abrir o guia animado do exercício.</p></div><span class="featured-tag">NOVO</span></div>
 <div class="featured-grid">${featuredIds.map(id=>{const ex=exById[id];return `<button class="featured-card" type="button" data-action="exercise" data-id="${id}" aria-label="Ver demonstração de ${safe(ex.name)}"><img src="${featuredFor(id)}" alt="" loading="lazy" decoding="async"><span>${safe(ex.name)}</span><small>Abrir demonstração <b>↗</b></small></button>`}).join('')}</div>
 </section>
 <div class="dashboard-grid"><div><div class="section-head"><div><h2>Sua divisão de treino</h2><p>Selecione o dia que deseja trabalhar</p></div><button class="text-button" data-page="treinos">Ver plano ↗</button></div>${renderDayCards()}
 <div class="section-head routine-heading"><div><h2>Exercícios do treino ${day.letter}</h2><p>${safe(day.title)} • toque para aprender</p></div><button class="btn btn-dark btn-sm" data-action="edit-workout">⚙ Editar treino</button><span class="small muted">${doneCount()}/${totalCount()} séries</span></div>
 <div class="stack">${exerciseSlots(day).map((slot,i)=>renderExerciseCard(exById[slot.id],i,slot.original)).join('')}</div></div>
 <aside class="stack right-col"><div class="stat-grid"><div class="stat-card"><span class="stat-label">TREINOS CONCLUÍDOS</span><strong>${completed}</strong><span class="stat-foot">✓ Sua constância</span></div><div class="stat-card"><span class="stat-label">SÉRIES DE HOJE</span><strong>${doneCount()}<small> / ${totalCount()}</small></strong><span class="stat-foot">↗ ${progress}% do treino</span></div></div>
 ${profilePanel()}<div class="coach-card"><div class="coach-heading"><span class="coach-icon">✦</span><div><h3>Seu coach orienta</h3><p class="muted small" style="margin:3px 0 0">Dica para este treino</p></div></div><p>Comece com <b>5–10 minutos</b> de aquecimento leve. ${safe(goalInfo().tip)} Antes de uma série pesada, faça uma ou duas séries leves de preparação.</p><ul><li>Execução controlada acima da carga</li><li>Descanse conforme o exercício</li><li>Interrompa se sentir dor aguda</li></ul>${state.goal!=="hipertrofia"?`<p class="small muted cardio-hint">★ Nos dias livres, considere caminhadas ou outra atividade aeróbica confortável, evoluindo aos poucos. Musculação isolada não garante emagrecimento.</p>`:""}</div>
 <div class="info-card"><div class="card-row"><h3>Progresso do treino</h3><b style="color:var(--lime)">${progress}%</b></div><div class="session-clock"><span>Tempo de treino: <strong id="workoutClock">00:00</strong></span><button class="btn btn-dark btn-sm" data-action="toggle-session-timer">${!sessionTimer()?'Iniciar':sessionTimer().paused?'Retomar':'Pausar'}</button></div><div class="progress-line"><span style="width:${progress}%"></span></div><p class="muted small">${doneCount()} séries realizadas de ${totalCount()} planejadas</p><button class="btn btn-dark" style="width:100%;margin-top:15px" data-action="finish-workout" ${doneCount()===0?'disabled':''}>✓ Finalizar treino</button></div>
 <div class="body-card"><h3>Seu plano atual</h3><p>${safe(plan().description)}</p><button class="text-button" data-page="ajustes" style="margin-top:13px">Personalizar →</button><p class="small muted" style="margin-top:12px">${nextSessions} treinos deste plano registrados.</p></div></aside></div>${safetyNote()}`; }
 function renderDayCards(){return `<div class="day-grid ${plan().days.length===3?'three':''}">${plan().days.map((d,i)=>`<button class="day-card ${i===currentDayIndex()?'active':''}" data-action="day" data-index="${i}"><span class="day-letter">${d.letter}</span><strong>${safe(d.short)}</strong><small>${safe(d.title)}</small>${i===currentDayIndex()?'<span class="day-tick">●</span>':''}</button>`).join('')}</div>`;}
 function renderExerciseCard(ex,i,original=ex.id){const n=getSetEntries(ex).filter(s=>s.done).length;const changed=original!==ex.id;return `<article class="exercise-card"><img src="${imageFor(ex.id)}" alt="Ilustração das duas posições de ${safe(ex.name)}" loading="lazy"><div><span class="ex-order">${String(i+1).padStart(2,'0')} • ${safe(ex.muscle.toUpperCase())}</span><h3>${safe(ex.name)}</h3>${changed?`<span class="swap-label">Substitui ${safe(exById[original].name)}</span>`:''}<p>${safe(ex.equip)} • ${safe(ex.difficulty)}</p><button class="swap-inline" data-action="swap-open" data-origin="${safe(original)}" aria-label="Trocar ${safe(ex.name)} por outro exercício">⇄ Aparelho ocupado? Trocar</button><span class="card-reps">${setsFor(ex)} × ${safe(repsFor(ex))} · ${restFor(ex)}s descanso ${n?` · <b style="color:var(--lime)">${n} ✓</b>`:''}</span></div><button class="open-exercise" data-action="exercise" data-id="${ex.id}" data-track="1" aria-label="Aprender ${safe(ex.name)}">↗</button></article>`;}
 function renderWeeklySchedule(){
  // A suggested repeatable week, not a mandatory calendar or a promise of recovery.
  const trainingSlots=state.plan==='abc'?{0:0,2:1,4:2}:{0:0,1:1,3:2,4:3};
  const now=new Date(), monday=new Date(now);
  monday.setDate(now.getDate()-((now.getDay()+6)%7));monday.setHours(12,0,0,0);
  const labels=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  const tiles=labels.map((label,i)=>{
   const date=new Date(monday);date.setDate(monday.getDate()+i);
   const today=date.toDateString()===now.toDateString();
   const idx=trainingSlots[i],workout=idx===undefined?null:plan().days[idx];
   const completed=workout && state.history.some(h=>h.plan===state.plan&&h.day===workout.id&&localDateKey(h.date)===localDateKey(date));
   const inside=`<span class="week-name">${label}</span><span class="week-number">${date.getDate()}</span><strong>${workout?'Treino '+safe(workout.letter):'Livre'}</strong><small>${completed?'✓ Feito':workout?safe(workout.short):'Recuperar'}</small>${today?'<span class="week-today">HOJE</span>':''}`;
   return workout?`<button type="button" class="week-day ${today?'is-today':''} ${completed?'is-done':''}" data-action="day" data-index="${idx}" data-navigate="inicio" aria-label="${label}, dia ${date.getDate()}: Treino ${safe(workout.letter)}${completed?', já registrado':''}. Abrir treino">${inside}</button>`:`<div class="week-day week-rest ${today?'is-today':''}" aria-label="${label}, dia ${date.getDate()}: descanso ou atividade leve">${inside}</div>`;
  }).join('');
  return `<section class="week-section" aria-labelledby="weekTitle"><div class="section-head week-heading"><div><h2 id="weekTitle">Sua semana</h2><p>Exemplo de organização · toque num treino para abrir</p></div></div><div class="week-strip">${tiles}</div><p class="week-help">Os dias são sugestões. Se precisar descansar mais, ajuste sua rotina sem perder as séries registradas.</p></section>`;
 }
 function renderTreinos(){
  return `<div class="page-heading"><span class="eyebrow">PROGRAMAÇÃO SEMANAL</span><h1>Meus <span class="headline-name">treinos</span></h1><p>Seu plano atual: ${safe(plan().label)}.</p></div>
  ${renderWeeklySchedule()}
  <div class="section-head"><h2>Treinos do seu plano</h2></div>
  <div class="plan-list">${plan().days.map((d,i)=>`<div class="plan-row ${i===currentDayIndex()?'active':''}"><div class="day-letter">${d.letter}</div><div class="plan-row-text"><h3>${safe(d.title)}</h3><p>${safe(d.focus)} · ${workoutBaseIds(d).length} exercícios · ${d.min} min estimados</p></div><button class="btn btn-dark btn-sm" data-action="edit-workout" data-index="${i}" aria-label="Editar treino ${safe(d.letter)}">Editar</button><button class="btn ${i===currentDayIndex()?'btn-primary':'btn-dark'} btn-sm" data-action="day" data-index="${i}" data-navigate="inicio">${i===currentDayIndex()?'Continuar':'Abrir'} ↗</button></div>`).join('')}</div>
  <details class="plan-switcher"><summary>Trocar tipo de treino</summary><p>Você pode escolher qualquer programa, independentemente do sexo. Seus registros continuam salvos.</p><div class="plan-controls"><button class="seg-button ${state.plan==='abc'?'active':''}" data-action="plan" data-plan="abc">Treino ABC • 3 dias</button><button class="seg-button ${state.plan==='quad'?'active':''}" data-action="plan" data-plan="quad">Pernas / superiores • 4 dias</button></div></details>
  ${safetyNote()}`;
 }
 
 const EQUIPMENT_OPTIONS=[['todos','Todos os equipamentos'],['maquinas','Máquinas'],['polias','Polias e cabos'],['pesos','Halteres e barras'],['corporal','Corpo livre e acessórios']];
 function equipmentCategories(ex){
   const text=String(ex.equip||'').toLocaleLowerCase('pt-BR'),result=[];
   if(/máquina|maquina/.test(text))result.push('maquinas');
   if(/polia|cabo|corda/.test(text))result.push('polias');
   if(/barra|halter/.test(text))result.push('pesos');
   if(/peso corporal|colchonete|degrau|caixa/.test(text))result.push('corporal');
   return result.length?result:['corporal'];
 }
 function refreshLibraryResults(){const items=filteredExercises();const target=$('libraryCards');if(target)target.innerHTML=renderLibraryCards(items);const count=$('libraryCount');if(count)count.textContent=`${items.length} de ${DATA.exercises.length} exercícios`;}
 function renderLibrary(){const muscles=['todos',...new Set(DATA.exercises.map(ex=>ex.muscle))];const items=filteredExercises();return `<div class="page-heading library-title"><div><span class="eyebrow">GUIA VISUAL DE MOVIMENTOS</span><h1>Biblioteca de <span class="headline-name">exercícios</span></h1><p>${DATA.exercises.length} exercícios com imagens de duas posições, passo a passo, dicas de postura e erros comuns.</p></div><img class="library-illustration" src="assets/webp/ui/library.webp" alt="" decoding="async" loading="lazy"></div><div class="control-strip"><input aria-label="Pesquisar exercícios" class="search-input" id="searchExercises" placeholder="⌕  Buscar exercício ou equipamento..." value="${safe(search)}"><select id="muscleFilter" class="select-input" aria-label="Filtrar por grupo muscular">${muscles.map(x=>`<option value="${safe(x)}" ${muscle===x?'selected':''}>${x==='todos'?'Todos os músculos':safe(x)}</option>`).join('')}</select><select id="equipmentFilter" class="select-input" aria-label="Filtrar por tipo de equipamento">${EQUIPMENT_OPTIONS.map(([id,label])=>`<option value="${id}" ${equipment===id?'selected':''}>${label}</option>`).join('')}</select></div><p class="library-count" id="libraryCount" role="status">${items.length} de ${DATA.exercises.length} exercícios</p><div id="libraryCards">${renderLibraryCards(items)}</div>${safetyNote()}`;}
 function filteredExercises(){const norm=t=>t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();const q=norm(search.trim());return DATA.exercises.filter(ex=>(muscle==='todos'||muscle===ex.muscle)&&(equipment==='todos'||equipmentCategories(ex).includes(equipment))&&(!q||norm(`${ex.name} ${ex.muscle} ${ex.equip}`).includes(q)));}
 function renderLibraryCards(items){return items.length?`<div class="library-grid">${items.map(ex=>`<article class="library-card"><img src="${featuredIds.includes(ex.id)?featuredFor(ex.id):imageFor(ex.id)}" loading="lazy" alt="${featuredIds.includes(ex.id)?`Nova ilustração de ${safe(ex.name)}`:`Posições de ${safe(ex.name)}`}"><div class="library-body"><span class="ex-order">${safe(ex.muscle.toUpperCase())}</span><h3>${safe(ex.name)}</h3><p>${safe(ex.equip)} · ${safe(repsFor(ex))}</p><span class="animated-tag">● Guia técnico 2D individual</span><button class="btn btn-dark btn-sm" data-action="exercise" data-id="${ex.id}">▶ Aprender exercício</button></div></article>`).join('')}</div>`:'<div class="empty">Nenhum exercício encontrado. Tente outro termo.</div>';}

 function strengthSeries(id){
   return state.history.flatMap(log=>{
     const sets=log.details?.[id]?.sets;
     if(!Array.isArray(sets))return [];
     const valid=sets.filter(x=>x&&x.done).map(x=>({kg:Number(String(x.kg||'').replace(',','.')),reps:Number.parseInt(String(x.reps||''),10)})).filter(x=>Number.isFinite(x.kg)&&x.kg>0&&x.kg<=1000&&Number.isFinite(x.reps)&&x.reps>=0&&x.reps<=500);
     if(!valid.length)return [];
     return [{date:log.date,series:valid,maxKg:Math.max(...valid.map(x=>x.kg)),volume:valid.reduce((v,x)=>v+x.kg*x.reps,0),last:valid[valid.length-1]}];
   }).sort((a,b)=>new Date(a.date)-new Date(b.date));
 }
 function strengthAdvice(ex,records){
   if(ex.reps.includes('s')&& !ex.reps.includes('reps'))return 'Exercício com tempo de execução: acompanhe duração e técnica, sem sugerir aumento de carga.';
   if(records.length<2)return 'Registre pelo menos duas sessões com carga e repetições para receber um indicativo de progressão.';
   const r=records.slice(-2),nums=(ex.reps.match(/\d+/g)||[]).map(Number),target=Math.max(...nums,0);
   if(!target)return 'Observe sua técnica e regularidade antes de aumentar a dificuldade.';
   const stable=Math.abs(r[0].maxKg-r[1].maxKg)<.01;
   if(stable && r.every(row=>row.series.length>=2&&row.last.reps>=target+2)){
     const next=Math.round(r[1].maxKg*1.025*2)/2;
     return `Você fez ao menos ${target+2} repetições na última série de duas sessões com a mesma carga. Se a execução ficou estável, sem dor e com boa recuperação, pode considerar um pequeno aumento (exemplo de 2,5%: ${next.toLocaleString('pt-BR')} kg, ajustando ao equipamento). É apenas uma sugestão, não uma meta obrigatória.`;
   }
   return 'Mantenha uma carga confortável e tente consolidar a técnica e as repetições primeiro. Uma regra prática é alcançar cerca de 2 repetições além da meta em duas sessões comparáveis antes de considerar aumentar o peso.';
 }
 function renderStrengthPanel(){
   if(!exById[progressExercise])progressExercise='agachamento';
   const ex=exById[progressExercise],rec=strengthSeries(ex.id),last=rec.slice(-8),max=Math.max(1,...last.map(x=>x.maxKg)),volume=rec.reduce((n,x)=>n+x.volume,0);
   return `<section class="strength-panel" aria-label="Evolução de carga por exercício"><div class="section-head"><div><h2>Progressão de cargas</h2><p>Compare as últimas sessões e veja quando considerar evoluir.</p></div></div>
    <label class="strength-select-label" for="progressExerciseSelect">Selecione o exercício</label><select id="progressExerciseSelect" class="select-input" aria-label="Exercício para comparar evolução">${DATA.exercises.map(item=>`<option value="${item.id}" ${item.id===ex.id?'selected':''}>${safe(item.name)}</option>`).join('')}</select>
    <div class="metric-row strength-summary"><div class="stat-card"><span class="stat-label">SESSÕES COM CARGA</span><strong>${rec.length}</strong></div><div class="stat-card"><span class="stat-label">RECORDE REGISTRADO</span><strong>${rec.length?Math.max(...rec.map(x=>x.maxKg)).toLocaleString('pt-BR'):'—'}<small> ${rec.length?'kg':''}</small></strong></div><div class="stat-card"><span class="stat-label">VOLUME REGISTRADO</span><strong>${Math.round(volume).toLocaleString('pt-BR')}<small> kg·rep</small></strong></div></div>
    <div class="load-chart" role="img" aria-label="Últimas cargas máximas por sessão de ${safe(ex.name)}">${last.length?last.map((v,i)=>`<div class="load-col" title="${safe(dateString(new Date(v.date)))}: ${v.maxKg} kg"><span>${v.maxKg.toLocaleString('pt-BR')} kg</span><div class="load-track"><div style="height:${Math.max(5,100*v.maxKg/max)}%"></div></div><small>${safe(new Date(v.date).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}))}</small></div>`).join(''):'<p class="empty" style="width:100%">Nenhuma sessão com peso e repetições registrada para este exercício.</p>'}</div>
    <div class="coach-card progress-coach"><b>✦ Orientação de progressão</b><p>${safe(strengthAdvice(ex,rec))}</p><small>Registros baseados nas séries finalizadas. Medida de volume = carga × repetições, não estimativa de ganho muscular. Não compare pesos de máquinas diferentes.</small></div>
    </section>`;
 }
 
 function renderTrainingSummary(){
   const days=Array.from({length:28},(_,i)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-27+i);return {key:localDateKey(d),label:d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}),today:i===27};});
   const keys=new Set(days.map(d=>d.key)),counts=Object.create(null),muscles=Object.create(null);
   for(const log of state.history){
     const date=localDateKey(log.date);if(!keys.has(date))continue;
     counts[date]=(counts[date]||0)+1;
     for(const [id,entry] of Object.entries(log.details||{})){
       const ex=exById[id];if(!ex||!Array.isArray(entry?.sets))continue;
       const done=entry.sets.filter(row=>row?.done===true).length;
       if(done)muscles[ex.muscle]=(muscles[ex.muscle]||0)+done;
     }
   }
   const active=days.filter(d=>(counts[d.key]||0)>0).length;
   const sessions=days.reduce((n,d)=>n+(counts[d.key]||0),0);
   const tiles=days.map(d=>{const n=counts[d.key]||0;return `<span class="heat-day heat-${Math.min(3,n)} ${d.today?'heat-today':''}" title="${safe(d.label)}: ${n} treino${n===1?'':'s'}" aria-label="${safe(d.label)}: ${n} treino${n===1?'':'s'}"></span>`;}).join('');
   const byMuscle=Object.entries(muscles).sort((a,b)=>b[1]-a[1]),max=Math.max(1,...byMuscle.map(x=>x[1]));
   return `<section class="training-summary" aria-label="Constância e grupos musculares nos últimos 28 dias"><div class="section-head"><div><h2>Seus últimos 28 dias</h2><p>Treinos finalizados e séries registradas — sem estimar esforço ou recuperação.</p></div></div><div class="training-overview"><div class="training-heat-card"><div class="training-overview-stat"><strong>${active}</strong><span>dias ativos</span><strong>${sessions}</strong><span>treinos concluídos</span></div><div class="training-heat-grid" role="group" aria-label="Dias com treinos finalizados">${tiles}</div><p class="heat-legend">Cada quadrado representa um dia; a intensidade mostra quantos treinos foram concluídos.</p></div><div class="training-muscle-card"><h3>Séries por grupo principal</h3>${byMuscle.length?`<div class="training-muscle-list">${byMuscle.map(([name,count])=>`<div class="muscle-stat"><div class="muscle-stat-label"><span>${safe(name)}</span><strong>${count} ${count===1?'série':'séries'}</strong></div><div class="muscle-stat-track"><span style="width:${Math.round(count/max*100)}%"></span></div></div>`).join('')}</div>`:'<p class="muted small">Finalize um treino para acompanhar os grupos musculares trabalhados.</p>'}<p class="heat-legend">Contagem de séries concluídas por grupo principal cadastrado; não mede fadiga muscular.</p></div></div></section>`;
 }
 function renderProgress(){let logs=state.history.slice().reverse();const cutoff=new Date();cutoff.setHours(0,0,0,0);cutoff.setDate(cutoff.getDate()-progressWindow+1);
 const periodLogs=logs.filter(log=>Number.isFinite(new Date(log.date).getTime())&&new Date(log.date)>=cutoff);
 const totalSets=periodLogs.reduce((s,x)=>s+(x.doneSets||0),0);const minutes=periodLogs.reduce((s,x)=>s+(x.durationMode==='measured'?(x.minutes||0):0),0);const lastSeven=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return {date:localDateKey(d),name:d.toLocaleDateString('pt-BR',{weekday:'short'}).slice(0,3)}});const max=Math.max(1,...lastSeven.map(day=>logs.filter(l=>localDateKey(l.date)===day.date).length));return `<div class="page-heading"><span class="eyebrow">CONSTÂNCIA E ACOMPANHAMENTO</span><h1>Sua <span class="headline-name">evolução</span></h1><p>Acompanhe as sessões finalizadas e as séries feitas, direto no seu dispositivo.</p></div><div class="period-filter" role="group" aria-label="Período das métricas e do histórico"><span>Mostrar período</span>${[7,30,90].map(n=>`<button type="button" class="period-option ${progressWindow===n?'active':''}" data-action="progress-window" data-days="${n}" aria-pressed="${progressWindow===n}">${n} dias</button>`).join('')}</div><div class="metric-row"><div class="stat-card"><span class="stat-label">TREINOS NO PERÍODO</span><strong>${periodLogs.length}</strong><span class="stat-foot">Sessões registradas</span></div><div class="stat-card"><span class="stat-label">SÉRIES CONCLUÍDAS</span><strong>${totalSets}</strong><span class="stat-foot">Repetição após repetição</span></div><div class="stat-card"><span class="stat-label">TEMPO MEDIDO</span><strong>${minutes}<small> min</small></strong><span class="stat-foot">Duração real dos treinos novos</span></div></div><div class="section-head"><h2>Últimos 7 dias</h2></div><div class="chart-card"><div class="bar-chart">${lastSeven.map(d=>{const count=logs.filter(l=>localDateKey(l.date)===d.date).length;return `<div class="bar-col"><b>${count||''}</b><div style="height:${Math.max(4,100*count/max)}%"></div><span>${d.name}</span></div>`}).join('')}</div></div>${renderTrainingSummary()}${renderStrengthPanel()}<div class="section-head"><h2>Histórico de treinos</h2><button class="text-button" data-action="export">Exportar meus dados ↓</button></div><div class="history-list">${periodLogs.length?periodLogs.slice(0,40).map(log=>`<div class="history-row"><div class="history-icon">✓</div><div><h3>${safe(log.title)}</h3><p>${safe(dateString(new Date(log.date)))} · ${safe(log.program)} · ${log.durationMode==='measured'?`${formatTime(log.durationSeconds||0)} medidos`:`${log.minutes||0} min estimados`}</p></div><span class="history-count">${log.doneSets} séries</span></div>`).join(''):'<div class="empty empty-history"><img src="assets/webp/ui/empty-history.webp" alt="" loading="lazy" decoding="async"><p>Nenhum treino finalizado no período selecionado. Tente 90 dias ou registre uma nova sessão.</p></div>'}</div>${safetyNote()}`; }
 function renderSettings(){return `<div class="page-heading"><span class="eyebrow">SEU PERSONAL, SUAS REGRAS</span><h1>Seu <span class="headline-name">perfil</span></h1><p>Atualize seu nome, foto, objetivo, nível e divisão. As séries e o histórico continuam salvos.</p></div>
 <section class="profile-editor"><div class="profile-editor-header">${avatarMarkup('xl')}<div><span class="eyebrow">PERFIL INDIVIDUAL</span><h2>${safe(state.name||'Meu perfil')}</h2><p>Personalize sua experiência de treino.</p></div></div>
 <div class="profile-photo-actions"><label for="profilePhotoFile" class="btn btn-dark btn-sm photo-button">📷 Adicionar ou trocar foto</label><input type="file" id="profilePhotoFile" accept="image/jpeg,image/png,image/webp" class="visually-hidden-file"><button class="btn btn-ghost btn-sm" data-action="remove-photo" ${state.photo?'':'disabled'}>Remover foto</button></div><p class="muted small">A foto é recortada e reduzida automaticamente. Fica somente no navegador e será incluída no backup JSON.</p>
 <label class="profile-field"><strong>Como devemos chamar você?</strong><input id="displayName" maxlength="35" class="search-input" placeholder="Digite seu nome" value="${safe(state.name||'')}"></label>
 <div class="profile-field"><strong>Qual é o seu objetivo?</strong><p class="muted small">O app ajusta sugestões de repetição e orientação geral; não impõe carga nem ritmo.</p><div class="goal-option-grid">${goalsMarkup('settingsGoal')}</div></div>
 <div class="profile-field"><strong>Nível de experiência</strong><p class="muted small">Iniciantes fazem menos séries; avançados têm mais volume em grupos principais.</p><div class="level-grid"><button data-action="level" data-level="iniciante" class="level-card ${state.level==='iniciante'?'active':''}"><b>Iniciante</b><small>2 séries por exercício</small></button><button data-action="level" data-level="intermediario" class="level-card ${state.level==='intermediario'?'active':''}"><b>Intermediário</b><small>3 séries por exercício</small></button><button data-action="level" data-level="avancado" class="level-card ${state.level==='avancado'?'active':''}"><b>Avançado</b><small>3–4 séries (dependendo do objetivo)</small></button></div></div>
 </section>
 <div class="section-head"><h2>Escolha sua divisão</h2></div><div class="onboarding-grid"><button class="onboarding-card ${state.plan==='abc'?'active':''}" data-action="plan" data-plan="abc"><span class="big-icon">🏋️</span>${pill('DIVISÃO EM 3 DIAS')}<h2>Treino ABC</h2><p>Peito, ombros, tríceps / Costas, bíceps / Pernas e abdômen.</p><span class="goal-tag">3 treinos</span></button><button class="onboarding-card ${state.plan==='quad'?'active':''}" data-action="plan" data-plan="quad"><span class="big-icon">⚡</span>${pill('DIVISÃO EM 4 DIAS')}<h2>Foco em pernas</h2><p>Quadríceps e glúteos / Superiores / Posterior e glúteos / Superiores.</p><span class="goal-tag">4 treinos</span></button></div>
 <div class="setup-footer"><p>Qualquer pessoa pode selecionar a divisão que preferir. Adapte o plano a lesões e limitações com acompanhamento profissional.</p><button class="btn btn-primary" data-action="save-settings">Salvar perfil e abrir meus treinos →</button></div>
 <div class="section-head"><h2>Dados e privacidade</h2></div><div class="info-card"><p class="muted" style="line-height:1.7">Nome, foto, objetivo, cargas e treinos ficam no armazenamento deste navegador. Sem conta e sem envio para servidor. Ao trocar de domínio ou aparelho, exporte e importe um backup.</p><div class="control-strip"><button class="btn btn-dark btn-sm" data-action="export">↓ Fazer backup (JSON)</button><label class="btn btn-dark btn-sm" for="importFile" style="cursor:pointer">↑ Importar backup</label><input type="file" id="importFile" accept="application/json" class="hidden"><button class="btn btn-ghost btn-sm" data-action="reset">Limpar histórico</button></div></div>
 <div class="section-head"><h2>Fontes e referências</h2></div><div class="info-card link-list"><a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/" target="_blank" rel="noopener noreferrer">↗ ACSM: recomendações de treinamento de força</a><a href="https://www.nsca.com/education/articles/kinetic-select/determination-of-resistance-training-frequency/" target="_blank" rel="noopener noreferrer">↗ NSCA: frequência e recuperação</a><a href="https://www.acefitness.org/resources/everyone/exercise-library/154/seated-leg-press/" target="_blank" rel="noopener noreferrer">↗ ACE: preparação do leg press</a><a href="https://www.acefitness.org/resources/everyone/exercise-library/158/seated-lat-pulldown/" target="_blank" rel="noopener noreferrer">↗ ACE: execução da puxada alta</a><a href="https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance" target="_blank" rel="noopener noreferrer">↗ MDN: narração por voz no navegador</a><a href="https://github.com/RepDB/exercise-dataset" target="_blank" rel="noopener noreferrer">↗ Biblioteca ilustrada RepDB (para consulta, não incorporada)</a><p class="muted small" style="line-height:1.6">As animações SVG são ilustrações originais do projeto, não filmagens. Não representam técnica perfeita nem substituem acompanhamento profissional. Nenhuma mídia externa foi copiada ou redistribuída.</p></div>${safetyNote()}`;}
 function safetyNote(){return `<div class="safe-warning">✦ <b>Orientação importante:</b> este aplicativo é educativo e não observa sua postura em tempo real. Pare se houver dor aguda, tontura ou falta de ar incomum. Para começar, prefira pesos leves e orientação presencial se possível.</div>`;}
  // Concise cues for movements whose equipment geometry was revised in 1.9.
  // Orientações curtas também disponíveis nas demonstrações em 2D.
  const VISUAL_FIRST=new Set(["supino","supino_inclinado","crucifixo","puxada_alta","remada_baixa","remada_unilateral","face_pull","leg_press","extensora","afundo","romeno","flexora","hip_thrust","abdutora","bulgaro","supino_maquina","step_up","coice_polia","elevacao_lateral","triceps_polia","triceps_frances","rosca_direta","rosca_martelo","panturrilha","prancha","agachamento_goblet","abdominal"]);
  const MOTION_EXPLAINS={"supino": "Barra ou halteres sobem na fase de força e descem com controle.", "supino_inclinado": "Deitado num banco inclinado, mantenha as costas apoiadas e empurre os halteres acima da parte superior do peito, sem levantar os ombros.", "crucifixo": "Vista superior do banco: abra os braços em arco com os cotovelos levemente flexionados e feche sobre o peito. Os halteres não fazem o caminho do supino.", "elevacao_lateral": "Em pé e com o tronco estável, eleve os halteres para os lados até aproximadamente a altura dos ombros e volte devagar.", "triceps_polia": "Na polia alta, mantenha os cotovelos perto do corpo. Estenda os braços para baixo sem jogar o peso do tronco sobre o pegador.", "triceps_frances": "Com os cotovelos apontando para cima, estenda os antebraços levando o halter acima da cabeça; evite abrir ou balançar os cotovelos.", "puxada_alta": "Sentado e com as coxas apoiadas, traga a barra da polia alta à parte superior do peito. Não puxe atrás da cabeça.", "remada_baixa": "Sentado com pés apoiados, puxe o pegador da polia baixa na direção da cintura. Os cotovelos vão para trás enquanto a coluna permanece neutra.", "remada_unilateral": "Mão e joelho ficam sobre o banco, costas neutras. O outro braço puxa o halter junto ao tronco até o quadril e retorna sem girar os ombros.", "face_pull": "Na polia alta com corda, puxe as mãos em direção ao rosto e afaste os cotovelos sem inclinar o tronco.", "rosca_direta": "Mantenha os cotovelos próximos ao tronco. Suba a barra flexionando os cotovelos e desça sem inclinar o corpo.", "rosca_martelo": "Segure os halteres com palmas voltadas uma para a outra e flexione os cotovelos sem girar os punhos ou balançar o tronco.", "agachamento": "Quadril desce e depois volta à posição de pé.", "leg_press": "Os pés afastam a plataforma e voltam com controle.", "extensora": "A canela sobe contra o rolo e desce controlando a volta.", "afundo": "Com um pé à frente e outro atrás, flexione os joelhos para descer com controle. Mantenha o equilíbrio no pé dianteiro.", "romeno": "Leve o quadril para trás, mantendo a coluna neutra e a barra próxima às pernas. Flexione os joelhos apenas ligeiramente.", "flexora": "Na mesa flexora deitada, mantenha o quadril apoiado. O joelho permanece próximo ao eixo da máquina enquanto a canela dobra e o rolo acompanha os tornozelos.", "panturrilha": "Mantenha as pontas dos pés apoiadas e eleve os calcanhares lentamente. Evite dar impulsos com os joelhos.", "prancha": "Apoie antebraços e pontas dos pés, alinhe ombros, quadril e tornozelos e sustente a posição respirando; não é um exercício de subir e descer.", "hip_thrust": "Com a parte alta das costas apoiada no banco e os pés firmes, eleve o quadril até alinhar o tronco, sem arquear demais a lombar.", "abdutora": "Na cadeira abdutora, sente-se com as costas no encosto e abra os joelhos afastando as almofadas laterais, sem balançar o tronco.", "bulgaro": "Mantenha o peito do pé traseiro sobre um banco baixo. Desça flexionando o joelho da frente e suba com apoio no pé dianteiro.", "desenvolvimento": "Na visão frontal, veja os dois halteres saindo da altura dos ombros e subindo acima da cabeça. Os punhos acompanham os antebraços e o tronco não inclina para trás.", "supino_maquina": "Com costas e quadril apoiados, empurre as alças da máquina à frente, na altura do peito. Retorne lentamente sem bater as placas.", "agachamento_goblet": "Segure o halter junto ao peito, flexione quadril e joelhos com os pés inteiramente apoiados e retorne sem perder a postura.", "step_up": "Ponha um pé no degrau firme. Suba usando principalmente essa perna, mantendo o tronco estável, e desça com controle.", "abdominal": "Deitado no colchonete e com os joelhos flexionados, eleve um pouco os ombros. Mantenha a lombar apoiada e evite puxar o pescoço.", "coice_polia": "Com a tornozeleira presa à polia baixa, estenda a perna para trás com o quadril estável, sem arquear a lombar.", "__default": "A imagem mostra uma sequência educativa. Primeiro observe a posição inicial, depois veja qual parte do corpo se move e por fim retorne com controle."};
  function motionExplainMarkup(ex){const text=MOTION_EXPLAINS[ex.id]||MOTION_EXPLAINS['__default'];return `<div class="motion-explain"><strong>Como entender este desenho</strong><p>${safe(text)}</p></div>`;}
  const MOTION_CUES={
   remada_baixa:['Pés apoiados e coluna neutra','Pegador vai até a cintura','Não balance o tronco'],
   desenvolvimento:['Dois halteres à altura dos ombros','Empurre acima da cabeça','Evite arquear a lombar'],
   crucifixo:['Vista superior: banco e tronco fixos','Abra os braços em arco suave','Cotovelos sem rigidez'],
   leg_press:['Quadril e lombar apoiados','Joelhos seguem a direção dos pés','Não trave os joelhos'],
   extensora:['Alinhe joelho e eixo do aparelho','O rolo acompanha a canela','Não use impulso'],
   abdutora:['Encoste costas no banco','Abra os joelhos com controle','Não balance o tronco'],
   agachamento:['Mantenha os pés apoiados','Joelhos acompanham os pés','Pare na amplitude confortável'],
   afundo:['Mantenha o pé dianteiro firme','Desça com equilíbrio','Evite bater o joelho no chão'],
   bulgaro:['Pé traseiro apoiado no banco','Equilíbrio na perna da frente','Comece sem carga'],
   step_up:['Comece com degrau baixo','Suba usando a perna apoiada','Desça sem se jogar'],
   hip_thrust:['Apoie a parte alta das costas','Eleve o quadril sem arquear lombar','Mantenha os pés firmes'],
   coice_polia:['Tornozeleira ligada à polia baixa','Pé de apoio firme e quadril estável','Mova a perna para trás sem arquear a lombar'],
   flexora:['Joelho alinhado ao eixo','Quadril fica apoiado','Não chute o rolo'],
   romeno:['Leve o quadril para trás','Mantenha carga perto das pernas','Não arredonde a coluna']
  };
  function motionCueMarkup(ex){
   const cues=MOTION_CUES[ex.id]; if(!cues)return '';
   return `<div class="motion-cue-panel" id="motionCuePanel" aria-label="Três pontos de atenção"><strong>3 pontos para observar</strong><ol>${cues.map(c=>`<li>${safe(c)}</li>`).join('')}</ol></div>`;
  }
 function openModal(id,track){const ex=exById[id];if(!ex)return;const prev=state.history.slice().reverse().find(h=>h.details?.[id]?.sets?.some(s=>s.done));const lastCompleted=prev?.details?.[id]?.sets?.filter(s=>s.done)||[];const pastLoads=lastCompleted.map(s=>parseFloat(s.kg)).filter(n=>Number.isFinite(n)&&n>0);const prevHtml=prev?`<div class="body-card"><h3>Seu último registro</h3><p>${lastCompleted.length} séries concluídas${pastLoads.length?` · até ${Math.max(...pastLoads)} kg`:''} em ${safe(dateString(new Date(prev.date)))}.</p><p style="margin-top:7px">Aumente a carga apenas quando dominar a técnica e completar a faixa de repetições com controle.</p></div>`:'';const prefersReduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;rememberDialogTrigger();activeModal={id,track:!!track,viewerMode:'2d',guideStep:0,demoMode:prefersReduced?'still':(VISUAL_FIRST.has(id)?'poses':'motion')};clearInterval(restTimer);$('modalRoot').innerHTML=`<div class="modal-overlay" id="modalOverlay"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><div class="modal-header"><div><span class="eyebrow">${safe(ex.muscle.toUpperCase())} • GUIA DE EXECUÇÃO</span><h2 id="modalTitle">${safe(ex.name)}</h2><p>${safe(ex.equip)} · ${safe(ex.difficulty)}</p></div><button class="close-btn" data-action="close" aria-label="Fechar">×</button></div><div class="modal-grid"><div class="demo-side"><div class="motion-title"><span class="eyebrow">DEMONSTRAÇÃO PASSO A PASSO</span><span class="motion-pill" id="motionLabel">● Ilustração animada</span></div><div class="viewer-tabs" role="group" aria-label="Tipo de demonstração"><button data-action="viewer-mode" data-viewer="2d" class="view-tab active" aria-pressed="true">▶ Animado</button><button data-action="viewer-mode" data-viewer="guide" class="view-tab" aria-pressed="false">① Etapas</button></div><section class="guide-stage" id="guideStage" hidden aria-label="Execução em três etapas"><div class="guide-picture"><img class="guide-frame" id="guideFrame" src="${frameFor(ex.id,'start')}" alt="${safe(ex.name)} — posição inicial"></div><div class="guide-copy" aria-live="polite"><span class="guide-counter" id="guideCounter">PASSO 1 DE 3</span><h3 id="guideHeading">Prepare sua posição</h3><p id="guideDescription">${safe(ex.steps[0])}</p></div><div class="guide-controls"><button data-action="guide-prev" class="guide-button" id="guidePrev" disabled>← Voltar</button><button data-action="guide-speak" class="guide-button guide-audio" aria-label="Ouvir esta etapa">♫ Ouvir</button><button data-action="guide-next" class="guide-button guide-primary" id="guideNext">Próximo →</button></div></section>${motionCueMarkup(ex)}<img class="demo-image motion-image" id="motionImage" src="${activeModal.demoMode==='poses'?imageFor(ex.id):demoFor(ex.id,activeModal.demoMode)}" alt="${activeModal.demoMode==='poses'?`Posição inicial e final de ${safe(ex.name)}`:`Demonstração esquemática ${safe(ex.name)} entre a posição inicial e a fase principal`}"><div class="motion-controls" id="motionControls" role="group" aria-label="Controles da demonstração"><button data-action="demo-mode" data-mode="motion" class="motion-button ${activeModal.demoMode==='motion'?'active':''}" aria-pressed="${activeModal.demoMode==='motion'}">▶ Normal</button><button data-action="demo-mode" data-mode="motion-slow" class="motion-button ${activeModal.demoMode==='motion-slow'?'active':''}" aria-pressed="${activeModal.demoMode==='motion-slow'}">◷ Devagar</button><button data-action="demo-mode" data-mode="still" class="motion-button ${activeModal.demoMode==='still'?'active':''}" aria-pressed="${activeModal.demoMode==='still'}">⏸ Pausar</button><button data-action="demo-mode" data-mode="poses" class="motion-button ${activeModal.demoMode==='poses'?'active':''}" aria-pressed="${activeModal.demoMode==='poses'}">▣ Posições</button></div><p class="motion-caption" id="motionCaption">${activeModal.demoMode==='poses'?'Compare a posição inicial com a fase principal. Primeiro veja onde o corpo começa; depois veja o que realmente se move.':(activeModal.demoMode==='still'?'Demonstração pausada. Use esta visão para localizar braços, pernas e equipamento antes de assistir ao movimento.':(activeModal.demoMode==='motion-slow'?'Animação lenta. Repare especialmente na parte do corpo destacada na explicação abaixo.':'Animação em repetição. Observe a direção principal do movimento antes de copiar a sequência.'))}</p>${motionExplainMarkup(ex)}${muscleDiagram(ex.muscle)}${coachPanel(ex)}<div class="card-row"><div><h3>Seu treinador explica</h3><p class="muted small" style="margin-top:5px">Passo a passo com foco em segurança</p></div><button class="btn btn-dark btn-sm" data-action="speak">♫ Ouvir</button></div>${ex.steps.map((s,i)=>`<div class="step-item"><span>${i+1}</span><p>${safe(s)}</p></div>`).join('')}<div class="cue-box"><b>✓ Dica do personal</b><br>${safe(ex.tip)}</div><div class="cue-box warning"><b>! Evite este erro</b><br>${safe(ex.mistake)}</div><p class="muted small" style="margin-top:12px">Respiração: ${safe(ex.breath)}</p></div><div class="steps-side"><div class="card-row"><h3>${track?'Registrar suas séries':'Plano sugerido'}</h3>${pill(ex.muscle)}</div><div class="stat-grid" style="margin-top:13px"><div class="stat-card"><span class="stat-label">SÉRIES</span><strong>${setsFor(ex)}</strong></div><div class="stat-card"><span class="stat-label">REPETIÇÕES</span><strong style="font-size:22px">${safe(repsFor(ex))}</strong></div></div><p class="personal-target">${safe(goalInfo().icon+" "+goalInfo().name)} · ${safe(state.level)}. Adapte a carga mantendo o movimento controlado.</p>${prevHtml}<div class="body-card"><h3>Descanso recomendado</h3><p>${restFor(ex)} segundos entre as séries. Aguarde recuperar o fôlego para preservar a técnica.</p></div>${track?`<div class="set-tracker"><div class="card-row"><h3>Suas séries</h3><span class="muted small">Carga em kg (opcional)</span></div>${previousExerciseSets(ex.id).length?`<div class="repeat-loads"><button type="button" class="btn btn-dark btn-sm" data-action="copy-last">↺ Usar valores anteriores</button><small>Preenche campos vazios sem marcar séries feitas.</small></div>`:''}<div id="setList">${renderSetList(ex)}</div><div id="restContainer"></div><button class="btn btn-dark btn-sm" data-action="rest-manual" style="margin-top:14px">◷ Iniciar descanso de ${restFor(ex)}s</button></div>`:`<div class="body-card"><h3>Quer treinar agora?</h3><p>Escolha um dia do plano para registrar suas séries, carga e repetições. Aqui você pode estudar o movimento.</p><button class="btn btn-primary btn-sm" style="margin-top:12px" data-action="go-workout">Ir para o meu treino →</button></div>`}</div></div><div class="modal-bottom"><span class="muted small">Aprenda o movimento antes de aumentar a carga.</span><button class="btn btn-primary btn-sm" data-action="close">Entendi ✓</button></div></section></div>`;document.body.style.overflow='hidden';if(track){renderRest();if(activeRest()?.endAt)restTimer=setInterval(renderRest,1000);}activateDialogFocus();}
 function changeDemo(mode){
   if(!activeModal || !['motion','motion-slow','still','poses'].includes(mode))return;
   activeModal.demoMode=mode;
   const el=$('motionImage');if(!el)return;
   el.src=mode==='poses'?imageFor(activeModal.id):demoFor(activeModal.id,mode);
   el.alt=mode==='poses'?'Posição inicial e final lado a lado':'Movimento esquemático de '+exById[activeModal.id].name;
   const caption=$('motionCaption');if(caption) caption.textContent=mode==='poses'?'Compare a posição inicial com a fase principal. Primeiro veja onde o corpo começa; depois veja o que realmente se move.':mode==='still'?'Demonstração pausada. Use esta visão para localizar braços, pernas e equipamento antes de assistir ao movimento.':mode==='motion-slow'?'Animação lenta. Repare especialmente na parte do corpo destacada na explicação abaixo.':'Animação em repetição. Observe a direção principal do movimento antes de copiar a sequência.';
   document.querySelectorAll('.motion-button').forEach(btn=>{const selected=btn.dataset.mode===mode;btn.classList.toggle('active',selected);btn.setAttribute('aria-pressed',String(selected));});
 }
 function renderGuideStep(){
   if(!activeModal)return;
   const ex=exById[activeModal.id], n=Math.max(0,Math.min(2,activeModal.guideStep||0));
   const titles=ex.type==='plank'?['Prepare seus apoios','Ative o tronco','Sustente e respire']:['Prepare sua posição','Execute o movimento','Retorne com controle'];
   const frame=n===1 || (n===2 && ex.type==='plank')?'finish':'start';
   const picture=$('guideFrame');if(picture){picture.src=frameFor(ex.id,frame);picture.alt=`${ex.name}: ${titles[n]}. Esquema ilustrativo.`;}
   if($('guideCounter'))$('guideCounter').textContent=`PASSO ${n+1} DE 3`;
   if($('guideHeading'))$('guideHeading').textContent=titles[n];
   if($('guideDescription'))$('guideDescription').textContent=ex.steps[n] || ex.tip;
   if($('guidePrev'))$('guidePrev').disabled=n===0;
   if($('guideNext')){ $('guideNext').disabled=n===2;$('guideNext').textContent=n===2?'Concluído ✓':'Próximo →'; }
 }
 function guideMove(delta){if(!activeModal || activeModal.viewerMode!=='guide')return;activeModal.guideStep=Math.max(0,Math.min(2,(activeModal.guideStep||0)+delta));renderGuideStep();}
 function guideSpeak(){if(!activeModal)return;const ex=exById[activeModal.id],i=activeModal.guideStep||0;if(!('speechSynthesis'in window)){notify('Voz indisponível neste navegador.');return;}try{speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(`Passo ${i+1}. ${ex.steps[i]||ex.tip}`);utterance.lang='pt-BR';utterance.rate=.87;speechSynthesis.speak(utterance);}catch{notify('Não foi possível reproduzir a voz.');}}
  function changeViewer(mode){
    if(!activeModal || !['2d','guide'].includes(mode))return;
    const useGuide=mode==='guide';activeModal.viewerMode=mode;
    if($('motionImage'))$('motionImage').hidden=useGuide;
    if($('motionControls'))$('motionControls').hidden=useGuide;
    if($('guideStage'))$('guideStage').hidden=!useGuide;
    if(useGuide)renderGuideStep();
    if($('motionLabel'))$('motionLabel').textContent=useGuide?'● Posições ampliadas':'● Ilustração animada';
    document.querySelectorAll('.view-tab').forEach(b=>{const on=b.dataset.viewer===mode;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
    const caption=$('motionCaption');if(caption)caption.textContent=useGuide?'Toque em Próximo para ver cada posição ampliada e ler a explicação.':'Animação ilustrativa. Observe a execução, sem copiar a postura cegamente.';
  }
 const MACHINE_SETUPS={
  leg_press:['Leg press 45°','Ajuste o banco para manter quadril e lombar apoiados durante a descida.','Não solte a trava de segurança até estar bem posicionado(a).','Trava • encosto • plataforma'],
  extensora:['Cadeira extensora','Alinhe o eixo do aparelho ao joelho e coloque o rolo sobre a parte baixa da canela.','Evite usar impulso ou movimentar o quadril para levantar a carga.','Encosto • eixo do joelho • rolo'],
  flexora:['Mesa flexora','Ajuste o rolo à região acima do calcanhar, mantendo o quadril apoiado no banco.','Evite forçar a lombar ou projetar o quadril para cima.','Rolo • apoio • amplitude'],
  puxada_alta:['Puxador alto','Ajuste o apoio das coxas e escolha um pegador confortável antes de puxar.','Não puxe a barra atrás da nuca.','Apoio de coxa • pegador • polia'],
  remada_baixa:['Remada sentada','Posicione os pés nos apoios e o tronco neutro antes de iniciar.','Não balance o corpo de trás para a frente.','Apoio de pés • banco • pegador'],
  supino_maquina:['Supino na máquina','Regule o banco para que os pegadores fiquem próximos à altura do peito.','Não deixe os ombros perderem o controle na volta.','Banco • altura dos pegadores'],
  triceps_polia:['Polia alta','Regule a altura da polia e mantenha espaço para estender os cotovelos.','Evite transformar o exercício em uma flexão do tronco.','Pegador • torre de pesos • polia'],
  abdutora:['Cadeira abdutora','Ajuste os apoios laterais e sente-se com as costas apoiadas.','Evite forçar uma amplitude desconfortável.','Encosto • apoio dos joelhos'],
  coice_polia:['Polia baixa','Fixe a tornozeleira de modo firme e posicione-se com apoio estável.','Evite hiperestender a lombar ao levar a perna para trás.','Tornozeleira • ajuste de altura'],
  hip_thrust:['Banco de apoio','Apoie a parte alta das costas num banco firme e mantenha os pés estáveis.','Evite estender excessivamente a lombar na subida.','Banco estável • apoio de pés'],
  supino:['Banco com barra','Ajuste a altura dos suportes e tenha uma pessoa de apoio se for usar carga desafiadora.','Evite treinar até a falha sob barra livre sem segurança adequada.','Suportes • travas • banco'],
  supino_inclinado:['Banco inclinado','Ajuste o encosto em inclinação moderada antes de pegar os halteres.','Não deixe os halteres caírem para além da amplitude controlável.','Inclinação • estabilidade'],
  bulgaro:['Banco baixo','Posicione o pé traseiro num banco estável e apoie o pé dianteiro por inteiro.','Evite perder equilíbrio por escolher banco alto demais.','Banco • apoio de pés']
 };
 function coachPanel(ex){
  const machine=MACHINE_SETUPS[ex.id], equipment=machine||[ex.equip,'Regule sua postura, a posição dos apoios e a carga antes de começar.','Não use carga que impeça realizar o movimento com controle.','Apoio • pegada • amplitude'];
  return `<section class="coach-panel" data-coach-id="${safe(ex.id)}" aria-label="Personal interativo">
   <div class="coach-panel-top"><div><span class="eyebrow">✦ PERSONAL INTERATIVO</span><h3>Treine com orientação</h3><p>Avance pelos passos ou ouça as instruções em português.</p></div><span class="coach-pulse" aria-hidden="true">♫</span></div>
   <div class="coach-instruction" aria-live="polite"><div class="coach-step-meta"><span id="coachStepNum">PASSO 1 DE ${ex.steps.length}</span><span>EXPLICAÇÃO DO MOVIMENTO</span></div><p id="coachStepText">${safe(ex.steps[0])}</p></div>
   <div class="coach-step-dots">${ex.steps.map((s,i)=>`<button type="button" data-coach="goto" data-i="${i}" class="coach-dot ${i===0?'active':''}" aria-label="Mostrar passo ${i+1}" aria-pressed="${i===0}">${i+1}</button>`).join('')}</div>
   <div class="coach-toolbar"><button type="button" class="btn btn-dark btn-sm" data-coach="previous">← Anterior</button><button type="button" class="btn btn-dark btn-sm" data-coach="next">Próximo →</button><button type="button" class="btn btn-primary btn-sm" data-coach="read">♫ Ouvir passo</button><button type="button" class="btn btn-dark btn-sm" data-coach="all">▷ Ouvir guia</button><button type="button" class="btn btn-dark btn-sm" data-coach="stop">■ Parar voz</button></div>
   <p class="coach-status" id="coachStatus" role="status">Narração opcional. A voz é produzida pelo próprio navegador.</p>
   <div class="coach-equipment"><span class="eyebrow">PREPARE O EQUIPAMENTO</span><div class="coach-equipment-main"><div class="coach-equipment-illustration" aria-hidden="true"><svg viewBox="0 0 144 126" xmlns="http://www.w3.org/2000/svg"><path d="M19 111H127M31 110V21H110V110M42 31H99M48 41H90" stroke="#789a97" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/><rect x="57" y="53" width="26" height="42" rx="5" fill="#324e59" stroke="#c6f65b" stroke-width="2"/><path d="M24 75H54M84 77H115M29 78V103M114 77V103" stroke="#c6f65b" stroke-width="7" stroke-linecap="round"/><circle cx="39" cy="21" r="8" fill="#c6f65b"/><circle cx="110" cy="21" r="8" fill="#c6f65b"/></svg></div><div><h4>${safe(equipment[0])}</h4><p>${safe(equipment[1])}</p><small>${safe(equipment[3])}</small></div></div><p class="coach-caution">Atenção: ${safe(equipment[2])}</p></div>
   </section>`;
 }
 // Última sessão concluída do exercício, preservando índices e sem copiar status "feito".

 // Substituições são locais ao treino em andamento e não tocam no plano original.
 function hasSetData(id){const entry=sessionFor()[id];return Array.isArray(entry?.sets)&&entry.sets.some(x=>x&&(x.done||String(x.kg??'').trim()||String(x.reps??'').trim()));}
 function availableSwaps(original){
  const occupied=new Set(exerciseSlots().filter(slot=>slot.original!==original).map(slot=>slot.id));
  const sameMuscle=DATA.exercises.filter(ex=>ex.id!==original&&ex.muscle===exById[original]?.muscle).map(ex=>ex.id);
  return [...new Set([...(SWAP_ALTERNATIVES[original]||[]),...sameMuscle])].filter(id=>id!==activeExerciseId(original)&&exById[id]&&!occupied.has(id)&&!hasSetData(id));
 }
 function openSwapPicker(original){
  if(!workoutBaseIds().includes(original))return;
  const active=activeExerciseId(original);
  if(hasSetData(active)){notify('Já existem séries nesse exercício. Para não perder os dados, a troca só é possível antes da primeira série.');return;}
  const opener=document.activeElement;closeModal();rememberDialogTrigger(opener);swapOrigin=original;
  const options=availableSwaps(original),changed=active!==original;
  const altButtons=options.map(id=>{const ex=exById[id];return `<button class="swap-option" data-action="swap-choose" data-origin="${safe(original)}" data-id="${safe(id)}"><img loading="lazy" src="${imageFor(id)}" alt="${safe(ex.name)}"><span><strong>${safe(ex.name)}</strong><small>${safe(ex.muscle)} • ${safe(ex.equip)}</small></span><span class="swap-arrow" aria-hidden="true">→</span></button>`;}).join('');
  $('modalRoot').innerHTML=`<div class="modal-overlay" id="modalOverlay"><section class="modal swap-dialog" role="dialog" aria-modal="true" aria-labelledby="swapTitle"><div class="modal-header"><div><span class="eyebrow">ALTERNATIVAS PARA O TREINO ATUAL</span><h2 id="swapTitle">Aparelho ocupado?</h2><p>Substituir ${safe(exById[original].name)} no treino ${safe(selectedDay().letter)}.</p></div><button class="close-btn" data-action="close" aria-label="Fechar">×</button></div><div class="swap-inner"><p class="muted small">Sugestões com grupo muscular relacionado; o movimento e a carga podem ser diferentes. Confira a execução antes de começar.</p><p class="swap-preserve">✓ Permanecem ${baseSetsFor(exById[original])} séries planejadas. Nenhuma série anterior é transferida automaticamente.</p>${altButtons||'<p class="muted">Não há outra opção cadastrada e livre de conflito com os exercícios deste treino.</p>'}${changed?`<button class="btn btn-dark swap-return" data-action="swap-choose" data-origin="${safe(original)}" data-id="${safe(original)}">↶ Voltar para ${safe(exById[original].name)}</button>`:''}</div></section></div>`;
  document.body.style.overflow='hidden';activateDialogFocus();
 }
 function chooseSwap(original,id){
  if(swapOrigin!==original||!workoutBaseIds().includes(original))return;
  const current=activeExerciseId(original),reset=id===original;
  if(hasSetData(current)||(!reset&&!availableSwaps(original).includes(id))){notify('Troca indisponível: já existem séries registradas ou o exercício está no treino.');return;}
  const ses=sessionFor();if(!ses._swaps||typeof ses._swaps!=='object')ses._swaps={};
  if(reset)delete ses._swaps[original];else ses._swaps[original]=id;
  if(ses._rest?.exerciseId===current)delete ses._rest;
  save();closeModal();render();
  notify(reset?'Exercício original restaurado.':'Exercício trocado. Confira a técnica e ajuste a carga com segurança.');
 }
 function workoutHasData(){
 const ses=sessionFor();
 return Object.keys(ses).some(id=>Object.hasOwn(exById,id)&&hasSetData(id));
}
function editAllowed(){
 if(workoutHasData()){notify('Este treino já tem séries preenchidas. Finalize-o antes de editar os exercícios, para preservar seus registros.');return false;}
 return true;
}
function editorOptions(mode,target){
 const used=new Set(workoutBaseIds()),ref=exById[target],curated=SWAP_ALTERNATIVES[target]||[];
 const allowed=DATA.exercises.filter(ex=>!used.has(ex.id)&&(mode==='add'||ex.muscle===ref?.muscle));
 return allowed.sort((a,b)=>{
  const pa=mode==='replace'&&curated.includes(a.id)?0:1,pb=mode==='replace'&&curated.includes(b.id)?0:1;
  return pa-pb||a.muscle.localeCompare(b.muscle,'pt-BR')||a.name.localeCompare(b.name,'pt-BR');
 });
}
function renderTargetPanel(){
 if(planEditorMode!=='targets')return '';
 const id=planEditorTarget,ex=exById[id];
 if(!ex||!workoutBaseIds().includes(id))return '';
 const override=exerciseTarget(ex);
 return `<div class="routine-target-panel" aria-label="Metas individuais de exercício">
 <div class="card-row"><div><h3>Metas para ${safe(ex.name)}</h3><p class="muted small">Personalização apenas do treino ${safe(selectedDay().letter)}.</p></div><button class="btn btn-dark btn-sm" data-action="edit-cancel">Voltar</button></div>
 <div class="routine-target-fields"><label>Séries <input id="editTargetSets" type="number" inputmode="numeric" min="1" max="8" step="1" value="${setsFor(ex)}"></label><label>Repetições ou duração <input id="editTargetReps" type="text" maxlength="16" value="${safe(repsFor(ex))}" placeholder="8–12 ou 30 s"></label></div>
 <p class="muted small">Escolha entre 1 e 8 séries. Para as repetições use 8–12; para exercício por tempo use 30 s, por exemplo. Confira a carga e a execução.</p>
 <div class="routine-actions"><button class="btn btn-primary btn-sm" data-action="edit-target-save" data-id="${safe(id)}">Salvar metas</button><button class="btn btn-dark btn-sm" data-action="edit-target-reset" data-id="${safe(id)}" ${override?'':'disabled'}>Restaurar metas padrão</button></div>
 </div>`;
}
function renderPlanEditor(){
 const ids=workoutBaseIds(),isDefault=ids.join(',')===selectedDay().ex.join(',');
 const locked=workoutHasData();
 const rows=ids.map((id,i)=>{const ex=exById[id];return `<div class="routine-item"><span class="routine-index">${i+1}</span><img loading="lazy" src="${imageFor(id)}" alt=""><div class="routine-info"><strong>${safe(ex.name)}</strong><small>${safe(ex.muscle)} · ${safe(ex.equip)} · ${setsFor(ex)} séries · ${safe(repsFor(ex))}</small></div><div class="routine-buttons"><button type="button" data-action="edit-move" data-id="${safe(id)}" data-dir="-1" ${locked||i===0?'disabled':''} aria-label="Mover ${safe(ex.name)} para cima">↑</button><button type="button" data-action="edit-move" data-id="${safe(id)}" data-dir="1" ${locked||i===ids.length-1?'disabled':''} aria-label="Mover ${safe(ex.name)} para baixo">↓</button><button type="button" data-action="edit-pick" data-id="${safe(id)}" ${locked?'disabled':''}>Trocar</button><button type="button" data-action="edit-target" data-id="${safe(id)}" ${locked?'disabled':''}>Séries/reps</button><button type="button" data-action="edit-remove" data-id="${safe(id)}" ${locked||ids.length===1?'disabled':''}>Remover</button></div></div>`;}).join('');
 const picking=planEditorMode==='replace'||planEditorMode==='add';
 const choices=picking?editorOptions(planEditorMode,planEditorTarget):[];
 const selection=picking?`<div class="routine-picker"><div class="card-row"><h3>${planEditorMode==='replace'?'Escolher substituto do mesmo grupo muscular':'Adicionar exercício da biblioteca'}</h3><button type="button" class="btn btn-dark btn-sm" data-action="edit-cancel">Voltar</button></div><p class="muted small">${planEditorMode==='replace'?'Exercícios com o mesmo grupo muscular principal. Confira diferenças de equipamento e execução.':'Escolha qualquer exercício ainda não utilizado neste treino.'}</p><div class="routine-options">${choices.map(ex=>`<button type="button" class="routine-choice" data-action="edit-select" data-id="${safe(ex.id)}"><img loading="lazy" src="${imageFor(ex.id)}" alt=""><span><strong>${safe(ex.name)}</strong><small>${safe(ex.muscle)} · ${safe(ex.equip)}</small></span></button>`).join('')||'<p class="muted">Não existem alternativas disponíveis nesta categoria.</p>'}</div></div>`:'';
 if(!$('modalRoot').querySelector('[role="dialog"]'))rememberDialogTrigger();
 $('modalRoot').innerHTML=`<div class="modal-overlay" id="modalOverlay"><section class="modal routine-editor" role="dialog" aria-modal="true" aria-labelledby="routineTitle"><div class="modal-header"><div><span class="eyebrow">PLANO PERSONALIZÁVEL • SEM 3D</span><h2 id="routineTitle">Editar treino ${safe(selectedDay().letter)}</h2><p>${safe(selectedDay().title)} · ${ids.length} exercícios</p></div><button class="close-btn" data-action="close" aria-label="Fechar">×</button></div><div class="routine-body"><p class="muted small">Mude a ordem com as setas, troque, remova ou adicione exercícios. Seu plano ABC ou pernas/superiores continua como modelo inicial. O histórico anterior não é alterado.</p>${locked?'<p class="routine-warning">Existem séries preenchidas neste treino. A edição fica bloqueada até concluir a sessão.</p>':''}<div class="routine-list">${rows}</div><div class="routine-actions"><button class="btn btn-primary btn-sm" data-action="edit-add" ${locked||ids.length>=10?'disabled':''}>+ Adicionar exercício</button><button class="btn btn-dark btn-sm" data-action="edit-reset" ${locked||isDefault?'disabled':''}>↶ Restaurar treino original</button></div>${selection}${renderTargetPanel()}<p class="muted small">Máximo de 10 exercícios e mínimo de 1 por dia. Pesos digitados ou séries concluídas bloqueiam a edição deste treino até ele ser finalizado.</p></div></section></div>`;
 document.body.style.overflow='hidden';activateDialogFocus();
}
function openPlanEditor(index){
 if(index!==undefined){const n=Number(index);if(!Number.isInteger(n)||n<0||n>=plan().days.length)return;if(n!==currentDayIndex()){state.selected[state.plan]=n;save();render();}}
 closeModal();planEditorMode='';planEditorTarget=null;renderPlanEditor();
}
function editRoutine(action,id,delta){
 if(action==='cancel'){planEditorMode='';planEditorTarget=null;renderPlanEditor();return;}
 if(!editAllowed())return;
 const ids=workoutBaseIds();
 if(action==='target'){if(!ids.includes(id))return;planEditorMode='targets';planEditorTarget=id;renderPlanEditor();return;}
 if(action==='pick'){if(!ids.includes(id))return;planEditorMode='replace';planEditorTarget=id;renderPlanEditor();return;}
 if(action==='add'){if(ids.length>=10){notify('O treino pode ter no máximo 10 exercícios.');return;}planEditorMode='add';planEditorTarget=null;renderPlanEditor();return;}
 if(action==='target-save'||action==='target-reset'){
 if(!ids.includes(id))return;
 if(!state.workoutTargets||typeof state.workoutTargets!=='object'||Array.isArray(state.workoutTargets))state.workoutTargets={};
 if(!state.workoutTargets[state.plan]||typeof state.workoutTargets[state.plan]!=='object')state.workoutTargets[state.plan]={};
 if(!state.workoutTargets[state.plan][selectedDay().id]||typeof state.workoutTargets[state.plan][selectedDay().id]!=='object')state.workoutTargets[state.plan][selectedDay().id]={};
 const map=state.workoutTargets[state.plan][selectedDay().id];
 if(action==='target-reset')delete map[id];
 else{
   const raw=String($('editTargetSets')?.value??'').trim(),reps=String($('editTargetReps')?.value??'').trim();
   const sets=Number(raw);
   if(!/^\d+$/.test(raw)||!Number.isInteger(sets)||sets<1||sets>8||!validRepTarget(reps)){notify('Use 1–8 séries, repetições como 8–12 ou tempo como 30 s.');return;}
   map[id]={sets,reps};
 }
 planEditorMode='';planEditorTarget=null;save();render();renderPlanEditor();
 notify(action==='target-reset'?'Metas padrão restauradas.':'Metas individuais atualizadas.');
}
 if(action==='reset'){if(!confirm('Restaurar os exercícios originais deste dia? O histórico anterior será preservado.'))return;
  if(state.customWorkouts?.[state.plan])delete state.customWorkouts[state.plan][selectedDay().id];
  if(state.workoutTargets?.[state.plan])delete state.workoutTargets[state.plan][selectedDay().id];
 }else if(action==='move'){const i=ids.indexOf(id),j=i+Number(delta);if(i<0||j<0||j>=ids.length||!Number.isInteger(j))return;[ids[i],ids[j]]=[ids[j],ids[i]];}
 else if(action==='remove'){if(ids.length<=1)return;const i=ids.indexOf(id);if(i<0)return;ids.splice(i,1);if(state.workoutTargets?.[state.plan]?.[selectedDay().id])delete state.workoutTargets[state.plan][selectedDay().id][id];}
 else if(action==='select'){
  if(!editorOptions(planEditorMode,planEditorTarget).some(ex=>ex.id===id))return;
  if(planEditorMode==='replace'){const i=ids.indexOf(planEditorTarget);if(i<0)return;if(state.workoutTargets?.[state.plan]?.[selectedDay().id])delete state.workoutTargets[state.plan][selectedDay().id][planEditorTarget];ids[i]=id;}
  else if(planEditorMode==='add'&&ids.length<10)ids.push(id);else return;
 }else return;
 if(action!=='reset'){
  if(!state.customWorkouts||typeof state.customWorkouts!=='object'||Array.isArray(state.customWorkouts))state.customWorkouts={};
  if(!state.customWorkouts[state.plan]||typeof state.customWorkouts[state.plan]!=='object')state.customWorkouts[state.plan]={};
  state.customWorkouts[state.plan][selectedDay().id]=ids;
 }
 const ses=sessionFor();delete ses._swaps;delete ses._rest;
 planEditorMode='';planEditorTarget=null;save();render();renderPlanEditor();
 notify(action==='reset'?'Treino original restaurado.':'Plano do treino atualizado.');
}
 function previousExerciseSets(id){
   for(let i=state.history.length-1;i>=0;i--){
     const entries=state.history[i]?.details?.[id]?.sets;
     if(Array.isArray(entries)&&entries.some(row=>row?.done))return entries;
   }
   return [];
 }
 function copyPreviousSets(){
   if(!activeModal?.track)return;
   const ex=exById[activeModal.id],previous=previousExerciseSets(ex.id);
   if(!previous.length){notify('Ainda não há séries anteriores desse exercício.');return;}
   const entry=sessionFor()[ex.id]||(sessionFor()[ex.id]={sets:[]});
   const current=getSetEntries(ex).map(row=>({...row}));let changed=0;
   for(let i=0;i<current.length;i++){
     const old=previous[i];if(!old?.done||current[i].done)continue;
     const kg=String(old.kg??'').trim(),reps=String(old.reps??'').trim();
     if(!String(current[i].kg??'').trim()&&kg&&Number.isFinite(Number(kg.replace(',','.')))&&Number(kg.replace(',','.'))>=0&&Number(kg.replace(',','.'))<=1000){current[i].kg=kg.replace(',','.');changed++;}
     if(!String(current[i].reps??'').trim()&&reps.length<=12&&reps){current[i].reps=reps;changed++;}
   }
   if(!changed){notify('As séries já estão preenchidas. Nada foi substituído.');return;}
   entry.sets=current;save();$('setList').innerHTML=renderSetList(ex);
   notify('Valores anteriores copiados. Confira antes de concluir.');
 }
 function renderSetList(ex){
   const sets=getSetEntries(ex),prior=previousExerciseSets(ex.id);
   return sets.map((entry,i)=>{
     const last=prior[i]?.done?prior[i]:null;
     const kg=String(last?.kg??'').trim(),reps=String(last?.reps??'').trim();
     const previous=[kg?`${safe(kg)} kg`:'',reps?`${safe(reps)} rep`:''].filter(Boolean).join(' × ');
     return `<div class="set-row ${entry.done?'set-completed':''}"><span class="set-index">${i+1}ª</span><label><span class="hidden">Peso da série ${i+1} em kg</span><input class="weight-input" type="number" inputmode="decimal" min="0" max="1000" step="0.5" aria-label="Peso da série ${i+1} em kg" placeholder="kg" data-set="${i}" data-field="kg" value="${safe(entry.kg)}"></label><label><span class="hidden">Repetições da série ${i+1}</span><input class="reps-input" type="text" maxlength="12" aria-label="Repetições da série ${i+1}" placeholder="reps" data-set="${i}" data-field="reps" value="${safe(entry.reps)}"></label><button class="set-done ${entry.done?'finished':''}" data-action="toggle-set" data-index="${i}" aria-pressed="${!!entry.done}" aria-label="${entry.done?'Desmarcar':'Concluir'} série ${i+1}">${entry.done?'✓ Feita':'✓ Feito'}</button>${previous?`<small class="previous-set">Anterior: ${previous}</small>`:''}</div>`;
   }).join('');
 }

 function closeModal(){const hadDialog=!!$('modalRoot').querySelector('[role="dialog"]'),hadTracker=!!activeModal?.track;activeModal=null;swapOrigin=null;planEditorMode='';planEditorTarget=null;clearInterval(restTimer);$('modalRoot').innerHTML='';document.body.style.overflow='';if(hadDialog){$('app').inert=false;document.querySelector('.mobile-nav').inert=false;}try{speechSynthesis.cancel()}catch{}window.TreinaProCoach?.stop();if(hadTracker&&page==='inicio')render();if(hadDialog)restoreDialogFocus();}
 function syncSetField(target){if(!activeModal?.track)return;const ex=exById[activeModal.id],n=Number(target.dataset.set),field=target.dataset.field;if(!ex||!['kg','reps'].includes(field)||!Number.isInteger(n)||n<0||n>=setsFor(ex))return;const ses=sessionFor(),entry=ses[ex.id]||(ses[ex.id]={sets:[]});entry.sets[n]=entry.sets[n]||{done:false,kg:'',reps:''};entry.sets[n][field]=String(target.value).slice(0,12);save();}
 function toggleSet(n){if(!activeModal?.track)return;startSessionTimer();const ex=exById[activeModal.id],all=getSetEntries(ex);if(!Number.isInteger(n)||n<0||n>=all.length)return;const ses=sessionFor(),entry=ses[ex.id]||(ses[ex.id]={sets:[]});entry.sets=all;entry.sets[n].done=!entry.sets[n].done;const marked=entry.sets[n].done;save();$('setList').innerHTML=renderSetList(ex);if(marked){if(entry.sets.some(s=>!s.done))startRest(restFor(ex));else clearRest('✓ Exercício concluído!');notify('Série concluída! Bom trabalho.');}else{notify('Série desmarcada.');}}
 // Descanso é salvo na sessão atual, inclusive ao fechar a explicação ou atualizar a página.
 function activeRest(){const rest=sessionFor()._rest;return rest&&rest.exerciseId===activeModal?.id?rest:null;}
 function restRemaining(rest=activeRest()){
   if(!rest)return 0;
   return Math.max(0,Math.ceil((rest.paused?Number(rest.remaining)||0:Number(rest.endAt)-Date.now())/1000));
 }
 function clearRest(message=''){
   const ses=sessionFor();delete ses._rest;clearInterval(restTimer);restTimer=null;save();
   if($('restContainer'))$('restContainer').innerHTML=message?`<div class="cue-box" role="status">${message}</div>`:'';
 }
 function startRest(seconds){
   if(!activeModal?.track)return;
   const amount=Math.max(15,Math.min(600,Math.round(Number(seconds)||60)));
   sessionFor()._rest={exerciseId:activeModal.id,paused:false,remaining:amount*1000,endAt:Date.now()+amount*1000};
   save();clearInterval(restTimer);renderRest();restTimer=setInterval(renderRest,1000);
 }
 function changeRest(delta){
   const rest=activeRest();if(!rest)return;
   const remaining=Math.max(0,(rest.paused?rest.remaining:rest.endAt-Date.now())+delta*1000);
   if(remaining<=0){clearRest('✓ Descanso concluído. Continue quando estiver pronto(a).');return;}
   rest.remaining=remaining;if(!rest.paused)rest.endAt=Date.now()+remaining;
   save();renderRest(true);
 }
 function pauseOrResumeRest(){
   const rest=activeRest();if(!rest)return;
   if(rest.paused){rest.endAt=Date.now()+Math.max(1000,rest.remaining);rest.paused=false;}
   else {rest.remaining=Math.max(0,rest.endAt-Date.now());rest.paused=true;}
   save();renderRest(true);
 }
 function renderRest(force=false){
   const box=$('restContainer');if(!box||!activeModal?.track)return;
   const rest=activeRest();if(!rest){if(force)box.innerHTML='';return;}
   const seconds=restRemaining(rest);
   if(!rest.paused&&seconds===0){
     clearRest('✓ Descanso terminado! Quando estiver pronto(a), faça a próxima série.');
     if(!document.hidden)try{navigator.vibrate?.(100);}catch{}
     return;
   }
   if(force||!box.querySelector('.rest-panel')){
     box.innerHTML=`<div class="rest-panel" aria-label="Cronômetro de descanso"><div class="rest-head"><strong class="rest-clock" role="timer">${formatTime(seconds)}</strong><span class="rest-status">${rest.paused?'Pausado':'Descansando'}</span></div><div class="rest-actions"><button type="button" data-action="rest-minus" aria-label="Reduzir descanso em 15 segundos">−15s</button><button type="button" data-action="rest-pause">${rest.paused?'▶ Retomar':'⏸ Pausar'}</button><button type="button" data-action="rest-plus" aria-label="Adicionar 15 segundos ao descanso">+15s</button><button type="button" data-action="skip-rest">Pular</button></div></div>`;
   }else{
     const clock=box.querySelector('.rest-clock');if(clock)clock.textContent=formatTime(seconds);
   }
 }
 function sessionTimer(){return sessionFor()._timer||null;}
 function elapsedWorkoutMs(timer=sessionTimer()){
   if(!timer)return 0;
   const base=Math.max(0,Number(timer.elapsedMs)||0);
   const running=timer.runningSince&& !timer.paused ? Math.max(0,Date.now()-Number(timer.runningSince)):0;
   return Math.min(72*3600000,base+running);
 }
 function refreshWorkoutClock(){const el=$('workoutClock');if(el){const timer=sessionTimer();el.textContent=timer?formatTime(Math.floor(elapsedWorkoutMs(timer)/1000)):'00:00';}}
 function startSessionTimer(){const ses=sessionFor();if(!ses._timer){ses._timer={startedAt:new Date().toISOString(),elapsedMs:0,runningSince:Date.now(),paused:false,autoPaused:false};save();}refreshWorkoutClock();}
 function pauseSessionTimer(auto=false){const timer=sessionTimer();if(!timer||timer.paused)return;
   timer.elapsedMs=elapsedWorkoutMs(timer);timer.runningSince=null;timer.paused=true;timer.autoPaused=!!auto;save();refreshWorkoutClock();}
 function resumeSessionTimer(){const timer=sessionTimer();if(!timer||!timer.paused)return;
   timer.paused=false;timer.autoPaused=false;timer.runningSince=Date.now();save();refreshWorkoutClock();}
 function freezeOrphanedTimers(){Object.values(state.sessions||{}).forEach(s=>{const t=s?._timer;if(t?.runningSince){t.runningSince=null;t.paused=true;t.autoPaused=true;}});}
 // Restauração de tela após bloqueio/fechamento é conservadora: não conta horas ausentes.
 freezeOrphanedTimers();
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseSessionTimer(true);else{const t=sessionTimer();if(t?.autoPaused)resumeSessionTimer();}});
 window.addEventListener('pagehide',()=>pauseSessionTimer(true));
 setInterval(refreshWorkoutClock,1000);
 function startWorkout(){startSessionTimer();const slots=exerciseSlots(),id=slots.find(x=>getSetEntries(exById[x.id]).some(s=>!s.done))?.id||slots[0]?.id;if(id)openModal(id,true);}
 function finishWorkout(){const day=selectedDay(),n=doneCount(),total=totalCount();if(n===0){notify('Registre ao menos uma série para finalizar.');return;}if(n<total&&!confirm(`Você registrou ${n} de ${total} séries. Deseja finalizar mesmo assim?`))return;const ses=sessionFor(),timer=ses._timer;const seconds=Math.max(0,Math.floor(elapsedWorkoutMs(timer)/1000));const details=JSON.parse(JSON.stringify(ses));delete details._timer;delete details._rest;delete details._swaps;const substitutions={...ses._swaps};const record={date:new Date().toISOString(),startedAt:timer?.startedAt||null,plan:state.plan,day:day.id,title:day.title,program:plan().label,doneSets:n,plannedSets:total,minutes:Math.ceil(seconds/60),durationSeconds:seconds,durationMode:timer?'measured':'unavailable',substitutions,exerciseOrder:exerciseSlots().map(slot=>({original:slot.original,performed:slot.id,sets:setsFor(exById[slot.id]),reps:repsFor(exById[slot.id])})),details};state.history.push(record);delete state.sessions[sessionKey(state.plan,day.id)];state.next[state.plan]=(currentDayIndex()+1)%plan().days.length;state.selected[state.plan]=state.next[state.plan];save();notify(`Treino ${day.letter} salvo! Parabéns!`);render();}
 function setPlan(p){if(!DATA.plans[p]||p===state.plan)return;if(!confirmChangeWorkout())return;const draft=$('displayName')?.value;state.plan=p;state.selected[p]=Number(state.selected[p])||0;save();render();if(draft!==undefined&&$('displayName'))$('displayName').value=draft;notify(`Plano ${DATA.plans[p].label} selecionado.`);}
 function setGoal(goal){if(!GOALS[goal])return;const draft=$('displayName')?.value;state.goal=goal;save();render();if(draft!==undefined&&$('displayName'))$('displayName').value=draft;notify(`Objetivo atualizado: ${GOALS[goal].name}.`);}
 function setLevel(l){if(!['iniciante','intermediario','avancado'].includes(l))return;const draft=$('displayName')?.value;state.level=l;save();render();if(draft!==undefined&&$('displayName'))$('displayName').value=draft;}
 function exportData(){const data=JSON.stringify({app:'TreinaPro',version:2,exportedAt:new Date().toISOString(),state},null,2);const blob=new Blob([data],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='treinapro-backup.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);notify('Backup exportado.');}
 function importData(file){if(!file)return;if(file.size>3*1024*1024){notify('Arquivo muito grande.');return;}const reader=new FileReader();reader.onload=()=>{try{const raw=JSON.parse(String(reader.result));if(raw.app!=='TreinaPro'||!raw.state||!Array.isArray(raw.state.history)||!DATA.plans[raw.state.plan])throw Error('formato');if(!confirm('Substituir os dados atuais pelo backup selecionado?'))return;const s=raw.state;state={...defaults(),...s,history:s.history.slice(-3000),sessions:s.sessions&&typeof s.sessions==='object'?s.sessions:{}};if(!GOALS[state.goal])state.goal='hipertrofia';if(typeof state.photo!=='string'||!/^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(state.photo)||state.photo.length>220000)state.photo='';save();render();if(!(state.profileComplete===true||String(state.name||'').trim().length>=2))renderWelcome();notify('Backup restaurado.');}catch{notify('Arquivo de backup inválido.');}};reader.readAsText(file);}
 function speak(){if(!activeModal)return;const ex=exById[activeModal.id];if(!('speechSynthesis'in window)){notify('Narração indisponível neste navegador.');return;}try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(`${ex.name}. ${ex.steps.map((s,i)=>`Passo ${i+1}: ${s}`).join(' ')} Dica: ${ex.tip}. Atenção: ${ex.mistake}. Respiração: ${ex.breath}`);u.lang='pt-BR';u.rate=.94;speechSynthesis.speak(u);notify('O personal está explicando o exercício.');}catch{notify('Narração indisponível.');}}
 document.addEventListener('click',e=>{if(e.target.id==='modalOverlay'){closeModal();return;}const control=e.target.closest('[data-action],[data-page]');if(!control)return;if(control.dataset.action){switch(control.dataset.action){case'day':{const i=Number(control.dataset.index);if(Number.isInteger(i)&&i>=0&&i<plan().days.length){if(i!==currentDayIndex()&&!confirmChangeWorkout())break;state.selected[state.plan]=i;save();if(control.dataset.navigate)setPage('inicio');else render();}break;}case'plan':setPlan(control.dataset.plan);break;case'progress-window':{const days=Number(control.dataset.days);if([7,30,90].includes(days)){progressWindow=days;render();document.querySelector(`.period-option[data-days="${days}"]`)?.focus();}break;}case'level':setLevel(control.dataset.level);break;case'remove-photo':{const draft=$('displayName')?.value;state.photo='';save();render();if(draft!==undefined&&$('displayName'))$('displayName').value=draft;notify('Foto removida.');break;}case'exercise':openModal(control.dataset.id,control.dataset.track==='1');break;case'edit-workout':openPlanEditor(control.dataset.index);break;case'edit-move':editRoutine('move',control.dataset.id,control.dataset.dir);break;case'edit-remove':editRoutine('remove',control.dataset.id);break;case'edit-pick':editRoutine('pick',control.dataset.id);break;case'edit-add':editRoutine('add');break;case'edit-reset':editRoutine('reset');break;case'edit-cancel':editRoutine('cancel');break;case'edit-select':editRoutine('select',control.dataset.id);break;case'edit-target':editRoutine('target',control.dataset.id);break;case'edit-target-save':editRoutine('target-save',control.dataset.id);break;case'edit-target-reset':editRoutine('target-reset',control.dataset.id);break;case'swap-open':openSwapPicker(control.dataset.origin);break;case'swap-choose':chooseSwap(control.dataset.origin,control.dataset.id);break;case'close':closeModal();break;case'go-workout':closeModal();setPage('inicio');break;case'start-workout':startWorkout();break;case'finish-workout':finishWorkout();break;case'toggle-session-timer':{const timer=sessionTimer();if(!timer){startSessionTimer();}else if(timer.paused)resumeSessionTimer();else pauseSessionTimer();render();break;}case'toggle-set':toggleSet(Number(control.dataset.index));break;case'copy-last':copyPreviousSets();break;case'rest-manual':if(activeModal)startRest(restFor(exById[activeModal.id]));break;case'skip-rest':if(activeRest())clearRest();break;case'rest-pause':pauseOrResumeRest();break;case'rest-plus':changeRest(15);break;case'rest-minus':changeRest(-15);break;case'speak':speak();break;case'demo-mode':changeDemo(control.dataset.mode);break;case'guide-next':guideMove(1);break;case'guide-prev':guideMove(-1);break;case'guide-speak':guideSpeak();break;case'viewer-mode':changeViewer(control.dataset.viewer);break;case'save-settings':{const n=($('displayName')?.value||'').trim().replace(/\s+/g,' ');if(n.length<2){notify('Informe um nome com pelo menos 2 caracteres.');$('displayName')?.focus();break;}state.name=n.slice(0,35);state.profileComplete=true;save();setPage('inicio');notify('Nome e preferências salvos!');break;}case'export':exportData();break;case'reset':if(confirm('Apagar todo o histórico e séries atuais deste navegador?')){state.history=[];state.sessions={};state.next={abc:0,quad:0};state.selected={abc:0,quad:0};save();render();notify('Histórico limpo.');}break;}return;}if(control.dataset.page){e.preventDefault();setPage(control.dataset.page);}});
 document.addEventListener('submit',e=>{if(e.target.id==='welcomeForm')welcomeSubmit(e);});
 document.addEventListener('input',e=>{if(e.target.id==='welcomeName')e.target.setCustomValidity('');if(e.target.matches('#searchExercises')){search=e.target.value;refreshLibraryResults();}if(e.target.matches('[data-set][data-field]'))syncSetField(e.target);});
 document.addEventListener('change',e=>{if(e.target.matches('#muscleFilter')){muscle=e.target.value;refreshLibraryResults();}if(e.target.matches('#equipmentFilter')){equipment=e.target.value;refreshLibraryResults();}if(e.target.matches('#importFile'))importData(e.target.files?.[0]);if(e.target.id==='welcomePhotoFile')handleProfilePhoto(e.target.files?.[0],'welcome');if(e.target.id==='profilePhotoFile')handleProfilePhoto(e.target.files?.[0],'settings');if(e.target.matches('input[name="settingsGoal"]'))setGoal(e.target.value);if(e.target.matches('#progressExerciseSelect')){progressExercise=e.target.value;const target=document.querySelector('.strength-panel');if(target)target.outerHTML=renderStrengthPanel();}});
 document.addEventListener('keydown',e=>{
   const dialog=$('modalRoot')?.querySelector('[role="dialog"]');
   if(!dialog)return;
   if(e.key==='Escape'){e.preventDefault();closeModal();return;}
   if(e.key!=='Tab')return;
   const items=[...dialog.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(el=>!el.hidden&&el.getClientRects().length);
   if(!items.length){e.preventDefault();dialog.tabIndex=-1;dialog.focus();return;}
   const first=items[0],last=items[items.length-1],active=document.activeElement;
   if(e.shiftKey&&(active===first||!dialog.contains(active))){e.preventDefault();last.focus();}
   else if(!e.shiftKey&&(active===last||!dialog.contains(active))){e.preventDefault();first.focus();}
 });
 if('serviceWorker'in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
 render();
 if(needsWelcome())renderWelcome();
 restoreFromDatabase();

 // In older caches, a WebP might not exist yet; keep the exercise usable.
 document.addEventListener('error',event=>{
   const img=event.target;
   if(!img||img.tagName!=='IMG')return;
   const path=img.getAttribute('src')||'';
   const match=path.match(/^assets\/webp\/(exercises|still|frames\/start|frames\/finish)\/([^?#]+)\.webp$/);
   const featured=path.match(/^assets\/featured\/(supino_maquina|leg_press|desenvolvimento|face_pull)\.webp$/);
   if(featured&&!img.dataset.webpFallback){
     img.dataset.webpFallback='1';
     img.src='assets/featured/svg/'+featured[1]+'.svg';
     return;
   }
   if(match&&!img.dataset.webpFallback){
     img.dataset.webpFallback='1';
     img.src='assets/'+match[1]+'/'+match[2]+'.svg';
   }else if(path==='assets/webp/ui/hero-workout.webp'){
     img.parentElement?.classList.add('hero-fallback');img.style.display='none';
   }else if(path.startsWith('assets/webp/ui/')){
     img.style.display='none';
   }
 },true);
})();
