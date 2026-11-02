/* Lista dos universos gravados neste navegador. */
import { S, $ } from './state.js';
import { Store } from '../store.js';

export async function renderStore(){
  if(!Store.ok){ $('stStatus').textContent='Gravação indisponível neste navegador (IndexedDB bloqueado). A simulação funciona normalmente.'; $('stList').innerHTML=''; return; }
  let est=''; try{ const e=await navigator.storage.estimate(); est=` · espaço usado ≈ ${(e.usage/1048576).toFixed(1)} MB`; }catch(e){}
  const L=(await Store.list()).sort((a,b)=>a.createdAt<b.createdAt?1:-1);
  $('stStatus').textContent=`${L.length} universo(s) gravado(s)${est}`;
  const box=$('stList'); box.innerHTML='';
  for(const m of L){
    const row=document.createElement('div'); row.className='uni'; const cur=m.id===Store.uid;
    const lbl=document.createElement('span'); lbl.className='lbl';
    lbl.textContent=`${m.label}${cur?' (atual)':''} · ${new Date(m.createdAt).toLocaleString('pt-BR')} · ${m.version} · ${m.worldTimeS??0} s de mundo · ${m.nodes??0} nós · ${m.ltp??m.reinforcements??0} reforços`;
    const bD=document.createElement('button'); bD.textContent='Baixar JSON';
    bD.onclick=async()=>{ if(cur) await Store.flush(S.U); const data=await Store.exportU(m.id); const blob=new Blob([JSON.stringify(data)],{type:'application/json'});
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`sdom-${m.id}.json`; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },2000); };
    row.appendChild(lbl); row.appendChild(bD);
    if(!cur){ const bX=document.createElement('button'); bX.textContent='Apagar'; let arm=0;
      bX.onclick=async()=>{ const now=performance.now(); if(now-arm>3000){ arm=now; bX.textContent='Toque de novo'; setTimeout(()=>bX.textContent='Apagar',3000); return; } await Store.del(m.id); renderStore(); };
      row.appendChild(bX); }
    box.appendChild(row);
  }
}
export function initStoreUI(){ $('stRefresh').onclick=async()=>{ await Store.flush(S.U); renderStore(); }; }
