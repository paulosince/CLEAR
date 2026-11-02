/* Painel de números, nó selecionado, onda nos ouvidos e linha do tempo. */
import { S, $, sizeCanvas, fmt, fmtInt, goLive, seek, on } from './state.js';

let lastStatT=0, lastFC=0, lastMp=null;
const mpSnap=U=>U.mp?{bf:U.mp.blockedFire,bl:U.mp.blockedLearn,bc:U.mp.blockedCreate,t:U.t}:null;
export function resetRates(){ lastFC=S.U.fireCount; lastStatT=performance.now(); lastMp=mpSnap(S.U); }
export function drawPanel(){
  const now=performance.now(); if(now-lastStatT<500) return;
  const U=S.U, dt=(now-lastStatT)/1000; lastStatT=now;
  const rate=(U.fireCount-lastFC)/dt; lastFC=U.fireCount;
  let nos=0, fib=0; const per=[0,0,0,0,0];
  for(const n of U.nodes) if(n.diedAt===Infinity){ per[n.lvl]++; if(n.lvl>=2) nos++; else if(n.lvl===1) fib++; }
  let arestas=0, sinapses=0;
  for(const e of U.edges) if(e.diedAt===Infinity && e.from.lvl>=1){ arestas++; if(e.to.lvl>=2) sinapses++; }
  $('tMalhas').textContent=fmtInt(U.malhaCount()); $('tNos').textContent=fmtInt(nos);
  $('tArestas').textContent=fmtInt(arestas); $('tSinapses').textContent=fmtInt(sinapses);
  $('tDisp').textContent= rate>=10000 ? (rate/1000).toFixed(0)+' mil' : fmtInt(rate);
  let falta='';
  if(U.mp){ const m=U.mp, s=mpSnap(U), ws=lastMp&&s.t>lastMp.t ? (s.t-lastMp.t)/U.sr : 0;
    const r=k=> ws>0 ? (s[k]-lastMp[k])/ws : 0, rf=r('bf'), rl=r('bl'), rc=r('bc'); lastMp=s;
    $('tBpm').textContent=Math.round(m.f*60)+'/min'; $('tRes').textContent=Math.round(100*m.level)+'%';
    const tot=rf+rl+rc; $('tFalta').textContent= tot>=10000 ? (tot/1000).toFixed(0)+' mil' : fmtInt(tot);
    falta=` · faltas por segundo de mundo: disparar ${fmtInt(rf)}, aprender ${fmtInt(rl)}, criar ${fmtInt(rc)}`; }
  else { $('tBpm').textContent='desligado'; $('tRes').textContent='—'; $('tFalta').textContent='—'; }
  $('statsMore').textContent=`tempo do mundo ${fmt(U.t)} · ritmo ${S.labBusy?'em espera (laboratório)':(S.simRatio*100).toFixed(0)+'% do real'} · Sdom perto ${per[2]} · médio ${per[3]} · longe ${per[4]} · reforços ${fmtInt(U.ltp)} · enfraquecimentos ${fmtInt(U.ltd)} · consolidações ${fmtInt(U.consol)} · candidatas à poda ${U.candidates} · podadas ${U.prunedE} arestas, ${U.prunedN} nós${falta}`;
  if(S.view.sel) showInfo();
}

