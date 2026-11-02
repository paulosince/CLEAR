/* =====================================================================
   Ambiente: o mundo (sala, fontes, som nos microfones) + os fluxos ligados.
   O mesmo código alimenta a página (ao vivo) e o laboratório (roteiros).
   ===================================================================== */
import { World } from './world.js';
import { STREAMS, MUSIC_KEYS } from './streams.js';
import { CYCLE } from './score.js';
import { mulberry32 } from '../core/util.js';

export const streamRng = (seed,i) => mulberry32((Math.imul(seed^0x5bd1e995, 0x9e3779b1)+i*0x632be5ab)>>>0);

export class Ambiente{
  // sources: lista [nome, timbre, x, y] na ordem em que entram no mundo (a ordem da soma importa para repetir resultados)
  constructor(sr, sources){
    this.W=new World(sr); this.src={}; this.on=new Map(); this.musicT0=null; this.lead=0.1;
    for(const [k,inst,x,y] of sources) this.addSource(k,inst,x,y);
    this.W.prepare();
  }
  // embrulha um mundo que já existe (ex.: o que veio do laboratório); os fluxos começam desligados
  static fromWorld(W){ const a=Object.create(Ambiente.prototype); a.W=W; a.src={}; a.on=new Map(); a.musicT0=null; a.lead=0.1;
    for(const s of W.sources) if(s.label) a.src[s.label]=s; return a; }
  static allSources(){ const seen=new Set(), out=[];
    for(const k in STREAMS) for(const s of STREAMS[k].sources) if(!seen.has(s[0])){ seen.add(s[0]); out.push(s); }
    return out; }
  addSource(k,inst,x,y){ if(!this.src[k]) this.src[k]=this.W.addSource(inst,x,y,k); return this.src[k]; }
  isOn(key){ return this.on.has(key); }
  // liga um fluxo no tempo tS (s de mundo). Instrumentos entram no próximo ciclo da música, juntos.
  start(key,tS,seed,opts={}){
    const def=STREAMS[key]; if(!def) throw new Error('fluxo desconhecido: '+key);
    for(const s of def.sources) this.addSource(...s);
    const R=opts.R || mulberry32(seed>>>0);
    let base=tS, ctx={};
    if(def.music){
      if(this.musicT0===null || !MUSIC_KEYS.some(k=>this.on.has(k))) this.musicT0 = opts.musicT0 ?? (tS+0.2);
      base=this.musicT0; ctx.c0 = opts.c0 ?? Math.max(0, Math.ceil((tS+0.15-base)/CYCLE));
    }
    const gen=def.gen(R,ctx);
    this.on.set(key,{gen, base, head:gen.next(), order:opts.order ?? this.on.size});
    this.W.prepare();
  }
  // desliga: as notas futuras desse fluxo são retiradas; o que já soa termina naturalmente
  stop(key,tSample){ const st=this.on.get(key); if(!st) return; this.on.delete(key);
    for(const s of STREAMS[key].sources){ const src=this.src[s[0]]; if(src) src.notes=src.notes.filter(n=>n.start<=tSample); } }
  // põe no mundo os eventos que começam até `until` (amostra); onNote(nota, fonte, evento, início) para registrar/tocar
  pump(until,onNote){
    const sr=this.W.sr;
    while(true){
      let best=null;
      for(const st of this.on.values()) if(!st.head.done){ const t=st.base+st.head.value.t;
        if(Math.round(t*sr)<=until && (!best || t<best.t || (t===best.t && st.order<best.st.order))) best={st,t}; }
      if(!best) return;
      const x=best.st.head.value, src=this.src[x.s], start=Math.round(best.t*sr);
      const nt=this.W.play(src,x.f,x.dur,x.amp,start,x.opt);
      if(onNote) onNote(nt,src,x,start);
      best.st.head=best.st.gen.next();
    }
  }
}
