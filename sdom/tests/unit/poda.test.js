// Poda: aresta inerte por 7 dias sai; nó só sai quando fica órfão; acesso salva a candidata.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { universoSemCriacao, fibra, no, dispara } from './_ajuda.js';
const DIA=86400;

test('aresta inerte vira candidata e é podada após 7 dias; o nó que fica órfão também sai', ()=>{
  const U=universoSemCriacao(); const N=no(U); const e=U.addEdge(fibra(U,0),N,5);
  e.wF=e.mod=0.005; e.lastUse=U.t; const t0=U.t;
  U.jump(3*DIA*U.sr); assert.equal(U.candidates,1); assert.equal(e.diedAt,Infinity);
  U.jump(5*DIA*U.sr); assert.equal(e.diedAt, t0+7*DIA*U.sr); assert.equal(N.diedAt, t0+7*DIA*U.sr);
  assert.equal(U.prunedE,1); assert.equal(U.prunedN,1);
});
test('nó com outra aresta viva não é podado', ()=>{
  const U=universoSemCriacao(); const N=no(U); const e=U.addEdge(fibra(U,0),N,5); const f=U.addEdge(fibra(U,1),N,5);
  e.wF=e.mod=0.005; e.lastUse=U.t; f.wS=0.9; f.wF=0; f.mod=0.9; f.lastUse=U.t;
  U.jump(8*DIA*U.sr); assert.notEqual(e.diedAt,Infinity); assert.equal(N.diedAt,Infinity);
});
test('acesso: a origem dispara pela candidata → reforço basal, fim da contagem e janela maior', ()=>{
  const U=universoSemCriacao(); const N=no(U); const A=fibra(U,0); const e=U.addEdge(A,N,5);
  e.wF=e.mod=0.005; e.lastUse=U.t; U.jump(3*DIA*U.sr); assert.notEqual(e.inertSince,null);
  dispara(U,A);
  assert.equal(U.accesses,1); assert.equal(e.inertSince,null); assert.ok(e.mod>=0.1 && e.mod<0.106, `peso ${e.mod}`);
  assert.equal(e.winExtra, U.accessWin);
});
