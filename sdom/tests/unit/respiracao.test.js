// Respiração (v0.20): repõe o estoque e tira o resíduo; o coração distribui o que há no estoque;
// reflexo fixo: resíduo acima da referência acelera a respiração.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Universe, DEFAULTS } from './_imports.js';

test('em repouso respira no ritmo de repouso, com o estoque cheio', ()=>{
  const U=new Universe(Object.assign({},DEFAULTS),2); for(let i=0;i<20*U.sr;i++) U.step(0,0);
  assert.ok(Math.abs(U.resp.f*60-U.p.respRestPm)<0.5, `ritmo ${(U.resp.f*60).toFixed(1)}`);
  assert.ok(U.resp.estoque>=0.99*U.p.respEstoqueMax, `estoque ${U.resp.estoque}`);
  assert.ok(Math.abs(U.resp.respiracoes - 20*U.p.respRestPm/60)<=1, `respirações ${U.resp.respiracoes}`);
});
test('resíduo alto acelera a respiração (até o teto) e ela volta ao repouso quando o resíduo sai', ()=>{
  const U=new Universe(Object.assign({},DEFAULTS),2), R=U.resp, P=U.p;
  for(let i=0;i<6*U.sr;i++){ R.residuo=3*P.respResiduoRef; U.respStep(i); }
  assert.ok(R.f*60>P.respRestPm*2.5 && R.f*60<=P.respMaxPm+0.01, `ritmo ${(R.f*60).toFixed(1)}`);
  for(let i=6*U.sr;i<60*U.sr;i++) U.respStep(i);
  assert.ok(Math.abs(R.f*60-P.respRestPm)<0.5, `voltou a ${(R.f*60).toFixed(1)}`);
});
test('o coração só entrega o que há no estoque; o que entrega vira resíduo', ()=>{
  const U=new Universe(Object.assign({},DEFAULTS),2), R=U.resp;
  const n=U.addNode({lvl:2, depth:2, W:20, thr:1, mag:0.5, refr:20, born:0, x:400, y:400}); n.cap=U.p.mpCap0; n.res=0; n.spent=0; n.falta=0; U.sdomList.push(n);
  R.estoque=50; R.residuo=0; U.mpBeat(U.t);
  assert.ok(n.res<=50+1e-9, `recebeu ${n.res}`); assert.ok(R.estoque>=-1e-9 && R.estoque<1e-6, 'estoque esgotado');
  assert.ok(Math.abs(R.residuo-50)<1e-6, 'o gasto entregue virou resíduo');
});
