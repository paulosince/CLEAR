/* Laboratório na página: inicia o Web Worker, mostra o progresso e as curvas, adota o universo no fim. */
import { S, $, sizeCanvas, emit } from './state.js';
import { SCEN, scenarioSources, startScenario } from '../env/scenarios.js';
import { Ambiente } from '../env/environment.js';
import { Universe } from '../core/universe.js';
import { World } from '../env/world.js';
import { unflattenGraph } from '../core/graph-copy.js';
import { Store } from '../store.js';
import { playBuffer } from './audio.js';

let labW=null, series=[], meta=null, result=null, hover=null;
export const labApi={ start:labStart, get busy(){ return S.labBusy; }, get series(){ return series; }, get result(){ return result; } };

function seedVal(){ let v=parseInt($('labSeedIn').value,10); if(!isFinite(v)){ v=(Math.floor(Math.random()*4294967295))>>>0; $('labSeedIn').value=v; } return v>>>0; }
export function readParams(){ const q=Object.assign({},S.params); for(const inp of document.querySelectorAll('#params input')){ const v=+inp.value; if(isFinite(v)) q[inp.dataset.k]=v; } q.sr=Math.max(4000,Math.min(48000,Math.round(q.sr))); return q; }

function labStart(scen,durS,sd){
  if(S.labBusy) return false;
  scen=scen||$('labScen').value; durS=+(durS||$('labDur').value); sd=(sd!==undefined)?(sd>>>0):seedVal();
  $('labScen').value=scen; $('labDesc').textContent=SCEN[scen].desc; $('labSeedIn').value=sd;
  if([...$('labDur').options].some(o=>+o.value===durS)) $('labDur').value=durS;
  emit('laboratorioInicio');
  labW=new Worker(new URL('../lab/worker.js', import.meta.url), {type:'module'});
  S.labBusy=true; series=[]; result=null; meta={scen,durS,seed:sd};
  $('labRun').disabled=true; $('labStop').disabled=false; $('labState').textContent='rodando…';
  $('labProg').textContent=`preparando ${SCEN[scen].name} · ${durS} s · semente ${sd}`;
  labW.onmessage=e=>{ const m=e.data;
    if(m.type==='prog'){ for(const x of m.add) series.push(x); const r=m.t/Math.max(1e-6,m.wallS);
      $('labProg').textContent=`${SCEN[scen].name} · mundo ${m.t.toFixed(1)} de ${m.durS} s (${(100*m.t/m.durS).toFixed(0)}%) · tempo real ${m.wallS.toFixed(1)} s · ritmo ${(r*100).toFixed(0)}% do real · malhas ${m.malhas} · nós ${m.sdom} · arestas ${m.edges}`;
      drawCharts(); }
    else if(m.type==='done') finish(m);
    else if(m.type==='error'){ $('labProg').textContent='Erro no laboratório: '+m.msg; end(); } };
  labW.onerror=e=>{ $('labProg').textContent='Erro no laboratório: '+(e.message||e); end(); };
  labW.postMessage({cmd:'start', params:readParams(), seed:sd, scen, durS, label:`#${S.maxNo+1} · laboratório: ${SCEN[scen].name}`});
  return true;
}
function end(){ if(labW){ labW.terminate(); labW=null; } S.labBusy=false; $('labRun').disabled=false; $('labStop').disabled=true; emit('laboratorioFim'); }
function finish(m){
  const G=unflattenGraph(m.G), u=G.U; Object.setPrototypeOf(u,Universe.prototype); delete u.rng;   // o sorteio continua de onde o laboratório parou (u.rs)
  Object.setPrototypeOf(G.W,World.prototype);
  if(S.U) Store.flush(S.U);
  S.universeNo=++S.maxNo; S.U=u; S.seed=m.seed; S.params=Object.assign({},u.p);
  S.amb=Ambiente.fromWorld(G.W); for(const s of Ambiente.allSources()) S.amb.addSource(...s); S.amb.W.prepare();
  // o laboratório já gravou tudo; a página continua no mesmo registro
  Store.uid=m.store.uid; Store.nodePtr=m.store.nodePtr; Store.meta=m.store.meta;
  series=m.series; result={worldS:u.t/u.sr, wallS:m.wallS, stopped:m.stopped};
  const v=S.view; v.live=true; v.playing=true; v.tv=u.t; v.sel=null; v.fitted=false;
  $('labState').textContent=m.stopped?'parado antes do fim':'concluído';
  $('labProg').textContent=`${SCEN[m.scen].name} · ${(u.t/u.sr).toFixed(1)} s de mundo em ${m.wallS.toFixed(1)} s de tempo real (ritmo ${(100*u.t/u.sr/Math.max(1e-6,m.wallS)).toFixed(0)}% do real) · semente ${m.seed}. Este universo agora é o atual e segue vivo.`;
  end(); emit('universo',{lab:true}); drawCharts();
}

