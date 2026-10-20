(() => {
 'use strict';
 const DATA = window.TREINO_DATA;
 const exById = Object.fromEntries(DATA.exercises.map(ex=>[ex.id,ex]));
 const LS = 'treinapro-personal-v1';
 // Manter a mesma chave para preservar o histórico das versões 1.0–1.3.
 const defaults = () => ({ plan:'abc',level:'iniciante',goal:'hipertrofia',photo:'',name:'',next:{abc:0,quad:0},selected:{abc:0,quad:0},sessions:{},history:[],settings:{speech:true}});
 let state;
 try {state={...defaults(),...JSON.parse(localStorage.getItem(LS) || '{}')};} catch { state=defaults(); }
 if(!DATA.plans[state.plan]) state.plan='abc';
 if(!['iniciante','intermediario','avancado'].includes(state.level)) state.level='iniciante';
 if(!['hipertrofia','emagrecimento','condicionamento'].includes(state.goal)) state.goal='hipertrofia';
 if(typeof state.photo!=='string'||!/^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(state.photo)||state.photo.length>220000)state.photo='';
 if(!Array.isArray(state.history)) state.history=[];
 if(!state.sessions || typeof state.sessions!=='object') state.sessions={};
 if(!state.next || typeof state.next!=='object') state.next={abc:0,quad:0};
 if(!state.selected || typeof state.selected!=='object') state.selected={abc:0,quad:0};
 // Perfis existentes com nome preenchido migram sem interromper os treinos.
 // Um perfil sem nome vê as perguntas iniciais, mantendo séries e histórico.
 const needsWelcome = !(state.profileComplete === true || (typeof state.name==='string' && state.name.trim().length >= 2));
 let draftWelcomePhoto=state.photo||'', page='inicio', search='', muscle='todos', activeModal=null, restUntil=0, restTimer=null, toastTimer=null, viewer3D=null, progressExercise='agachamento';
 const $ = id => document.getElementById(id);
 const safe = s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
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
 const save=()=>{try{localStorage.setItem(LS,JSON.stringify(state));}catch{notify('Não foi possível salvar: armazenamento indisponível.');}};
 const plan =()=>DATA.plans[state.plan];
 const currentDayIndex=()=>Math.max(0,Math.min(plan().days.length-1,Number(state.selected[state.plan])||0));
 const selectedDay=()=>plan().days[currentDayIndex()];
 const sessionKey=(pid,dayid)=>`${pid}:${dayid}`;
 const sessionFor=(pid=state.plan,dayId=selectedDay().id)=>{const k=sessionKey(pid,dayId); return state.sessions[k] || (state.sessions[k]={});};
 const setsFor=(ex)=>state.level==='iniciante'?2:state.goal==='condicionamento'?Math.min(3,ex.sets):state.level==='avancado'&&(ex.muscle==='Quadríceps'||ex.muscle==='Costas'||ex.muscle==='Peito'||ex.muscle==='Glúteos')?4:ex.sets;
 const getSetEntries=(ex)=>{const ses=sessionFor(), entry=ses[ex.id]||{sets:[]};const total=setsFor(ex);return Array.from({length:total},(_,i)=>entry.sets?.[i] || {done:false,kg:'',reps:''});};
 const doneCount=(day=selectedDay())=>day.ex.reduce((sum,id)=>sum+getSetEntries(exById[id]).filter(s=>s.done).length,0);
 const totalCount=(day=selectedDay())=>day.ex.reduce((sum,id)=>sum+setsFor(exById[id]),0);
 const dateString=(d=new Date())=>d.toLocaleDateString('pt-BR',{day:'numeric',month:'short',year:'numeric'});
 const formatTime=(sec)=>`${Math.floor(sec/60).toString().padStart(2,'0')}:${(sec%60).toString().padStart(2,'0')}`;
 function notify(message){const t=$('toast');t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3200);}
 function setPage(next){page=next;search='';muscle='todos';closeModal();render();window.scrollTo({top:0,behavior:'smooth'});}
 function pill(text){return `<span class="chip">✦ ${safe(text)}</span>`;}
 const imageFor=(id)=>`assets/exercises/${encodeURIComponent(id)}.svg`;
 const demoFor=(id,mode='motion')=>`assets/${['motion','motion-slow','still'].includes(mode)?mode:'motion'}/${encodeURIComponent(id)}.svg`;
 const frameFor=(id,phase)=>`assets/frames/${phase==='finish'?'finish':'start'}/${encodeURIComponent(id)}.svg`;
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
        <div class="welcome-brand"><span class="brand-mark">T<span>+</span></span><div><b>treina<span>pro</span></b><small>SEU PERSONAL DIGITAL</small></div><span class="welcome-stage">SEU PRIMEIRO PASSO</span></div>
        <div class="welcome-header"><span class="eyebrow">✦ BEM-VINDO(A) AO TREINAPRO</span><h1 id="welcomeTitle">Vamos montar o <em>seu treino.</em></h1><p id="welcomeDescription">Diga como podemos chamar você e selecione o programa que prefere. Leva menos de um minuto.</p></div>
        <form id="welcomeForm" class="welcome-form">
         <div class="welcome-name"><label for="welcomeName"><span class="welcome-number">01</span> Qual é o seu nome?</label><input id="welcomeName" name="name" class="welcome-input" autocomplete="given-name" placeholder="Digite seu nome" type="text" minlength="2" maxlength="35" required value="${safe(state.name||'')}"><small>O personal vai usar seu nome para personalizar o aplicativo.</small></div>
         <fieldset class="welcome-plan-field"><legend><span class="welcome-number">02</span> Qual treino você deseja?</legend><div class="welcome-plan-grid">
          <label class="welcome-choice"><input type="radio" name="welcomePlan" value="abc" required><span class="welcome-choice-body"><span class="welcome-choice-top"><span class="welcome-choice-icon">🏋️</span><span class="welcome-select-circle" aria-hidden="true">✓</span></span><span class="welcome-choice-tag">TREINO MASCULINO</span><strong>Homem <span>ABC</span></strong><small>Peito, ombros e tríceps → Costas e bíceps → Pernas e abdômen</small><span class="welcome-frequency">◷ 3 treinos na sequência</span></span></label>
          <label class="welcome-choice"><input type="radio" name="welcomePlan" value="quad" required><span class="welcome-choice-body"><span class="welcome-choice-top"><span class="welcome-choice-icon">⚡</span><span class="welcome-select-circle" aria-hidden="true">✓</span></span><span class="welcome-choice-tag">TREINO FEMININO</span><strong>Mulher <span>Pernas + Braços</span></strong><small>Quadríceps e glúteos → Superiores → Posterior e glúteos → Superiores</small><span class="welcome-frequency">◷ 4 treinos na sequência</span></span></label>
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
   $('pageContent').innerHTML=({inicio:renderHome,treinos:renderTreinos,biblioteca:renderLibrary,progresso:renderProgress,ajustes:renderSettings})[page]();
 }
 function heroIllustration(){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 270 225" aria-hidden="true"><circle cx="154" cy="107" r="96" fill="#c6f65b" opacity=".07"/><circle cx="154" cy="107" r="74" fill="none" stroke="#c6f65b" opacity=".25" stroke-width="2"/><g stroke="#d0f68c" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M150 87L136 135L169 165"/><path d="M139 135L107 170L97 204"/><path d="M166 165L192 202"/><path d="M150 99L105 115L89 87"/><path d="M150 100L187 119L212 101"/></g><g fill="#e6ffd1"><circle cx="151" cy="64" r="22"/><circle cx="89" cy="83" r="10"/><circle cx="216" cy="96" r="10"/></g><g stroke="#b9e56e" stroke-width="5"><path d="M62 83h48M195 96h48"/><path d="M61 72v22M243 85v22"/></g><path d="M85 211h129" stroke="#86bd73" opacity=".7" stroke-width="4" stroke-linecap="round"/></svg>`;}
 function renderHome(){const day=selectedDay(),completed=state.history.length,progress=Math.round(doneCount()/totalCount()*100),nextSessions=state.history.filter(l=>l.plan===state.plan).length;
 return `<section class="intro"><div><div class="eyebrow" style="margin-bottom:9px">TRANSFORME SEU MOVIMENTO</div><h1>${state.name?`Olá, ${safe(state.name.split(/\s+/)[0])}!`:"Seu ritmo."}<br><span class="headline-name">Sua evolução.</span></h1><p>Seu personal digital com orientação em cada repetição.</p></div><div class="intro-person">${avatarMarkup("lg")}<div>${pill(plan().audience)}<span class="intro-goal">${safe(goalInfo().icon+" "+goalInfo().name)} · ${safe(state.level)}</span></div></div></section>
 <section class="hero"><div class="hero-body"><div class="eyebrow">✦ SEU PRÓXIMO TREINO</div><h2>${safe(day.title)}</h2><p>${safe(day.focus)}. Acompanhe a execução ilustrada, registre sua carga e evolua no seu ritmo.</p><div class="hero-meta"><span>◷ ${day.min} min estimados</span><span>▤ ${day.ex.length} exercícios</span><span>◉ ${totalCount()} séries</span></div><button class="btn btn-primary" data-action="start-workout">${doneCount()>0?'▶ Continuar treino':'▶ Começar treino'} <span>↗</span></button><span style="margin-left:10px" class="pill-outline">Treino ${day.letter}</span></div><div class="hero-visual">${heroIllustration()}</div></section>
 <div class="dashboard-grid"><div><div class="section-head"><div><h2>Sua divisão de treino</h2><p>Selecione o dia que deseja trabalhar</p></div><button class="text-button" data-page="treinos">Ver plano ↗</button></div>${renderDayCards()}
 <div class="section-head"><div><h2>Exercícios do treino ${day.letter}</h2><p>${safe(day.title)} • toque para aprender</p></div><span class="small muted">${doneCount()}/${totalCount()} séries</span></div>
 <div class="stack">${day.ex.map((id,i)=>renderExerciseCard(exById[id],i)).join('')}</div></div>
 <aside class="stack right-col"><div class="stat-grid"><div class="stat-card"><span class="stat-label">TREINOS CONCLUÍDOS</span><strong>${completed}</strong><span class="stat-foot">✓ Sua constância</span></div><div class="stat-card"><span class="stat-label">SÉRIES DE HOJE</span><strong>${doneCount()}<small> / ${totalCount()}</small></strong><span class="stat-foot">↗ ${progress}% do treino</span></div></div>
 ${profilePanel()}<div class="coach-card"><div class="coach-heading"><span class="coach-icon">✦</span><div><h3>Seu coach orienta</h3><p class="muted small" style="margin:3px 0 0">Dica para este treino</p></div></div><p>Comece com <b>5–10 minutos</b> de aquecimento leve. ${safe(goalInfo().tip)} Antes de uma série pesada, faça uma ou duas séries leves de preparação.</p><ul><li>Execução controlada acima da carga</li><li>Descanse conforme o exercício</li><li>Interrompa se sentir dor aguda</li></ul>${state.goal!=="hipertrofia"?`<p class="small muted cardio-hint">★ Nos dias livres, considere caminhadas ou outra atividade aeróbica confortável, evoluindo aos poucos. Musculação isolada não garante emagrecimento.</p>`:""}</div>
 <div class="info-card"><div class="card-row"><h3>Progresso do treino</h3><b style="color:var(--lime)">${progress}%</b></div><div class="progress-line"><span style="width:${progress}%"></span></div><p class="muted small">${doneCount()} séries realizadas de ${totalCount()} planejadas</p><button class="btn btn-dark" style="width:100%;margin-top:15px" data-action="finish-workout" ${doneCount()===0?'disabled':''}>✓ Finalizar treino</button></div>
 <div class="body-card"><h3>Seu plano atual</h3><p>${safe(plan().description)}</p><button class="text-button" data-page="ajustes" style="margin-top:13px">Personalizar →</button><p class="small muted" style="margin-top:12px">${nextSessions} treinos deste plano registrados.</p></div></aside></div>${safetyNote()}`; }
 function renderDayCards(){return `<div class="day-grid ${plan().days.length===3?'three':''}">${plan().days.map((d,i)=>`<button class="day-card ${i===currentDayIndex()?'active':''}" data-action="day" data-index="${i}"><span class="day-letter">${d.letter}</span><strong>${safe(d.short)}</strong><small>${safe(d.title)}</small>${i===currentDayIndex()?'<span class="day-tick">●</span>':''}</button>`).join('')}</div>`;}
 function renderExerciseCard(ex,i){const n=getSetEntries(ex).filter(s=>s.done).length;return `<article class="exercise-card"><img src="${imageFor(ex.id)}" alt="Ilustração das duas posições de ${safe(ex.name)}" loading="lazy"><div><span class="ex-order">${String(i+1).padStart(2,'0')} • ${safe(ex.muscle.toUpperCase())}</span><h3>${safe(ex.name)}</h3><p>${safe(ex.equip)} • ${safe(ex.difficulty)}</p><span class="card-reps">${setsFor(ex)} × ${safe(repsFor(ex))} · ${restFor(ex)}s descanso ${n?` · <b style="color:var(--lime)">${n} ✓</b>`:''}</span></div><button class="open-exercise" data-action="exercise" data-id="${ex.id}" data-track="1" aria-label="Aprender ${safe(ex.name)}">↗</button></article>`;}
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
   const completed=workout && state.history.some(h=>h.plan===state.plan&&h.day===workout.id&&String(h.date||'').slice(0,10)===date.toLocaleDateString('en-CA'));
   const inside=`<span class="week-name">${label}</span><span class="week-number">${date.getDate()}</span><strong>${workout?'Treino '+safe(workout.letter):'Livre'}</strong><small>${completed?'✓ Feito':workout?safe(workout.short):'Recuperar'}</small>${today?'<span class="week-today">HOJE</span>':''}`;
   return workout?`<button type="button" class="week-day ${today?'is-today':''} ${completed?'is-done':''}" data-action="day" data-index="${idx}" data-navigate="inicio" aria-label="${label}, dia ${date.getDate()}: Treino ${safe(workout.letter)}${completed?', já registrado':''}. Abrir treino">${inside}</button>`:`<div class="week-day week-rest ${today?'is-today':''}" aria-label="${label}, dia ${date.getDate()}: descanso ou atividade leve">${inside}</div>`;
  }).join('');
  return `<section class="week-section" aria-labelledby="weekTitle"><div class="section-head week-heading"><div><h2 id="weekTitle">Sua semana</h2><p>Exemplo de organização · toque num treino para abrir</p></div></div><div class="week-strip">${tiles}</div><p class="week-help">Os dias são sugestões. Se precisar descansar mais, ajuste sua rotina sem perder as séries registradas.</p></section>`;
 }
 function renderTreinos(){
  return `<div class="page-heading"><span class="eyebrow">PROGRAMAÇÃO SEMANAL</span><h1>Meus <span class="headline-name">treinos</span></h1><p>Seu plano atual: ${safe(plan().label)}.</p></div>
  ${renderWeeklySchedule()}
  <div class="section-head"><h2>Treinos do seu plano</h2></div>
  <div class="plan-list">${plan().days.map((d,i)=>`<div class="plan-row ${i===currentDayIndex()?'active':''}"><div class="day-letter">${d.letter}</div><div class="plan-row-text"><h3>${safe(d.title)}</h3><p>${safe(d.focus)} · ${d.ex.length} exercícios · ${d.min} min estimados</p></div><button class="btn ${i===currentDayIndex()?'btn-primary':'btn-dark'} btn-sm" data-action="day" data-index="${i}" data-navigate="inicio">${i===currentDayIndex()?'Continuar':'Abrir'} ↗</button></div>`).join('')}</div>
  <details class="plan-switcher"><summary>Trocar tipo de treino</summary><p>Você pode escolher qualquer programa, independentemente do sexo. Seus registros continuam salvos.</p><div class="plan-controls"><button class="seg-button ${state.plan==='abc'?'active':''}" data-action="plan" data-plan="abc">Treino ABC • 3 dias</button><button class="seg-button ${state.plan==='quad'?'active':''}" data-action="plan" data-plan="quad">Pernas / superiores • 4 dias</button></div></details>
  ${safetyNote()}`;
 }
 function renderLibrary(){const muscles=['todos',...new Set(DATA.exercises.map(ex=>ex.muscle))];const items=filteredExercises();return `<div class="page-heading"><span class="eyebrow">GUIA VISUAL DE MOVIMENTOS</span><h1>Biblioteca de <span class="headline-name">exercícios</span></h1><p>${DATA.exercises.length} exercícios com imagens de duas posições, passo a passo, dicas de postura e erros comuns.</p></div><div class="control-strip"><input aria-label="Pesquisar exercícios" class="search-input" id="searchExercises" placeholder="⌕  Buscar exercício ou equipamento..." value="${safe(search)}"><select id="muscleFilter" class="select-input" aria-label="Filtrar por grupo muscular">${muscles.map(x=>`<option value="${safe(x)}" ${muscle===x?'selected':''}>${x==='todos'?'Todos os músculos':safe(x)}</option>`).join('')}</select></div><div id="libraryCards">${renderLibraryCards(items)}</div>${safetyNote()}`;}
 function filteredExercises(){const norm=t=>t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();const q=norm(search.trim());return DATA.exercises.filter(ex=>(muscle==='todos'||muscle===ex.muscle)&&(!q||norm(`${ex.name} ${ex.muscle} ${ex.equip}`).includes(q)));}
 function renderLibraryCards(items){return items.length?`<div class="library-grid">${items.map(ex=>`<article class="library-card"><img src="${imageFor(ex.id)}" loading="lazy" alt="Posições de ${safe(ex.name)}"><div class="library-body"><span class="ex-order">${safe(ex.muscle.toUpperCase())}</span><h3>${safe(ex.name)}</h3><p>${safe(ex.equip)} · ${safe(repsFor(ex))}</p><span class="animated-tag">● Demonstração animada</span><button class="btn btn-dark btn-sm" data-action="exercise" data-id="${ex.id}">▶ Aprender exercício</button></div></article>`).join('')}</div>`:'<div class="empty">Nenhum exercício encontrado. Tente outro termo.</div>';}

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
 function renderProgress(){let logs=state.history.slice().reverse();const totalSets=logs.reduce((s,x)=>s+(x.doneSets||0),0);const minutes=logs.reduce((s,x)=>s+(x.minutes||0),0);const lastSeven=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return {date:d.toLocaleDateString('en-CA'),name:d.toLocaleDateString('pt-BR',{weekday:'short'}).slice(0,3)}});const max=Math.max(1,...lastSeven.map(day=>logs.filter(l=>l.date.slice(0,10)===day.date).length));return `<div class="page-heading"><span class="eyebrow">CONSTÂNCIA E ACOMPANHAMENTO</span><h1>Sua <span class="headline-name">evolução</span></h1><p>Acompanhe as sessões finalizadas e as séries feitas, direto no seu dispositivo.</p></div><div class="metric-row"><div class="stat-card"><span class="stat-label">TOTAL DE TREINOS</span><strong>${logs.length}</strong><span class="stat-foot">Sessões registradas</span></div><div class="stat-card"><span class="stat-label">SÉRIES CONCLUÍDAS</span><strong>${totalSets}</strong><span class="stat-foot">Repetição após repetição</span></div><div class="stat-card"><span class="stat-label">TEMPO ESTIMADO</span><strong>${minutes}<small> min</small></strong><span class="stat-foot">Volume de sessões</span></div></div><div class="section-head"><h2>Últimos 7 dias</h2></div><div class="chart-card"><div class="bar-chart">${lastSeven.map(d=>{const count=logs.filter(l=>l.date.slice(0,10)===d.date).length;return `<div class="bar-col"><b>${count||''}</b><div style="height:${Math.max(4,100*count/max)}%"></div><span>${d.name}</span></div>`}).join('')}</div></div>${renderStrengthPanel()}<div class="section-head"><h2>Histórico de treinos</h2><button class="text-button" data-action="export">Exportar meus dados ↓</button></div><div class="history-list">${logs.length?logs.slice(0,40).map(log=>`<div class="history-row"><div class="history-icon">✓</div><div><h3>${safe(log.title)}</h3><p>${safe(dateString(new Date(log.date)))} · ${safe(log.program)} · ${log.minutes||0} min estimados</p></div><span class="history-count">${log.doneSets} séries</span></div>`).join(''):'<div class="empty">Você ainda não finalizou nenhum treino. Suas próximas conquistas aparecerão aqui.</div>'}</div>${safetyNote()}`; }
 function renderSettings(){return `<div class="page-heading"><span class="eyebrow">SEU PERSONAL, SUAS REGRAS</span><h1>Seu <span class="headline-name">perfil</span></h1><p>Atualize seu nome, foto, objetivo, nível e divisão. As séries e o histórico continuam salvos.</p></div>
 <section class="profile-editor"><div class="profile-editor-header">${avatarMarkup('xl')}<div><span class="eyebrow">PERFIL INDIVIDUAL</span><h2>${safe(state.name||'Meu perfil')}</h2><p>Personalize sua experiência de treino.</p></div></div>
 <div class="profile-photo-actions"><label for="profilePhotoFile" class="btn btn-dark btn-sm photo-button">📷 Adicionar ou trocar foto</label><input type="file" id="profilePhotoFile" accept="image/jpeg,image/png,image/webp" class="visually-hidden-file"><button class="btn btn-ghost btn-sm" data-action="remove-photo" ${state.photo?'':'disabled'}>Remover foto</button></div><p class="muted small">A foto é recortada e reduzida automaticamente. Fica somente no navegador e será incluída no backup JSON.</p>
 <label class="profile-field"><strong>Como devemos chamar você?</strong><input id="displayName" maxlength="35" class="search-input" placeholder="Digite seu nome" value="${safe(state.name||'')}"></label>
 <div class="profile-field"><strong>Qual é o seu objetivo?</strong><p class="muted small">O app ajusta sugestões de repetição e orientação geral; não impõe carga nem ritmo.</p><div class="goal-option-grid">${goalsMarkup('settingsGoal')}</div></div>
 <div class="profile-field"><strong>Nível de experiência</strong><p class="muted small">Iniciantes fazem menos séries; avançados têm mais volume em grupos principais.</p><div class="level-grid"><button data-action="level" data-level="iniciante" class="level-card ${state.level==='iniciante'?'active':''}"><b>Iniciante</b><small>2 séries por exercício</small></button><button data-action="level" data-level="intermediario" class="level-card ${state.level==='intermediario'?'active':''}"><b>Intermediário</b><small>3 séries por exercício</small></button><button data-action="level" data-level="avancado" class="level-card ${state.level==='avancado'?'active':''}"><b>Avançado</b><small>3–4 séries (dependendo do objetivo)</small></button></div></div>
 </section>
 <div class="section-head"><h2>Escolha sua divisão</h2></div><div class="onboarding-grid"><button class="onboarding-card ${state.plan==='abc'?'active':''}" data-action="plan" data-plan="abc"><span class="big-icon">🏋️</span>${pill('MODELO MASCULINO')}<h2>Treino ABC</h2><p>Peito, ombros, tríceps / Costas, bíceps / Pernas e abdômen.</p><span class="goal-tag">3 treinos</span></button><button class="onboarding-card ${state.plan==='quad'?'active':''}" data-action="plan" data-plan="quad"><span class="big-icon">⚡</span>${pill('MODELO FEMININO')}<h2>Foco em pernas</h2><p>Quadríceps e glúteos / Superiores / Posterior e glúteos / Superiores.</p><span class="goal-tag">4 treinos</span></button></div>
 <div class="setup-footer"><p>Qualquer pessoa pode selecionar a divisão que preferir. Adapte o plano a lesões e limitações com acompanhamento profissional.</p><button class="btn btn-primary" data-action="save-settings">Salvar perfil e abrir meus treinos →</button></div>
 <div class="section-head"><h2>Dados e privacidade</h2></div><div class="info-card"><p class="muted" style="line-height:1.7">Nome, foto, objetivo, cargas e treinos ficam no armazenamento deste navegador. Sem conta e sem envio para servidor. Ao trocar de domínio ou aparelho, exporte e importe um backup.</p><div class="control-strip"><button class="btn btn-dark btn-sm" data-action="export">↓ Fazer backup (JSON)</button><label class="btn btn-dark btn-sm" for="importFile" style="cursor:pointer">↑ Importar backup</label><input type="file" id="importFile" accept="application/json" class="hidden"><button class="btn btn-ghost btn-sm" data-action="reset">Limpar histórico</button></div></div>
 <div class="section-head"><h2>Fontes e referências</h2></div><div class="info-card link-list"><a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/" target="_blank" rel="noopener noreferrer">↗ ACSM: recomendações de treinamento de força</a><a href="https://www.nsca.com/education/articles/kinetic-select/determination-of-resistance-training-frequency/" target="_blank" rel="noopener noreferrer">↗ NSCA: frequência e recuperação</a><a href="https://www.acefitness.org/resources/everyone/exercise-library/154/seated-leg-press/" target="_blank" rel="noopener noreferrer">↗ ACE: preparação do leg press</a><a href="https://www.acefitness.org/resources/everyone/exercise-library/158/seated-lat-pulldown/" target="_blank" rel="noopener noreferrer">↗ ACE: execução da puxada alta</a><a href="https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance" target="_blank" rel="noopener noreferrer">↗ MDN: narração por voz no navegador</a><a href="https://github.com/RepDB/exercise-dataset" target="_blank" rel="noopener noreferrer">↗ Biblioteca ilustrada RepDB (para consulta, não incorporada)</a><p class="muted small" style="line-height:1.6">As animações SVG são ilustrações originais do projeto, não filmagens. Não representam técnica perfeita nem substituem acompanhamento profissional. Nenhuma mídia externa foi copiada ou redistribuída.</p></div>${safetyNote()}`;}
 function safetyNote(){return `<div class="safe-warning">✦ <b>Orientação importante:</b> este aplicativo é educativo e não observa sua postura em tempo real. Pare se houver dor aguda, tontura ou falta de ar incomum. Para começar, prefira pesos leves e orientação presencial se possível.</div>`;}
  // Concise cues for movements whose equipment geometry was revised in 1.9.
  // Explicit per-exercise wording prevents generic, misleading 3D instructions.
  const MOTION_CUES={
   leg_press:['Quadril e lombar apoiados','Joelhos seguem a direção dos pés','Não trave os joelhos'],
   extensora:['Alinhe joelho e eixo do aparelho','O rolo acompanha a canela','Não use impulso'],
   abdutora:['Encoste costas no banco','Abra os joelhos com controle','Não balance o tronco'],
   agachamento:['Mantenha os pés apoiados','Joelhos acompanham os pés','Pare na amplitude confortável'],
   afundo:['Mantenha o pé dianteiro firme','Desça com equilíbrio','Evite bater o joelho no chão'],
   bulgaro:['Pé traseiro apoiado no banco','Equilíbrio na perna da frente','Comece sem carga'],
   step_up:['Comece com degrau baixo','Suba usando a perna apoiada','Desça sem se jogar'],
   hip_thrust:['Apoie a parte alta das costas','Eleve o quadril sem arquear lombar','Mantenha os pés firmes'],
   coice_polia:['Segure um apoio estável','Mova só a perna que trabalha','Não arqueie a lombar'],
   flexora:['Joelho alinhado ao eixo','Quadril fica apoiado','Não chute o rolo'],
   romeno:['Leve o quadril para trás','Mantenha carga perto das pernas','Não arredonde a coluna']
  };
  function motionCueMarkup(ex){
   const cues=MOTION_CUES[ex.id]; if(!cues)return '';
   return `<div class="motion-cue-panel" id="motionCuePanel" hidden aria-label="Três pontos de atenção"><strong>3 pontos para observar</strong><ol>${cues.map(c=>`<li>${safe(c)}</li>`).join('')}</ol></div>`;
  }
 function openModal(id,track){const ex=exById[id];if(!ex)return;const prev=state.history.slice().reverse().find(h=>h.details?.[id]?.sets?.some(s=>s.done));const lastCompleted=prev?.details?.[id]?.sets?.filter(s=>s.done)||[];const pastLoads=lastCompleted.map(s=>parseFloat(s.kg)).filter(n=>Number.isFinite(n)&&n>0);const prevHtml=prev?`<div class="body-card"><h3>Seu último registro</h3><p>${lastCompleted.length} séries concluídas${pastLoads.length?` · até ${Math.max(...pastLoads)} kg`:''} em ${safe(dateString(new Date(prev.date)))}.</p><p style="margin-top:7px">Aumente a carga apenas quando dominar a técnica e completar a faixa de repetições com controle.</p></div>`:'';activeModal={id,track:!!track,viewerMode:'2d',guideStep:0,demoMode:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'still':'motion'};restUntil=0;clearInterval(restTimer);$('modalRoot').innerHTML=`<div class="modal-overlay" id="modalOverlay"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><div class="modal-header"><div><span class="eyebrow">${safe(ex.muscle.toUpperCase())} • GUIA DE EXECUÇÃO</span><h2 id="modalTitle">${safe(ex.name)}</h2><p>${safe(ex.equip)} · ${safe(ex.difficulty)}</p></div><button class="close-btn" data-action="close" aria-label="Fechar">×</button></div><div class="modal-grid"><div class="demo-side"><div class="motion-title"><span class="eyebrow">DEMONSTRAÇÃO PASSO A PASSO</span><span class="motion-pill" id="motionLabel">● Ilustração animada</span></div><div class="viewer-tabs" role="group" aria-label="Tipo de demonstração"><button data-action="viewer-mode" data-viewer="2d" class="view-tab active" aria-pressed="true">▶ Animado</button><button data-action="viewer-mode" data-viewer="guide" class="view-tab" aria-pressed="false">① Etapas</button><button data-action="viewer-mode" data-viewer="3d" class="view-tab" aria-pressed="false">⬡ 3D</button></div><section class="guide-stage" id="guideStage" hidden aria-label="Execução em três etapas"><div class="guide-picture"><img class="guide-frame" id="guideFrame" src="${frameFor(ex.id,'start')}" alt="${safe(ex.name)} — posição inicial"></div><div class="guide-copy" aria-live="polite"><span class="guide-counter" id="guideCounter">PASSO 1 DE 3</span><h3 id="guideHeading">Prepare sua posição</h3><p id="guideDescription">${safe(ex.steps[0])}</p></div><div class="guide-controls"><button data-action="guide-prev" class="guide-button" id="guidePrev" disabled>← Voltar</button><button data-action="guide-speak" class="guide-button guide-audio" aria-label="Ouvir esta etapa">♫ Ouvir</button><button data-action="guide-next" class="guide-button guide-primary" id="guideNext">Próximo →</button></div></section><div class="viewer3d-stage" id="viewer3dStage" hidden><canvas id="viewer3dCanvas" aria-label="Modelo de pessoa em três dimensões, rotacionável com o mouse ou toque" role="img"></canvas><div class="viewer3d-info"><span>⬡ 3D ILUSTRATIVO • SEM CÂMERA</span><span>Arraste para girar</span></div></div><div class="viewer3d-actions" id="viewer3dActions" hidden><button data-action="viewer-3d" data-control="front" class="motion-button">Frente</button><button data-action="viewer-3d" data-control="side" class="motion-button">Lado</button><button data-action="viewer-3d" data-control="start" class="motion-button">① Início</button><button data-action="viewer-3d" data-control="finish" class="motion-button">② Final</button><button data-action="viewer-3d" data-control="slow" class="motion-button">◷ Devagar</button><button data-action="viewer-3d" data-control="pause" class="motion-button">⏸ Pausar</button></div><p class="viewer3d-status" id="viewer3dStatus" role="status" aria-live="polite" hidden>Gire o boneco ou escolha Início / Final para estudar o movimento.</p>${motionCueMarkup(ex)}<img class="demo-image motion-image" id="motionImage" src="${demoFor(ex.id,activeModal.demoMode)}" alt="Demonstração esquemática ${safe(ex.name)} entre a posição inicial e a fase principal"><div class="motion-controls" id="motionControls" role="group" aria-label="Controles da demonstração"><button data-action="demo-mode" data-mode="motion" class="motion-button ${activeModal.demoMode==='motion'?'active':''}" aria-pressed="${activeModal.demoMode==='motion'}">▶ Normal</button><button data-action="demo-mode" data-mode="motion-slow" class="motion-button ${activeModal.demoMode==='motion-slow'?'active':''}" aria-pressed="${activeModal.demoMode==='motion-slow'}">◷ Devagar</button><button data-action="demo-mode" data-mode="still" class="motion-button ${activeModal.demoMode==='still'?'active':''}" aria-pressed="${activeModal.demoMode==='still'}">⏸ Pausar</button><button data-action="demo-mode" data-mode="poses" class="motion-button" aria-pressed="false">▣ Posições</button></div><p class="motion-caption" id="motionCaption">Movimento ilustrativo para aprender a sequência. Não mede nem corrige sua postura.</p>${muscleDiagram(ex.muscle)}${coachPanel(ex)}<div class="card-row"><div><h3>Seu treinador explica</h3><p class="muted small" style="margin-top:5px">Passo a passo com foco em segurança</p></div><button class="btn btn-dark btn-sm" data-action="speak">♫ Ouvir</button></div>${ex.steps.map((s,i)=>`<div class="step-item"><span>${i+1}</span><p>${safe(s)}</p></div>`).join('')}<div class="cue-box"><b>✓ Dica do personal</b><br>${safe(ex.tip)}</div><div class="cue-box warning"><b>! Evite este erro</b><br>${safe(ex.mistake)}</div><p class="muted small" style="margin-top:12px">Respiração: ${safe(ex.breath)}</p></div><div class="steps-side"><div class="card-row"><h3>${track?'Registrar suas séries':'Plano sugerido'}</h3>${pill(ex.muscle)}</div><div class="stat-grid" style="margin-top:13px"><div class="stat-card"><span class="stat-label">SÉRIES</span><strong>${setsFor(ex)}</strong></div><div class="stat-card"><span class="stat-label">REPETIÇÕES</span><strong style="font-size:22px">${safe(repsFor(ex))}</strong></div></div><p class="personal-target">${safe(goalInfo().icon+" "+goalInfo().name)} · ${safe(state.level)}. Adapte a carga mantendo o movimento controlado.</p>${prevHtml}<div class="body-card"><h3>Descanso recomendado</h3><p>${restFor(ex)} segundos entre as séries. Aguarde recuperar o fôlego para preservar a técnica.</p></div>${track?`<div class="set-tracker"><div class="card-row"><h3>Suas séries</h3><span class="muted small">Carga em kg (opcional)</span></div><div id="setList">${renderSetList(ex)}</div><div id="restContainer"></div><button class="btn btn-dark btn-sm" data-action="rest-manual" style="margin-top:14px">◷ Iniciar descanso de ${restFor(ex)}s</button></div>`:`<div class="body-card"><h3>Quer treinar agora?</h3><p>Escolha um dia do plano para registrar suas séries, carga e repetições. Aqui você pode estudar o movimento.</p><button class="btn btn-primary btn-sm" style="margin-top:12px" data-action="go-workout">Ir para o meu treino →</button></div>`}</div></div><div class="modal-bottom"><span class="muted small">Aprenda o movimento antes de aumentar a carga.</span><button class="btn btn-primary btn-sm" data-action="close">Entendi ✓</button></div></section></div>`;document.body.style.overflow='hidden';if(track)renderRest();const close=$('modalRoot').querySelector('.close-btn');close?.focus();}
 function changeDemo(mode){
   if(!activeModal || !['motion','motion-slow','still','poses'].includes(mode))return;
   if(activeModal.viewerMode==='3d')changeViewer('2d');
   activeModal.demoMode=mode;
   const el=$('motionImage');if(!el)return;
   el.src=mode==='poses'?imageFor(activeModal.id):demoFor(activeModal.id,mode);
   el.alt=mode==='poses'?'Posição inicial e final lado a lado':'Movimento esquemático de '+exById[activeModal.id].name;
   const caption=$('motionCaption');if(caption) caption.textContent=mode==='poses'?'Compare a posição inicial e a fase principal do movimento.':mode==='still'?'Demonstração pausada na posição inicial.':'Animação esquemática em repetição. Observe a técnica descrita abaixo.';
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
   if(!activeModal || !['2d','guide','3d'].includes(mode))return;
   const use3d=mode==='3d',useGuide=mode==='guide';activeModal.viewerMode=mode;
   if(!use3d&&viewer3D){viewer3D.destroy();viewer3D=null;}
   const stage=$('viewer3dStage'),tools=$('viewer3dActions');if(stage)stage.hidden=!use3d;if(tools)tools.hidden=!use3d;if($('viewer3dStatus'))$('viewer3dStatus').hidden=!use3d;if($('motionCuePanel'))$('motionCuePanel').hidden=!use3d;
   if($('motionImage'))$('motionImage').hidden=use3d||useGuide;
   if($('motionControls'))$('motionControls').hidden=use3d||useGuide;
   if($('guideStage'))$('guideStage').hidden=!useGuide;
   if(useGuide)renderGuideStep();
   if($('motionLabel'))$('motionLabel').textContent=useGuide?'● Posições ampliadas':use3d?'● 3D esquemático':'● Ilustração animada';
   document.querySelectorAll('.view-tab').forEach(b=>{const on=b.dataset.viewer===mode;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
   if(use3d && window.TreinaPro3D && $('viewer3dCanvas')){
     if(viewer3D)viewer3D.destroy();viewer3D=window.TreinaPro3D.mount($('viewer3dCanvas'),exById[activeModal.id]);
   }
   const caption=$('motionCaption');if(caption)caption.textContent=use3d?'Modelo 3D estilizado. Arraste para girar; não avalia a postura.':useGuide?'Toque em Próximo para ver cada posição ampliada e ler a explicação.':'Animação ilustrativa. Observe a execução, sem copiar a postura cegamente.';
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
 function renderSetList(ex){const sets=getSetEntries(ex);return sets.map((s,i)=>`<div class="set-row"><span class="set-index">${i+1}ª</span><label><span class="hidden">Peso da série ${i+1} em kg</span><input class="weight-input" type="number" inputmode="decimal" min="0" max="1000" step="0.5" aria-label="Peso da série ${i+1} em kg" placeholder="kg" data-set="${i}" data-field="kg" value="${safe(s.kg)}"></label><label><span class="hidden">Repetições da série ${i+1}</span><input class="reps-input" type="text" maxlength="12" aria-label="Repetições da série ${i+1}" placeholder="reps" data-set="${i}" data-field="reps" value="${safe(s.reps)}"></label><button class="set-done ${s.done?'finished':''}" data-action="toggle-set" data-index="${i}" aria-label="${s.done?'Desmarcar':'Concluir'} série ${i+1}">${s.done?'✓ Feita':'✓ Feito'}</button></div>`).join('');}
 function closeModal(){if(viewer3D){viewer3D.destroy();viewer3D=null;}const hadTracker=!!activeModal?.track;activeModal=null;clearInterval(restTimer);restUntil=0;$('modalRoot').innerHTML='';document.body.style.overflow='';try{speechSynthesis.cancel()}catch{}window.TreinaProCoach?.stop();if(hadTracker&&page==='inicio')render();}
 function syncSetField(target){if(!activeModal?.track)return;const ex=exById[activeModal.id],n=Number(target.dataset.set),field=target.dataset.field;if(!ex||!['kg','reps'].includes(field)||!Number.isInteger(n)||n<0||n>=setsFor(ex))return;const ses=sessionFor(),entry=ses[ex.id]||(ses[ex.id]={sets:[]});entry.sets[n]=entry.sets[n]||{done:false,kg:'',reps:''};entry.sets[n][field]=String(target.value).slice(0,12);save();}
 function toggleSet(n){if(!activeModal?.track)return;const ex=exById[activeModal.id],all=getSetEntries(ex);if(!Number.isInteger(n)||n<0||n>=all.length)return;const ses=sessionFor(),entry=ses[ex.id]||(ses[ex.id]={sets:[]});entry.sets=all;entry.sets[n].done=!entry.sets[n].done;const marked=entry.sets[n].done;save();$('setList').innerHTML=renderSetList(ex);if(marked){startRest(restFor(ex));notify('Série concluída! Bom trabalho.');}else{notify('Série desmarcada.');}}
 function startRest(seconds){restUntil=Date.now()+seconds*1000;clearInterval(restTimer);renderRest();restTimer=setInterval(renderRest,500);}
 function renderRest(){const box=$('restContainer');if(!box||!activeModal?.track)return;const rem=Math.max(0,Math.ceil((restUntil-Date.now())/1000));if(rem===0){if(restUntil>0){clearInterval(restTimer);restUntil=0;box.innerHTML='<div class="cue-box">✓ Descanso terminado! Quando estiver pronto(a), faça a próxima série.</div>';try{if(navigator.vibrate)navigator.vibrate(100);}catch{}}return;}box.innerHTML=`<div class="rest-panel"><strong>${formatTime(rem)}</strong><span>Respire e prepare-se para a próxima série.</span><button data-action="skip-rest">Pular</button></div>`;}
 function startWorkout(){const day=selectedDay(),id=day.ex.find(x=>getSetEntries(exById[x]).some(s=>!s.done))||day.ex[0];openModal(id,true);}
 function finishWorkout(){const day=selectedDay(),n=doneCount(),total=totalCount();if(n===0){notify('Registre ao menos uma série para finalizar.');return;}if(n<total&&!confirm(`Você registrou ${n} de ${total} séries. Deseja finalizar mesmo assim?`))return;const ses=sessionFor(),record={date:new Date().toISOString(),plan:state.plan,day:day.id,title:day.title,program:plan().label,doneSets:n,plannedSets:total,minutes:Math.round(day.min*n/total),details:JSON.parse(JSON.stringify(ses))};state.history.push(record);delete state.sessions[sessionKey(state.plan,day.id)];state.next[state.plan]=(currentDayIndex()+1)%plan().days.length;state.selected[state.plan]=state.next[state.plan];save();notify(`Treino ${day.letter} salvo! Parabéns!`);render();}
 function setPlan(p){if(!DATA.plans[p])return;const draft=$('displayName')?.value;state.plan=p;state.selected[p]=Number(state.selected[p])||0;save();render();if(draft!==undefined&&$('displayName'))$('displayName').value=draft;notify(`Plano ${DATA.plans[p].label} selecionado.`);}
 function setGoal(goal){if(!GOALS[goal])return;const draft=$('displayName')?.value;state.goal=goal;save();render();if(draft!==undefined&&$('displayName'))$('displayName').value=draft;notify(`Objetivo atualizado: ${GOALS[goal].name}.`);}
 function setLevel(l){if(!['iniciante','intermediario','avancado'].includes(l))return;const draft=$('displayName')?.value;state.level=l;save();render();if(draft!==undefined&&$('displayName'))$('displayName').value=draft;}
 function exportData(){const data=JSON.stringify({app:'TreinaPro',version:2,exportedAt:new Date().toISOString(),state},null,2);const blob=new Blob([data],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='treinapro-backup.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);notify('Backup exportado.');}
 function importData(file){if(!file)return;if(file.size>3*1024*1024){notify('Arquivo muito grande.');return;}const reader=new FileReader();reader.onload=()=>{try{const raw=JSON.parse(String(reader.result));if(raw.app!=='TreinaPro'||!raw.state||!Array.isArray(raw.state.history)||!DATA.plans[raw.state.plan])throw Error('formato');if(!confirm('Substituir os dados atuais pelo backup selecionado?'))return;const s=raw.state;state={...defaults(),...s,history:s.history.slice(-3000),sessions:s.sessions&&typeof s.sessions==='object'?s.sessions:{}};if(!GOALS[state.goal])state.goal='hipertrofia';if(typeof state.photo!=='string'||!/^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(state.photo)||state.photo.length>220000)state.photo='';save();render();if(!(state.profileComplete===true||String(state.name||'').trim().length>=2))renderWelcome();notify('Backup restaurado.');}catch{notify('Arquivo de backup inválido.');}};reader.readAsText(file);}
 function speak(){if(!activeModal)return;const ex=exById[activeModal.id];if(!('speechSynthesis'in window)){notify('Narração indisponível neste navegador.');return;}try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(`${ex.name}. ${ex.steps.map((s,i)=>`Passo ${i+1}: ${s}`).join(' ')} Dica: ${ex.tip}. Atenção: ${ex.mistake}. Respiração: ${ex.breath}`);u.lang='pt-BR';u.rate=.94;speechSynthesis.speak(u);notify('O personal está explicando o exercício.');}catch{notify('Narração indisponível.');}}
 document.addEventListener('click',e=>{if(e.target.id==='modalOverlay'){closeModal();return;}const control=e.target.closest('[data-action],[data-page]');if(!control)return;if(control.dataset.action){switch(control.dataset.action){case'day':{const i=Number(control.dataset.index);if(Number.isInteger(i)&&i>=0&&i<plan().days.length){state.selected[state.plan]=i;save();if(control.dataset.navigate)setPage('inicio');else render();}break;}case'plan':setPlan(control.dataset.plan);break;case'level':setLevel(control.dataset.level);break;case'remove-photo':{const draft=$('displayName')?.value;state.photo='';save();render();if(draft!==undefined&&$('displayName'))$('displayName').value=draft;notify('Foto removida.');break;}case'exercise':openModal(control.dataset.id,control.dataset.track==='1');break;case'close':closeModal();break;case'go-workout':closeModal();setPage('inicio');break;case'start-workout':startWorkout();break;case'finish-workout':finishWorkout();break;case'toggle-set':toggleSet(Number(control.dataset.index));break;case'rest-manual':if(activeModal)startRest(restFor(exById[activeModal.id]));break;case'skip-rest':restUntil=0;renderRest();clearInterval(restTimer);break;case'speak':speak();break;case'demo-mode':changeDemo(control.dataset.mode);break;case'guide-next':guideMove(1);break;case'guide-prev':guideMove(-1);break;case'guide-speak':guideSpeak();break;case'viewer-mode':changeViewer(control.dataset.viewer);break;case'viewer-3d':if(viewer3D){
   const action=control.dataset.control;
   const paused=viewer3D.control(action);
   const playBtn=$('viewer3dActions')?.querySelector('[data-control="pause"]');
   if(playBtn)playBtn.textContent=paused?'▶ Continuar':'⏸ Pausar';
   document.querySelectorAll('#viewer3dActions button').forEach(b=>b.classList.toggle('active',(action==='start'||action==='finish')&&b.dataset.control===action));
   const status=$('viewer3dStatus');
   if(status)status.textContent=action==='start'?'Posição inicial ilustrativa. Confira seus apoios.':action==='finish'?'Posição final ilustrativa. Não force além de uma amplitude confortável.':action==='pause'?(paused?'Movimento pausado.':'Animação em andamento.'):action==='slow'?'Animação lenta para observar melhor a execução.':'Ângulo de visão atualizado.';
  }break;case'save-settings':{const n=($('displayName')?.value||'').trim().replace(/\s+/g,' ');if(n.length<2){notify('Informe um nome com pelo menos 2 caracteres.');$('displayName')?.focus();break;}state.name=n.slice(0,35);state.profileComplete=true;save();setPage('inicio');notify('Nome e preferências salvos!');break;}case'export':exportData();break;case'reset':if(confirm('Apagar todo o histórico e séries atuais deste navegador?')){state.history=[];state.sessions={};state.next={abc:0,quad:0};state.selected={abc:0,quad:0};save();render();notify('Histórico limpo.');}break;}return;}if(control.dataset.page){e.preventDefault();setPage(control.dataset.page);}});
 document.addEventListener('submit',e=>{if(e.target.id==='welcomeForm')welcomeSubmit(e);});
 document.addEventListener('input',e=>{if(e.target.id==='welcomeName')e.target.setCustomValidity('');if(e.target.matches('#searchExercises')){search=e.target.value;$('libraryCards').innerHTML=renderLibraryCards(filteredExercises());}if(e.target.matches('[data-set][data-field]'))syncSetField(e.target);});
 document.addEventListener('change',e=>{if(e.target.matches('#muscleFilter')){muscle=e.target.value;$('libraryCards').innerHTML=renderLibraryCards(filteredExercises());}if(e.target.matches('#importFile'))importData(e.target.files?.[0]);if(e.target.id==='welcomePhotoFile')handleProfilePhoto(e.target.files?.[0],'welcome');if(e.target.id==='profilePhotoFile')handleProfilePhoto(e.target.files?.[0],'settings');if(e.target.matches('input[name="settingsGoal"]'))setGoal(e.target.value);if(e.target.matches('#progressExerciseSelect')){progressExercise=e.target.value;const target=document.querySelector('.strength-panel');if(target)target.outerHTML=renderStrengthPanel();}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&activeModal)closeModal();});
 if('serviceWorker'in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
 render();
 if(needsWelcome)renderWelcome();
})();
