/* Visão do Sdom: de longe, um mapa de atividade (à maneira de uma fMRI: onde há atividade
   recente, acende); ao aproximar, o grafo com nós e arestas. Não é um modelo de sinal BOLD:
   é só a contagem de disparos recentes de cada nó, espalhada e suavizada no mapa. */
import { S, $, sizeCanvas, emit } from './state.js';

const COL=['#9aa3b2','#7d8aa0','#5b8def','#a77bf3','#f0a04b'];
const NOVO='#1de9d6';     // verde-piscina: nó ou aresta nova, ainda não consolidada (pedido do Paulo)
const PODRE='#c4623a';    // terracota: aresta candidata à poda (inerte, esperando os dias de poda)
const RAD=[9,3.4,4,5,6.5];
const WORLD={w:1300, h:1000};        // área do desenho do Sdom (coordenadas dos nós)
const TAU=0.25;                       // atividade recente: média com esquecimento de 0,25 s
const GW=104, GH=80;                  // resolução do mapa de atividade
let glow=new Float32Array(8192), part=new Float32Array(8192), act=new Float32Array(8192);
const grid=new Float32Array(GW*GH), anat=new Float32Array(GW*GH), tmp=new Float32Array(GW*GH);
let anatKey='', aRefT=1, aRefS=1, off=null, offG=null, img=null, graphOff=null;
const SPLIT=Math.round(400/WORLD.w*GW);   // colunas do mapa à esquerda disso = transdução (escala própria)

export function fitView(){
  const c=$('sdom'), r=c.getBoundingClientRect(), v=S.view;
  const s=Math.min(r.width/1180, r.height/1010);
  v.s=s; v.fitS=s; v.ox=(r.width-1180*s)/2+10*s; v.oy=(r.height-1000*s)/2;
}
// quanto do grafo aparece (0 = só atividade, 1 = só grafo)
function graphShare(){ const v=S.view; if(v.mode==='grafo') return 1; if(v.mode==='atividade') return 0;
  const z=v.s/v.fitS; return Math.max(0,Math.min(1,(z-1.6)/0.8)); }

export function drawSdom(){
  const c=$('sdom'), d=sizeCanvas(c), g=c.getContext('2d'), U=S.U, v=S.view;
  if(!v.fitted){ fitView(); v.fitted=true; }
  g.setTransform(1,0,0,1,0,0); g.clearRect(0,0,c.width,c.height);
  const share=graphShare();
  if(share<1) drawActivity(g,c,d,1-share*0.85);
  if(share>0){
    if(share>=0.999) drawGraph(g,c,d);
    else { if(!graphOff) graphOff=document.createElement('canvas'); if(graphOff.width!==c.width||graphOff.height!==c.height){ graphOff.width=c.width; graphOff.height=c.height; }
      const og=graphOff.getContext('2d'); og.setTransform(1,0,0,1,0,0); og.clearRect(0,0,c.width,c.height); drawGraph(og,c,d);
      g.globalAlpha=share; g.drawImage(graphOff,0,0); g.globalAlpha=1; }
  }
  $('legend').hidden = share>=0.999; $('legendGraph').hidden = share<=0.001;
  $('legendHint').textContent = v.mode==='auto' ? (share<0.5?'aproxime (pinça ou +) para ver o grafo':'afaste para ver o mapa de atividade') : '';
  if(U.capHit){ g.fillStyle='#ff8a8a'; g.font=`${12*d}px system-ui`; g.fillText('teto de nós atingido: criação parada', 10*d, c.height-10*d); }
}

// ---------- mapa de atividade ----------
function blur(a){ // borrão separável (caixa de raio 2, duas passadas)
  for(let pass=0;pass<2;pass++){
    for(let y=0;y<GH;y++){ let s=0; const o=y*GW; for(let x=-2;x<GW+2;x++){ if(x+2<GW) s+=a[o+x+2]; if(x-3>=0) s-=a[o+x-3]; if(x>=0&&x<GW) tmp[o+x]=s/5; } }
    for(let x=0;x<GW;x++){ let s=0; for(let y=-2;y<GH+2;y++){ if(y+2<GH) s+=tmp[(y+2)*GW+x]; if(y-3>=0) s-=tmp[(y-3)*GW+x]; if(y>=0&&y<GH) a[y*GW+x]=s/5; } }
  }
}
function splat(a,x,y,w){ const gx=x/WORLD.w*GW, gy=y/WORLD.h*GH, ix=Math.floor(gx), iy=Math.floor(gy), fx=gx-ix, fy=gy-iy;
  if(ix<0||iy<0||ix>=GW-1||iy>=GH-1) return;
  const o=iy*GW+ix; a[o]+=w*(1-fx)*(1-fy); a[o+1]+=w*fx*(1-fy); a[o+GW]+=w*(1-fx)*fy; a[o+GW+1]+=w*fx*fy; }
