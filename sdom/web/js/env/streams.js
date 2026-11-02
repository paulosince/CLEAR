/* =====================================================================
   Fluxos de eventos sonoros. Cada fluxo é um gerador sem fim de eventos em ordem
   de tempo ({t em s, s: nome da fonte, f, dur, amp, opt}), com seu próprio sorteio.
   Os mesmos fluxos servem para os controles da página (ligar/desligar) e para os
   roteiros do laboratório.
   ===================================================================== */
import { cycleNotes, CYCLE } from './score.js';

const seed = R => (R()*1e9)|0;

// fala: sílabas (só vogais) de 0,12–0,25 s, frases de 1–3 s; f0 com declinação ao longo da frase
function* speak(key,t0,t1,sex,R){
  const f0b = sex==='f' ? 210 : sex==='c' ? 300 : 120; let t=t0;
  while(t<t1){
    const phr=0.8+R()*2.2, n0=t; const base=f0b*(0.9+0.2*R());
    while(t<Math.min(t1,n0+phr)){
      const d=0.12+0.13*R(), prog=(t-n0)/phr;
      yield {t, s:key, f:base*(1.08-0.16*prog)*(0.95+0.1*R()), dur:d, amp:0.35+0.2*R(), opt:{v:Math.floor(R()*5), sex, glide:(R()-0.6)*0.6, seed:seed(R)}};
      t+=d+0.03+0.05*R();
    }
    t+=0.25+0.6*R();
  }
}
// conversa entre duas vozes (grave e aguda) que alternam turnos
function* conversation(t0,t1,R){ let t=t0, who=0;
  while(t<t1){ const turn=1.5+2.5*R(); yield* speak(who?'vozB':'vozA', t, Math.min(t1,t+turn), who?'f':'m', R); t+=turn+0.3+0.7*R(); who^=1; } }
function* rainChunk(key,t0,t1,rate,R){ let t=t0; while(true){ t+=-Math.log(1-R())/rate; if(t>=t1)break; yield {t, s:key, f:0, dur:0.005, amp:0.04+0.14*R(), opt:{seed:seed(R)}}; } }
// Dó Mi Sol Mi Dó — sempre o mesmo motivo, para estudar reconhecimento
function* motif(key,t0,amp){ const M=[261.63,329.63,392.0,329.63,261.63]; let t=t0;
  for(const f of M){ yield {t, s:key, f, dur:0.28, amp:amp||0.6, opt:{}}; t+=0.32; } }
function* birdSong(key,t0,R){ // 3–8 piados de 60–120 ms; cada canto tem seu "desenho"
  const n=3+Math.floor(6*R()), f0=2000+2500*R(), g=(R()-0.5)*8, tr=R()<0.5?0:20+20*R(), dep=0.03+0.05*R(); let t=t0;
  for(let i=0;i<n;i++){ const d=0.06+0.06*R(); yield {t, s:key, f:f0*(0.9+0.2*R()), dur:d, amp:0.25+0.2*R(), opt:{glide:g, trill:tr, depth:dep}}; t+=d+0.04+0.04*R(); }
}
function* laugh(key,t0,R){ const n=4+Math.floor(4*R()), f0=320+60*R(); let t=t0;
  for(let i=0;i<n;i++){ const d=0.08+0.04*R(); yield {t, s:key, f:f0*(1.1-0.2*i/n), dur:d, amp:0.35+0.15*R(), opt:{v:2, sex:'c', glide:0.3, seed:seed(R)}}; t+=d+0.06+0.04*R(); } }

// mescla vários geradores em ordem de tempo (empate: o de menor índice primeiro)
export function* merge(gens){
  const heads=gens.map(g=>g.next());
  while(true){ let bi=-1;
    for(let i=0;i<heads.length;i++) if(!heads[i].done && (bi<0 || heads[i].value.t<heads[bi].value.t)) bi=i;
    if(bi<0) return; yield heads[bi].value; heads[bi]=gens[bi].next(); }
}

/* Definição dos fluxos. sources: [nome, timbre, x, y] (sala 4×4 m; robô em (2; 2,4), olhando para cima).
   gen(R, ctx) devolve o gerador; ctx.c0 = primeiro ciclo (música). */
