/* Som para você ouvir o que as fontes tocam (não é o que o robô "ouve": isso vai pelos microfones). */
import { INST, noteValue } from '../env/sounds.js';
import { $ } from './state.js';
let ctx=null;
export function ensureAudio(){ if(!ctx){ try{ ctx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ ctx=null; } } if(ctx&&ctx.state==='suspended') ctx.resume().catch(()=>{}); return ctx; }
export function playNote(nt,sr,delaySec,gain=0.5){
  if(!$('audioOn').checked || !ctx) return;
  try{
    const len=Math.ceil((nt.dur+INST[nt.inst].tail)*sr); if(len<=0) return;
    const buf=ctx.createBuffer(1,len,sr), d=buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=gain*noteValue(nt,i/sr,sr);
    const src=ctx.createBufferSource(); src.buffer=buf; src.connect(ctx.destination);
    src.start(ctx.currentTime+Math.max(0,delaySec));
  }catch(e){}
}
export function playBuffer(chs,sr){ if(!ensureAudio()) return false; const N=chs[0].length, b=ctx.createBuffer(chs.length,N,sr);
  chs.forEach((c,i)=>b.getChannelData(i).set(c)); const s=ctx.createBufferSource(); s.buffer=b; s.connect(ctx.destination); s.start(); return true; }
