/* TreinaPro 3D — viewer authored in vanilla WebGL, no remote dependency.
 * Stylized 3D teaching model; not biomechanical, medical or posture assessment.
 */
(function(){'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
const V=(x,y,z)=>[x,y,z], add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),scale=(a,k)=>a.map(v=>v*k),len=a=>Math.hypot(...a),normal=a=>scale(a,1/(len(a)||1)),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],center=(a,b)=>scale(add(a,b),.5);
const types={bench:['bench','fly'],squat:['squat','legpress'],curl:['curl'],hinge:['hinge'],row:['row'],lunge:['lunge'],pull:['pull'],overhead:['overhead'],lateral:['lateral'],triceps:['triceps'],legcurl:['curlleg'],legextension:['extension'],abduction:['abduction'],calf:['calf'],plank:['plank'],crunch:['crunch'],hip:['hip']};
function getType(ex){const t=ex.type; if(['press','overhead'].includes(t))return 'overhead'; if(t==='bench' || t==='fly')return 'bench';if(['cable','pushdown'].includes(t))return 'triceps';if(['lateral'].includes(t))return 'lateral';if(t==='crunch')return 'crunch';if(t==='legpress')return 'legpress';if(t==='pulldown')return 'pull';if(t==='extension')return 'legextension';if(t==='curlleg')return 'legcurl';return t;}
function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
function makeMesh(gl){const verts=[];const faces=[];
 function ellipsoid(n=14,m=9){for(let j=0;j<=m;j++){const a=Math.PI*j/m;for(let i=0;i<=n;i++){const b=2*Math.PI*i/n;const x=Math.sin(a)*Math.cos(b),y=Math.cos(a),z=Math.sin(a)*Math.sin(b);verts.push(x,y,z,x,y,z);}}for(let j=0;j<m;j++)for(let i=0;i<n;i++){const v=j*(n+1)+i;faces.push(v,v+n+1,v+1,v+1,v+n+1,v+n+2);}}
 ellipsoid();const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.STATIC_DRAW);const index=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(faces),gl.STATIC_DRAW);return{buffer,index,length:faces.length};}
