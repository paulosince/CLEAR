// Cenários de referência usados no teste de regressão (e para regravar a referência).
// Rodam com o marcapasso de recursos DESLIGADO (mpOn:0): guardam as regras da v0.10.
import { Universe } from '../web/js/core/universe.js';
import { World } from '../web/js/env/world.js';
import { DEFAULTS } from '../web/js/core/params.js';
import { Lab } from '../web/js/lab/lab.js';

export function impressao(U){ let ws=0, wsS=0; for(const e of U.edges){ ws+=e.wF; wsS+=e.wS; }
  let th=0; for(const n of U.nodes) th+=n.thr*(n.id%7+1);
  return {t:U.t, nodes:U.nodes.length, edges:U.edges.length, fires:U.fireCount, ltp:U.ltp, ltd:U.ltd, consol:U.consol, wF:+ws.toFixed(6), wS:+wsS.toFixed(6), thr:+th.toFixed(6)}; }
export const cenarios={
  g1(){ const U=new Universe(Object.assign({},DEFAULTS,{mpOn:0,hebbOn:0}),777), W=new World(U.sr);
    const P=W.addSource('piano',1.0,1.1), V=W.addSource('viola',3.0,1.1), xs=[0,0];
    const run=s=>{ const n=Math.round(s*U.sr); W.prepare(); for(let i=0;i<n;i++){ W.sample(U.t,xs); U.step(xs[0],xs[1]); } W.gc(U.t); };
    for(let i=0;i<6;i++){ W.play(P,261.63,0.6,0.7,U.t); run(1.2); }
    for(let i=0;i<6;i++){ W.play(V,261.63,0.6,0.7,U.t); run(1.2); }
    const a=impressao(U); U.jump(8*86400*U.sr); W.gc(U.t); const b=impressao(U); W.play(P,261.63,0.6,0.7,U.t); run(1.2);
    return [a,b,impressao(U),{prunedE:U.prunedE, prunedN:U.prunedN, accesses:U.accesses}]; },
  g2(){ const L=new Lab(Object.assign({},DEFAULTS,{mpOn:0,hebbOn:0}),2026,'casa',15); while(!L.advance(800));
    return {fp:impressao(L.U), series:L.series.map(x=>[x.t,x.sdom,x.edges,x.firesPerS]), stim:L.U.stimLog.length}; },
  g3(){ const U=new Universe(Object.assign({},DEFAULTS,{sr:8000,mpOn:0,hebbOn:0}),5), W=new World(8000); const P=W.addSource('piano',1,1.1), xs=[0,0];
    for(let i=0;i<3;i++){ W.play(P,329.63,0.5,0.7,U.t); W.prepare(); for(let k=0;k<8000;k++){ W.sample(U.t,xs); U.step(xs[0],xs[1]); } }
    return impressao(U); },
};
