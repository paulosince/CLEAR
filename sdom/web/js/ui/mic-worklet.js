// Processador de áudio: copia as amostras do microfone e manda para a página em blocos.
class SdomMic extends AudioWorkletProcessor{
  constructor(){ super(); this.bufL=new Float32Array(1024); this.bufR=new Float32Array(1024); this.n=0; this.eL=0; this.eR=0; }
  process(inputs){
    const inp=inputs[0]; if(!inp || !inp.length) return true;
    const L=inp[0], R=inp[1]||inp[0];
    for(let i=0;i<L.length;i++){ const l=L[i], r=R[i]; this.bufL[this.n]=l; this.bufR[this.n]=r; this.eL+=l*l; this.eR+=r*r; this.n++;
      if(this.n===1024){ this.port.postMessage({L:this.bufL.slice(), R:this.bufR.slice(), eL:this.eL, eR:this.eR}); this.n=0; this.eL=0; this.eR=0; } }
    return true;
  }
}
registerProcessor('sdom-mic', SdomMic);
