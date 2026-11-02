// Experimento de poda: arestas inertes por 7 dias são podadas; nós órfãos também.
// Uso: NODE_PATH=$(npm root -g) node experimentos/poda.cjs   (requer playwright)
(async () => {
  const { page: p, erros: errs, fechar } = await require('./servidor.cjs').abrir();
  const r = await p.evaluate(() => {
    const out=[];
    const mk=()=>{ const U=new window.__sdom.U.constructor(Object.assign({},window.__sdom.U.p),777); const W=new window.__sdom.W.constructor(U.sr);
      const P=W.addSource('piano',1.0,1.1); const xs=[0,0];
      const run=(sec)=>{ const n=Math.round(sec*U.sr); W.prepare(); for(let i=0;i<n;i++){ W.sample(U.t,xs); U.step(xs[0],xs[1]); } W.gc(U.t); };
      const note=()=>{ const b0=U.nodes.length; W.play(P,261.63,0.6,0.7,U.t); run(1.2); return U.nodes.length-b0; };
      const st=(lbl)=>{ const alive=U.nodes.filter(n=>n.lvl>0&&n.diedAt===Infinity).length; out.push(`${lbl.padEnd(34)} nós vivos ${String(alive).padEnd(4)} arestas vivas ${String(U.edges.filter(e=>e.diedAt===Infinity).length).padEnd(4)} candidatas ${String(U.candidates).padEnd(4)} podadas ${U.prunedE}a/${U.prunedN}n  acessos ${U.accesses}`); };
      const day=86400*U.sr; return {U,note,st,day}; };
    { const {U,note,st,day}=mk(); out.push('— ouviu 1×');
      note(); st('após 1 nota');
      U.jump(day); st('+1 dia');
      const nv=note(); st(`ouviu de novo (+${nv} nós)`);
      U.jump(3*day); st('+3 dias');
      U.jump(5*day); st('+5 dias (8 dias inertes)');
      U.jump(7*day); st('+7 dias'); }
    { const {U,note,st,day}=mk(); out.push('— ouviu 6×');
      for(let i=0;i<6;i++) note(); st('após 6 notas');
      U.jump(28*day); st('+4 semanas');
      U.jump(70*day); st('+10 semanas');
      U.jump(14*day); st('+2 semanas'); }
    return out;
  });
  for (const x of r) console.log(x);
  console.log(errs); await fechar();
})();
