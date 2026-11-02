/* =====================================================================
   Música em domínio público, separada por instrumento:
   Cânone em Ré, de Johann Pachelbel (†1706).
   ATENÇÃO: transcrição DE MEMÓRIA e simplificada (3 padrões do violino e o baixo).
   O cravo com acordes é arranjo meu. Conferir com a partitura (IMSLP) antes de usar em artigo.
   O teste tests/unit/ambiente.test.js confere que cada nota de violino no tempo forte
   pertence ao acorde do baixo.
   ===================================================================== */
const A4 = 440;
export const midiHz = m => A4*Math.pow(2,(m-69)/12);
// nomes → número MIDI (Ré3 = 50)
const N = {D2:38, Fs2:42, G2:43, A2:45, B2:47, D3:50, E3:52, Fs3:54, G3:55, A3:57, B3:59, Cs4:61,
  D4:62, E4:64, Fs4:66, G4:67, A4:69, B4:71, Cs5:73, D5:74, E5:76, Fs5:78, G5:79, A5:81, B5:83};

export const BPM = 72;                       // semínima = 72 (escolha minha; versões comuns ficam entre 50 e 80)
export const BEAT = 60/BPM;                  // duração da semínima (s)
export const CYCLE = 8*BEAT;                 // um ciclo do baixo (2 compassos 4/4)

// Baixo obstinado (semínimas): Ré Lá Si Fá# Sol Ré Sol Lá
export const GROUND = [N.D3, N.A2, N.B2, N.Fs2, N.G2, N.D2, N.G2, N.A2];
// acordes sobre cada nota do baixo (para o cravo e para o teste de consonância)
export const CHORDS = [[N.D4,N.Fs4,N.A4],[N.Cs4,N.E4,N.A3],[N.B3,N.D4,N.Fs4],[N.Fs3,N.A3,N.Cs4],
                       [N.G3,N.B3,N.D4],[N.Fs3,N.A3,N.D4],[N.G3,N.B3,N.D4],[N.A3,N.Cs4,N.E4]];
// Linha do violino: 3 padrões de um ciclo cada; [nota MIDI, duração em semínimas]
export const PHRASES = [
  [[N.Fs5,1],[N.E5,1],[N.D5,1],[N.Cs5,1],[N.B4,1],[N.A4,1],[N.B4,1],[N.Cs5,1]],
  [[N.D5,1],[N.Cs5,1],[N.B4,1],[N.A4,1],[N.G4,1],[N.Fs4,1],[N.G4,1],[N.E4,1]],
  [[N.D5,.5],[N.Fs5,.5],[N.A5,.5],[N.G5,.5],[N.Fs5,.5],[N.D5,.5],[N.Fs5,.5],[N.E5,.5],
   [N.D5,.5],[N.B4,.5],[N.D5,.5],[N.A5,.5],[N.G5,.5],[N.B5,.5],[N.A5,.5],[N.G5,.5]],
];

// Partes: cada uma gera as notas do ciclo c (tempo relativo ao início do ciclo, em s)
export const PARTS = {
  violino1:{entry:1}, violino2:{entry:2}, violino3:{entry:3}, violoncelo:{entry:0}, cravo:{entry:0},
};
const mod = (a,b)=>((a%b)+b)%b;
export function cycleNotes(part, c){
  const out=[];
  if(part==='violoncelo'){ GROUND.forEach((m,i)=>out.push({t:i*BEAT, f:midiHz(m), dur:0.92*BEAT, amp:0.55})); }
  else if(part==='cravo'){ CHORDS.forEach((ch,i)=>ch.forEach((m,j)=>out.push({t:i*BEAT+j*0.012, f:midiHz(m), dur:0.05, amp:0.3}))); }  // arpejo rápido
  else {
    const ph=PHRASES[mod(c-PARTS[part].entry,3)]; let t=0;
    for(const [m,d] of ph){ out.push({t, f:midiHz(m), dur:0.9*d*BEAT, amp:0.45}); t+=d*BEAT; }
  }
  return out;
}
