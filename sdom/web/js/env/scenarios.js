/* =====================================================================
   Roteiros do laboratório: conjuntos de fluxos que começam no tempo 0.
   Repetíveis pela semente: cada fluxo tem seu sorteio, então o começo de um
   roteiro longo é igual ao roteiro curto com a mesma semente.
   ===================================================================== */
import { STREAMS } from './streams.js';
import { streamRng } from './environment.js';
import { PARTS } from './score.js';

export const SCEN = {
  casa:{name:'Casa', desc:'conversa entre duas vozes, chuva na janela, passos, porta, campainha e alguém tocando um motivo no piano',
    sources:[['vozA','voz',1.2,1.3],['vozB','voz',2.9,1.5],['chuva','gota',0.2,0.4],['passos','passo',0.8,3.4],['porta','porta',3.7,0.3],['campainha','campainha',3.6,3.6],['piano','piano',0.6,1.0]],
    streams:['chuva','conversaEpisodios','passos','campainha','motivoPiano']},
  conversa:{name:'Conversa', desc:'duas vozes (uma grave, uma aguda) alternando a fala, sem outros sons',
    streams:['conversa']},
  musica:{name:'Música', desc:'Cânone de Pachelbel: violoncelo e cravo desde o início; violinos I, II e III entram um ciclo depois do outro',
    streams:['violoncelo','cravo','violino1','violino2','violino3']},
  parque:{name:'Parque', desc:'pássaros, crianças brincando e carros ao fundo',
    streams:['passaros','criancas','carros']},
  praia:{name:'Praia', desc:'mar, pássaros e crianças',
    streams:['mar','passaros','criancas']},
  chuva:{name:'Chuva', desc:'só chuva na janela, com intensidade variando',
    streams:['chuva']},
};
export function scenarioSources(key){
  const sc=SCEN[key]; if(sc.sources) return sc.sources;
  const out=[], seen=new Set(); for(const k of sc.streams) for(const s of STREAMS[k].sources) if(!seen.has(s[0])){ seen.add(s[0]); out.push(s); }
  return out;
}
// liga os fluxos do roteiro num Ambiente, no tempo 0
export function startScenario(amb,key,seed){
  SCEN[key].streams.forEach((k,i)=>{
    const def=STREAMS[k];
    const R=streamRng(seed, def.seedIndex ?? (10+i));
    amb.start(k,0,0,{R, order:i, musicT0:0.5, c0:def.music ? PARTS[k].entry : 0});
  });
}