function hear(){
  const key=$('labScen').value, sd=seedVal(), sr=readParams().sr, T=10, N=T*sr;
  const a=new Ambiente(sr,scenarioSources(key)); startScenario(a,key,sd);
  const L=new Float32Array(N), R=new Float32Array(N), xs=[0,0]; let mx=1e-9;
  for(let t=0;t<N;t++){ if((t&511)===0){ a.pump(t+Math.round(0.1*sr)); } a.W.sample(t,xs); L[t]=xs[0]; R[t]=xs[1]; const q=Math.max(Math.abs(xs[0]),Math.abs(xs[1])); if(q>mx) mx=q; if((t&1023)===0) a.W.gc(t); }
  const g=Math.min(1,0.9/mx); for(let t=0;t<N;t++){ L[t]*=g; R[t]*=g; }
  $('labProg').textContent = playBuffer([L,R],sr) ? `tocando os primeiros 10 s de "${SCEN[key].name}" (semente ${sd}), como chegam aos dois microfones` : 'Este navegador não deixou tocar som.';
}

// ---------- curvas: uma série por gráfico, eixo único; passe o dedo para ler ----------
const fmtS=s=> s<120? `${Math.round(s)} s` : `${(s/60).toFixed(s<600?1:0)} min`;
function chart(id,key,color,fmtV){
  const c=$(id), d=sizeCanvas(c), g=c.getContext('2d'), W=c.width, H=c.height;
  g.setTransform(1,0,0,1,0,0); g.clearRect(0,0,W,H); g.font=`${10*d}px system-ui`;
  if(series.length<2){ g.fillStyle='#5d6575'; g.fillText('rode um roteiro para ver a curva', 10*d, H/2); c._geo=null; return; }
  const padL=44*d, padR=8*d, padT=8*d, padB=16*d, tMax=Math.max(1,(meta&&meta.durS)||series[series.length-1].t);
  let vMax=0; for(const p of series) if((p[key]||0)>vMax) vMax=p[key]; vMax=vMax||1;
  const X=t=>padL+(W-padL-padR)*t/tMax, Y=v=>H-padB-(H-padT-padB)*v/vMax;
  g.strokeStyle='#1e232d'; g.lineWidth=1; g.fillStyle='#6b7385';
  for(let i=0;i<=2;i++){ const v=vMax*i/2, y=Y(v); g.beginPath(); g.moveTo(padL,y); g.lineTo(W-padR,y); g.stroke(); g.fillText(fmtV(v),4*d,y+3*d); }
  g.fillText('0 s',padL,H-3*d); const tl=fmtS(tMax); g.fillText(tl,W-padR-g.measureText(tl).width,H-3*d);
  g.strokeStyle=color; g.lineWidth=2*d; g.lineJoin='round'; g.beginPath(); series.forEach((p,i)=>{ const x=X(p.t), y=Y(p[key]||0); i?g.lineTo(x,y):g.moveTo(x,y); }); g.stroke();
  if(hover!==null && hover<series.length){ const p=series[hover], x=X(p.t); g.strokeStyle='#8a92a3'; g.lineWidth=d; g.beginPath(); g.moveTo(x,padT); g.lineTo(x,H-padB); g.stroke(); g.fillStyle=color; g.beginPath(); g.arc(x,Y(p[key]||0),4*d,0,6.2832); g.fill(); }
  c._geo={padL,padR,tMax,d};
}
export function drawCharts(){ const k=v=>v>=1000?(v/1000).toFixed(0)+' mil':String(Math.round(v)); chart('labC1','sdom','#5b8def',v=>String(Math.round(v))); chart('labC2','firesPerS','#3fc1b0',k); chart('labC3','faltasPerS','#e07a5f',k); }

export function initLab(){
  const s=$('labScen'); for(const k in SCEN){ const o=document.createElement('option'); o.value=k; o.textContent=SCEN[k].name; s.appendChild(o); }
  const desc=()=>{ $('labDesc').textContent=SCEN[s.value].desc; }; s.onchange=desc; desc();
  $('labRun').onclick=()=>labStart();
  $('labStop').onclick=()=>{ if(labW){ labW.postMessage({cmd:'stop'}); $('labState').textContent='parando…'; } };
  $('labHear').onclick=hear;
  for(const id of ['labC1','labC2','labC3']){ const c=$(id);
    const mv=e=>{ const G=c._geo; if(!G||series.length<2) return; const r=c.getBoundingClientRect();
      const x=(e.clientX-r.left)*G.d, t=(x-G.padL)/(c.width-G.padL-G.padR)*G.tMax; let bi=0,bd=1e18; series.forEach((p,i)=>{ const dd=Math.abs(p.t-t); if(dd<bd){bd=dd;bi=i} });
      hover=bi; drawCharts(); const p=series[bi], tip=$('labTip');
      tip.textContent=`${fmtS(p.t)} de mundo · ${p.sdom} nós · ${p.malhas??'—'} malhas · ${p.firesPerS.toLocaleString('pt-BR')} disparos/s · ${p.edges} arestas`+(p.bpm!=null?` · marcapasso ${Math.round(p.bpm)}/min · reserva ${Math.round(100*p.nivel)}% · faltas ${p.faltasPerS.toLocaleString('pt-BR')}/s`:'')+` · ${p.wallS.toFixed(1)} s reais`;
      tip.style.display='block'; tip.style.left=Math.min(innerWidth-270,e.clientX+12)+'px'; tip.style.top=(e.clientY-34)+'px'; };
    c.addEventListener('pointermove',mv); c.addEventListener('pointerdown',mv);
    c.addEventListener('pointerleave',()=>{ hover=null; $('labTip').style.display='none'; drawCharts(); }); }
  setTimeout(drawCharts,0); addEventListener('resize',drawCharts);
}
