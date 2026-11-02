// Ambiente: fluxos repetíveis, música coerente, sons dentro da faixa.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Ambiente } from '../../web/js/env/environment.js';
import { SCEN, scenarioSources, startScenario } from '../../web/js/env/scenarios.js';
import { PHRASES, CHORDS, BEAT, CYCLE } from '../../web/js/env/score.js';
import { INST, makeNote, noteValue } from '../../web/js/env/sounds.js';

function eventos(key,seed,T){ const a=new Ambiente(16000,scenarioSources(key)); startScenario(a,key,seed); const out=[];
  a.pump(Math.round(T*16000),(nt,s,x,start)=>out.push([start,s.label,+x.f.toFixed(3),+x.dur.toFixed(4)])); return out; }

test('mesma semente → mesmos eventos; o começo de um roteiro longo é igual ao curto', ()=>{
  for(const k in SCEN){ const a=eventos(k,7,30), b=eventos(k,7,60).filter(e=>e[0]<=30*16000);
    assert.ok(a.length>0, k); assert.deepEqual(a,b,k); assert.deepEqual(a,eventos(k,7,30),k); }
});
test('Cânone: toda nota de violino no tempo forte pertence ao acorde do baixo', ()=>{
  for(const ph of PHRASES){ let t=0; assert.ok(Math.abs(ph.reduce((s,[,d])=>s+d,0)-8)<1e-9,'cada padrão dura um ciclo (8 semínimas)');
    for(const [m,d] of ph){ const beat=t; if(Math.abs(beat-Math.round(beat))<1e-9){ const pcs=CHORDS[Math.round(beat)].map(x=>x%12); assert.ok(pcs.includes(m%12), `nota ${m} no tempo ${beat}`); } t+=d; } }
  assert.ok(Math.abs(CYCLE-8*BEAT)<1e-12);
});
test('instrumentos ligados ao vivo entram juntos, no mesmo ciclo da música', ()=>{
  const a=new Ambiente(16000,Ambiente.allSources()); a.start('violoncelo',3.0,1); a.start('violino1',5.1,2);
  const first={}; a.pump(Math.round(40*16000),(nt,s,x,start)=>{ if(!(s.label in first)) first[s.label]=start/16000; });
  const r=k=>((first[k]-a.musicT0)/CYCLE); assert.ok(Math.abs(r('violoncelo')-Math.round(r('violoncelo')))<1e-4); assert.ok(Math.abs(r('violino1')-Math.round(r('violino1')))<1e-4);
});
test('desligar um fluxo tira as notas futuras dele', ()=>{
  const a=new Ambiente(16000,Ambiente.allSources()); a.start('chuva',0,3); a.pump(16000*2); const before=a.src.chuva.notes.length;
  a.stop('chuva',16000); assert.ok(a.src.chuva.notes.length<before); assert.ok(a.src.chuva.notes.every(n=>n.start<=16000)); assert.equal(a.isOn('chuva'),false);
});
test('nenhum som passa muito de 1 (amplitude 1)', ()=>{
  const cases=[['piano',262],['viola',262],['violino',660],['violoncelo',110],['cravo',294],['voz',120,{v:2}],['voz',300,{sex:'c',v:0}],
    ['passo',0,{seed:5}],['porta',0,{seed:7}],['campainha',659],['gota',0,{seed:3}],['passaro',3000,{glide:2,trill:30,depth:0.05}],['onda',0,{seed:4,rise:2}],['carro',35,{seed:9,glide:-0.02}]];
  for(const [i,f,o] of cases){ const d=i==='onda'?6:i==='carro'?5:0.3; const nt=makeNote(i,f,d,1,16000,o||{}); let mx=0;
    for(let k=0;k<(d+INST[i].tail)*16000;k+=3) mx=Math.max(mx,Math.abs(noteValue(nt,k/16000,16000)));
    assert.ok(mx>0.05 && mx<1.6, `${i}: pico ${mx.toFixed(3)}`); }
});
test('a 8 kHz o microfone não alcança pássaros acima de 3,6 kHz (fica em silêncio)', ()=>{
  assert.equal(makeNote('passaro',4000,0.1,1,8000,{}).parts.length,0);
});