function matMul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[0*4+r]*b[c*4+0]+a[1*4+r]*b[c*4+1]+a[2*4+r]*b[c*4+2]+a[3*4+r]*b[c*4+3];return o;}
function persp(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);}
function lookAt(eye,target){const z=normal(sub(eye,target)),x=normal(cross([0,1,0],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-(x[0]*eye[0]+x[1]*eye[1]+x[2]*eye[2]),-(y[0]*eye[0]+y[1]*eye[1]+y[2]*eye[2]),-(z[0]*eye[0]+z[1]*eye[1]+z[2]*eye[2]),1]);}
const colors={skin:[.82,.85,.79],body:[.19,.34,.38],joint:[.38,.54,.56],highlight:[.76,.96,.29],muscle:[.35,.56,.56],metal:[.72,.80,.78],background:[.035,.075,.10],shadow:[.12,.21,.24],equipment:[.31,.37,.43],shoe:[.13,.19,.23]};
// Resolve um joelho num plano sagital mantendo os comprimentos constantes dos membros.
// Não é validação biomecânica; serve para evitar canelas que mudam de comprimento.
function bentKnee(hip,ankle,upper=.75,lower=.75){
 const dy=ankle[1]-hip[1],dz=ankle[2]-hip[2],d=Math.max(.0001,Math.hypot(dy,dz));
 const dd=Math.min(d,upper+lower-.003),along=(upper*upper-lower*lower+dd*dd)/(2*dd);
 const height=Math.sqrt(Math.max(0,upper*upper-along*along));
 const cy=hip[1]+along*dy/d,cz=hip[2]+along*dz/d;
 // Knee moves forward/up in the model, foot stays on the plate.
 return [hip[0],cy+height*dz/d,cz-height*dy/d];
}
function pose(ex,t){const j={};
 for(let s of [-1,1]){const p=s<0?'l':'r';j[p+'hip']=V(s*.18,1.01,0);j[p+'knee']=V(s*.18,.57,.04);j[p+'ankle']=V(s*.18,.12,.03);j[p+'shoulder']=V(s*.27,1.52,0);j[p+'elbow']=V(s*.36,1.18,.045);j[p+'wrist']=V(s*.37,.91,.05);j[p+'toe']=V(s*.19,.065,.23);}
 j.head=V(0,1.88,0);j.neck=V(0,1.64,0);j.pelvis=V(0,.99,0); j.chest=V(0,1.41,0);
 const type=getType(ex);
 if(ex.id==='leg_press'){
 j.head=V(0,1.46,-.55);j.neck=V(0,1.27,-.50);j.chest=V(0,1.05,-.39);j.pelvis=V(0,.63,-.27);
 for(const p of ['l','r']){const side=p==='l'?-1:1;
  j[p+'shoulder']=V(side*.26,1.09,-.38);j[p+'elbow']=V(side*.35,.86,-.28);j[p+'wrist']=V(side*.35,.65,-.26);
  j[p+'hip']=V(side*.19,.63,-.25);
  const ankle=V(side*.20,.49+.24*t,.58+.43*t);
  j[p+'ankle']=ankle;
  j[p+'knee']=bentKnee(j[p+'hip'],ankle,.72,.72);
  j[p+'toe']=V(side*.20,ankle[1]-.055,ankle[2]+.22);
 }
 } else if(ex.id==='coice_polia'){
 // Standing cable kickback: body/standing leg stay fixed, only working hip extends.
 j.pelvis=V(0,1.00,-.10);j.chest=V(0,1.40,.12);j.neck=V(0,1.59,.18);j.head=V(0,1.79,.19);
 for(const p of ['l','r']){const side=p==='l'?-1:1;
   j[p+'hip']=V(side*.18,1.00,-.10);j[p+'shoulder']=V(side*.26,1.49,.12);
   j[p+'elbow']=V(side*.36,1.28,.38);j[p+'wrist']=V(side*.36,1.22,.50);
   if(p==='l'){j[p+'knee']=V(-.18,.57,-.05);j[p+'ankle']=V(-.18,.12,.02);j[p+'toe']=V(-.18,.08,.26);}
   else {j[p+'knee']=V(.19,.57,-.12-.24*t);j[p+'ankle']=V(.19,.14+.19*t,-.02-.52*t);j[p+'toe']=V(.19,.08+.19*t,.20-.52*t);}
 }
 } else if(ex.id==='extensora'){
 // Knee remains aligned with the rotating machine; ankles trace an arc around it.
 j.head=V(0,1.43,-.36);j.neck=V(0,1.27,-.36);j.chest=V(0,1.08,-.25);j.pelvis=V(0,.70,-.18);
 const angle=mix(-1.36,-.07,t);
 for(const p of ['l','r']){const side=p==='l'?-1:1;
   j[p+'shoulder']=V(side*.27,1.12,-.24);j[p+'elbow']=V(side*.36,.81,-.20);j[p+'wrist']=V(side*.35,.61,-.18);
   j[p+'hip']=V(side*.17,.70,-.18);j[p+'knee']=V(side*.20,.57,.36);
   const ay=.57+.51*Math.sin(angle),az=.36+.51*Math.cos(angle);
   j[p+'ankle']=V(side*.20,ay,az);j[p+'toe']=V(side*.20,ay-.055,az+.19);
 }
 } else if(ex.id==='bulgaro'){
 // Stationary front foot + rear instep on bench. Torso follows vertical descent.
 const drop=.28*t;
 j.pelvis=V(0,1.01-drop,-.04);j.chest=V(0,1.43-drop,.015);j.neck=V(0,1.64-drop,.015);j.head=V(0,1.87-drop,.015);
 for(const p of ['l','r']){const side=p==='l'?-1:1;
   j[p+'shoulder']=V(side*.27,1.53-drop,.015);j[p+'elbow']=V(side*.36,1.22-drop,.06);j[p+'wrist']=V(side*.38,.93-drop,.10);
   j[p+'hip']=V(side*.18,1.01-drop,-.04);
   if(p==='l'){j[p+'knee']=V(-.20,.62-.14*t,.48+.08*t);j[p+'ankle']=V(-.20,.12,.55);j[p+'toe']=V(-.20,.08,.75);}
   else {j[p+'knee']=V(.20,.65-.26*t,-.42);j[p+'ankle']=V(.20,.60,-.78);j[p+'toe']=V(.20,.54,-.93);}
 }
 } else if(ex.id==='step_up'){
 // Front foot fixed on box, torso and back leg rise toward the planted leg.
 const climb=.48*t;
 j.pelvis=V(0,1.02+climb,-.20+.32*t);j.chest=V(0,1.45+climb,-.20+.32*t);
 j.neck=V(0,1.66+climb,-.20+.32*t);j.head=V(0,1.90+climb,-.20+.32*t);
 for(const p of ['l','r']){const side=p==='l'?-1:1;
   j[p+'hip']=V(side*.19,1.02+climb,-.20+.32*t);j[p+'shoulder']=V(side*.27,1.54+climb,-.20+.32*t);
   j[p+'elbow']=V(side*.36,1.23+climb,-.12+.32*t);j[p+'wrist']=V(side*.38,.95+climb,-.10+.32*t);
   if(p==='l'){j[p+'knee']=V(-.20,.60+.24*t,.44);j[p+'ankle']=V(-.20,.56,.54);j[p+'toe']=V(-.20,.52,.76);}
   else {j[p+'knee']=V(.19,.57+.38*t,-.46+.28*t);j[p+'ankle']=V(.19,.12+.43*t,-.43+.47*t);j[p+'toe']=V(.19,.08+.43*t,-.21+.47*t);}
 }
 } else if(ex.id==='remada_baixa'){
 j.head=V(0,1.36,-.12);j.neck=V(0,1.18,-.10);j.chest=V(0,.98,-.04);j.pelvis=V(0,.59,-.20);
 for(const p of ['l','r']){const s=p==='l'?-1:1;j[p+'shoulder']=V(s*.24,1.04,-.06);j[p+'elbow']=V(s*.31,.85,.30-.22*t);j[p+'wrist']=V(s*.32,.80,.54-.50*t);j[p+'hip']=V(s*.18,.59,-.20);j[p+'knee']=V(s*.18,.55,.43);j[p+'ankle']=V(s*.19,.18,.76);j[p+'toe']=V(s*.19,.10,.99);}
 } else if(type==='squat'){
 for(const p of ['l','r']){j[p+'hip'][1]-=.42*t;j[p+'hip'][2]-=.16*t;j[p+'knee'][1]-=.12*t;j[p+'knee'][2]+=.30*t;j[p+'shoulder'][1]-=.35*t;j[p+'shoulder'][2]+=.15*t;j[p+'elbow'][1]-=.31*t;j[p+'elbow'][2]+=.18*t;j[p+'wrist'][1]-=.28*t;j[p+'wrist'][2]+=.21*t;}
 j.pelvis[1]-=.42*t;j.pelvis[2]-=.16*t;j.chest[1]-=.35*t;j.chest[2]+=.15*t;j.neck[1]-=.35*t;j.neck[2]+=.15*t;j.head[1]-=.35*t;j.head[2]+=.14*t;
 } else if(type==='lunge'){
 for(const p of ['l','r']){const front=p==='l';const offset=front?.38:-.48;j[p+'hip'][1]-=.26*t;j[p+'knee']=V(j[p+'knee'][0],.58-(front?.11:.30)*t,offset*.8);j[p+'ankle'][2]=offset;j[p+'toe'][2]=offset+.19;}j.pelvis[1]-=.26*t;j.chest[1]-=.26*t;j.head[1]-=.26*t;j.neck[1]-=.26*t;for(let p of ['l','r']){j[p+'shoulder'][1]-=.26*t;j[p+'elbow'][1]-=.26*t;j[p+'wrist'][1]-=.26*t;}
 } else if(type==='hinge' || type==='row'){
 const d=.52*t;j.chest[1]-=d;j.chest[2]+=.52*t;j.neck[1]-=d;j.neck[2]+=.60*t;j.head[1]-=d;j.head[2]+=.64*t;for(let p of ['l','r']){j[p+'shoulder'][1]-=d;j[p+'shoulder'][2]+=.54*t;j[p+'elbow'][1]-=.39*t;j[p+'elbow'][2]+=.40*t;j[p+'wrist'][1]-=.34*t;j[p+'wrist'][2]+=.44*t;}if(type==='row')for(let p of ['l','r']){j[p+'elbow'][2]=.66-.4*t;j[p+'wrist'][2]=.72-.56*t;j[p+'wrist'][1]=.72+.22*t;}
 } else if(type==='bench'){
 j.head=V(0,.97,.93);j.neck=V(0,.90,.70);j.chest=V(0,.89,.30);j.pelvis=V(0,.71,-.30);
 for(let p of ['l','r']){const s=p==='l'?-1:1;j[p+'shoulder']=V(s*.28,.89,.34);j[p+'elbow']=V(s*.45,.82+.25*t,.29);j[p+'wrist']=V(s*.45,.94+.62*t,.29);j[p+'hip']=V(s*.18,.69,-.28);j[p+'knee']=V(s*.24,.53,-.75);j[p+'ankle']=V(s*.23,.12,-.66);j[p+'toe']=V(s*.24,.08,-.46);}
 } else if(type==='hip'){
 j.head=V(0,.85,-.94);j.neck=V(0,.83,-.75);j.chest=V(0,.77,-.54);j.pelvis=V(0,.52+.37*t,-.11);
 for(let p of ['l','r']){const s=p==='l'?-1:1;j[p+'shoulder']=V(s*.29,.77,-.56);j[p+'elbow']=V(s*.39,.43,-.48);j[p+'wrist']=V(s*.4,.30,-.3);j[p+'hip']=V(s*.18,.52+.37*t,-.1);j[p+'knee']=V(s*.26,.58,.50);j[p+'ankle']=V(s*.27,.12,.72);j[p+'toe']=V(s*.26,.08,.89);}
 } else if(type==='plank' || type==='crunch' || type==='legcurl'){
 j.head=V(0,.61,.94);j.neck=V(0,.55,.7);j.chest=V(0,.55,.37);j.pelvis=V(0,.48,-.28);
 for(let p of ['l','r']){const s=p==='l'?-1:1;j[p+'shoulder']=V(s*.26,.56,.38);j[p+'elbow']=V(s*.32,.28,.58);j[p+'wrist']=V(s*.32,.12,.82);j[p+'hip']=V(s*.16,.48,-.30);j[p+'knee']=V(s*.18,.29,-.79);j[p+'ankle']=V(s*.18,.10,-1.05);j[p+'toe']=V(s*.18,.065,-1.17);}
 if(type==='legcurl')for(let p of ['l','r']){j[p+'ankle'][1]+=.52*t;j[p+'ankle'][2]+=.25*t;}
 if(type==='crunch'){j.head[1]+=.28*t;j.head[2]-=.19*t;j.neck[1]+=.20*t;j.chest[1]+=.16*t;}
 } else if(type==='abduction'){
 j.head=V(0,1.43,-.36);j.neck=V(0,1.27,-.36);j.chest=V(0,1.08,-.25);j.pelvis=V(0,.70,-.18);
 for(let p of ['l','r']){const s=p==='l'?-1:1;j[p+'shoulder']=V(s*.27,1.12,-.24);j[p+'elbow']=V(s*.36,.81,-.20);j[p+'wrist']=V(s*.35,.61,-.18);j[p+'hip']=V(s*.17,.70,-.18);j[p+'knee']=V(s*.20,.57,.39);j[p+'ankle']=V(s*.20,.18+.37*t,.50+.24*t);j[p+'toe']=V(s*.20,.10+.37*t,.68+.24*t);j[p+'knee'][0]+=s*.26*t;j[p+'ankle'][0]+=s*.30*t;j[p+'toe'][0]+=s*.30*t;}
 } else {
 if(type==='curl')for(const p of ['l','r']){j[p+'wrist'][1]=mix(.88,1.42,t);j[p+'wrist'][2]=.12+.25*t;}
 if(type==='triceps')for(const p of ['l','r']){j[p+'elbow'][1]=1.28;j[p+'wrist'][1]=mix(1.27,.86,t);j[p+'wrist'][2]=.20;}
 if(type==='overhead')for(const p of ['l','r']){const s=p==='l'?-1:1;j[p+'elbow']=V(s*.43,1.40+.25*t,.02);j[p+'wrist']=V(s*.48,1.51+.48*t,.02);}
 if(type==='lateral')for(const p of ['l','r']){const s=p==='l'?-1:1;j[p+'elbow']=V(s*(.41+.30*t),1.22+.28*t,.04);j[p+'wrist']=V(s*(.45+.57*t),.91+.59*t,.05);}
 if(type==='pull')for(const p of ['l','r']){const s=p==='l'?-1:1;j[p+'elbow']=V(s*(.43+.14*(1-t)),1.52+.22*(1-t),.05);j[p+'wrist']=V(s*.53,1.47+.48*(1-t),.09);}
 if(type==='calf'){for(const point of ['head','neck','chest','pelvis',...['l','r'].flatMap(p=>[p+'shoulder',p+'elbow',p+'wrist',p+'hip',p+'knee',p+'ankle'])])j[point][1]+=.13*t;}
 }
 if(ex.id==='face_pull'){for(const p of ['l','r']){const s=p==='l'?-1:1;j[p+'elbow']=V(s*.55,1.50,.2*t);j[p+'wrist']=V(s*.31,1.58,.55*(1-t));}}
 if(ex.id==='crucifixo'){for(const p of ['l','r']){const s=p==='l'?-1:1;j[p+'elbow']=V(s*(.70-.22*t),.95+.16*t,.25);j[p+'wrist']=V(s*(.98-.52*t),.94+.58*t,.25);}}
 return j;
}
// v1.8: volume anatomy stylization, not a medically accurate avatar.
// Build once per frame for both GPU and Canvas fallback, avoiding inconsistent models.
function anatomyFor(j,focus){
 const shapes=[];
 const bone=(a,b,r,color)=>shapes.push({kind:'bone',a,b,r,color});
 const ell=(at,radii,color)=>shapes.push({kind:'orb',at,radii,color});
 const upright=normal(sub(j.neck,j.pelvis));
 const across=normal(sub(j.rshoulder,j.lshoulder));
 const front=normal(cross(across,upright));
 const shifted=(o,x,y,z)=>add(add(add(o,scale(across,x)),scale(upright,y)),scale(front,z));
 const on=(a,b,k)=>mixVec(a,b,k);
 // Torso, clavicles, waist and segmented pectorals.
 bone(j.pelvis,j.chest,.198,focus==='Abdômen'||focus==='Costas'?'highlight':'body');
 bone(j.lshoulder,j.rshoulder,.110,'body');
 ell(j.pelvis,[.225,.145,.180],focus==='Glúteos'?'highlight':'body');
 for(const s of [-1,1]){
  ell(shifted(j.chest,s*.118,-.005,.103),[.137,.119,.086],focus==='Peito'?'highlight':'muscle');
  ell(shifted(j.chest,s*.083,-.225,.092),[.074,.108,.065],focus==='Abdômen'?'highlight':'body');
 }
 for(const p of ['l','r']){
  const sho=j[p+'shoulder'],elb=j[p+'elbow'],wr=j[p+'wrist'];
  const hip=j[p+'hip'],kn=j[p+'knee'],ank=j[p+'ankle'];
  bone(sho,elb,.093,'body');bone(elb,wr,.069,'skin');
  ell(sho,[.114,.136,.123],focus==='Ombros'?'highlight':'joint');
  const armSpot=shifted(on(sho,elb,.47),0,0,.045);
  ell(armSpot,[.085,.175,.075],focus==='Bíceps'||focus==='Tríceps'?'highlight':'muscle');
  ell(wr,[.077,.075,.082],'skin');
  bone(hip,kn,.125,'body');bone(kn,ank,.087,'body');
  // Quadriceps and hamstrings are separate highlightable volumes.
  ell(shifted(on(hip,kn,.47),0,0,.07),[.128,.235,.102],focus==='Quadríceps'?'highlight':'muscle');
  if(focus==='Posterior')ell(shifted(on(hip,kn,.43),0,0,-.082),[.120,.19,.086],'highlight');
  ell(on(kn,ank,.57),[.098,.192,.091],focus==='Panturrilhas'?'highlight':'muscle');
  ell(kn,[.094,.094,.095],'joint');
  bone(ank,j[p+'toe'],.078,'shoe');
  ell(j[p+'toe'],[.095,.058,.121],'shoe');
 }
 bone(j.neck,j.head,.082,'skin');
 ell(j.head,[.153,.193,.140],'skin');
 return shapes;
}
function mixVec(a,b,t){return a.map((v,i)=>mix(v,b[i],t));}
function equipmentFor(ex,j,t){
 const parts=[],seg=(a,b,r=.045,c='equipment')=>parts.push([a,b,r,c]);
 const frame=(x,z,height=2)=>{seg(V(x,0,z),V(x,height,z),.045);seg(V(x,0,z),V(x+.5,0,z),.035);};
 const seat=(y,z)=>{seg(V(-.32,y,z),V(.32,y,z),.12);seg(V(-.24,y,z),V(-.24,.06,z),.055);seg(V(.24,y,z),V(.24,.06,z),.055);};
 const cable=(a,b)=>seg(a,b,.014,'metal');
 switch(ex.id){
  case 'leg_press':
   seat(.60,-.26);seg(V(-.39,.66,-.53),V(.39,.66,-.53),.09);
   // Inclined rails and sled follow both feet; toe/foot remain aligned with platform.
   for(const x of [-.48,.48])seg(V(x,.23,.75),V(x,1.54,1.69),.045);
   {const y=j.lankle[1]+.07,z=j.ltoe[2]+.045;
    seg(V(-.57,y,z),V(.57,y,z),.10,'metal');
    seg(V(-.57,y+.30,z-.10),V(.57,y+.30,z-.10),.055,'metal');
    seg(V(-.57,y,z),V(-.57,y+.30,z-.10),.038,'metal');seg(V(.57,y,z),V(.57,y+.30,z-.10),.038,'metal');}
   seg(V(-.40,.31,-.32),V(-.40,.86,-.53),.04);seg(V(.40,.31,-.32),V(.40,.86,-.53),.04);
   break;
  case 'extensora':
   seat(.64,-.18);seg(V(-.35,.68,-.46),V(.35,1.20,-.46),.105);
   seg(V(-.34,.56,.36),V(.34,.56,.36),.043,'metal');
   seg(V(-.37,j.lankle[1]-.045,j.lankle[2]),V(.37,j.rankle[1]-.045,j.rankle[2]),.082,'metal');
   seg(V(0,.54,.37),V(0,.23,.26),.044);break;
  case 'flexora':
   seat(.48,-.25);seg(V(-.36,.52,.48),V(.36,.52,.48),.11);seg(V(-.4,.24,-1.10),V(.4,.24,-1.10),.08,'metal');break;
  case 'abdutora':
   seat(.64,-.20);seg(V(-.35,.69,-.47),V(.35,1.26,-.47),.09);seg(V(j.lknee[0]-.09,.59,.31),V(j.lknee[0]-.09,.40,.43),.075,'metal');seg(V(j.rknee[0]+.09,.59,.31),V(j.rknee[0]+.09,.40,.43),.075,'metal');break;
  case 'puxada_alta':
   seat(.59,0);frame(-.67,-.35,2.30);frame(.67,-.35,2.30);seg(V(-.7,2.30,-.35),V(.7,2.30,-.35),.04);seg(V(-.76,1.89-.44*t,.10),V(.76,1.89-.44*t,.10),.045,'metal');cable(V(0,2.30,.1),V(0,1.89-.44*t,.10));seg(V(-.38,.62,.17),V(.38,.62,.17),.065);break;
  case 'remada_baixa':
   seat(.57,-.22);frame(-.56,1.08,1.28);frame(.56,1.08,1.28);seg(V(-.36,.23,.72),V(.36,.23,.72),.065,'metal');cable(V(0,.49,1.09),V(0,.82,.54-.5*t));break;
  case 'supino_maquina':
   seat(.61,-.25);seg(V(-.34,.71,-.5),V(.34,1.36,-.5),.1);frame(-.70,-.65,1.48);frame(.70,-.65,1.48);seg(V(-.57,1.02,.35),V(.57,1.02,.35),.045,'metal');break;
  case 'triceps_polia': case 'coice_polia':
   frame(-.67,-.20,2.25);seg(V(-.69,2.25,-.20),V(0,2.25,-.20),.055);if(ex.id==='coice_polia'){cable(V(-.67,.20,-.20),j.rankle);seg(V(-.70,1.22,.51),V(.38,1.22,.51),.055,'metal');}else cable(V(0,2.24,-.20),V(0,1.04,0));break;
  case 'hip_thrust':
   seg(V(-.62,.73,-.70),V(.62,.73,-.70),.11);
   seg(V(-.55,.70,-.70),V(-.55,.05,-.70),.05);seg(V(.55,.70,-.70),V(.55,.05,-.70),.05);
   seg(V(-.44,j.pelvis[1]+.10,-.10),V(.44,j.pelvis[1]+.10,-.10),.065,'metal');break;
  case 'bulgaro':
   seg(V(-.4,.56,-.89),V(.4,.56,-.89),.12);seg(V(-.34,.55,-.90),V(-.34,.05,-.90),.043);seg(V(.34,.55,-.90),V(.34,.05,-.90),.043);break;
  case 'step_up':
   for(const x of [-.48,.48]){
    seg(V(x,.04,.60),V(x,.49,.60),.045);seg(V(x,.04,.10),V(x,.49,.10),.045);
   }seg(V(-.48,.52,.10),V(.48,.52,.10),.065);seg(V(-.48,.52,.82),V(.48,.52,.82),.08);break;
  case 'supino':case 'supino_inclinado':case 'crucifixo':
   seg(V(-.36,.64,-.12),V(.36,.64,-.12),.15);seg(V(0,.64,-.90),V(0,.64,.76),.13);seg(V(0,.60,-.55),V(0,.08,-.55),.06);if(ex.id==='supino'){seg(V(-.7,.85,.39),V(-.7,1.22,.39),.04);seg(V(.7,.85,.39),V(.7,1.22,.39),.04);}break;
  default:break;
 }
 return parts;
}
class Viewer{
 constructor(canvas,ex){this.canvas=canvas;this.ex=ex;this.angle=['bench','hip','plank','crunch','legcurl','legpress','legextension'].includes(getType(ex))||ex.id==='remada_baixa'?1.0:.34;this.speed=1;this.paused=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;this.phase=0;this.last=0;this.lastPaint=0;this.disposed=false;this.mobile=window.innerWidth<=600;this.frameInterval=this.mobile?1000/30:1000/45;this.pixelRatio=Math.min(window.devicePixelRatio||1,this.mobile?1.4:1.8);this.gl=canvas.getContext('webgl',{antialias:true,alpha:false,preserveDrawingBuffer:false});if(!this.gl){this.ctx=canvas.getContext('2d');this.mode='projection';}else{
 try{this.init();this.mode='webgl';}catch(err){this.fallback('Renderização tridimensional indisponível neste navegador. Use a animação 2D.');return;}}
 this.onVisibility=()=>{this.last=0;this.lastPaint=0;if(document.hidden){cancelAnimationFrame(this.frame);this.frame=0;}else if(!this.disposed&&!this.frame){this.frame=requestAnimationFrame(this.loop);}};document.addEventListener('visibilitychange',this.onVisibility);this.down=null;canvas.addEventListener('pointerdown',this.pointerDown=e=>{this.down={x:e.clientX,angle:this.angle};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',this.pointerMove=e=>{if(this.down){this.angle=this.down.angle+(e.clientX-this.down.x)*.014;if(this.paused)this.render();}});canvas.addEventListener('pointerup',this.pointerUp=()=>{this.down=null;});canvas.addEventListener('pointercancel',this.pointerUp);this.onResize=()=>{if(!this.disposed&&this.paused)this.render();};window.addEventListener('resize',this.onResize);this.loop=this.loop.bind(this);this.frame=requestAnimationFrame(this.loop);
 }
 fallback(message){this.canvas.style.display='none';const msg=document.createElement('p');msg.className='viewer-fallback';msg.textContent=message;this.canvas.insertAdjacentElement('afterend',msg);this.fallbackNode=msg;}
 init(){const gl=this.gl;const vertex='attribute vec3 p;attribute vec3 n;uniform mat4 mvp;uniform mat4 model;varying float shade;void main(){vec3 normal=normalize((model*vec4(n,0.0)).xyz);shade=0.55+0.45*max(dot(normal,normalize(vec3(-0.6,0.9,1.0))),0.0);gl_Position=mvp*vec4(p,1.0);}';const fragment='precision mediump float;varying float shade;uniform vec3 color;void main(){gl_FragColor=vec4(color*shade,1.0);}';const program=gl.createProgram();gl.attachShader(program,shader(gl,gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl,gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);this.program=program;this.loc={p:gl.getAttribLocation(program,'p'),n:gl.getAttribLocation(program,'n'),mvp:gl.getUniformLocation(program,'mvp'),model:gl.getUniformLocation(program,'model'),color:gl.getUniformLocation(program,'color')};this.mesh=makeMesh(gl);gl.bindBuffer(gl.ARRAY_BUFFER,this.mesh.buffer);gl.vertexAttribPointer(this.loc.p,3,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(this.loc.p);gl.vertexAttribPointer(this.loc.n,3,gl.FLOAT,false,24,12);gl.enableVertexAttribArray(this.loc.n);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.mesh.index);gl.enable(gl.DEPTH_TEST);}
 drawEllipsoid(at,radii,col,along){const gl=this.gl;let X=[radii[0],0,0],Y=[0,radii[1],0],Z=[0,0,radii[2]];if(along){let axis=normal(along),ref=Math.abs(axis[1])<.95?[0,1,0]:[1,0,0];let x=normal(cross(ref,axis)),z=normal(cross(x,axis));X=scale(x,radii[0]);Y=scale(axis,radii[1]);Z=scale(z,radii[2]);}const model=new Float32Array([X[0],X[1],X[2],0,Y[0],Y[1],Y[2],0,Z[0],Z[1],Z[2],0,at[0],at[1],at[2],1]);gl.uniformMatrix4fv(this.loc.model,false,model);gl.uniformMatrix4fv(this.loc.mvp,false,matMul(this.vp,model));gl.uniform3fv(this.loc.color,colors[col]||col);gl.drawElements(gl.TRIANGLES,this.mesh.length,gl.UNSIGNED_SHORT,0);}
 bone(a,b,r,col){const delta=sub(b,a);this.drawEllipsoid(center(a,b),[r,len(delta)*.54,r],col,delta);}
 renderProjection(){
   const canvas=this.canvas,ctx=this.ctx;if(!ctx)return;const width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)return;const dpr=this.pixelRatio,w=Math.round(width*dpr),h=Math.round(height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
   const bg=ctx.createRadialGradient(w*.5,h*.48,10,w*.5,h*.46,w*.63);bg.addColorStop(0,'#264650');bg.addColorStop(1,'#07141b');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
   const distance=['leg_press','hip_thrust','prancha','flexora','supino','supino_inclinado','crucifixo','remada_baixa'].includes(this.ex.id)?3.8:3.0;const eye=[Math.sin(this.angle)*distance,1.7,Math.cos(this.angle)*distance],fwd=normal(sub([0,1,0],eye)),right=normal([Math.cos(this.angle),0,-Math.sin(this.angle)]),up=normal(cross(right,fwd)),f=(h*.94),j=pose(this.ex,(1-Math.cos(this.phase))/2);
   const project=v=>{const d=sub(v,eye),z=Math.max(.1,d[0]*fwd[0]+d[1]*fwd[1]+d[2]*fwd[2]);return {x:w/2+(d[0]*right[0]+d[1]*right[1]+d[2]*right[2])*f/z,y:h*.59-(d[0]*up[0]+d[1]*up[1]+d[2]*up[2])*f/z,z,unit:f/z};};
   const shadow=project([0,0,0]);ctx.fillStyle='#102932';ctx.beginPath();ctx.ellipse(shadow.x,shadow.y+5*dpr,115*dpr,25*dpr,0,0,2*Math.PI);ctx.fill();
   ctx.strokeStyle='rgba(150,213,177,.11)';ctx.lineWidth=dpr;for(let k=-4;k<=4;k++){const a=project([k*.35,0,-1.5]),b=project([k*.35,0,1.5]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
   const palette={body:'#37575d',joint:'#708f8e',skin:'#d5e7dc',highlight:'#c6f65b',muscle:'#719796',metal:'#adc0c7',equipment:'#586d75',shoe:'#23333d'};
   let parts=[];const bone=(a,b,r,c)=>{const A=project(a),B=project(b);parts.push({a:A,b:B,r:r*(A.unit+B.unit)/2,c,depth:(A.z+B.z)/2});};const orb=(a,r,c)=>{const A=project(a);parts.push({a:A,b:A,r:r*A.unit,c,depth:A.z});};
   for(const [a,b,r,c] of equipmentFor(this.ex,j,(1-Math.cos(this.phase))/2))bone(a,b,r,c);
   for(const item of anatomyFor(j,this.ex.muscle)){
    if(item.kind==='bone')bone(item.a,item.b,item.r,item.color);
    else {const [rx,ry,rz]=item.radii;orb(item.at,Math.max(rx,ry,rz)*.88,item.color);}
   }
   if(['curl','overhead','bench','row','lateral','hinge'].includes(getType(this.ex))){for(const p of ['l','r'])bone(add(j[p+'wrist'],[-.10,0,0]),add(j[p+'wrist'],[.10,0,0]),.05,'metal');}
   parts.sort((a,b)=>b.depth-a.depth);for(const v of parts){ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#0b1e24';ctx.lineWidth=Math.max(3,v.r*2+3*dpr);ctx.beginPath();ctx.moveTo(v.a.x,v.a.y);ctx.lineTo(v.b.x+.001,v.b.y);ctx.stroke();ctx.strokeStyle=palette[v.c]||palette.body;ctx.lineWidth=Math.max(3,v.r*2);ctx.stroke();ctx.lineWidth=Math.max(1,v.r*.29);ctx.strokeStyle='rgba(244,255,250,.19)';ctx.beginPath();ctx.moveTo(v.a.x-v.r*.20,v.a.y-v.r*.20);ctx.lineTo(v.b.x-v.r*.20+.001,v.b.y-v.r*.20);ctx.stroke();}
 }
 render(){if(!this.gl){this.renderProjection();return;}const gl=this.gl;if(!gl||this.disposed)return;const width=this.canvas.clientWidth,height=this.canvas.clientHeight;if(!width||!height)return;const dpr=this.pixelRatio,w=Math.round(width*dpr),h=Math.round(height*dpr);if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}gl.viewport(0,0,w,h);gl.clearColor(...colors.background,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);const distance=['leg_press','hip_thrust','prancha','flexora','supino','supino_inclinado','crucifixo','remada_baixa'].includes(this.ex.id)?3.8:3.0;const eye=[Math.sin(this.angle)*distance,1.7,Math.cos(this.angle)*distance],target=[0,1.05,0];this.vp=matMul(persp(.68,w/h,.10,30),lookAt(eye,target));const t=(1-Math.cos(this.phase))/2;const j=pose(this.ex,t);this.drawEllipsoid([0,-.12,0],[1.25,.10,1.38],colors.shadow);
 for(const [a,b,r,c] of equipmentFor(this.ex,j,t))this.bone(a,b,r,c);
 const jShapes=anatomyFor(j,this.ex.muscle);
 for(const s of jShapes){
   if(s.kind==='bone')this.bone(s.a,s.b,s.r,s.color);
   else this.drawEllipsoid(s.at,s.radii,s.color);
 }
 if(['curl','overhead','bench','row','lateral','hinge'].includes(getType(this.ex))){for(const p of ['l','r'])this.bone(add(j[p+'wrist'],[-.10,0,0]),add(j[p+'wrist'],[.10,0,0]),.054,'metal');}
 }
 loop(now){
   this.frame=0;if(this.disposed||document.hidden)return;
   const dt=this.last?Math.min(70,now-this.last):0;this.last=now;
   if(!this.paused)this.phase+=dt*.0016*this.speed;
   if(!this.lastPaint||now-this.lastPaint>=this.frameInterval){this.lastPaint=now;this.render();}
   if(!this.paused)this.frame=requestAnimationFrame(this.loop);
 }
 control(action){
   if(action==='pause')this.paused=!this.paused;
   if(action==='start'){this.paused=true;this.phase=0;}
   if(action==='finish'){this.paused=true;this.phase=Math.PI;}
   if(action==='slow'){this.speed=.45;this.paused=false;}
   if(action==='normal'){this.speed=1;this.paused=false;}
   if(action==='front')this.angle=0;
   if(action==='side')this.angle=Math.PI/2;
   if(this.paused && this.frame){cancelAnimationFrame(this.frame);this.frame=0;}
   this.render();
   if(!this.paused&&!this.frame&&!document.hidden){this.last=0;this.lastPaint=0;this.frame=requestAnimationFrame(this.loop);}
   return this.paused;
 }
 destroy(){
   this.disposed=true;cancelAnimationFrame(this.frame);
   document.removeEventListener('visibilitychange',this.onVisibility);window.removeEventListener('resize',this.onResize);
   if(this.canvas){this.canvas.removeEventListener('pointerdown',this.pointerDown);this.canvas.removeEventListener('pointermove',this.pointerMove);this.canvas.removeEventListener('pointerup',this.pointerUp);this.canvas.removeEventListener('pointercancel',this.pointerUp);}
   if(this.gl){const gl=this.gl;gl.deleteBuffer(this.mesh?.buffer);gl.deleteBuffer(this.mesh?.index);gl.deleteProgram(this.program);}
   this.fallbackNode?.remove();
 }

}
window.TreinaPro3D={mount(canvas,ex){return new Viewer(canvas,ex)}};
})();
