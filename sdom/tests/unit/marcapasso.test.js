// Marcapasso de recursos (v0.11): dependência real, ordem do corte, repouso, circuito e adaptação.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Universe, DEFAULTS } from './_ajuda.js';

// universo com marcapasso, sem criação automática; nós montados à mão para testar uma regra por vez
function montagem(extra={}){
  const U=new Universe(Object.assign({},DEFAULTS,{mpOn:1},extra),1); U.p.maxNodes=0;
  const no=(depth)=>{ const n=U.addNode({lvl:Math.min(4,depth), depth, W:10, thr:0.95, mag:0.7, refr:20, born:U.t, x:0, y:0}); n.cap=U.p.mpCap0; n.res=n.cap; n.spent=0; n.blocked=false; U.sdomList.push(n); return n; };
  const A=U.fibers[0][0], B=U.fibers[0][1];
  return {U,no,A,B};
}
const silencio=(U,n)=>{ for(let i=0;i<n;i++) U.step(0,0); };
const pulso=(U,A,B,N)=>{ U.fire(A,U.t); U.fire(B,U.t); silencio(U,10); };

test('dependência real: sem recurso, o nó do Sdom não dispara; a fibra da transdução continua', ()=>{
  const {U,no,A,B}=montagem(); const N=no(2); U.addEdge(A,N,5); U.addEdge(B,N,5);
  U.mp.stopped=true; N.res=80;   // pouca reserva e o marcapasso parado: ninguém repõe
  let antes=N.fires; for(let i=0;i<200;i++) pulso(U,A,B,N);
  assert.ok(N.fires>antes, 'dispara enquanto há reserva');
  const f1=N.fires; for(let i=0;i<50;i++) pulso(U,A,B,N);
  assert.equal(N.fires,f1,'a reserva acabou: parou de disparar');
  assert.ok(U.mp.blockedFire>0); assert.ok(A.fires>0);
});
test('ordem do corte: entre os pisos, o nó dispara mas não aprende', ()=>{
  const {U,no,A,B}=montagem(); const N=no(2); const eA=U.addEdge(A,N,5); U.addEdge(B,N,5);
  U.mp.stopped=true; N.res=0.4*N.cap;      // abaixo do piso de aprender (0,6), acima do de disparar (0,05)
  const w=eA.mod, f=N.fires; pulso(U,A,B,N);
  assert.equal(N.fires,f+1,'disparou'); assert.equal(eA.mod,w,'não aprendeu'); assert.ok(U.mp.blockedLearn>0);
});
test('ordem do corte: o mais longe da transdução para antes do mais perto', ()=>{
  const {U,no,A,B}=montagem(); const perto=no(2), longe=no(10);
  for(const N of [perto,longe]){ U.addEdge(A,N,5); U.addEdge(B,N,5); N.res=0.2*N.cap; }
  U.mp.stopped=true; pulso(U,A,B,perto);
  assert.equal(perto.fires,1,'perto: piso 0,05 < 0,2 → dispara');
  assert.equal(longe.fires,0,`longe: piso ${U.pisoFire(longe).toFixed(2)} > 0,2 → não dispara`);
});
test('o mundo não espera: com falta, o relógio do mundo segue igual', ()=>{
  const {U,no,A,B}=montagem(); const N=no(2); U.addEdge(A,N,5); U.addEdge(B,N,5); N.res=0; U.mp.stopped=true;
  const t0=U.t; pulso(U,A,B,N); assert.equal(U.t,t0+10);
});
test('repouso: com o reflexo, o ritmo se acomoda abaixo do ritmo próprio (~81/min)', ()=>{
  const U=new Universe(Object.assign({},DEFAULTS,{mpOn:1}),1); U.mp.f=U.p.mpF0; U.mp.press=0;
  silencio(U,30*U.sr);
  const bpm=U.mp.f*60; assert.ok(Math.abs(bpm-U.p.mpRestBpm)<4, `ritmo ${bpm.toFixed(1)}/min`); assert.ok(bpm<U.p.mpF0*60);
});
test('circuito: em silêncio total, as fibras endógenas disparam a cada batida', ()=>{
  const U=new Universe(Object.assign({},DEFAULTS,{mpOn:1}),1); silencio(U,10*U.sr);
  const batida=U.endoFibers.filter(f=>f.endo.kind==='batida');
  assert.ok(U.mp.beats>=12, `batidas ${U.mp.beats}`); for(const f of batida) assert.equal(f.fires,U.mp.beats);
  assert.ok(U.fibers[0].every(f=>f.fires===0),'as fibras da cóclea ficam em silêncio');
});
test('adaptação: falta sustentada aumenta o teto; sem falta, ele volta devagar', ()=>{
  const {U,no}=montagem(); const N=no(2); N.res=0; const c0=N.cap;
  for(let i=0;i<2000;i++){ N.blocked=true; U.mpBeat(U.t+i); }
  assert.ok(N.cap>c0, `teto ${N.cap.toFixed(3)} > ${c0}`);
  const c1=N.cap; U.jump(14*86400*U.sr);
  assert.ok(Math.abs((N.cap-c0)-(c1-c0)/2)<1e-6*c1, 'meia-vida de 14 dias de volta ao inicial');
});
test('mesma semente, mesmo resultado com o marcapasso ligado', async ()=>{
  const { Lab } = await import('../../web/js/lab/lab.js');
  const r=()=>{ const L=new Lab(Object.assign({},DEFAULTS),2026,'casa',6); while(!L.advance(1600)); const m=L.U.mp; return [L.U.fireCount,L.U.nodes.length,m.blockedFire,m.blockedLearn,Math.round(m.opsSpent)]; };
  assert.deepEqual(r(),r());
});
test('painel: a falta local aparece mesmo quando a média da reserva está alta', ()=>{
  const U=new Universe(Object.assign({},DEFAULTS),11); let r=7; const rnd=()=>{ r=(r*1103515245+12345)>>>0; return r/4294967296-0.5; };
  let maxShort=0, minLevel=1;
  for(let i=0;i<6*U.sr;i++){ const t=i/U.sr, x=0.5*(Math.sin(2*Math.PI*220*t)+0.6*Math.sin(2*Math.PI*440*t)+0.5*rnd()); U.step(x,x);
    if(i%800===0 && U.mp.beats>2){ maxShort=Math.max(maxShort,U.mp.shortFrac); minLevel=Math.min(minLevel,U.mp.level); } }
  assert.ok(maxShort>0, 'algum nó ficou em falta'); assert.ok(minLevel>0.5, 'a média continua alta');
});
