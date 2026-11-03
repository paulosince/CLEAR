/* Estado compartilhado da página e pequenas utilidades de interface. */
import { DEFAULTS } from '../core/params.js';

export const $ = id => document.getElementById(id);
export const S = {
  U:null, params:Object.assign({},DEFAULTS), universeNo:0, maxNo:0, seed:12345, simRatio:1,
  vida:{ ticks:0, congelado:false, congelamentos:0, ultimoCongeladoS:0, relogio:'' },   // universo congelado = página fora da tela
  // observador: visão do Sdom, sempre ao vivo (tv = agora)
  view:{tv:0, sel:null, ox:0, oy:0, s:1, fitS:1, fitted:false, mode:'auto'},
};
// avisos simples entre módulos (ex.: 'universo' quando o universo muda)
const subs={};
export const on=(ev,fn)=>{ (subs[ev]=subs[ev]||[]).push(fn); };
export const emit=(ev,x)=>{ for(const fn of subs[ev]||[]) fn(x); };

export function sizeCanvas(c){ const r=c.getBoundingClientRect(), d=window.devicePixelRatio||1; const w=Math.round(r.width*d), h=Math.round(r.height*d); if(c.width!==w||c.height!==h){c.width=w;c.height=h} return d; }
export function fmt(t){
  const s=t/S.U.sr; if(s<3600) return s.toFixed(3)+' s';
  const d=Math.floor(s/86400), h=Math.floor(s%86400/3600), m=Math.floor(s%3600/60), x=(s%60).toFixed(1);
  return (d?d+' d ':'')+h+' h '+m+' min '+x+' s';
}
export const fmtInt = v => Math.round(v).toLocaleString('pt-BR');
