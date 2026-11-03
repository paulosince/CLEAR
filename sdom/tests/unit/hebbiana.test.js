// Regra hebbiana (v0.19): disparar junto, de novo e de novo, liga dois nós que já existem.
// rastro → aresta em formação → fecha após 3 dias de recorrência, ou recolhe.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Universe, DEFAULTS, Lab } from './_imports.js';

const montar=()=>{ const U=new Universe(Object.assign({},DEFAULTS,{mpOn:0}),3);
  const mk=()=>U.addNode({lvl:2, depth:2, W:20, thr:1, mag:0.5, refr:20, born:0, x:400, y:400});
  return {U, A:mk(), B:mk()}; };
const H=3600, D=86400;

test('um disparo junto isolado deixa só rastro; repetido, nasce a aresta em formação (fraca)', ()=>{
  const {U,A,B}=montar(), sr=U.sr; let t=1000;
  U.hebbConta(A,B,t,40); assert.equal(A.out.length,0,'uma vez não basta');
  for(let i=0;i<=U.p.hebbLimiar;i++){ t+=sr; U.hebbConta(A,B,t,40); }
  const e=A.out.find(x=>x.to===B); assert.ok(e,'nasceu a aresta A → B');
  assert.equal(e.hebb.estado,0); assert.equal(e.wF,U.p.hebbPeso); assert.ok(!B.out.some(x=>x.to===A),'direção: de quem disparou antes');
});

test('com recorrência ao longo dos dias, fecha no prazo (3 dias) e vira aresta comum', ()=>{
  const {U,A,B}=montar(), sr=U.sr; let t=1000;
  for(let i=0;i<=U.p.hebbLimiar;i++){ t+=sr; U.hebbConta(A,B,t,40); }
  const e=A.out.find(x=>x.to===B), nasc=e.hebb.nasceu;
  while(t-nasc < 2.9*D*sr){ t+=2*H*sr; U.hebbConta(A,B,t,40); U.hebbVerifica(t); }
  assert.equal(e.hebb.estado,0,'antes de 3 dias ainda está em formação');
  t=nasc+3*D*sr+1; U.hebbConta(A,B,t,40); U.hebbVerifica(t);
  assert.equal(e.hebb.estado,1,'fechou'); assert.equal(U.hebbStats.fechadas,1); assert.equal(e.diedAt,Infinity);
});

test('sem recorrência, a aresta em formação recolhe (some) antes do prazo', ()=>{
  const {U,A,B}=montar(), sr=U.sr; let t=1000;
  for(let i=0;i<=U.p.hebbLimiar;i++){ t+=sr; U.hebbConta(A,B,t,40); }
  const e=A.out.find(x=>x.to===B);
  for(let h=1;h<=72;h++) U.hebbVerifica(t+h*H*sr);
  assert.equal(e.hebb.estado,2,'recolheu'); assert.ok(!A.out.includes(e) && !B.in.includes(e)); assert.equal(U.hebbStats.recolhidas,1);
});

test('praticamente ao mesmo tempo: as duas direções; e o rastro some com o tempo', ()=>{
  const {U,A,B}=montar(), sr=U.sr, S=U.hS;
  let t=5000; for(let i=0;i<=U.p.hebbLimiar;i++){ t+=sr; U.hebbFire(A,t); U.hebbFire(B,t+Math.max(1,S-1)); }
  assert.ok(A.out.some(x=>x.to===B) && B.out.some(x=>x.to===A),'ligação recíproca');
  const {U:U2,A:A2,B:B2}=montar(); let t2=0;
  for(let i=0;i<U2.p.hebbLimiar-1;i++){ t2+=6*H*sr; U2.hebbConta(A2,B2,t2,40); }   // espaçado demais: o rastro some antes de acumular
  assert.equal(A2.out.length,0);
});

test('num robô ouvindo conversa, nascem arestas em formação entre nós que já existiam (inclusive recíprocas)', ()=>{
  const L=new Lab(Object.assign({},DEFAULTS),2026,'conversa',12); while(!L.advance(1600));
  const f=L.U.edges.filter(e=>e.hebb && e.diedAt===Infinity);
  assert.ok(f.length>0, 'há arestas em formação'); assert.ok(f.some(e=>e.from.lvl>=2), 'entre nós do Sdom');
  for(const n of L.U.nodes) assert.ok((n.hebbFormando||0)<=L.U.p.hebbMaxFormando, 'equilíbrio por nó');
});
