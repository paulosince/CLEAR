// Experimento de controle (v0.21): o Sdom só com o corpo. Silêncio total; o ritmo do coração é imposto de fora
// (como um remédio no laboratório), alternando repouso e ritmo alto. Pergunta: surge algum nó, sem som na origem,
// que dispara com o coração alto e nunca em repouso? Controle: o mesmo, sem as fibras do ritmo (ritmoFibras: 0).
// Uso: node experimentos/coracao-isolado.mjs <semente> <ciclos> <comRitmo 1|0>
import { Universe } from '../web/js/core/universe.js';
import { DEFAULTS } from '../web/js/core/params.js';
const seed=+process.argv[2]||7, ciclos=+process.argv[3]||20, comRitmo=process.argv[4]!=='0';
const U=new Universe(Object.assign({},DEFAULTS,comRitmo?{}:{ritmoFibras:0}),seed), sr=U.sr;
let rs=(seed*2654435761)>>>0; const rnd=()=>(rs=(rs*1664525+1013904223)>>>0)/4294967296;
const per=[]; const snap=()=>new Map(U.nodes.map(n=>[n.id,n.fires]));
const fase=(s,bpm,tipo)=>{ const a=snap(), n=Math.round(s*sr); for(let i=0;i<n;i++){ U.step(0,0); U.mp.f=bpm/60; } per.push({tipo,s,a,b:snap()}); };
for(let c=0;c<ciclos;c++){ const rep=65+20*rnd(), alto=140+30*rnd();
  fase(20,rep,'descida'); fase(40,rep,'repouso'); fase(5,alto,'subida'); fase(10,alto,'alto'); }
const T={}; for(const p of per) T[p.tipo]=(T[p.tipo]||0)+p.s;
const taxa=(n,tipo)=>per.filter(p=>p.tipo===tipo).reduce((s,p)=>s+((p.b.get(n.id)||0)-(p.a.get(n.id)||0)),0)/T[tipo];
const anc=n=>{ const seen=new Set(), st=[n], k=new Set(); while(st.length){ const m=st.pop(); for(const e of m.in){ const f=e.from; if(seen.has(f.id)) continue; seen.add(f.id);
  if(f.endo) k.add(f.endo.kind); else if(f.fiber||f.lvl===0) k.add('som'); else if(f.lvl>=2) st.push(f); } } return k; };
const viv=U.nodes.filter(n=>n.lvl>=2 && n.diedAt===Infinity);
const linhas=[]; let selet=0, comR=0;
for(const n of viv){ const k=anc(n); if(k.has('som')) continue; const r={sub:taxa(n,'subida'),alto:taxa(n,'alto'),desc:taxa(n,'descida'),rep:taxa(n,'repouso')};
  const sel = r.rep===0 && (r.sub+r.alto)>0.05; if(k.has('ritmo')) comR++; if(sel) selet++;
  if(sel || k.has('ritmo')) linhas.push(`  #${n.id} origem {${[...k].join(',')}} /s: subida ${r.sub.toFixed(2)} alto ${r.alto.toFixed(2)} descida ${r.desc.toFixed(2)} repouso ${r.rep.toFixed(2)}${sel?'  ← seletivo':''}`); }
console.log(`semente ${seed} · ${ciclos} ciclos · ${comRitmo?'COM':'SEM'} fibras do ritmo · Sdom ${viv.length} nós (todos sem som) · com ritmo na origem ${comR} · seletivos ao coração alto ${selet} · arestas em formação ${U.hebbForm?.length??'-'} · fechadas ${U.hebbStats?.fechadas??'-'}`);
console.log(linhas.slice(0,15).join('\n'));
