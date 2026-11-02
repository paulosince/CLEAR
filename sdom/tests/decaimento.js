// Experimento: aprender o dó do piano, ficar em silêncio por um tempo e ouvir de novo.
// Avança o mundo diretamente (sem desenhar) para não esperar em tempo real.
// Uso: node decaimento.js   (requer playwright)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs=[]; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + require('path').resolve(__dirname, '../web/index.html'));
  await p.waitForTimeout(600);
  const r = await p.evaluate(() => {
    const S=window.__sdom, U=S.U, W=S.W; document.getElementById('audioOn').checked=false;
    const P=W.sources.find(s=>s.inst==='piano'); const xs=[0,0];
    const run=(sec)=>{ const n=Math.round(sec*U.sr); W.prepare(); for(let i=0;i<n;i++){ W.sample(U.t,xs); U.step(xs[0],xs[1]); } W.gc(U.t); };
    const born=()=>U.nodes.length;
    const learned=()=>U.edges.filter(e=>e.from.lvl>0);
    const meanW=()=>{ const E=learned(); return E.length? (E.reduce((a,e)=>a+U.wAt(e,U.t),0)/E.length).toFixed(3):'-'; };
    const note=()=>{ const b0=born(), p0=U.ltp, d0=U.ltd; S.trigger(P,261.63,0.6,0.7,0); run(1.2); return {novos:born()-b0, reforcos:U.ltp-p0, enfraq:U.ltd-d0, pesoMedio:meanW()}; };
    const inert=()=>{ const E=learned(); return E.filter(e=>U.wAt(e,U.t)<U.p.inertW).length+'/'+E.length+' arestas'; };
    const out=[];
    for(let i=0;i<5;i++) out.push(['piano '+(i+1), note()]);
    for(const pause of [10, 60, 240]){
      run(pause); out.push([`silêncio ${pause}s → inertes`, inert()]);
      out.push(['piano após silêncio', note()]);
      out.push(['piano de novo', note()]);
    }
    return out;
  });
  for (const x of r) console.log(x[0].padEnd(28), JSON.stringify(x[1]));
  console.log(errs); await b.close();
})();