export const STREAMS = {
  // ---------- instrumentos (Cânone de Pachelbel) ----------
  violino1:{group:'instr', label:'Violino I', icon:'🎻', sources:[['violino1','violino',1.0,0.55]], music:true},
  violino2:{group:'instr', label:'Violino II', icon:'🎻', sources:[['violino2','violino',1.6,0.4]], music:true},
  violino3:{group:'instr', label:'Violino III', icon:'🎻', sources:[['violino3','violino',2.4,0.4]], music:true},
  violoncelo:{group:'instr', label:'Violoncelo', icon:'🎻', sources:[['violoncelo','violoncelo',3.0,0.55]], music:true},
  cravo:{group:'instr', label:'Cravo', icon:'🎹', sources:[['cravo','cravo',2.0,0.85]], music:true},
  // ---------- sons ambiente ----------
  passaros:{group:'amb', label:'Pássaros', icon:'🐦', sources:[['passaro1','passaro',0.3,1.2],['passaro2','passaro',3.3,1.0]],
    gen:function*(R){ const gs=['passaro1','passaro2'].map(k=>(function*(){ let t=1+4*R(); while(true){ const s=[...birdSong(k,t,R)]; yield* s; t=s[s.length-1].t+2+6*R(); } })()); yield* merge(gs); }},
  mar:{group:'amb', label:'Mar', icon:'🌊', sources:[['mar','onda',2.0,3.85]],
    gen:function*(R){ let t=0; while(true){ const d=5+4*R(); yield {t, s:'mar', f:0, dur:d, amp:0.5+0.3*R(), opt:{seed:seed(R), rise:1.5+1.2*R()}}; t+=0.55*d+1.5*R(); } }},
  carros:{group:'amb', label:'Carros ao fundo', icon:'🚗', sources:[['carros','carro',3.85,2.2]],
    gen:function*(R){ let t=0.5+3*R(); while(true){ const d=4+4*R(); yield {t, s:'carros', f:25+20*R(), dur:d, amp:0.12+0.1*R(), opt:{seed:seed(R), glide:-0.1/d}}; t+=2+10*R(); } }},
  criancas:{group:'amb', label:'Crianças', icon:'🧒', sources:[['crianca1','voz',0.4,2.4],['crianca2','voz',1.1,2.9]],
    gen:function*(R){ let t=0.3;
      while(true){ const k=R()<0.5?'crianca1':'crianca2';
        if(R()<0.35){ const s=[...laugh(k,t,R)]; yield* s; t=s[s.length-1].t+0.4+1.5*R(); }
        else { const L=1+2*R(), s=[...speak(k,t,t+L,'c',R)]; yield* s; t=(s.length?s[s.length-1].t:t)+0.5+2*R(); } } }},
  chuva:{group:'amb', label:'Chuva', icon:'🌧️', sources:[['chuva','gota',0.2,0.4]], seedIndex:1,
    gen:function*(R){ for(let t0=0;;t0+=20) yield* rainChunk('chuva',t0,t0+20,6+14*R(),R); }},
  conversa:{group:'amb', label:'Conversa', icon:'🗣️', sources:[['vozA','voz',1.2,1.3],['vozB','voz',2.9,1.5]], seedIndex:2,
    gen:function*(R){ yield* conversation(0.5,Infinity,R); }},
  passos:{group:'amb', label:'Passos e porta', icon:'👣', sources:[['passos','passo',0.8,3.4],['porta','porta',3.7,0.3]], seedIndex:3,
    gen:function*(R){ for(let t=6+6*R(); ; t+=15+15*R()){ const n=5+Math.floor(5*R());
      for(let i=0;i<n;i++) yield {t:t+i*(0.5+0.1*R()), s:'passos', f:0, dur:0.03, amp:0.35+0.25*R(), opt:{seed:seed(R)}};
      const e=t+n*0.55; if(R()<0.35) yield {t:e+0.2, s:'porta', f:0, dur:0.02, amp:0.8, opt:{seed:seed(R)}}; } }},
  campainha:{group:'amb', label:'Campainha', icon:'🔔', sources:[['campainha','campainha',3.6,3.6]], seedIndex:4,
    gen:function*(R){ for(let t=25+20*R(); ; t+=60+60*R()){ yield {t, s:'campainha', f:659.25, dur:0.01, amp:0.5, opt:{}}; yield {t:t+0.45, s:'campainha', f:523.25, dur:0.01, amp:0.5, opt:{}}; } }},
  // ---------- só para roteiros ----------
  conversaEpisodios:{group:'rot', sources:[['vozA','voz',1.2,1.3],['vozB','voz',2.9,1.5]], seedIndex:2,
    gen:function*(R){ for(let t=1+2*R(); ; ){ const L=8+12*R(); yield* conversation(t,t+L,R); t+=L+5+10*R(); } }},
  motivoPiano:{group:'rot', sources:[['piano','piano',0.6,1.0]], seedIndex:5,
    gen:function*(R){ for(let t=10+10*R(); ; t+=20+20*R()) yield* motif('piano',t); }},
};
// instrumentos: o gerador toca a parte ciclo a ciclo, a partir do ciclo c0 (tempo relativo ao início da música)
for(const k of ['violino1','violino2','violino3','violoncelo','cravo'])
  STREAMS[k].gen=function*(R,ctx){ const src=STREAMS[k].sources[0][0]; for(let c=(ctx&&ctx.c0)||0; ; c++) for(const n of cycleNotes(k,c)) yield {t:c*CYCLE+n.t, s:src, f:n.f, dur:n.dur, amp:n.amp, opt:{}}; };
export const MUSIC_KEYS = ['violino1','violino2','violino3','violoncelo','cravo'];
