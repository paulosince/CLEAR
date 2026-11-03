// Aprendizado: reforço e enfraquecimento por sincronia, freio, consolidação, decaimento.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { universoSemCriacao, fibra, no, silencio, dispara } from './_ajuda.js';

function montagem(opts){ const U=universoSemCriacao(); const A=fibra(U,0), B=fibra(U,1), N=no(U,opts);
  return {U,A,B,N,eA:U.addEdge(A,N,5),eB:U.addEdge(B,N,5)}; }

test('reforço: quem chegou antes e ajudou o disparo ganha peso (aPlus × (1 − peso) × janela)', ()=>{
  const {U,A,B,eA}=montagem(); dispara(U,A); dispara(U,B); silencio(U,10);
  assert.ok(Math.abs(eA.mod-(0.5+0.005*0.5))<1e-6, `peso ${eA.mod}`);
  assert.equal(U.ltp,2);
});
test('enfraquecimento pendente: chegou depois do disparo e expirou sem ajudar', ()=>{
  const {U,A,B,eA,eB}=montagem({W:10, refr:20}); dispara(U,A); dispara(U,B); silencio(U,3);
  dispara(U,A);            // chega 3 amostras depois do disparo do nó
  silencio(U,40);
  assert.equal(U.ltd,1);
  const dep=U.p.aMinus*Math.exp(-3/U.tauM);
  assert.ok(Math.abs(eA.mod-eB.mod*(1-dep))<1e-6, `A ${eA.mod} · B ${eB.mod}`);
});
test('o reforço vence: a incidência atrasada que ajuda o próximo disparo não é enfraquecida', ()=>{
  const {U,A,B,eA,eB}=montagem({W:30, refr:20}); dispara(U,A); dispara(U,B); silencio(U,3);
  dispara(U,A); silencio(U,60);
  assert.equal(U.ltd,0); assert.ok(eA.mod>eB.mod);
});
test('freio: o peso se aproxima de 1 sem passar', ()=>{
  const {U,eA}=montagem(); for(let i=0;i<5000;i++) U.potentiate(eA,U.t,1);
  assert.ok(eA.mod<=1 && eA.mod>0.99, `peso ${eA.mod}`);
});
test('consolidação: reforço acumulado ≥ 0,3 na janela passa o peso basal para consolidado', ()=>{
  const {U,eA}=montagem(); let n=0;
  while(U.consol===0 && n<1000){ U.potentiate(eA,U.t,1); n++; }
  assert.equal(U.consol,1); assert.equal(eA.wF,0); assert.ok(eA.wS>0.75 && eA.wS<0.85, `consolidado ${eA.wS} após ${n}`);
});
test('aresta nova fica marcada como nova até a primeira consolidação (verde-piscina na tela), e não volta a ser nova', ()=>{
  const {U,eA}=montagem(); assert.equal(eA.consAt,-1, 'nasce nova');
  U.t=1234; while(U.consol===0) U.potentiate(eA,U.t,1);
  assert.equal(eA.consAt,1234, 'marca o momento da primeira consolidação');
  U.depress(eA,U.t,0.99); assert.equal(eA.consAt,1234, 'enfraquecer não a torna nova de novo');
});
test('janela de consolidação: fora dela, o acúmulo recomeça', ()=>{
  const {U,eA}=montagem(); const t=U.t; U.potentiate(eA,t,1);
  assert.equal(eA.tagUntil, t+U.tagLen);
  const later=t+U.tagLen+U.sr; const w=U.wAt(eA,later);
  U.potentiate(eA,later,1);
  assert.ok(Math.abs(eA.acc-U.p.aPlus*(1-w))<1e-12, 'o acúmulo é só o reforço novo');
  assert.equal(eA.tagUntil, later+U.tagLen);
});
test('decaimento em duas fases: basal meia-vida 1 h, consolidado meia-vida 14 dias', ()=>{
  const {U,eA}=montagem(); eA.wF=0.5; eA.wS=0.2; eA.lastUse=U.t; const h=3600*U.sr, d=86400*U.sr;
  assert.ok(Math.abs(U.wAt(eA,U.t+h)-(0.25+0.2*Math.pow(0.5,1/(14*24))))<1e-9);
  assert.ok(Math.abs(U.wAt(eA,U.t+14*d)-0.1)<1e-6);
});
