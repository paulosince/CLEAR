/* Página: cria (ou retoma) o universo, mantém o robô vivo enquanto a página está na tela, desenha e liga os controles.
   O robô ouve só o mundo real (microfone). Página fora da tela, fechada ou recarregada = universo congelado. */
import { CODE_VERSION, PARAM_UI } from '../core/params.js';
import { hashStr } from '../core/util.js';
import { Universe } from '../core/universe.js';
import { Store } from '../store.js';
import { S, $, on, emit } from './state.js';
import { drawSdom, initSdomView } from './sdomview.js';
import { drawPanel, drawWave, initPanels } from './panels.js';
import { renderStore, initStoreUI } from './storeui.js';
import { mic, initMic, feedFromMic, stopMic, muteMic } from './mic.js';
import { restoreFrom } from '../core/persist.js';

function setVersion(extra=''){ $('ver').textContent=`· ${CODE_VERSION} · universo #${S.universeNo}${extra} · params ${hashStr(JSON.stringify(S.params))}`; }

// ---------- guardar e retomar o robô ----------
// O cérebro é guardado no aparelho (IndexedDB) a cada 20 s, ao esconder a aba e ao fechar a página.
// Recarregar a página ou atualizar o código retoma o mesmo robô, do instante em que parou; só "Destruir universo" cria outro.
const SALVAR_S=20;
function salvar(){ if(!S.U) return Promise.resolve(); return Store.flush(S.U,{seed:S.seed, label:'#'+S.universeNo}); }
const numDe=l=>{ const m=/#(\d+)/.exec(l||''); return m?+m[1]:0; };
function viewLive(){ const v=S.view; v.tv=S.U.t; v.sel=null; v.fitted=false; }
const AVISO_RO='Este robô já está vivo em outra aba. Esta aba mostra uma cópia e não grava nada; feche-a e use a outra.';
function aviso(txt){ const b=$('resumeMsg'); if(!b) return; if(Store.ro) txt=AVISO_RO+(txt&&txt!==AVISO_RO?' '+txt:''); b.textContent=txt?txt+' (toque para fechar)':''; b.hidden=!txt; b.onclick=()=>{ b.hidden=true; }; }

// universo novo: um robô que nasce vazio
function newUniverse(){
  if(S.U) Store.flush(S.U);
  if(mic.on) stopMic('universo novo');
  S.universeNo=++S.maxNo; S.seed=(S.seed*1103515245+12345)>>>0;
  S.U=new Universe(Object.assign({},S.params), S.seed);
  Store.begin(S.U,'#'+S.universeNo);
  viewLive(); setVersion(); emit('universo');
  salvar();   // já fica guardado: recarregar a página retoma este
}
// Destruir: o cérebro atual deixa de existir (a fotografia é apagada); os registros continuam na lista para baixar.
async function destruir(){
  const old=Store.uid; if(S.U) await Store.flush(S.U);
  if(old) await Store.dropSnapshot(old);
  newUniverse();
}
// Retomar um robô guardado. O tempo em que a página ficou fechada não existe para ele: o universo estava congelado.
async function retomar(id){
  const snap=await Store.getSnapshot(id), meta=(await Store.list()).find(m=>m.id===id);
  if(!snap||!meta) return false;
  let U; try{ U=restoreFrom(snap); }catch(e){ console.warn('não consegui retomar',e); return false; }
  if(S.U && Store.uid!==id){ if(mic.on) stopMic('troca de universo'); await salvar(); }
  const apagados=await Store.cleanAfter(id, snap.nodePtr, snap.t);
  const foraS=Math.max(0,(Date.now()-snap.savedAt)/1000);
  U.stimLog.push({t:U.t, retomada:true, congeladoS:+foraS.toFixed(1), fotoEm:new Date(snap.savedAt).toISOString(), versaoDaFoto:snap.version, versaoAtual:CODE_VERSION});
  U.histStart=U.t;
  S.U=U; S.seed=snap.seed>>>0; S.params=Object.assign({},U.p); S.universeNo=numDe(snap.label||meta.label);
  Store.resume(meta, snap.nodePtr); Store.meta.version=CODE_VERSION;
  for(const inp of document.querySelectorAll('#params input')) inp.value=S.params[inp.dataset.k];
  viewLive(); setVersion(); emit('universo');
  aviso(`Robô ${meta.label} retomado do instante em que parou (${fmtDur(U.t/U.sr)} de vida). Ficou ${fmtDur(foraS)} congelado: para ele, esse tempo não existiu. O microfone começa desligado.`+
    (apagados?` (${apagados} registro(s) depois da última fotografia foram retirados: o robô voltou ao estado fotografado.)`:''));
  await salvar(); lastSim=performance.now();
  return true;
}
function fmtDur(s){ if(s<90) return `${s.toFixed(0)} s`; if(s<5400) return `${(s/60).toFixed(0)} min`; if(s<172800) return `${(s/3600).toFixed(1)} h`; return `${(s/86400).toFixed(1)} dias`; }

// ---------- laço de vida ----------
// Com a página na tela, o robô vive no tempo real: ouve o microfone, ou o silêncio se o microfone está desligado.
// Fora da tela, o universo congela: nada acontece para o robô; ao voltar, ele continua do mesmo instante.
let lastSim=performance.now(), lastDrawT=0, congeladoEm=null;
const vida=S.vida;
function congelar(){ if(congeladoEm!==null) return; congeladoEm=performance.now(); vida.congelado=true; muteMic(true); }
function descongelar(){ if(congeladoEm===null) return; const s=(performance.now()-congeladoEm)/1000; congeladoEm=null;
  vida.congelado=false; vida.congelamentos++; vida.ultimoCongeladoS=s; muteMic(false);
  if(S.U) S.U.stimLog.push({t:S.U.t, congeladoS:+s.toFixed(2)});   // anotação do observador: para o robô, nada aconteceu
  lastSim=performance.now(); }
function simTick(now){
  let gap=(now-lastSim)/1000; lastSim=now; vida.ticks++;
  if(congeladoEm!==null || document.visibilityState==='hidden') return;
  const U=S.U;
  if(mic.on){ feedFromMic(U,12); S.simRatio=S.simRatio*0.9+0.1*(mic.queue.available()>0.05*U.sr?0.5:1); return; }
  // silêncio no tempo real; uma parada longa do navegador (> 0,1 s) não vira tempo para o robô
  const n=Math.round(Math.min(0.1,gap)*U.sr);
  const t0=performance.now(); let done=0;
  while(done<n){ const lim=Math.min(n,done+64); for(;done<lim;done++) U.step(0,0); if(performance.now()-t0>12) break; }
  S.simRatio = S.simRatio*0.9 + 0.1*(n>0? done/n : 1);
}
function drawFrame(now){
  const U=S.U; S.view.tv=U.t;
  if(now-lastDrawT>30){ lastDrawT=now; drawSdom(); drawWave(); drawPanel(); }
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

on('retomar',id=>{ retomar(id).then(ok=>{ if(!ok) aviso('Não consegui retomar esse robô.'); setTimeout(renderStore,300); }); });

(async()=>{
  await Store.open();
  await umaAbaSo();
  S.maxNo=Math.max(0,...(await Store.list()).map(m=>numDe(m.label)));
  initParams();
  const ultimo=await Store.latestId();
  if(!(ultimo && await retomar(ultimo))) newUniverse();
  initSdomView(); initPanels(); initStoreUI(); initMic();
  emit('universo');
  let ultimaFoto=performance.now();
  setInterval(()=>{ if(congeladoEm!==null) return; if(performance.now()-ultimaFoto>SALVAR_S*1000){ ultimaFoto=performance.now(); salvar(); } else Store.flush(S.U); },2000);
  addEventListener('pagehide',()=>{ congelar(); salvar(); });
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden'){ congelar(); ultimaFoto=performance.now(); salvar(); } else descongelar(); });
  addEventListener('pageshow',()=>{ if(document.visibilityState!=='hidden') descongelar(); });
  if(document.visibilityState==='hidden') congelar();
  vida.relogio=startClock();
  requestAnimationFrame(t=>{ requestAnimationFrame(drawFrame); });
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
window.__sdom={ salvar, retomar, congelar, descongelar, mic, vida, get U(){ return S.U; }, view:S.view, Store, renderStore, Universe, S };
