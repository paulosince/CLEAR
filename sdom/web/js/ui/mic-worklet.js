// Processador de áudio: copia as amostras do microfone e manda para a página em blocos.
class SdomMic extends AudioWorkletProcessor{
  constructor(){ super(); this.bufL=new Float32Array(1024); this.bufR=new Float32Array(1024); this.n=0; this.stereo=false; }
  process(inputs){
    const inp=inputs[0]; if(!inp || !inp.length) return true;
    const L=inp[0], R=inp[1]||inp[0]; if(inp[1]) this.stereo=true;
    for(let i=0;i<L.length;i++){ this.bufL[this.n]=L[i]; this.bufR[this.n]=R[i]; this.n++;
      if(this.n===1024){ this.port.postMessage({L:this.bufL.slice(), R:this.bufR.slice(), stereo:this.stereo}); this.n=0; } }
    return true;
  }
}
registerProcessor('sdom-mic', SdomMic);
