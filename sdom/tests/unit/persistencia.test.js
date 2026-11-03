// Guardar e retomar o robô: recarregar a página não pode apagar o cérebro.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Universe, World, DEFAULTS, Lab } from './_imports.js';
import { snapshotOf, restoreFrom } from '../../web/js/core/persist.js';

const toca=(U,W,f,seg)=>{ const s=W.sources[0]; W.play(s,f,0.3,0.6,U.t,{v:2,sex:'f',seed:5}); W.prepare(); const xs=[0,0];
  for(let i=0;i<seg*U.sr;i++){ W.sample(U.t,xs); U.step(xs[0],xs[1]); } return [U.fireCount,U.nodes.length,U.edges.length,U.ltp,U.ltd,U.consol,U.rs]; };

test('robô guardado e retomado continua exatamente como o original', ()=>{
  const L=new Lab(Object.assign({},DEFAULTS),2027,'conversa',6); while(!L.advance(1600));
  const U=L.U; U.actLog=[]; U.stimLog=[]; U.pruneLog=[]; U.wChanged.clear();
  const foto=structuredClone(snapshotOf(U));                 // o mesmo caminho do IndexedDB
  assert.ok(U.hT instanceof Float64Array && U.aud[0] instanceof Float32Array, 'o original continua com a gravação do observador');
  const R=restoreFrom(foto);
  assert.equal(R.nodes.length, U.nodes.length); assert.equal(R.t, U.t);
  assert.equal(R.edges.at(-1).from, R.nodes[R.edges.at(-1).from.id], 'arestas apontam para os nós retomados');
  const W1=new World(U.sr), W2=new World(U.sr); W1.addSource('voz',2,1,1); W2.addSource('voz',2,1,1);
  assert.deepEqual(toca(R,W2,220,1.5), toca(U,W1,220,1.5));
});

test('a fotografia não leva a gravação do observador (grande) e a fita recomeça na retomada', ()=>{
  const U=new Universe(Object.assign({},DEFAULTS),9); for(let i=0;i<4000;i++) U.step(0.1*Math.sin(i/7),0);
  const foto=snapshotOf(U), txt=JSON.stringify(foto.G.map(x=>ArrayBuffer.isView(x)?x.length:0));
  assert.ok(!foto.G.some(x=>ArrayBuffer.isView(x)&&x.length>=U.hCap), 'sem buffers do observador');
  const R=restoreFrom(structuredClone(foto)); R.jump(16000); R.histStart=R.t;
  assert.ok(R.earliestViewable()>=R.t, 'não dá para voltar a fita para antes da retomada'); assert.ok(txt.length>0);
});

test('parâmetro que não existia quando o robô foi guardado recebe o valor padrão', ()=>{
  const U=new Universe(Object.assign({},DEFAULTS),4); const foto=structuredClone(snapshotOf(U));
  const pRef=foto.G[0].$o.p.$r; delete foto.G[pRef].$o.mpRestBpm;
  const R=restoreFrom(foto); assert.equal(R.p.mpRestBpm, DEFAULTS.mpRestBpm);
});

test('formato futuro desconhecido é recusado (não estraga nada)', ()=>{
  assert.throws(()=>restoreFrom({format:999, G:[]}));
});

test('robô guardado antes da v0.17: aresta com peso consolidado conta como já consolidada', ()=>{
  const U=new Universe(Object.assign({},DEFAULTS),5); const e=U.edges.find(x=>x.from.lvl>=1) || U.edges[U.edges.length-1];
  const foto=structuredClone(snapshotOf(U)); for(const x of foto.G) if(x.$o && 'consAt' in x.$o){ delete x.$o.consAt; if(x.$o.id===0) x.$o.wS=0.4; }
  const R=restoreFrom(foto); assert.ok(R.edges.every(x=>typeof x.consAt==='number'));
  assert.ok(R.edges[0].consAt>=0, 'tinha peso consolidado'); assert.ok(R.edges.slice(1).every(x=>x.consAt===-1 || x.wS>0));
});
