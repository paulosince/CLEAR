/* Controle do ambiente: instrumentos e sons ambiente (ícone + play/pause), sala, tempo do mundo. */
import { S, $, sizeCanvas, goLive, emit, on } from './state.js';
import { STREAMS } from '../env/streams.js';
import { INST } from '../env/sounds.js';
import { logStimulus } from '../lab/lab.js';
import { ensureAudio, playNote } from './audio.js';

// de que fluxo é cada fonte (para o ícone na sala)
const SRC_STREAM={};
for(const k in STREAMS){ const d=STREAMS[k]; if(d.group==='rot') continue; for(const s of d.sources) if(!(s[0] in SRC_STREAM)) SRC_STREAM[s[0]]=k; }

export function toggleStream(key){
  ensureAudio(); const {U,amb}=S;
  if(amb.isOn(key)) amb.stop(key,U.t); else amb.start(key, U.t/U.sr, (Math.random()*4294967295)>>>0);
  renderChips();
}
export function renderChips(){
  for(const [box,group] of [['chipsInstr','instr'],['chipsAmb','amb']]){
    const el=$(box); if(!el.children.length){
      for(const k in STREAMS){ const d=STREAMS[k]; if(d.group!==group) continue;
        const b=document.createElement('button'); b.className='chip'; b.dataset.k=k; b.setAttribute('aria-pressed','false');
        b.innerHTML=`<span class="ic" aria-hidden="true">${d.icon}</span><span class="nm">${d.label}</span><span class="st">▶</span>`;
        b.onclick=()=>toggleStream(k); el.appendChild(b); } }
    for(const b of el.children){ const onNow=S.amb.isOn(b.dataset.k); b.classList.toggle('on',onNow); b.setAttribute('aria-pressed',String(onNow)); b.querySelector('.st').textContent=onNow?'⏸':'▶'; b.title=onNow?'pausar':'tocar'; }
  }
}

// toca uma nota numa fonte (experimentos manuais e testes)
export function trigger(src,f,dur,amp,delaySec=0,opt={}){
  if(!src) return; const {U,amb}=S, start=U.t+Math.round(delaySec*U.sr);
  const nt=amb.W.play(src,f,dur,amp,start,opt); logStimulus(U,nt,src,{f,dur,amp,opt},start);
  if(S.worldSpeed===1) playNote(nt,U.sr,delaySec);
}

// ---------- sala ----------
function roomGeom(){ const c=$('room'), r=c.getBoundingClientRect(); const sz=Math.min(r.width-20,(r.height-16)*1.6); const sx=sz/4, sy=(r.height-16)/4; return {r,sx,sy,ox:(r.width-4*sx)/2,oy:8}; }
export function drawRoom(){
  const c=$('room'), d=sizeCanvas(c), g=c.getContext('2d'), G=roomGeom(), W=S.amb.W, U=S.U;
  g.setTransform(d,0,0,d,0,0); g.clearRect(0,0,G.r.width,G.r.height);
  g.strokeStyle='#2a3140'; g.lineWidth=1; g.strokeRect(G.ox,G.oy,4*G.sx,4*G.sy);
  const P=(x,y)=>[G.ox+x*G.sx, G.oy+y*G.sy];
  const [rx,ry]=P(W.robot.x,W.robot.y);
  g.fillStyle='#2b3344'; g.beginPath(); g.arc(rx,ry,13,0,6.2832); g.fill();
  g.fillStyle='#9aa3b2'; g.beginPath(); g.moveTo(rx,ry-17); g.lineTo(rx-5,ry-10); g.lineTo(rx+5,ry-10); g.fill();
  const E=W.ears(); for(let e=0;e<2;e++){ const [x,y]=P(E[e].x,E[e].y); g.fillStyle=e?'#f08080':'#80c0f0'; g.beginPath(); g.arc(x+(e?6:-6),y,4,0,6.2832); g.fill(); }
  g.textAlign='center'; g.textBaseline='middle';
  for(const s of W.sources){
    const [x,y]=P(s.x,s.y), key=SRC_STREAM[s.label], def=key&&STREAMS[key];
    const live = key ? S.amb.isOn(key) : s.notes.length>0, act=W.activeAt(s,U.t);
    g.globalAlpha = live||act ? 1 : 0.28;
    if(act){ g.fillStyle='rgba(255,226,122,0.28)'; g.beginPath(); g.arc(x,y,17,0,6.2832); g.fill(); }
    if(def){ g.font='17px system-ui'; g.fillText(def.icon,x,y+1); }
    else { g.fillStyle=INST[s.inst].color; g.beginPath(); g.arc(x,y,10,0,6.2832); g.fill(); g.fillStyle='#111'; g.font='bold 10px system-ui'; g.fillText(INST[s.inst].letter,x,y); }
  }
  g.globalAlpha=1; g.textAlign='start'; g.textBaseline='alphabetic';
}
function initRoom(){
  const c=$('room'); let drag=null;
  c.addEventListener('pointerdown',e=>{ const G=roomGeom(); let best=null,bd=22; for(const s of S.amb.W.sources){ const dd=Math.hypot(G.ox+s.x*G.sx-e.offsetX, G.oy+s.y*G.sy-e.offsetY); if(dd<bd){bd=dd;best=s} } if(best){ drag=best; c.setPointerCapture(e.pointerId); } });
  c.addEventListener('pointermove',e=>{ if(!drag) return; const G=roomGeom(), W=S.amb.W;
    drag.x=Math.max(0.1,Math.min(3.9,(e.offsetX-G.ox)/G.sx)); drag.y=Math.max(0.1,Math.min(3.9,(e.offsetY-G.oy)/G.sy));
    if(Math.hypot(drag.x-W.robot.x,drag.y-W.robot.y)<0.3) drag.y=W.robot.y-0.3; W.prepare(); });
  const up=()=>{ drag=null; }; c.addEventListener('pointerup',up); c.addEventListener('pointercancel',up);
}

