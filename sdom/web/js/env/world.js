import { INST, makeNote, noteValue } from './sounds.js';

export class World{
  constructor(sr){
    this.sr=sr; this.c=343; this.robot={x:2,y:2.4}; this.earSep=0.2;
    this.sources=[]; this.nextId=1;
  }
  ears(){ const r=this.robot; return [{x:r.x-this.earSep/2,y:r.y},{x:r.x+this.earSep/2,y:r.y}]; }
  addSource(inst,x,y,label){ const s={id:this.nextId++,inst,x,y,notes:[],label:label||null}; this.sources.push(s); return s; }
  play(src,f,dur,amp,start,opt){ const nt=makeNote(src.inst,f,dur,amp,this.sr,opt); nt.start=start; src.notes.push(nt); return nt; }
  prepare(){ // geometria do quadro atual
    const E=this.ears();
    for(const s of this.sources){
      s.g=[0,0]; s.dl=[0,0];
      for(let e=0;e<2;e++){ const r=Math.hypot(s.x-E[e].x,s.y-E[e].y); s.dl[e]=r/this.c; s.g[e]=0.5/Math.max(r,0.25); }
    }
  }
  sample(t,out){
    const sr=this.sr; let L=0,R=0;
    for(let i=0;i<this.sources.length;i++){
      const s=this.sources[i];
      for(let j=0;j<s.notes.length;j++){
        const nt=s.notes[j]; const base=(t-nt.start)/sr;
        if(base<0) continue;
        L+=s.g[0]*noteValue(nt,base-s.dl[0],sr);
        R+=s.g[1]*noteValue(nt,base-s.dl[1],sr);
      }
    }
    out[0]=L; out[1]=R;
  }
  gc(t){ for(const s of this.sources){ s.notes=s.notes.filter(n=>(t-n.start)/this.sr < n.dur+INST[n.inst].tail+0.05); } }
  activeAt(s,t){ return s.notes.some(n=>{const a=(t-n.start)/this.sr; return a>=0 && a<n.dur+(INST[n.inst].perc?Math.min(0.3,INST[n.inst].tail):0.05);}); }
}
