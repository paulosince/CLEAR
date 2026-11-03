/* Guardar e retomar o robô (o cérebro), para que recarregar a página ou atualizar o código não o apague.
   Só "Destruir universo" cria outro.

   O que é guardado: todo o estado do robô (nós, arestas, pesos, marcas, poda, marcapasso, cóclea, sorteio…).
   O que NÃO é guardado: a gravação do observador (os ~90 s para voltar a fita na tela) — é grande e não é
   o robô; ao retomar, a fita começa no instante da retomada.

   IMPORTANTE para quem mexer no código: se uma versão nova acrescentar estado ao universo (um campo novo
   criado no construtor), escreva aqui, em `migrar`, como preencher esse campo num universo guardado por uma
   versão anterior. Parâmetros novos já recebem o valor padrão automaticamente. */
import { flattenGraph, unflattenGraph } from './graph-copy.js';
import { Universe } from './universe.js';
import { DEFAULTS, CODE_VERSION } from './params.js';

export const SNAP_FORMAT = 1;
const OBSERVADOR = ['hT','hN','nmT','nmN','nmF','aud'];

// Fotografia do universo, pronta para o IndexedDB (structuredClone). Chame com os registros já descarregados.
export function snapshotOf(U){
  const keep={}; for(const k of OBSERVADOR){ keep[k]=U[k]; U[k]=null; }
  try{ return {format:SNAP_FORMAT, version:CODE_VERSION, G:flattenGraph(U)}; }
  finally{ Object.assign(U,keep); }
}

// Reconstrói o universo a partir da fotografia.
export function restoreFrom(snap){
  if(!snap || snap.format>SNAP_FORMAT) throw new Error('fotografia de formato desconhecido');
  const U=unflattenGraph(snap.G);
  Object.setPrototypeOf(U, Universe.prototype);
  if(Object.prototype.hasOwnProperty.call(U,'rng')) delete U.rng;   // versões antigas guardavam a função (como null)
  U.p=Object.assign({}, DEFAULTS, U.p);
  migrar(U, snap);
  U.allocObserver();
  for(const k of ['actLog','stimLog','pruneLog']) if(!Array.isArray(U[k])) U[k]=[];
  if(!(U.wChanged instanceof Set)) U.wChanged=new Set();
  U.audioChunks=[];
  return U;
}

// Preenche campos que versões anteriores não tinham. (Por enquanto, nenhum: o formato 1 nasceu na v0.15.)
function migrar(U, snap){
  if(typeof U.rs!=='number') U.rs=(U.t|0)^0x9e3779b9;
  if(U.histStart===undefined) U.histStart=0;
  U.p.histSeconds=DEFAULTS.histSeconds;   // gravação do observador (v0.16: só o agora); não muda o robô
  // v0.17: momento da primeira consolidação da aresta (-1 = ainda não consolidou). Robôs anteriores: quem tem peso consolidado já consolidou.
  for(const e of U.edges) if(e.consAt===undefined) e.consAt = e.wS>0 ? e.lastUse : -1;
  // v0.18: pedido de recurso → ritmo
  if(U.mp && U.mp.pedido===undefined){ U.mp.pedido=1; U.mp.u=0; U.mp.fAlvo=U.p.mpRestBpm/60; }
  // v0.20: respiração
  if(U.respOn===undefined){ U.respOn = U.mpOn && !!U.p.respOn; if(U.respOn) U.respInit(); }
  else if(U.respOn) U.respRateK=1-Math.exp(-64/(U.p.respRitmoTauS*U.sr));
  // v0.20.1: prazo de fechamento 3 dias → 4 h (decisão do Paulo) e meia-vida da recorrência 12 h → 40 min; os nomes antigos saem e os novos vêm do padrão
  delete U.p.hebbFecharDias; delete U.p.hebbRecMeiaH;
  // v0.21: fibras do ritmo do coração (robôs anteriores ganham as fibras agora, nascidas neste momento)
  if(U.mpOn && U.endoFibers && !U.endoFibers.some(f=>f.endo.kind==='ritmo')) U.ritmoInit();
  // v0.19: regra hebbiana
  if(U.hebbPar===undefined){ U.hebbOn=!!U.p.hebbOn; U.hebbInit(); } else U.hebbConst();
}
