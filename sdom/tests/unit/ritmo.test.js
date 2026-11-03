// Fibras do ritmo do coração (v0.21): recrutamento por limiares escalonados e adaptação. Nenhuma diz "acelerou".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Universe, DEFAULTS } from './_ajuda.js';

const montar=()=>{ const U=new Universe(Object.assign({},DEFAULTS,{mpOn:1}),3); U.p.maxNodes=0; return U; };
const fibras=U=>U.endoFibers.filter(f=>f.endo.kind==='ritmo');
// bate N vezes no ritmo bpm (força o ritmo, sem reflexo), devolve quantas vezes cada fibra disparou
function bater(U,bpm,N){ const F=fibras(U), f0=F.map(f=>f.fires); const dt=Math.round(60/bpm*U.sr);
  for(let i=0;i<N;i++){ U.t+=dt; U.mp.f=bpm/60; U.mpBeat(U.t); } return F.map((f,i)=>f.fires-f0[i]); }

test('há 4 fibras do ritmo com limiares 70, 100, 130, 160', ()=>{
  const U=montar(); assert.deepEqual(fibras(U).map(f=>f.endo.thr),[70,100,130,160]);
});
test('recrutamento: ritmo mais alto põe mais fibras para disparar', ()=>{
  const U=montar(); assert.deepEqual(bater(U,60,1),[0,0,0,0]);
  const U2=montar(); assert.deepEqual(bater(U2,110,1),[1,1,0,0]);
  const U3=montar(); assert.deepEqual(bater(U3,170,1),[1,1,1,1]);
});
test('adaptação: no começo dispara em toda batida; com o ritmo constante, passa a pular batidas', ()=>{
  const U=montar(); const ini=bater(U,150,3)[0]; const depois=bater(U,150,60)[0];
  assert.ok(ini>=2,'dispara nas primeiras batidas seguidas: '+ini); assert.ok(depois<45,'depois cansa: '+depois+' de 60');
  assert.ok(depois>5,'mas não para de vez');
});
test('em repouso a reserva se recupera: ao acelerar de novo, volta a disparar em sequência', ()=>{
  const U=montar(); bater(U,150,60); bater(U,60,60); assert.ok(fibras(U)[0].endo.q>0.95,'reserva recuperada'); assert.ok(bater(U,150,3)[0]>=2,'volta a disparar em sequência');
});
