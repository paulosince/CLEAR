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
import { mic, initMic, feedFromMic, stopMic } from './mic.js';
import { restoreFrom } from '../core/persist.js';

function setVersion(extra=''){ $('ver').textContent=`· ${CODE_VERSION} · universo #${S.universeNo}${extra} · params ${hashStr(JSON.stringify(S.params))}`; }

// ---------- guardar e retomar o robô ----------
// O cérebro é guardado no aparelho (IndexedDB) a cada 20 s, ao esconder a aba e ao fechar a página.
// Recarregar a página ou atualizar o código retoma o mesmo robô; só "Destruir universo" cria outro.
const SALVAR_S=20;
const posicoes=()=>S.amb ? Object.fromEntries(S.amb.W.sources.map(s=>[s.label,[s.x,s.y]])) : {};
function salvar(){ if(!S.U||S.labBusy) return Promise.resolve(); return Store.flush(S.U,{seed:S.seed, label:'#'+S.universeNo, amb:posicoes()}); }
const numDe=l=>{ const m=/#(\d+)/.exec(l||''); return m?+m[1]:0; };
function ambienteNovo(pos){
  S.amb=new Ambiente(S.params.sr, Ambiente.allSources());
  for(const s of S.amb.W.sources) if(pos&&pos[s.label]){ s.x=pos[s.label][0]; s.y=pos[s.label][1]; }
}
function viewLive(){ const v=S.view; v.live=true; v.playing=true; v.tv=S.U.t; v.sel=null; v.fitted=false; }
const AVISO_RO='Este robô já está vivo em outra aba. Esta aba mostra uma cópia e não grava nada; feche-a e use a outra.';
function aviso(txt){ const b=$('resumeMsg'); if(!b) return; if(Store.ro) txt=AVISO_RO+(txt&&txt!==AVISO_RO?' '+txt:''); b.textContent=txt?txt+' (toque para fechar)':''; b.hidden=!txt; b.onclick=()=>{ b.hidden=true; }; }

// universo novo: o mesmo ambiente (fontes e o que estava tocando) continua, num robô que nasce vazio
function newUniverse(){
  const was = S.amb ? [...S.amb.on.keys()] : [];
  const pos = posicoes();
  if(S.U) Store.flush(S.U);
  S.universeNo=++S.maxNo; S.seed=(S.seed*1103515245+12345)>>>0;
  S.U=new Universe(Object.assign({},S.params), S.seed);
  Store.begin(S.U,'#'+S.universeNo);
  ambienteNovo(pos);
  for(const k of was) S.amb.start(k,0,(Math.random()*4294967295)>>>0);
  viewLive(); setVersion(); emit('universo');
  salvar();   // já fica guardado: recarregar a página retoma este
}
// Destruir: o cérebro atual deixa de existir (a fotografia é apagada); os registros continuam na lista para baixar.
async function destruir(){
  const old=Store.uid; if(S.U) await Store.flush(S.U);
  if(old) await Store.dropSnapshot(old);
  newUniverse();
}
// Retomar um robô guardado. O tempo em que a página ficou fechada passa para ele em silêncio (o mundo não espera).
async function retomar(id){
  const snap=await Store.getSnapshot(id), meta=(await Store.list()).find(m=>m.id===id);
  if(!snap||!meta) return false;
  let U; try{ U=restoreFrom(snap); }catch(e){ console.warn('não consegui retomar',e); return false; }
  if(S.U && Store.uid!==id){ if(mic.on) stopMic('troca de universo'); await salvar(); }
  const apagados=await Store.cleanAfter(id, snap.nodePtr, snap.t);
  const foraS=Math.max(0,(Date.now()-snap.savedAt)/1000), n=Math.round(foraS*U.sr);
  U.stimLog.push({t:U.t, retomada:true, fotoEm:new Date(snap.savedAt).toISOString(), versaoDaFoto:snap.version, versaoAtual:CODE_VERSION});
  if(n>0) U.jump(n);
  U.histStart=U.t;
  S.U=U; S.seed=snap.seed>>>0; S.params=Object.assign({},U.p); S.universeNo=numDe(snap.label||meta.label);
  Store.resume(meta, snap.nodePtr); Store.meta.version=CODE_VERSION;
  ambienteNovo(snap.amb);
  for(const inp of document.querySelectorAll('#params input')) inp.value=S.params[inp.dataset.k];
  viewLive(); setVersion(); emit('universo');
  aviso(`Robô ${meta.label} retomado. Ficou ${fmtDur(foraS)} fora: esse tempo passou para ele em silêncio. `+
    `Os sons e o microfone começam desligados; a fita para voltar começa agora.`+(apagados?` (${apagados} registro(s) depois da última fotografia foram retirados: o robô voltou ao estado fotografado.)`:''));
  await salvar(); lastSim=performance.now(); carry=0;
  return true;
}
function fmtDur(s){ if(s<90) return `${s.toFixed(0)} s`; if(s<5400) return `${(s/60).toFixed(0)} min`; if(s<172800) return `${(s/3600).toFixed(1)} h`; return `${(s/86400).toFixed(1)} dias`; }

// ---------- laço de vida ----------
// A simulação anda pelo relógio (Web Worker), que continua com a aba em segundo plano; o desenho anda
// pelo requestAnimationFrame, que o navegador pausa quando ninguém está olhando. Se mesmo assim o navegador
// congelar a aba, ao voltar o tempo perdido vira um pulo no tempo (em silêncio): o mundo não espera.
let lastSim=performance.now(), carry=0, lastDrawT=0, lastFrame=performance.now();
const xs=[0,0];
const vida=S.vida;
function simTick(now){
  const U=S.U, A=S.amb; let gap=(now-lastSim)/1000; lastSim=now; vida.ticks++;
  if(gap>2 && !S.labBusy && !mic.on){   // a aba foi congelada pelo navegador
    const n=Math.round((gap-0.02)*U.sr*S.worldSpeed); U.jump(n); A.skipTo(U.t); A.W.gc(U.t);
    vida.congelamentos++; vida.ultimoPuloS=n/U.sr; carry=0; gap=0.02; if(S.view.live) S.view.tv=U.t;
  }
  if(S.labBusy) return;
  if(mic.on){ feedFromMic(U,12); S.simRatio=S.simRatio*0.9+0.1*(mic.queue.available()>0.05*U.sr?0.5:1); carry=0; return; }
  const dt=Math.min(0.1,gap);
  const target=dt*U.sr*S.worldSpeed+carry; const n=Math.floor(target); carry=target-n;
  // eventos dos fluxos ligados que começam até um pouco à frente
  if(n>0) A.pump(U.t+n+Math.round(0.15*U.sr),(nt,src,x,start)=>{ logStimulus(U,nt,src,x,start); if(S.worldSpeed===1) playNote(nt,U.sr,(start-U.t)/U.sr); });
  A.W.prepare();
  const t0=performance.now(); let done=0;
  while(done<n){ const lim=Math.min(n,done+64); for(;done<lim;done++){ A.W.sample(U.t,xs); U.step(xs[0],xs[1]); } if(performance.now()-t0>12) break; }
  if(done<n) carry=0;
  S.simRatio = S.simRatio*0.9 + 0.1*(n>0? done/n : 1);
  if((U.t&1023)<64) A.W.gc(U.t);
}
function drawFrame(now){
  const U=S.U, v=S.view, dt=Math.min(0.1,(now-lastFrame)/1000); lastFrame=now;
  if(v.live) v.tv=U.t; else if(v.playing){ v.tv+=dt*U.sr*v.speed; if(v.tv>=U.t){ v.live=true; v.playing=true; v.tv=U.t; } }
  const lo=U.earliestViewable(); if(v.tv<lo) v.tv=lo;
  if(!S.labBusy || now-lastDrawT>500){ lastDrawT=now; drawSdom(); drawRoom(); drawWave(); drawTimeline(); drawPanel(); }
  requestAnimationFrame(drawFrame);
}
function startClock(){
  try{ const w=new Worker(new URL('./clock-worker.js', import.meta.url)); w.onmessage=()=>simTick(performance.now()); return 'worker'; }
  catch(e){ setInterval(()=>simTick(performance.now()),20); return 'intervalo'; }
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
    aviso(''); destruir().then(()=>setTimeout(renderStore,300)); $('reset').textContent='💥 Destruir universo e criar outro'; };
  $('copy').onclick=async()=>{ try{ await navigator.clipboard.writeText(JSON.stringify(S.U.toJSON())); $('copy').textContent='Copiado ✓'; }catch(e){ $('copy').textContent='Não consegui copiar'; } setTimeout(()=>$('copy').textContent='Copiar universo (JSON)',2000); };
}

