// Experimento: 6× dó no piano, 6× dó na viola, 2× dó no piano.
// Mostra quantos nós nasceram (n1/n2/n3/n4) durante cada nota.
// Uso: NODE_PATH=$(npm root -g) node experimentos/convergencia.cjs   (requer playwright)
(async () => {
  const { page: p, erros: errs, fechar } = await require('./servidor.cjs').abrir();
  await p.evaluate(() => {
    const S=window.__sdom, W=S.W; const P=W.sources.find(s=>s.inst==='piano'), V=W.sources.find(s=>s.inst==='viola');
    document.getElementById('audioOn').checked=false;
    const seq=['P','P','P','P','P','P','V','V','V','V','V','V','P','P'];
    seq.forEach((k,i)=>S.trigger(k==='P'?P:V,261.63,0.6,0.7,0.3+i*1.2));
    window.__t0=S.U.t;
  });
  await p.waitForTimeout(18500);
  const r = await p.evaluate(() => {
    const U=window.__sdom.U, sr=U.sr, t0=window.__t0; const out=[];
    for(let i=0;i<14;i++){ const a=t0+Math.round((0.3+i*1.2)*sr), bb=a+Math.round(1.2*sr); const c=[0,0,0,0,0]; let f=0;
      for(const n of U.nodes) if(n.lvl>0&&n.born>=a&&n.born<bb) c[n.lvl]++;
      out.push(c.slice(1).join('/')); }
    return {out, total:U.nodes.length, t:U.t/sr};
  });
  console.log(JSON.stringify(r,null,0)); console.log(errs);
  await fechar();
})();
