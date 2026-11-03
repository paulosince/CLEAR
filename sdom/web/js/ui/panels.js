/* Painel de números, nó selecionado e onda nos sensores (sempre ao vivo). */
import { S, $, sizeCanvas, fmt, fmtInt, on } from './state.js';
import { micInfo } from './mic.js';

let lastStatT=0, lastFC=0, lastMp=null, lastF=null, lastS=null;
const mpSnap=U=>U.mp?{bf:U.mp.blockedFire,bl:U.mp.blockedLearn,bc:U.mp.blockedCreate,t:U.t}:null;
export function resetRates(){ lastFC=S.U.fireCount; lastStatT=performance.now(); lastMp=mpSnap(S.U); }
export function drawPanel(){
  const now=performance.now(); if(now-lastStatT<500) return;
  const U=S.U, dt=(now-lastStatT)/1000; lastStatT=now;
  const rate=(U.fireCount-lastFC)/dt; lastFC=U.fireCount;
  let fF=0, fS=0; for(const n of U.nodes){ if(n.fiber) fF+=n.fires; else if(n.lvl>=2) fS+=n.fires; }
  const rF=lastF==null?0:(fF-lastF)/dt, rS=lastS==null?0:(fS-lastS)/dt; lastF=fF; lastS=fS;
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
    $('tBpm').textContent=Math.round(m.f*60)+'/min'; if(U.resp){ $('tResp').textContent=Math.round(U.resp.f*60)+'/min'; } $('tRes').textContent=Math.round(100*(m.shortFrac||0))+'%';
    const tot=rf+rl+rc; $('tFalta').textContent= tot>=10000 ? (tot/1000).toFixed(0)+' mil' : fmtInt(tot);
    falta=`${U.resp?` · respiração: estoque ${Math.round(100*U.resp.estoque/U.p.respEstoqueMax)}%, resíduo ${(U.resp.residuo/U.p.respResiduoRef).toFixed(1)}× a referência`:''} · pedido ao coração ${(m.pedido??1).toFixed(2)}× o que uma batida entrega · reserva média ${Math.round(100*m.level)}% · faltas por segundo de mundo: disparar ${fmtInt(rf)}, aprender ${fmtInt(rl)}, criar ${fmtInt(rc)}`; }
  else { $('tBpm').textContent='desligado'; $('tRes').textContent='—'; $('tFalta').textContent='—'; }
  $('statsMore').textContent=`tempo do mundo ${fmt(U.t)} · disparos/s: fibras ${fmtInt(rF)}, Sdom ${fmtInt(rS)} · ritmo ${(S.simRatio*100).toFixed(0)}% do real · Sdom perto ${per[2]} · médio ${per[3]} · longe ${per[4]} · reforços ${fmtInt(U.ltp)} · enfraquecimentos ${fmtInt(U.ltd)} · consolidações ${fmtInt(U.consol)} · candidatas à poda ${U.candidates} · podadas ${U.prunedE} arestas, ${U.prunedN} nós${U.hebbOn?` · regra hebbiana: ${(U.hebbForm||[]).length} arestas em formação, ${U.hebbStats.fechadas} fechadas, ${U.hebbStats.recolhidas} recolhidas`:''}${falta}${S.vida.congelamentos?` · universo congelado ${S.vida.congelamentos}× com a página fora da tela (o último durou ${S.vida.ultimoCongeladoS.toFixed(1)} s, que para o robô não existiram)`:''}`;
  const mi=micInfo();
  if(mi){ $('micInfo').textContent=`${mi.stereo?'estéreo':`mono${mi.dead?` (o canal ${mi.dead==='L'?'esquerdo':'direito'} chega mudo)`:''}: os dois sensores recebem o mesmo som`} · som perdido por atraso: ${mi.lostS.toFixed(1)} s`+
    ` · nível ${mi.nivel?mi.nivel.toFixed(3):'—'} · graves (≲200 Hz, estimativa) ${mi.graves==null?'—':Math.round(100*mi.graves)+'% da energia'}`+
    ` · o navegador aplicou: ${quem(mi.aplicado)}`; }

  if(S.view.sel) showInfo();
}

