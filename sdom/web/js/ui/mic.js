/* Ouvir o mundo pelo microfone do aparelho.
   Proteções: desligado ao abrir; só liga com um toque; indicador sempre visível com botão de parar;
   para sozinho quando a aba sai de foco; nada sai do aparelho (sem servidor; CSP proíbe conexões externas);
   o som bruto só é guardado se a pessoa marcar a opção, e fica só neste navegador. */
import { S, $, on, emit, goLive } from './state.js';
import { MicQueue, Resampler } from '../env/micqueue.js';
import { renderChips } from './controls.js';

const BACKLOG_S=0.25;   // atraso máximo tolerado; além disso, o som é descartado (o mundo não espera)
export const mic={ on:false, starting:false, ctx:null, stream:null, node:null, queue:null, rs:null, stereo:false, lostAtStart:0, rec:false, recBuf:[], recT0:0, reason:'' };

export async function startMic(){
  if(mic.on||mic.starting) return;
  if(S.labBusy){ setStatus('Espere o laboratório terminar.'); return; }
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.AudioWorkletNode){ setStatus('Este navegador não oferece acesso ao microfone por aqui.'); return; }
  mic.starting=true; setStatus('pedindo permissão ao navegador…');
  try{
    const U=S.U;
    // o robô ouve só o mundo real: as fontes sintéticas param (e não voltam pelos alto-falantes)
    for(const k of [...S.amb.on.keys()]) S.amb.stop(k,U.t); renderChips();
    const stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:{ideal:2}, echoCancellation:false, noiseSuppression:false, autoGainControl:false}});
    let ctx; try{ ctx=new AudioContext({sampleRate:U.sr}); }catch(e){ ctx=new AudioContext(); }
    await ctx.audioWorklet.addModule(new URL('./mic-worklet.js', import.meta.url));
    const src=ctx.createMediaStreamSource(stream);
    const node=new AudioWorkletNode(ctx,'sdom-mic',{numberOfInputs:1, numberOfOutputs:1, channelCount:2, channelCountMode:'explicit', channelInterpretation:'discrete'});
    const mute=ctx.createGain(); mute.gain.value=0;          // nada volta para o alto-falante
    src.connect(node); node.connect(mute); mute.connect(ctx.destination);
    const settings=stream.getAudioTracks()[0].getSettings?.()||{};
    Object.assign(mic,{ctx, stream, node, on:true, starting:false, stereo:(settings.channelCount||1)>=2,
      queue:new MicQueue(Math.round(2*U.sr)), rs: ctx.sampleRate!==U.sr ? new Resampler(ctx.sampleRate,U.sr) : null,
      rec:$('micRec').checked, recBuf:[], recT0:U.t, reason:''});
    node.port.onmessage=e=>{ const m=e.data; if(m.stereo) mic.stereo=true;
      let L=m.L, R=m.R; if(mic.rs) [L,R]=mic.rs.process(L,R);
      mic.queue.push(L, mic.stereo?R:L); };
    S.worldSpeed=1; $('wspeed').value='1'; goLive();
    stream.getAudioTracks()[0].addEventListener('ended',()=>stopMic('o microfone foi desligado pelo aparelho'));
    emit('microfone',true); setStatus('');
  }catch(e){
    mic.starting=false; stopMic(); setStatus(e && e.name==='NotAllowedError' ? 'Permissão negada. Nada foi gravado.' : 'Não consegui abrir o microfone: '+(e&&e.message||e));
  }
}
export function stopMic(reason=''){
  const was=mic.on;
  try{ if(mic.stream) for(const t of mic.stream.getTracks()) t.stop(); }catch(e){}
  try{ if(mic.ctx) mic.ctx.close(); }catch(e){}
  if(mic.rec) flushRecording();
  Object.assign(mic,{on:false, starting:false, ctx:null, stream:null, node:null, rs:null, reason});
  if(was){ emit('microfone',false); if(reason) setStatus('Microfone desligado: '+reason+'.'); }
}
// alimenta o robô com o que chegou do microfone (chamado pelo laço da página)
export function feedFromMic(U, budgetMs){
  const q=mic.queue, xs=[0,0], t0=performance.now(); let done=0;
  while(q.available()){ for(let i=0;i<64 && q.take(xs);i++){ U.step(xs[0],xs[1]); done++; if(mic.rec) recPush(xs); } if(performance.now()-t0>budgetMs) break; }
  q.dropTo(Math.round(BACKLOG_S*U.sr));   // o que não deu para processar a tempo se perde
  return done;
}
function recPush(xs){ mic.recBuf.push(Math.max(-32768,Math.min(32767,Math.round(xs[0]*32767))), Math.max(-32768,Math.min(32767,Math.round(xs[1]*32767)))); if(mic.recBuf.length>=2*S.U.sr*5) flushRecording(); }
function flushRecording(){ if(!mic.recBuf.length) return; const U=S.U; (U.audioChunks=U.audioChunks||[]).push({t0:mic.recT0, sr:U.sr, data:Int16Array.from(mic.recBuf)}); mic.recT0+=mic.recBuf.length/2; mic.recBuf=[]; }

function setStatus(s){ $('micStatus').textContent=s; }
export function micInfo(){ if(!mic.on) return null; return {stereo:mic.stereo, lostS: mic.queue.lost/S.U.sr, backlogS: mic.queue.available()/S.U.sr}; }

export function initMic(){
  $('micBtn').onclick=()=>{ if(mic.on) stopMic('você parou'); else startMic(); };
  $('micStop').onclick=()=>stopMic('você parou');
  $('micRec').onchange=e=>{ if(mic.on){ if(!e.target.checked){ flushRecording(); } mic.rec=e.target.checked; if(mic.rec) mic.recT0=S.U.t; } };
  document.addEventListener('visibilitychange',()=>{ if(document.hidden && mic.on) stopMic('a aba saiu de foco'); });
  addEventListener('pagehide',()=>{ if(mic.on) stopMic('a página foi fechada'); });
  on('laboratorioInicio',()=>{ if(mic.on) stopMic('o laboratório começou'); });
  on('novoUniverso',()=>{ if(mic.on) stopMic('universo novo'); });
  on('microfone',onNow=>{
    $('micBanner').hidden=!onNow; $('micBtn').textContent= onNow ? '⏹ Parar de ouvir o mundo' : '🎙️ Ouvir o mundo (microfone)';
    $('micBtn').classList.toggle('danger',onNow);
    for(const b of document.querySelectorAll('.chip,.jmp,#expPV,#expDir,#stopAll')) b.disabled=onNow;
    $('wspeed').disabled=onNow; });
}