// rampa sequencial de um matiz (escuro → laranja → amarelo claro)
const STOPS=[[42,47,58],[122,61,16],[224,122,31],[255,211,106],[255,244,194]];
function ramp(v){ const x=Math.max(0,Math.min(0.9999,v))*(STOPS.length-1), i=Math.floor(x), f=x-i, a=STOPS[i], b=STOPS[i+1]; return [a[0]+(b[0]-a[0])*f, a[1]+(b[1]-a[1])*f, a[2]+(b[2]-a[2])*f]; }

function drawActivity(g,c,d,alpha){
  const U=S.U, v=S.view, tv=Math.floor(v.tv), nv=U.visibleCount(tv);
  if(act.length<U.nodes.length) act=new Float32Array(U.nodes.length*2);
  act.fill(0,0,nv);
  const win=Math.round(4*TAU*U.sr), tauS=TAU*U.sr;
  for(let k=U.firstHistIdx(tv-win); k<U.hCount; k++){ const tt=U.hT[k%U.hCap]; if(tt>tv) break; const id=U.hN[k%U.hCap]; if(id<nv) act[id]+=Math.exp(-(tv-tt)/tauS); }
  // anatomia (onde há nós), recalculada só quando a estrutura muda
  const key=nv+':'+U.prunedN;
  if(key!==anatKey){ anatKey=key; anat.fill(0); for(let i=0;i<nv;i++){ const n=U.nodes[i]; if(n.lvl>=1 && n.diedAt>tv && !(n.fiber&&!n.fiber.active)) splat(anat,n.x,n.y,1); } blur(anat); }
  grid.fill(0);
  for(let i=0;i<nv;i++) if(act[i]>0){ const n=U.nodes[i]; if(n.lvl>=1) splat(grid,n.x,n.y,act[i]); }
  blur(grid);
  // transdução e Sdom têm escalas próprias: as fibras disparam muito mais e apagariam o Sdom
  let mxT=0, mxS=0, am=0; for(let i=0;i<grid.length;i++){ if(i%GW<SPLIT){ if(grid[i]>mxT) mxT=grid[i]; } else if(grid[i]>mxS) mxS=grid[i]; if(anat[i]>am) am=anat[i]; }
  const adj=(ref,mx)=>Math.max(0.5, mx>ref ? mx : ref*0.985+mx*0.015);   // escala que se ajusta devagar (sem piscar)
  aRefT=adj(aRefT,mxT); aRefS=adj(aRefS,mxS);
  if(!off){ off=document.createElement('canvas'); off.width=GW; off.height=GH; offG=off.getContext('2d'); img=offG.createImageData(GW,GH); }
  const P=img.data, laT=Math.log1p(aRefT), laS=Math.log1p(aRefS);
  for(let i=0;i<GW*GH;i++){
    const an=am>0? Math.sqrt(anat[i]/am) : 0, base=11+40*an;
    const a=grid[i]>1e-6 ? Math.log1p(grid[i])/(i%GW<SPLIT?laT:laS) : 0;
    let r=base, gg=base+2, b=base+8, al=an>0.02?255:0;
    if(a>0.02){ const [R,G,B]=ramp(a); const m=Math.min(1,a*1.6); r=r*(1-m)+R*m; gg=gg*(1-m)+G*m; b=b*(1-m)+B*m; al=255; }
    P[4*i]=r; P[4*i+1]=gg; P[4*i+2]=b; P[4*i+3]=al;
  }
  offG.putImageData(img,0,0);
  const s=v.s*d, ox=v.ox*d, oy=v.oy*d;
  g.save(); g.globalAlpha=alpha; g.imageSmoothingEnabled=true; g.imageSmoothingQuality='high';
  g.drawImage(off, ox, oy, WORLD.w*s, WORLD.h*s); g.restore();
  g.font=`${11*d}px system-ui`; g.fillStyle='#7a8293';
  for(const [x,t] of [[60,'ouvidos'],[250,'transdução'],[560,'Sdom: mais longe dos ouvidos →']]) g.fillText(t, x*s+ox-18*d, Math.max(14*d, oy-6*d));
}

