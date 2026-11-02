// Ajuda para os testes: universos pequenos, sem criação de nós, para testar uma regra de cada vez.
import { Universe } from '../../web/js/core/universe.js';
import { DEFAULTS } from '../../web/js/core/params.js';
export { Universe, DEFAULTS };

export function universoSemCriacao(extra={}){
  const U=new Universe(Object.assign({},DEFAULTS,extra),1);
  U.p.maxNodes=0;   // trava a criação: só as regras de nó, aresta, aprendizado e poda agem
  return U;
}
// duas fibras quaisquer (nível 1) servem de origem das incidências
export const fibra = (U,i) => U.fibers[0][i];
export function no(U,{thr=1, W=10, refr=20, mag=0.7}={}){
  return U.addNode({lvl:2, depth:2, W, thr, mag, refr, born:U.t, x:0, y:0});
}
export function silencio(U,n){ for(let i=0;i<n;i++) U.step(0,0); }
// dispara a fibra AGORA (no tempo atual do universo)
export const dispara = (U,f) => U.fire(f,U.t);
export const perto = (a,b,tol=1e-9) => Math.abs(a-b)<=tol;
