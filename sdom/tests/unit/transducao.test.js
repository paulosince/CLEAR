// Transdução auditiva: cóclea (41 canais, 1 por ERB), 3 fibras por canal, adaptação.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Universe, DEFAULTS } from './_ajuda.js';
import { World } from '../../web/js/env/world.js';

test('41 canais de ~26 Hz a ~18,6 kHz; acima de 0,45 × taxa ficam inativos', ()=>{
  const U=new Universe(Object.assign({},DEFAULTS),1);
  assert.equal(U.coch.length,41);
  assert.ok(Math.abs(U.coch[0].fc-26)<1.5, `primeiro ${U.coch[0].fc}`);
  assert.ok(Math.abs(U.coch[40].fc-18600)<300, `último ${U.coch[40].fc}`);
  assert.equal(U.coch.filter(c=>c.active).length, U.coch.filter(c=>c.fc<0.45*16000).length);
  assert.equal(U.fibers[0].length,123); assert.equal(U.fibers[1].length,123);
  const [a,b,c]=U.fibers[0].slice(0,3).map(f=>f.thr); assert.ok(Math.abs(b/a-Math.pow(10,0.5))<1e-9); assert.ok(Math.abs(c/a-Math.pow(10,1.5))<1e-9);
});
function tocaTom(f){
  const U=new Universe(Object.assign({},DEFAULTS),1), W=new World(U.sr); const s=W.addSource('tom',2,1.4);
  W.play(s,f,0.4,0.5,0); W.prepare(); const xs=[0,0], perK=new Array(41).fill(0), onset=new Array(41).fill(0), late=new Array(41).fill(0);
  const before=U.fibers[0].map(n=>n.fires);
  for(let i=0;i<0.3*U.sr;i++){ W.sample(U.t,xs); U.step(xs[0],xs[1]);
    if(i===Math.round(0.02*U.sr)) U.fibers[0].forEach((n,j)=>onset[n.fiber.k]+=n.fires-before[j]);
    if(i===Math.round(0.1*U.sr)) U.fibers[0].forEach((n,j)=>late[n.fiber.k]-=n.fires);
  }
  U.fibers[0].forEach((n,j)=>{ perK[n.fiber.k]+=n.fires-before[j]; late[n.fiber.k]+=n.fires; });
  return {U,perK,onset,late};
}
test('um tom de 1 kHz excita mais o canal com centro perto de 1 kHz', ()=>{
  const {U,perK}=tocaTom(1000); const k=perK.indexOf(Math.max(...perK));
  assert.ok(Math.abs(U.coch[k].fc-1000) <= U.coch[k].erb*1.5, `canal ${k}: ${U.coch[k].fc} Hz`);
});
test('adaptação: a taxa no início do som é maior que a sustentada', ()=>{
  const {perK,onset,late}=tocaTom(1000); const k=perK.indexOf(Math.max(...perK));
  const rOn=onset[k]/0.02, rLate=late[k]/0.2; assert.ok(rOn>1.5*rLate, `início ${rOn.toFixed(0)}/s, sustentado ${rLate.toFixed(0)}/s`);
});