// ---------- grafo ----------
function drawGraph(g,c,d){
  const U=S.U, v=S.view, W=c.width, H=c.height;
  const s=v.s*d, ox=v.ox*d, oy=v.oy*d, X=x=>x*s+ox, Y=y=>y*s+oy;
  const tv=Math.floor(v.tv), nv=U.visibleCount(tv), ne=U.visibleEdges(tv);
  if(glow.length<U.nodes.length){ glow=new Float32Array(U.nodes.length*2); part=new Float32Array(U.nodes.length*2); }
  glow.fill(0,0,nv); part.fill(0,0,nv);
  const spd = 1;   // sempre ao vivo, no tempo real
  const gw = Math.max(4, Math.round(U.sr*Math.min(0.04,Math.max(0.0005,0.04*spd))));
  for(let k=U.firstHistIdx(tv-gw); k<U.hCount; k++){ const tt=U.hT[k%U.hCap]; if(tt>tv) break; const id=U.hN[k%U.hCap]; if(id<nv){ const a=1-(tv-tt)/gw; if(a>glow[id]) glow[id]=a; } }
  const pw=Math.round(U.sr*0.25*Math.max(0.05,Math.min(1,spd)));
  for(let k=U.firstNmIdx(tv-pw); k<U.nmCount; k++){ const tt=U.nmT[k%U.nmCap]; if(tt>tv) break; const id=U.nmN[k%U.nmCap]; if(id<nv && glow[id]===0){ const f=U.nmF[k%U.nmCap]; if(f>part[id]) part[id]=f; } }
  g.font=`${11*d}px system-ui`; g.fillStyle='#5d6575';
  for(const [x,t] of [[60,'ouvidos'],[270,'transdução'],[520,'Sdom: mais longe dos ouvidos →']]) g.fillText(t, X(x)-18*d, Math.max(14*d,Y(0)-6*d));
  g.fillText('esq.', X(20), Y(250)+24*d); g.fillText('dir.', X(20), Y(750)+24*d);
  if(ne<=15000){
    const B=[['rgba(140,150,170,0.06)',0.6],['rgba(150,170,210,0.16)',1],['rgba(120,190,255,0.45)',1.4]];
    const paths=[new Path2D(),new Path2D(),new Path2D()], inert=new Path2D(), cons=new Path2D(), novo=new Path2D(), podre=new Path2D();
    const zr=Math.max(0.7,Math.min(2.2,v.s*1.2)), setas = v.s/v.fitS>=2, setaP=new Path2D();   // setas só de perto, para não virar borrão
    for(let i=0;i<ne;i++){ const e=U.edges[i]; if(e.from.lvl===0||e.diedAt<=tv) continue; let w=U.wAt(e,tv); if(w===null) w=e.mod; let ws=U.wsAt(e,tv); if(ws===null) ws=e.wS;
      const p = e.inertSince!==null ? podre : !(e.consAt>=0 && e.consAt<=tv) ? (w<U.p.inertW ? inert : novo)
        : w<U.p.inertW ? inert : (ws>0.5*w && w>=0.35 ? cons : paths[w<0.35?0:(w<0.7?1:2)]);
      const x1=X(e.from.x), y1=Y(e.from.y), x2=X(e.to.x), y2=Y(e.to.y);
      p.moveTo(x1,y1); p.lineTo(x2,y2);
      // direção: ponta de seta perto de quem recebe (só quando a aresta é longa o bastante na tela)
      if(setas){ const dx=x2-x1, dy=y2-y1, L=Math.hypot(dx,dy);
        if(L>28*d && Math.max(x1,x2)>0 && Math.min(x1,x2)<W && Math.max(y1,y2)>0 && Math.min(y1,y2)<H){
          const ux=dx/L, uy=dy/L, back=Math.min(L*0.25, 3*d+RAD[e.to.lvl]*d*zr), hx=x2-ux*back, hy=y2-uy*back, a=8*d, b=3.5*d;
          setaP.moveTo(hx,hy); setaP.lineTo(hx-ux*a-uy*b, hy-uy*a+ux*b); setaP.lineTo(hx-ux*a+uy*b, hy-uy*a-ux*b); setaP.closePath(); } } }
    for(let k=0;k<3;k++){ g.strokeStyle=B[k][0]; g.lineWidth=B[k][1]*d; g.stroke(paths[k]); }
    g.strokeStyle='rgba(240,160,75,0.55)'; g.lineWidth=1.4*d; g.stroke(cons);
    g.setLineDash([3*d,4*d]); g.strokeStyle='rgba(120,120,120,0.25)'; g.lineWidth=0.7*d; g.stroke(inert); g.setLineDash([]);
    g.strokeStyle=NOVO; g.globalAlpha=0.5; g.lineWidth=1.1*d; g.stroke(novo);
    g.strokeStyle=PODRE; g.globalAlpha=0.9; g.lineWidth=1.4*d; g.setLineDash([4*d,3*d]); g.stroke(podre); g.setLineDash([]); g.globalAlpha=1;
    if(setas){ g.fillStyle='rgba(235,240,250,0.85)'; g.fill(setaP); }
  }
  g.strokeStyle='rgba(255,226,122,0.55)'; g.lineWidth=1.3*d; g.beginPath();
  for(let i=0;i<ne;i++){ const e=U.edges[i]; if(e.diedAt<=tv) continue; if(glow[e.to.id]>0 && (glow[e.from.id]>0 || e.from.lvl===0)){ g.moveTo(X(e.from.x),Y(e.from.y)); g.lineTo(X(e.to.x),Y(e.to.y)); } }
  g.stroke();
  const sel=v.sel;
  if(sel && sel.id<nv){ g.lineWidth=1.6*d;
    g.strokeStyle='rgba(120,200,255,0.9)'; g.beginPath(); for(const e of sel.in){ g.moveTo(X(e.from.x),Y(e.from.y)); g.lineTo(X(sel.x),Y(sel.y)); } g.stroke();
    g.strokeStyle='rgba(255,140,200,0.8)'; g.beginPath(); for(const e of sel.out){ if(e.to.id<nv){ g.moveTo(X(sel.x),Y(sel.y)); g.lineTo(X(e.to.x),Y(e.to.y)); } } g.stroke(); }
  const zr=Math.max(0.7,Math.min(2.2,v.s*1.2));
  for(let l=0;l<=4;l++){ g.fillStyle=COL[l]; g.globalAlpha=l===0?0.9:0.45; g.beginPath(); const r=RAD[l]*d*zr;
    for(let i=0;i<nv;i++){ const n=U.nodes[i]; if(n.lvl!==l||n.diedAt<=tv||(n.fiber&&!n.fiber.active)) continue; const x=X(n.x),y=Y(n.y); if(x<-10||y<-10||x>W+10||y>H+10) continue; g.moveTo(x+r,y); g.arc(x,y,r,0,6.2832); }
    g.fill(); }
  // nós novos (verde-piscina) até todas as arestas que chegam neles terem consolidado
  g.globalAlpha=0.95; g.fillStyle=NOVO; g.beginPath();
  const podres=new Path2D();
  for(let i=0;i<nv;i++){ const n=U.nodes[i]; if(n.lvl<2||n.diedAt<=tv) continue; const x=X(n.x),y=Y(n.y); if(x<-10||y<-10||x>W+10||y>H+10) continue; const r=RAD[n.lvl]*d*zr;
    if(noPodre(n,tv)){ podres.moveTo(x+r,y); podres.arc(x,y,r,0,6.2832); } else if(noNovo(n,tv)){ g.moveTo(x+r,y); g.arc(x,y,r,0,6.2832); } }
  g.fill();
  // nós cujas entradas vivas são todas candidatas à poda (vão ficar órfãos): terracota
  g.fillStyle=PODRE; g.fill(podres);
  g.globalAlpha=0.25; g.fillStyle='#4a5160'; g.beginPath();
  { const r=RAD[1]*d*zr; for(let i=0;i<nv;i++){ const n=U.nodes[i]; if(!n.fiber||n.fiber.active) continue; const x=X(n.x),y=Y(n.y); g.moveTo(x+r,y); g.arc(x,y,r,0,6.2832); } }
  g.fill(); g.globalAlpha=1;
  for(let i=0;i<nv;i++){ const n=U.nodes[i]; if(n.diedAt<=tv) continue; const x=X(n.x), y=Y(n.y); if(x<-10||y<-10||x>W+10||y>H+10) continue;
    const r=RAD[n.lvl]*d*zr;
    if(glow[i]>0){ g.fillStyle=`rgba(255,226,122,${0.35+0.65*glow[i]})`; g.beginPath(); g.arc(x,y,r*1.9,0,6.2832); g.fill(); }
    else if(part[i]>0){ g.strokeStyle='rgba(255,226,122,0.85)'; g.lineWidth=2*d; g.beginPath(); g.arc(x,y,r*2.2,-Math.PI/2,-Math.PI/2+6.2832*Math.min(1,part[i])); g.stroke(); }
    const age=tv-n.born;
    if(n.lvl>0 && age>=0 && age<U.sr*0.4){ g.strokeStyle=`rgba(255,255,255,${1-age/(U.sr*0.4)})`; g.lineWidth=1.5*d; g.beginPath(); g.arc(x,y,r*3.2,0,6.2832); g.stroke(); } }
  if(sel && sel.id<nv){ g.strokeStyle='#78c8ff'; g.lineWidth=2*d; g.beginPath(); g.arc(X(sel.x),Y(sel.y),RAD[sel.lvl]*d*zr*2.8,0,6.2832); g.stroke(); }
  drawBody(g,d,X,Y,zr,nv);
}
// nó novo = alguma aresta viva que chega nele ainda não consolidou
export function noNovo(n,tv){ for(const e of n.in){ if(e.from.lvl===0||e.diedAt<=tv) continue; if(!(e.consAt>=0 && e.consAt<=tv)) return true; } return false; }
// nó "podre" = tem entradas vivas e todas são candidatas à poda (quando forem podadas, o nó fica órfão e é podado)
export function noPodre(n,tv){ let k=0; for(const e of n.in){ if(e.from.lvl===0||e.diedAt<=tv) continue; if(e.inertSince===null) return false; k++; } return k>0; }
// Corpo: o marcapasso de recursos (fora do Sdom, como os ouvidos) e as fibras do corpo (transdução endógena)
export const HEART={x:60, y:500};
function drawBody(g,d,X,Y,zr,nv){
  const U=S.U; if(!U.mpOn || !U.endoFibers) return;
  const hx=X(HEART.x), hy=Y(HEART.y); let pulse=0;
  for(const f of U.endoFibers) if(f.endo.kind==='batida' && f.id<nv && glow[f.id]>pulse) pulse=glow[f.id];
  g.strokeStyle='rgba(224,96,126,0.4)'; g.lineWidth=0.8*d; g.beginPath();
  for(const f of U.endoFibers){ g.moveTo(hx,hy); g.lineTo(X(f.x),Y(f.y)); } g.stroke();
  const r=RAD[1]*d*zr*1.25; g.fillStyle='#e0607e'; g.beginPath();
  for(const f of U.endoFibers){ const x=X(f.x),y=Y(f.y); g.moveTo(x+r,y); g.arc(x,y,r,0,6.2832); } g.fill();
  for(const f of U.endoFibers) if(f.id<nv && glow[f.id]>0){ g.fillStyle=`rgba(255,226,122,${0.35+0.65*glow[f.id]})`; g.beginPath(); g.arc(X(f.x),Y(f.y),r*1.7,0,6.2832); g.fill(); }
  const sel=S.view.sel; const isSel=sel&&sel.heart;
  g.textAlign='center'; g.textBaseline='middle';
  g.font=`${Math.round((16+8*pulse)*d*Math.max(0.8,Math.min(1.6,zr)))}px system-ui`; g.fillStyle='#e0607e'; g.fillText('♥',hx,hy);
  if(isSel){ g.strokeStyle='#78c8ff'; g.lineWidth=2*d; g.beginPath(); g.arc(hx,hy,14*d*zr,0,6.2832); g.stroke(); }
  g.font=`${10*d}px system-ui`; g.fillStyle='#c98a99';
  g.fillText('marcapasso de recursos', hx, hy+20*d*Math.max(0.8,Math.min(1.6,zr)));
  g.fillText('corpo', X(270), Y(545)+8*d);
  g.textAlign='start'; g.textBaseline='alphabetic';
}

