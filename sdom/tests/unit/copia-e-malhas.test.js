// Cópia do universo entre processos (laboratório → página) e marcação de malhas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Universe, World, flatten, unflatten, DEFAULTS, Lab, mulberry32, logStimulus } from './_imports.js';

test('universo copiado continua idêntico ao original', ()=>{
  const L=new Lab(Object.assign({},DEFAULTS),2026,'casa',8); while(!L.advance(1600));
  const G=unflatten(structuredClone(flatten({U:L.U,W:L.W}))); Object.setPrototypeOf(G.U,Universe.prototype); Object.setPrototypeOf(G.W,World.prototype);
  L.U.rng=mulberry32(1); G.U.rng=mulberry32(1);
  const ei=G.U.edges.length-1; assert.equal(G.U.edges[ei].from, G.U.nodes[G.U.edges[ei].from.id]); assert.ok(G.U.mp && G.U.sdomList.length===L.U.sdomList.length, 'estado do marcapasso copiado');
  const go=(U,W)=>{ const s=W.sources[0]; W.play(s,120,0.2,0.5,U.t,{v:2,sex:'m',seed:3}); W.prepare(); const xs=[0,0]; for(let i=0;i<2*U.sr;i++){ W.sample(U.t,xs); U.step(xs[0],xs[1]); } return [U.fireCount,U.nodes.length,U.ltp,U.ltd]; };
  assert.deepEqual(go(G.U,G.W), go(L.U,L.W));
});
test('malha: cada nó novo é marcado com o estímulo de que nasceu', ()=>{
  const U=new Universe(Object.assign({},DEFAULTS,{mpOn:0}),3), W=new World(U.sr); const P=W.addSource('piano',1,1.1,'piano'); const xs=[0,0];
  const toca=f=>{ const x={f,dur:0.5,amp:0.7,opt:{}}; const nt=W.play(P,f,0.5,0.7,U.t); logStimulus(U,nt,P,x,U.t); W.prepare(); for(let i=0;i<1.2*U.sr;i++){ W.sample(U.t,xs); U.step(xs[0],xs[1]); } };
  toca(262); const n1=U.nodes.filter(n=>n.lvl>=2);
  assert.ok(n1.length>0); assert.ok(n1.every(n=>n.malha===0), 'todos do 1º estímulo');
  toca(392); const n2=U.nodes.filter(n=>n.lvl>=2).slice(n1.length);
  assert.ok(n2.length>0 && n2.every(n=>n.malha===1), 'nós novos do 2º estímulo');
  assert.equal(U.malhaCount(),2);
});
