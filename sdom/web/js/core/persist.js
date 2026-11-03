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
}