// ---------- interação: arrastar, pinça, roda, toque ----------
// zoom limitado em relação ao "ajustado" (metade a 40×), para o conteúdo não sumir
export function zoomAt(cx,cy,ns,base){ const v=S.view; ns=Math.max(0.5*v.fitS,Math.min(40*v.fitS,ns)); const b=base||{s:v.s,ox:v.ox,oy:v.oy}; const wx=(cx-b.ox)/b.s, wy=(cy-b.oy)/b.s; v.s=ns; v.ox=cx-wx*ns; v.oy=cy-wy*ns; keepInView(); }
// nunca deixa o conteúdo sair inteiro da tela: pelo menos uma faixa dele fica visível
function keepInView(){ const v=S.view, c=$('sdom'), r=c.getBoundingClientRect(), m=60;
  const x0=v.ox, x1=v.ox+WORLD.w*v.s, y0=v.oy, y1=v.oy+WORLD.h*v.s;
  if(x1<m) v.ox+=m-x1; if(x0>r.width-m) v.ox-=x0-(r.width-m);
  if(y1<m) v.oy+=m-y1; if(y0>r.height-m) v.oy-=y0-(r.height-m); }
function pick(px,py){
  if(graphShare()<0.5) return;          // no mapa de atividade não há nós para tocar
  const U=S.U, v=S.view, nv=U.visibleCount(Math.floor(v.tv)); let best=null, bd=18;
  for(let i=0;i<nv;i++){ const n=U.nodes[i]; if(n.diedAt<=v.tv) continue; const dd=Math.hypot(n.x*v.s+v.ox-px, n.y*v.s+v.oy-py); if(dd<bd){ bd=dd; best=n; } }
  if(U.mpOn){ const dd=Math.hypot(HEART.x*v.s+v.ox-px, HEART.y*v.s+v.oy-py); if(dd<Math.max(bd,22)) best={heart:true}; }
  v.sel=best; emit('selecao');
}
export function initSdomView(){
  const c=$('sdom'), ptrs=new Map(); let start=null, pinch=null; const v=S.view;
  c.addEventListener('pointerdown',e=>{ c.setPointerCapture(e.pointerId); ptrs.set(e.pointerId,{x:e.offsetX,y:e.offsetY}); if(ptrs.size===1) start={x:e.offsetX,y:e.offsetY,ox:v.ox,oy:v.oy,moved:false}; if(ptrs.size===2){ const [a,b]=[...ptrs.values()]; pinch={d:Math.hypot(a.x-b.x,a.y-b.y),s:v.s,cx:(a.x+b.x)/2,cy:(a.y+b.y)/2,ox:v.ox,oy:v.oy}; } });
  c.addEventListener('pointermove',e=>{ if(!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
    if(ptrs.size===2&&pinch){ const [a,b]=[...ptrs.values()]; zoomAt(pinch.cx,pinch.cy,pinch.s*Math.hypot(a.x-b.x,a.y-b.y)/pinch.d,pinch); }
    else if(ptrs.size===1&&start){ const dx=e.offsetX-start.x, dy=e.offsetY-start.y; if(Math.abs(dx)+Math.abs(dy)>6) start.moved=true; if(start.moved){ v.ox=start.ox+dx; v.oy=start.oy+dy; keepInView(); } } });
  // toque duplo: volta ao ponto original (centralizar)
  let lastTap={t:0,x:0,y:0};
  const up=e=>{ if(ptrs.size===1&&start&&!start.moved){ const now=performance.now();
      if(now-lastTap.t<350 && Math.hypot(e.offsetX-lastTap.x,e.offsetY-lastTap.y)<30){ fitView(); lastTap.t=0; }
      else { pick(e.offsetX,e.offsetY); lastTap={t:now,x:e.offsetX,y:e.offsetY}; } }
    ptrs.delete(e.pointerId); if(ptrs.size<2) pinch=null; if(ptrs.size===0) start=null; };
  c.addEventListener('dblclick',e=>{ e.preventDefault(); fitView(); });
  c.addEventListener('pointerup',up); c.addEventListener('pointercancel',e=>{ ptrs.delete(e.pointerId); pinch=null; start=null; });
  c.addEventListener('wheel',e=>{ e.preventDefault(); zoomAt(e.offsetX,e.offsetY,v.s*Math.exp(-e.deltaY*0.0015)); },{passive:false});
  const mid=k=>{ const r=c.getBoundingClientRect(); zoomAt(r.width/2,r.height/2,v.s*k); };
  $('zin').onclick=()=>mid(1.4); $('zout').onclick=()=>mid(1/1.4); $('zfit').onclick=()=>fitView();
  for(const b of $('viewMode').querySelectorAll('button')) b.onclick=()=>{ v.mode=b.dataset.m; for(const x of $('viewMode').querySelectorAll('button')) x.classList.toggle('on',x===b); };
}
