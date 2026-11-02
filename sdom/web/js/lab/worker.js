/* Web Worker do laboratório (módulo). Grava no IndexedDB durante a corrida e, no fim,
   entrega o universo à página como lista plana (o postMessage estoura a pilha em cadeias longas). */
import { Lab } from './lab.js';
import { Store } from '../store.js';
import { flattenGraph } from '../core/graph-copy.js';

let L=null, stopReq=false, sent=0, lastFlush=0, info=null;
self.onmessage=async e=>{ const m=e.data;
  if(m.cmd==='start'){
    try{ await Store.open(); L=new Lab(m.params,m.seed,m.scen,m.durS); }catch(err){ postMessage({type:'error',msg:String(err&&err.stack||err)}); return; }
    info={scen:m.scen, durS:m.durS, seed:m.seed};
    Store.begin(L.U, m.label); Store.meta.lab=Object.assign({running:true},info);
    stopReq=false; sent=0; lastFlush=performance.now(); setTimeout(tick,0); }
  else if(m.cmd==='stop') stopReq=true; };
async function tick(){
  const w=performance.now(); let done=false;
  try{ while(!done && performance.now()-w<250) done=L.advance(Math.round(0.05*L.U.sr)); }
  catch(err){ postMessage({type:'error',msg:String(err&&err.stack||err)}); return; }
  const c=L.census(), U=L.U, wallS=(performance.now()-L.w0)/1000;
  postMessage({type:'prog', t:U.t/U.sr, durS:L.durS, wallS, sdom:c.sdom, edges:c.edges, malhas:c.malhas, fires:c.fires, add:L.series.slice(sent)}); sent=L.series.length;
  if(performance.now()-lastFlush>2000){ lastFlush=performance.now(); Store.meta.lab=Object.assign({running:true, series:L.series},info); Store.flush(U); }
  if(done||stopReq){
    Store.meta.lab=Object.assign({worldS:+(U.t/U.sr).toFixed(2), wallS:+wallS.toFixed(1), stopped:!done, series:L.series},info);
    await Store.flush(U);
    U.rng=null;   // função não atravessa; a página recria
    const tr=[U.hT.buffer,U.hN.buffer,U.nmT.buffer,U.nmN.buffer,U.nmF.buffer,U.aud[0].buffer,U.aud[1].buffer];
    // o gerador dos fluxos não atravessa: entrega o mundo e quais fluxos estavam ligados
    postMessage({type:'done', G:flattenGraph({U, W:L.W}), on:[...L.amb.on.keys()], musicT0:L.amb.musicT0, series:L.series, scen:L.scen, durS:L.durS, seed:L.seed, stopped:!done, wallS, store:{uid:Store.uid, nodePtr:Store.nodePtr, meta:Store.meta}}, tr);
    L=null;
  } else setTimeout(tick,0);
}