on('novoUniverso',()=>{ newUniverse(); setTimeout(renderStore,300); });
on('laboratorioInicio',()=>salvar());   // o robô atual fica guardado antes de o laboratório tomar o lugar dele
on('universo',x=>{ if(x&&x.lab){ setVersion(' (laboratório)'); for(const inp of document.querySelectorAll('#params input')) inp.value=S.params[inp.dataset.k]; salvar(); setTimeout(renderStore,300); } });
on('retomar',id=>{ retomar(id).then(ok=>{ if(!ok) aviso('Não consegui retomar esse robô.'); setTimeout(renderStore,300); }); });
on('laboratorioFim',()=>{ lastSim=performance.now(); });

(async()=>{
  await Store.open();
  await umaAbaSo();
  S.maxNo=Math.max(0,...(await Store.list()).map(m=>numDe(m.label)));
  initParams();
  const ultimo=await Store.latestId();
  if(!(ultimo && await retomar(ultimo))) newUniverse();
  initSdomView(); initPanels(); initControls(); initLab(); initStoreUI(); initMic();
  emit('universo');
  let ultimaFoto=performance.now();
  setInterval(()=>{ if(S.labBusy) return; if(performance.now()-ultimaFoto>SALVAR_S*1000){ ultimaFoto=performance.now(); salvar(); } else Store.flush(S.U); },2000);
  addEventListener('pagehide',()=>salvar());
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden'){ ultimaFoto=performance.now(); salvar(); } });
  vida.relogio=startClock();
  requestAnimationFrame(t=>{ lastFrame=t; requestAnimationFrame(drawFrame); });
  renderStore();
})();

// Duas abas com o mesmo robô o fariam viver duas vidas diferentes gravando no mesmo lugar.
// Só a primeira aba grava; as outras avisam e não gravam nada.
async function umaAbaSo(){
  if(!navigator.locks) return;
  const ok=await new Promise(res=>{ navigator.locks.request('sdom-robo-vivo',{ifAvailable:true},lock=>{ if(!lock){ res(false); return; } res(true); return new Promise(()=>{}); }); });
  if(!ok){ Store.ro=true; aviso(AVISO_RO); }
}

// acesso para testes e experimentos (Playwright)
window.__sdom={ salvar, retomar, mic, vida, get U(){ return S.U; }, get W(){ return S.amb.W; }, get amb(){ return S.amb; }, trigger, view:S.view, Store, renderStore, lab:labApi,
  toggle:k=>{ import('./controls.js').then(m=>m.toggleStream(k)); }, Universe, S };
