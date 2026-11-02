// Experimento de esquecimento: ouvir o dó do piano N vezes, pular no tempo e ouvir de novo.
// Compara quantos nós nascem na volta (0 = reconheceu; muitos = esqueceu e reaprendeu).
// Cada cenário roda num universo novo. Uso: node decaimento.js   (requer playwright)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs=[]; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + require('path').resolve(__dirname, '../web/index.html'));
  await p.waitForTimeout(600);
  const r = await p.evaluate(() => {
    const out=[];
    for (const reps of [1, 3, 6]) for (const gap of [600, 2*3600, 86400, 7*86400, 28*86400]) {
      const U = new window.__sdom.U.constructor(Object.assign({}, window.__sdom.U.p), 777);
      const W = new window.__sdom.W.constructor(U.sr); const P = W.addSource('piano',1.0,1.1); const xs=[0,0];
      const run=(sec)=>{ const n=Math.round(sec*U.sr); W.prepare(); for(let i=0;i<n;i++){ W.sample(U.t,xs); U.step(xs[0],xs[1]); } W.gc(U.t); };
      const note=()=>{ const b0=U.nodes.length; W.play(P,261.63,0.6,0.7,U.t); run(1.2); return U.nodes.length-b0; };
      const learned=()=>U.edges.filter(e=>e.from.lvl>0);
      for(let i=0;i<reps;i++) note();
      const E=learned(), cons=E.filter(e=>e.wS>0).length;
      U.jump(Math.round(gap*U.sr));
      const inert=learned().filter(e=>U.wAt(e,U.t)<U.p.inertW).length;
      const back=note();
      out.push({reps, gap, consolidadas:cons+'/'+E.length, inertes:inert+'/'+E.length, novosNaVolta:back});
    }
    return out;
  });
  const fmt=s=>s<3600?(s/60)+' min':s<86400?(s/3600)+' h':(s/86400)+' d';
  for (const x of r) console.log(`${x.reps}× piano, pulo ${fmt(x.gap).padEnd(6)} consolidadas ${x.consolidadas.padEnd(8)} inertes ${x.inertes.padEnd(8)} nós novos na volta: ${x.novosNaVolta}`);
  console.log(errs); await b.close();
})();
