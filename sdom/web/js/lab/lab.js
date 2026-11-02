/* Laboratório: roda um roteiro sem desenhar, o mais rápido possível (dentro do Web Worker). */
import { Universe } from '../core/universe.js';
import { Ambiente } from '../env/environment.js';
import { SCEN, scenarioSources, startScenario } from '../env/scenarios.js';
import { INST } from '../env/sounds.js';

// registra uma nota tocada como estímulo do universo (gravação + malhas)
export function logStimulus(U,nt,s,x,start){
  U.addStimulus({t:start, src:s.id, inst:s.inst, f:+x.f.toFixed(2), dur:+x.dur.toFixed(3), amp:+x.amp.toFixed(3), x:s.x, y:s.y, opt:x.opt},
    start+Math.round((x.dur+INST[s.inst].tail+0.02)*U.sr));
}

export class Lab{
  constructor(p, seed, scenKey, durS){
    if(!SCEN[scenKey]) throw new Error('roteiro desconhecido: '+scenKey);
    this.U=new Universe(p,seed);
    this.amb=new Ambiente(p.sr, scenarioSources(scenKey)); startScenario(this.amb,scenKey,seed);
    this.W=this.amb.W;
    this.end=Math.round(durS*p.sr); this.scen=scenKey; this.durS=durS; this.seed=seed;
    this.series=[]; this.nextSer=0; this.lastFires=0; this.w0=performance.now();
  }
  advance(samples){
    const U=this.U, W=this.W, sr=U.sr, xs=[0,0];
    const until=Math.min(this.end, U.t+samples), lead=Math.round(0.1*sr), blk=Math.round(0.05*sr);
    while(U.t<until){
      this.amb.pump(Math.min(U.t+lead, this.end-1),(nt,s,x,start)=>logStimulus(U,nt,s,x,start));   // só o que começa antes do fim
      const stop=Math.min(until, U.t+blk);
      while(U.t<stop){ W.sample(U.t,xs); U.step(xs[0],xs[1]); }
      W.gc(U.t); this.record();
    }
    return U.t>=this.end;
  }
  census(){ const U=this.U; let sd=0; for(const n of U.nodes) if(n.lvl>=2 && n.diedAt===Infinity) sd++;
    return {sdom:sd, edges:U.edges.length-U.prunedE, fires:U.fireCount, malhas:U.malhaCount()}; }
  record(){ // um ponto por segundo de mundo
    const U=this.U, wallS=(performance.now()-this.w0)/1000;
    while(U.t>=this.nextSer){ const c=this.census(); const ts=Math.round(this.nextSer/U.sr);
      this.series.push({t:ts, sdom:c.sdom, edges:c.edges, malhas:c.malhas, firesPerS:c.fires-this.lastFires, wallS:+wallS.toFixed(2)}); this.lastFires=c.fires; this.nextSer+=U.sr; } }
}
