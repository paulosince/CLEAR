/* Fila de amostras do microfone (sem navegador: dá para testar no Node).
   O mundo não espera: se o Sdom não der conta, o que atrasar além do limite é descartado e contado. */
export class MicQueue{
  constructor(cap){ this.cap=cap; this.L=new Float32Array(cap); this.R=new Float32Array(cap); this.head=0; this.size=0; this.lost=0; }
  push(L,R){ R=R||L; const n=L.length;
    for(let i=0;i<n;i++){ if(this.size===this.cap){ this.head=(this.head+1)%this.cap; this.size--; this.lost++; }
      const k=(this.head+this.size)%this.cap; this.L[k]=L[i]; this.R[k]=R[i]; this.size++; } }
  available(){ return this.size; }
  // tira uma amostra (devolve false se vazia)
  take(out){ if(!this.size) return false; out[0]=this.L[this.head]; out[1]=this.R[this.head]; this.head=(this.head+1)%this.cap; this.size--; return true; }
  // descarta o atraso além de `max` amostras; devolve quantas foram descartadas
  dropTo(max){ if(this.size<=max) return 0; const d=this.size-max; this.head=(this.head+d)%this.cap; this.size=max; this.lost+=d; return d; }
}
// Conversão de taxa (linear, contínua entre pedaços): do microfone para a taxa do robô.
export class Resampler{
  constructor(fromHz,toHz){ this.step=fromHz/toHz; this.pos=0; this.prevL=0; this.prevR=0; }
  process(L,R){ R=R||L; const outL=[], outR=[]; const n=L.length;
    // posição relativa ao pedaço atual; -1 = última amostra do pedaço anterior
    while(this.pos<n-1){ const i=Math.floor(this.pos), f=this.pos-i;
      const l0= i<0?this.prevL:L[i], r0= i<0?this.prevR:R[i], l1=L[i+1], r1=R[i+1];
      outL.push(l0+(l1-l0)*f); outR.push(r0+(r1-r0)*f); this.pos+=this.step; }
    this.pos-=n; this.prevL=L[n-1]; this.prevR=R[n-1];
    return [Float32Array.from(outL), Float32Array.from(outR)]; }
}