export function showInfo(){
  const U=S.U, n=S.view.sel; if(!n){ $('info').textContent='Aproxime até ver o grafo e toque num nó para inspecionar.'; return; }
  const ms=v=>(v*1000/U.sr).toFixed(3)+' ms';
  const lv=n.lvl===0?'ouvido':n.lvl===1?'transdução (fibra)':`Sdom · distância dos ouvidos ${n.depth}`;
  let s=`#${n.id} · ${lv}${n.lvl<=1?(n.ear?' · ouvido direito':' · ouvido esquerdo'):''}\n`;
  if(n.lvl===0){ s+=`microfone (${U.sr/1000} kHz): entrega o som à cóclea (transdução)\nfibras: ${n.out.length}`; $('info').textContent=s; return; }
  if(n.endo){ s=`#${n.id} · transdução endógena (marcapasso de recursos)\n`;
    s+= n.endo.kind==='batida' ? `dispara a cada batida quando a força ≥ ${n.endo.thr} (força fixa nesta versão)\n` : `dispara junto com a batida quando o nível geral da reserva operacional ≥ ${Math.round(100*n.endo.thr)}%\n`;
    s+=`disparos até agora ${n.fires} · saídas para o Sdom: ${n.out.length}`; $('info').textContent=s; return; }
  if(n.fiber){ const F=n.fiber;
    s+=`canal ${F.k+1}/${U.coch.length} da cóclea · ${F.fc<1000?Math.round(F.fc)+' Hz':(F.fc/1000).toFixed(2)+' kHz'}\n`;
    s+=`fibra ${['sensível','média','pouco sensível'][F.cls]} (+${F.db} dB) · limiar ${n.thr.toFixed(4)}\n`;
    s+=F.active?`disparos até agora ${n.fires} · cada disparo entra no Sdom como incidência de magnitude ${n.mag}\n`:`fora do alcance do microfone (acima de ${(0.45*U.sr/1000).toFixed(1)} kHz): em silêncio\n`;
    s+=`saídas para o Sdom: ${n.out.length}`; $('info').textContent=s; return; }
  s+=`nasceu em ${fmt(n.born)}`+(n.diedAt!==Infinity?` · PODADO em ${fmt(n.diedAt)} (ficou órfão)`:'')+`\n`;
  if(n.malha!==undefined) s+= n.malha>=0 ? `malha: estímulo #${n.malha}\n` : `malha: nenhum estímulo identificado\n`;
  s+=`janela de integração ${ms(n.W)} · refratariedade ${ms(n.refr)}\n`;
  if(U.mp && n.res!==undefined) s+=`reserva operacional ${Math.round(n.res)} de ${Math.round(n.cap)} (${Math.round(100*n.res/n.cap)}%) · piso de aprender ${Math.round(100*U.p.mpPisoAprender)}% · piso de disparar ${Math.round(100*U.pisoFire(n))}%\n`;
  s+=`limiar ${n.thr.toFixed(4)} (fixo) · magnitude ${n.mag.toFixed(4)} (fixa)\n`;
  s+=`disparos até agora ${n.fires}`+(n.fires?` · último há ${((U.t-n.lastFire)/U.sr).toFixed(1)} s`:'')+`\n`;
  if(n.origin) s+=`origem: relacionou ${n.origin.k} disparos${n.origin.self?' (o mesmo nó consigo, no tempo)':''} espalhados em ${n.origin.span.toFixed(2)} ms · tolerância ${n.origin.tolMs.toFixed(2)} ms\n`;
  s+=`entradas (${n.in.length}):\n`;
  const tvv=Math.floor(S.view.tv);
  for(const e of n.in.slice(0,12)){ let w=U.wAt(e,tvv); if(w===null) w=e.mod; let ws=U.wsAt(e,tvv); if(ws===null) ws=e.wS;
    s+=`  de #${e.from.id} (${['ouvido','fibra','n2','n3','n4'][e.from.lvl]}) atraso ${ms(e.d)}`+(e.from.lvl? ` · peso ${w.toFixed(3)} (basal ${(w-ws).toFixed(3)} · consolidado ${ws.toFixed(3)})${w<U.p.inertW?' INERTE'+(e.inertSince!==null?`, candidata à poda há ${fmt(U.t-e.inertSince)}`:''):''}`:'')+`\n`; }
  if(n.in.length>12) s+=`  …\n`;
  s+=`saídas: ${n.out.length}`;
  $('info').textContent=s;
}

export function drawWave(){
  const U=S.U, c=$('wave'), d=sizeCanvas(c), g=c.getContext('2d'), W=c.width, H=c.height;
  g.setTransform(1,0,0,1,0,0); g.clearRect(0,0,W,H);
  const n=Math.round(U.sr*0.04), tv=Math.floor(S.view.tv), cols=['#80c0f0','#f08080'];
  for(let e=0;e<2;e++){ const yb=H*(e?0.75:0.25), A=H*0.22;
    g.strokeStyle='#222833'; g.lineWidth=1; g.beginPath(); g.moveTo(0,yb); g.lineTo(W,yb); g.stroke();
    g.strokeStyle=cols[e]; g.lineWidth=1.2*d; g.beginPath();
    for(let i=0;i<n;i++){ const t=tv-n+1+i; const v= t<0||U.t-t>=U.aCap ? 0 : U.aud[e][t%U.aCap]; const x=i/(n-1)*W, y=yb-Math.max(-1,Math.min(1,v*2.5))*A; i?g.lineTo(x,y):g.moveTo(x,y); }
    g.stroke(); }
}

let scrubbing=false;
export function drawTimeline(){
  const U=S.U, v=S.view, lo=U.earliestViewable(), sc=$('scrub');
  sc.min=lo; sc.max=U.t; if(!scrubbing) sc.value=Math.floor(v.tv);
  const back=(U.t-v.tv)/U.sr;
  $('tlbl').textContent = v.live ? `mundo: ${fmt(U.t)} · vendo ao vivo · gravado: últimos ${((U.t-lo)/U.sr).toFixed(1)} s`
    : `mundo: ${fmt(U.t)} · vendo: ${fmt(v.tv)} (${back.toFixed(3)} s atrás) · ${v.playing?'reproduzindo':'pausado'}`;
  $('bPlay').textContent = (v.live||v.playing)?'⏸':'▶';
  $('live').classList.toggle('on',v.live);
}
export function initPanels(){
  const v=S.view, U=()=>S.U;
  $('bPlay').onclick=()=>{ if(v.live){ v.live=false; v.playing=false; } else v.playing=!v.playing; };
  $('live').onclick=goLive;
  $('bBack1').onclick=()=>{ const p=v.playing&&!v.live; seek(v.tv-U().sr); v.playing=p; };
  $('bFwd1').onclick=()=>{ const p=v.playing; seek(v.tv+U().sr); if(!v.live) v.playing=p; };
  $('bBackS').onclick=()=>{ seek(v.tv-U().sr/1000); v.playing=false; };
  $('bFwdS').onclick=()=>{ seek(v.tv+U().sr/1000); if(!v.live) v.playing=false; };
  $('vspeed').onchange=e=>{ v.speed=+e.target.value; };
  const sc=$('scrub');
  sc.addEventListener('input',()=>{ scrubbing=true; v.live=false; v.playing=false; v.tv=+sc.value; });
  sc.addEventListener('change',()=>{ scrubbing=false; seek(+sc.value); if(!v.live) v.playing=false; });
  on('selecao',showInfo); on('universo',()=>{ resetRates(); showInfo(); });
}