export function initControls(){
  initRoom(); renderChips();
  $('stopAll').onclick=()=>{ for(const k of [...S.amb.on.keys()]) S.amb.stop(k,S.U.t); renderChips(); };
  $('wspeed').onchange=e=>{ S.worldSpeed=+e.target.value; };
  let srArm=0;
  $('srBtn').onclick=()=>{ const now=performance.now(), other=S.U.sr===16000?8000:16000;
    if(now-srArm>3000){ srArm=now; $('srBtn').textContent=`mudar p/ ${other/1000} kHz? (universo novo) toque de novo`; setTimeout(()=>{ $('srBtn').textContent=`mic ${S.U.sr/1000} kHz`; },3000); return; }
    srArm=0; S.params.sr=other; const inp=document.querySelector('#params input[data-k="sr"]'); if(inp) inp.value=other; emit('novoUniverso'); };
  for(const b of document.querySelectorAll('.jmp')) b.onclick=()=>{ S.U.jump(Math.round(+b.dataset.j*S.U.sr)); S.amb.W.gc(S.U.t); goLive(); };
  $('expPV').onclick=()=>{ ensureAudio(); const A=S.amb, f=261.63, a=0.7;
    const p=A.addSource('piano','piano',1.0,1.1), v=A.addSource('viola','viola',3.0,1.1); A.W.prepare();
    trigger(p,f,0.6,a,0); trigger(p,f,0.6,a,1.2); trigger(p,f,0.6,a,2.4); trigger(v,f,0.6,a,3.8); trigger(v,f,0.6,a,5.0); trigger(p,f,0.6,a,6.2); };
  $('expDir').onclick=()=>{ ensureAudio(); const A=S.amb, s=A.addSource('piano','piano',1.0,1.1), f=329.63, a=0.7, ox=s.x, oy=s.y; A.W.prepare();
    trigger(s,f,0.5,a,0); trigger(s,f,0.5,a,1.0);
    setTimeout(()=>{ s.x=Math.max(0.2,Math.min(3.8,4-ox)); A.W.prepare(); },1800/S.worldSpeed);
    trigger(s,f,0.5,a,2.2); trigger(s,f,0.5,a,3.2);
    setTimeout(()=>{ s.x=ox; s.y=oy; A.W.prepare(); },4200/S.worldSpeed); };
  on('universo',()=>{ renderChips(); $('srBtn').textContent=`mic ${S.U.sr/1000} kHz`; });
}