const simnao=v=>v===true?'sim':v===false?'não':'não informa';
function quem(a){ if(!a) return '—'; return `cancelamento de eco ${simnao(a.eco)}, supressão de ruído ${simnao(a.ruido)}, ganho automático ${simnao(a.ganho)}${a.voz!==undefined?`, isolamento de voz ${simnao(a.voz)}`:''}, ${Math.round(a.taxa/1000)} kHz`; }
export function showInfo(){
  const U=S.U, n=S.view.sel; if(!n){ $('info').textContent='Aproxime até ver o grafo e toque num nó para inspecionar.'; return; }
  const ms=v=>(v*1000/U.sr).toFixed(3)+' ms';
  const lv=n.endo?'corpo':n.lvl===0?'sensor':n.lvl===1?'transdução (fibra)':`Sdom · distância dos sensores ${n.depth}`;
  let s=`#${n.id} · ${lv}${n.lvl<=1&&!n.endo?(n.ear?' · sensor direito':' · sensor esquerdo'):''}\n`;
  if(n.heart){ const m=U.mp, fr=n=>(n*100).toFixed(0)+'%';
    $('info').textContent=`♥ marcapasso de recursos · fora do Sdom (como os sensores)\n`+
      `ritmo agora ${(m.f*60).toFixed(0)}/min · ritmo próprio ${(U.p.mpF0*60).toFixed(0)}/min · em repouso o reflexo fixo freia (~${U.p.mpRestBpm}/min)\n`+
      `batidas até agora ${m.beats} · recurso operacional por batida ${U.p.mpBeatOps.toLocaleString('pt-BR')}\n`+
      `na última batida: pedido ${Math.round(m.lastRequested).toLocaleString('pt-BR')} · entregue ${Math.round(m.lastDelivered).toLocaleString('pt-BR')}\n`+
      `pedido de recurso → ritmo: o Sdom está pedindo ${(m.pedido??1).toFixed(2)}× o que uma batida entrega · ritmo-alvo ${Math.round((m.fAlvo??U.p.mpRestBpm/60)*60)}/min (teto ${U.p.mpMaxBpm}/min)\n`+
      `nível geral da reserva operacional ${fr(m.level)}\n`+
      `faltas acumuladas: disparar ${m.blockedFire.toLocaleString('pt-BR')} · aprender ${m.blockedLearn.toLocaleString('pt-BR')} · criar ${m.blockedCreate.toLocaleString('pt-BR')}\n`+
      `sinal de volta ao Sdom: ${U.endoFibers.length} fibras do corpo (batida e nível)\n`+
      `eferência (o Sdom agir sobre ele): ainda não existe`; return; }
  if(n.lung){ const R=U.resp, P=U.p;
    $('info').textContent=`≋ respiração · fora do Sdom (como o coração)\n`+
      `ritmo agora ${(R.f*60).toFixed(0)}/min · alvo ${(R.fAlvo*60).toFixed(0)}/min · repouso ${P.respRestPm}/min · teto ${P.respMaxPm}/min\n`+
      `estoque ${Math.round(R.estoque).toLocaleString('pt-BR')} de ${P.respEstoqueMax.toLocaleString('pt-BR')} (cada respiração repõe ${P.respEntrada.toLocaleString('pt-BR')}; o coração distribui o que há aqui)\n`+
      `resíduo ${Math.round(R.residuo).toLocaleString('pt-BR')} (referência ${P.respResiduoRef.toLocaleString('pt-BR')}: acima dela a respiração acelera; cada expiração tira ${Math.round(100*P.respRetira)}%)\n`+
      `respirações até agora ${R.respiracoes} · sinal de volta ao Sdom: ${U.respFibers.length} fibras (inspira, expira e nível de resíduo)\n`+
      `comando voluntário (o Sdom prender ou acelerar a respiração): fica para a eferência`; return; }
  if(n.endo && n.endo.kind!=='batida' && n.endo.kind!=='nivel'){ const E=n.endo;
    s+=`fibra do corpo (transdução endógena da respiração) · ${E.kind==='inspira'?'dispara a cada inspiração':E.kind==='expira'?'dispara a cada expiração':`nível de resíduo: dispara na expiração se o resíduo ≥ ${E.thr}× a referência`}\n`;
    s+=`disparos até agora ${n.fires} · saídas para o Sdom: ${n.out.length}`; $('info').textContent=s; return; }
  if(n.endo){ const E=n.endo;
    s+=`fibra do corpo (transdução endógena) · ${E.kind==='batida'?`batida: dispara a cada batida com força ≥ ${E.thr}`:`nível geral da reserva operacional: dispara junto com a batida se o nível ≥ ${(E.thr*100).toFixed(0)}%`}\n`;
    s+=`disparos até agora ${n.fires} · magnitude ${n.mag} · saídas para o Sdom: ${n.out.length}`; $('info').textContent=s; return; }
  if(n.lvl===0){ s+=`microfone (${U.sr/1000} kHz): entrega o som à cóclea (transdução)\nfibras: ${n.out.length}`; $('info').textContent=s; return; }
  if(n.endo){ s=`#${n.id} · transdução endógena (marcapasso de recursos)\n`;
    s+= n.endo.kind==='batida' ? `dispara a cada batida quando a força ≥ ${n.endo.thr} (força fixa nesta versão)\n` : `dispara junto com a batida quando o nível geral da reserva operacional ≥ ${Math.round(100*n.endo.thr)}%\n`;
    s+=`disparos até agora ${n.fires} · saídas para o Sdom: ${n.out.length}`; $('info').textContent=s; return; }
  if(n.fiber){ const F=n.fiber;
    s+=`canal ${F.k+1}/${U.coch.length} da cóclea · ${F.fc<1000?Math.round(F.fc)+' Hz':(F.fc/1000).toFixed(2)+' kHz'}\n`;
    s+=`fibra ${['sensível','média','pouco sensível'][F.cls]} (+${F.db} dB) · limiar ${n.thr.toFixed(4)}\n`;
    s+=F.active?`disparos até agora ${n.fires} · cada disparo entra no Sdom como incidência de magnitude ${n.mag}\n`:`fora do alcance do microfone (acima de ${(0.45*U.sr/1000).toFixed(1)} kHz): em silêncio\n`;
    s+=`saídas para o Sdom: ${n.out.length}`; $('info').textContent=s; return; }
  if(n.lvl>=2){ let viv=0, cons=0, cand=0; for(const e of n.in){ if(e.from.lvl===0||e.diedAt!==Infinity) continue; viv++; if(e.consAt>=0) cons++; if(e.inertSince!==null) cand++; }
    s+= viv>0 && cand===viv ? `CANDIDATO À PODA (terracota): todas as ${viv} entradas são candidatas; quando forem podadas, o nó fica órfão e é podado\n` : cons<viv ? `NOVO (verde-piscina): ${cons} de ${viv} entradas já consolidaram\n` : `consolidado: todas as ${viv} entradas já consolidaram\n`; }
  s+=`nasceu em ${fmt(n.born)}`+(n.diedAt!==Infinity?` · PODADO em ${fmt(n.diedAt)} (ficou órfão)`:'')+`\n`;
  if(n.malha!==undefined) s+= n.malha>=0 ? `malha: estímulo #${n.malha}\n` : `malha: nenhum estímulo identificado\n`;
  s+=`janela de integração ${ms(n.W)} · refratariedade ${ms(n.refr)}\n`;
  if(n.res!==undefined) s+=`reserva operacional ${Math.round(n.res)} de ${Math.round(n.cap)} (${(100*n.res/n.cap).toFixed(0)}%) · piso de aprender ${(U.p.mpPisoAprender*100).toFixed(0)}% · piso de disparar ${(U.pisoFire(n)*100).toFixed(0)}%\n`;
  if(U.mp && n.res!==undefined) s+=`reserva operacional ${Math.round(n.res)} de ${Math.round(n.cap)} (${Math.round(100*n.res/n.cap)}%) · piso de aprender ${Math.round(100*U.p.mpPisoAprender)}% · piso de disparar ${Math.round(100*U.pisoFire(n))}%\n`;
  s+=`limiar ${n.thr.toFixed(4)} (fixo) · magnitude ${n.mag.toFixed(4)} (fixa)\n`;
  s+=`disparos até agora ${n.fires}`+(n.fires?` · último há ${((U.t-n.lastFire)/U.sr).toFixed(1)} s`:'')+`\n`;
  if(n.origin) s+=`origem: relacionou ${n.origin.k} disparos${n.origin.self?' (o mesmo nó consigo, no tempo)':''} espalhados em ${n.origin.span.toFixed(2)} ms · tolerância ${n.origin.tolMs.toFixed(2)} ms\n`;
  s+=`entradas (${n.in.length}):\n`;
  const tvv=Math.floor(S.view.tv);
  for(const e of n.in.slice(0,12)){ let w=U.wAt(e,tvv); if(w===null) w=e.mod; let ws=U.wsAt(e,tvv); if(ws===null) ws=e.wS;
    s+=`  de #${e.from.id} (${['sensor','fibra','n2','n3','n4'][e.from.lvl]}) atraso ${ms(e.d)}`+(e.from.lvl? ` · peso ${w.toFixed(3)} (basal ${(w-ws).toFixed(3)} · consolidado ${ws.toFixed(3)})${e.hebb?(e.hebb.estado===0?` · EM FORMAÇÃO (regra hebbiana; fecha em ${fmt(Math.max(0,e.hebb.nasceu+U.hFechar-U.t))} se o disparar junto continuar)`:` · nasceu pela regra hebbiana, fechada`):''}${e.consAt>=0?` · consolidou em ${fmt(e.consAt)}`:' · NOVA (ainda não consolidou)'}${w<U.p.inertW?' INERTE'+(e.inertSince!==null?`, candidata à poda há ${fmt(U.t-e.inertSince)}`:''):''}`:'')+`\n`; }
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

export function initPanels(){
  on('selecao',showInfo); on('universo',()=>{ resetRates(); showInfo(); });
}
