// Compara as duas regras de relação: tamanho do Sdom e o que é comum/exclusivo entre dó do piano e dó da viola.
// Uso: node discriminacao.js   (requer playwright)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + require('path').resolve(__dirname, '../web/index.html') + ''); await p.waitForTimeout(500);
  const r = await p.evaluate(() => {
    const out=[];
    for (const rule of [0,1]) {
      const U=new window.__sdom.U.constructor(Object.assign({},window.__sdom.U.p,{pathRule:rule}),777); const W=new window.__sdom.W.constructor(U.sr);
      const P=W.addSource('piano',1.0,1.1), V=W.addSource('viola',3.0,1.1); const xs=[0,0];
      const run=(sec)=>{ const n=Math.round(sec*U.sr); W.prepare(); for(let i=0;i<n;i++){ W.sample(U.t,xs); U.step(xs[0],xs[1]); } W.gc(U.t); };
      const play=(src,f)=>{ W.play(src,f,0.6,0.7,U.t); run(1.2); };
      for(let i=0;i<6;i++) play(P,261.63); for(let i=0;i<6;i++) play(V,261.63);
      const snap=()=>U.nodes.filter(n=>n.lvl>=2).map(n=>n.fires);
      const test=(src,f)=>{ const a=snap(); const b0=U.nodes.length; play(src,f); const bb=snap(); const act=new Set(); a.forEach((x,i)=>{ if(bb[i]>x) act.add(i); }); return {act, novos:U.nodes.length-b0}; };
      const tp=test(P,261.63), tv=test(V,261.63), tm=test(P,329.63);
      const only=(A,B)=>[...A].filter(x=>!B.has(x)).length, both=(A,B)=>[...A].filter(x=>B.has(x)).length;
      out.push(`regra ${rule?'"basta ter caminho"':'"preparação ≥50%"'}: Sdom ${U.nodes.filter(n=>n.lvl>=2).length} nós · dó piano ativa ${tp.act.size} · dó viola ativa ${tv.act.size} · em comum ${both(tp.act,tv.act)} · só piano ${only(tp.act,tv.act)} · só viola ${only(tv.act,tp.act)} · mi piano (nunca ouvido): ${tm.novos} nós novos, ${both(tm.act,tp.act)} em comum com dó piano`);
    }
    return out;
  });
  r.forEach(x=>console.log(x)); await b.close();
})();
