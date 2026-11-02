// Regras do nó e da aresta, definidas pelo Paulo (README, "Regras do modelo").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { universoSemCriacao, fibra, no, silencio, dispara } from './_ajuda.js';

function montagem(opts){ const U=universoSemCriacao(); const A=fibra(U,0), B=fibra(U,1), N=no(U,opts);
  const eA=U.addEdge(A,N,5), eB=U.addEdge(B,N,5); return {U,A,B,N,eA,eB}; }

test('limiar: a soma das incidências que chegam juntas atinge o limiar e o nó dispara', ()=>{
  const {U,A,B,N}=montagem(); const t0=U.t; dispara(U,A); dispara(U,B); silencio(U,10);
  assert.equal(N.fires,1); assert.equal(N.lastFire,t0+5);
});
test('abaixo do limiar o nó não dispara', ()=>{
  const {U,A,N}=montagem(); dispara(U,A); silencio(U,40); assert.equal(N.fires,0);
});
test('janela de integração: cada incidência vale só pela janela do nó, contada da chegada', ()=>{
  { const {U,A,B,N}=montagem({W:10, thr:0.95}); dispara(U,A); silencio(U,12); dispara(U,B); silencio(U,40); assert.equal(N.fires,0,'12 amostras de distância > janela de 10'); }
  { const {U,A,B,N}=montagem({W:10, thr:0.95}); dispara(U,A); silencio(U,8); dispara(U,B); silencio(U,40); assert.equal(N.fires,1,'8 amostras de distância < janela de 10'); }
});
test('refratariedade: passada a refratariedade, incidências ainda na janela continuam valendo', ()=>{
  { const {U,A,B,N}=montagem({W:30, refr:20}); const t0=U.t; dispara(U,A); dispara(U,B); silencio(U,19);
    assert.equal(N.fires,1,'durante a refratariedade não dispara de novo');
    silencio(U,20); assert.equal(N.fires,2); assert.equal(N.lastFire,t0+5+20,'dispara de novo ao fim da refratariedade'); }
  { const {U,A,B,N}=montagem({W:10, refr:20}); dispara(U,A); dispara(U,B); silencio(U,60);
    assert.equal(N.fires,1,'se a janela acaba antes da refratariedade, não sobra nada'); }
});
test('a aresta modula a magnitude pelo peso', ()=>{
  const {U,A,B,N,eA,eB}=montagem(); eA.wF=eA.mod=0.3; eB.wF=eB.mod=0.3;
  dispara(U,A); dispara(U,B); silencio(U,5); U.step(0,0);
  assert.equal(N.fires,0); assert.ok(Math.abs(N.contrib[0].v-0.3)<1e-9,'magnitude 1 da fibra × peso 0,3');
});
test('aresta que força efeito inibitório: incidência negativa, somada com as que chegam no mesmo instante', ()=>{
  const U=universoSemCriacao(); const [A,B,C]=[0,1,2].map(i=>fibra(U,i)); const N=no(U);
  U.addEdge(A,N,5); U.addEdge(B,N,5); const eC=U.addEdge(C,N,5); eC.effect=2;
  dispara(U,A); dispara(U,B); dispara(U,C); silencio(U,10);
  assert.equal(N.fires,0,'0,5 + 0,5 − 0,5 fica abaixo do limiar 1');
});
test('o nó sempre entrega excitatório, com sua magnitude fixa', ()=>{
  const {U,A,B,N}=montagem({mag:0.7}); const M=no(U,{thr:5}); U.addEdge(N,M,3);
  dispara(U,A); dispara(U,B); silencio(U,9);
  assert.equal(N.fires,1); assert.ok(Math.abs(M.contrib[0].v-0.35)<1e-6,'0,7 × peso de nascimento 0,5');
});
