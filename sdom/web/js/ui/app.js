/* Página: cria o universo, mantém o robô vivo (laço), desenha e liga os controles. */
import { CODE_VERSION, PARAM_UI } from '../core/params.js';
import { hashStr } from '../core/util.js';
import { Universe } from '../core/universe.js';
import { Ambiente } from '../env/environment.js';
import { Store } from '../store.js';
import { logStimulus } from '../lab/lab.js';
import { S, $, on, emit } from './state.js';
import { playNote } from './audio.js';
import { drawSdom, initSdomView } from './sdomview.js';
import { drawPanel, drawWave, drawTimeline, initPanels } from './panels.js';
import { initControls, drawRoom, renderChips, trigger } from './controls.js';
import { initLab, labApi } from './labui.js';
import { renderStore, initStoreUI } from './storeui.js';

function setVersion(extra=''){ $('ver').textContent=`· ${CODE_VERSION} · universo #${S.universeNo}${extra} · params ${hashStr(JSON.stringify(S.params))}`; }

// universo novo: o mesmo ambiente (fontes e o que estava tocando) continua, num robô que nasce vazio
function newUniverse(){
  const was = S.amb ? [...S.amb.on.keys()] : [];
  const pos = S.amb ? Object.fromEntries(S.amb.W.sources.map(s=>[s.label,[s.x,s.y]])) : {};
  if(S.U) Store.flush(S.U);
  S.universeNo++; S.seed=(S.seed*1103515245+12345)>>>0;
  S.U=new Universe(Object.assign({},S.params), S.seed);
  Store.begin(S.U,'#'+S.universeNo);
  S.amb=new Ambiente(S.params.sr, Ambiente.allSources());
  for(const s of S.amb.W.sources) if(pos[s.label]){ s.x=pos[s.label][0]; s.y=pos[s.label][1]; }
  for(const k of was) S.amb.start(k,0,(Math.random()*4294967295)>>>0);
  const v=S.view; v.live=true; v.playing=true; v.tv=0; v.sel=null; v.fitted=false;
  setVersion(); emit('universo');
}

// ---------- laço de vida (o robô nunca para; durante o laboratório fica em espera) ----------
let lastFrame=performance.now(), carry=0, lastDrawT=0;
const xs=[0,0];
function loop(now){
  const U=S.U, A=S.amb, v=S.view;
  const dt=Math.min(0.1,(now-lastFrame)/1000); lastFrame=now;
  const target=S.labBusy?0:dt*U.sr*S.worldSpeed+carry; const n=Math.floor(target); carry=target-n;
  // eventos dos fluxos ligados que começam até um pouco à frente
  if(n>0) A.pump(U.t+n+Math.round(0.15*U.sr),(nt,src,x,start)=>{ logStimulus(U,nt,src,x,start); if(S.worldSpeed===1) playNote(nt,U.sr,(start-U.t)/U.sr); });
  A.W.prepare();
  const t0=performance.now(); let done=0;
  while(done<n){ const lim=Math.min(n,done+64); for(;done<lim;done++){ A.W.sample(U.t,xs); U.step(xs[0],xs[1]); } if(performance.now()-t0>13) break; }
  if(done<n) carry=0;
  S.simRatio = S.simRatio*0.9 + 0.1*(n>0? done/n : 1);
  if((U.t&1023)<64) A.W.gc(U.t);
  if(v.live) v.tv=U.t; else if(v.playing){ v.tv+=dt*U.sr*v.speed; if(v.tv>=U.t){ v.live=true; v.playing=true; v.tv=U.t; } }
  const lo=U.earliestViewable(); if(v.tv<lo) v.tv=lo;
  if(!S.labBusy || now-lastDrawT>500){ lastDrawT=now; drawSdom(); drawRoom(); drawWave(); drawTimeline(); drawPanel(); }
  requestAnimationFrame(loop);
}

// ---------- parâmetros / destruir e recomeçar ----------
function initParams(){
  const box=$('params');
  for(const [k,l] of PARAM_UI){ const lab=document.createElement('label'); lab.textContent=l; lab.className='small'; const inp=document.createElement('input'); inp.type='number'; inp.step='any'; inp.value=S.params[k]; inp.dataset.k=k; box.appendChild(lab); box.appendChild(inp); }
  let arm=0;
  $('reset').onclick=()=>{ const now=performance.now();
    if(now-arm>3000){ arm=now; $('reset').textContent='Tem certeza? Toque de novo para destruir'; setTimeout(()=>{ $('reset').textContent='💥 Destruir universo e criar outro'; },3000); return; }
    arm=0; for(const inp of box.querySelectorAll('input')){ const v=+inp.value; if(isFinite(v)) S.params[inp.dataset.k]=v; }
    S.params.sr=Math.max(4000,Math.min(48000,Math.round(S.params.sr)));
    newUniverse(); $('reset').textContent='💥 Destruir universo e criar outro'; setTimeout(renderStore,300); };
  $('copy').onclick=async()=>{ try{ await navigator.clipboard.writeText(JSON.stringify(S.U.toJSON())); $('copy').textContent='Copiado ✓'; }catch(e){ $('copy').textContent='Não consegui copiar'; } setTimeout(()=>$('copy').textContent='Copiar universo (JSON)',2000); };
}

on('novoUniverso',()=>{ newUniverse(); setTimeout(renderStore,300); });
on('universo',x=>{ if(x&&x.lab){ setVersion(' (laboratório)'); for(const inp of document.querySelectorAll('#params input')) inp.value=S.params[inp.dataset.k]; setTimeout(renderStore,300); } });
on('laboratorioFim',()=>{ lastFrame=performance.now(); });

(async()=>{
  await Store.open();
  newUniverse();
  initSdomView(); initPanels(); initControls(); initLab(); initStoreUI(); initParams();
  emit('universo');
  setInterval(()=>{ if(!S.labBusy) Store.flush(S.U); },2000);
  addEventListener('pagehide',()=>Store.flush(S.U));
  requestAnimationFrame(t=>{ lastFrame=t; requestAnimationFrame(loop); });
  renderStore();
})();

// acesso para testes e experimentos (Playwright)
window.__sdom={ get U(){ return S.U; }, get W(){ return S.amb.W; }, get amb(){ return S.amb; }, trigger, view:S.view, Store, renderStore, lab:labApi,
  toggle:k=>{ import('./controls.js').then(m=>m.toggleStream(k)); }, Universe, S };
