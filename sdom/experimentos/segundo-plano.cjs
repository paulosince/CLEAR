// O robô continua vivo sem desenho (aba em segundo plano) e, se a aba for congelada, ao voltar o tempo vira pulo.
// Uso: NODE_PATH=$(npm root -g) node experimentos/segundo-plano.cjs
const { abrir } = require('./servidor.cjs');
(async()=>{
  const { page:p, erros, fechar } = await abrir({});
  await p.evaluate(()=>document.querySelector('.chip[data-k="chuva"]').click());
  await p.waitForTimeout(1500);
  // 1) sem desenho: o navegador pausa o requestAnimationFrame em segundo plano; aqui eu o desligo à força
  await p.evaluate(()=>{ window.requestAnimationFrame=()=>0; });
  const a=await p.evaluate(()=>({t:__sdom.U.t/__sdom.U.sr, gotas:__sdom.U.stimCount, relogio:__sdom.vida.relogio}));
  await p.waitForTimeout(4000);
  const b=await p.evaluate(()=>({t:__sdom.U.t/__sdom.U.sr, gotas:__sdom.U.stimCount}));
  console.log(`sem desenho (relógio: ${a.relogio}): em 4 s reais o mundo andou ${(b.t-a.t).toFixed(2)} s e caíram ${b.gotas-a.gotas} gotas`);
  // 2) página parada por 3 s (como uma aba congelada): ao voltar, o tempo perdido vira pulo no tempo
  const c=await p.evaluate(()=>__sdom.U.t/__sdom.U.sr);
  await p.evaluate(()=>{ const t=performance.now(); while(performance.now()-t<3000){} });
  await p.waitForTimeout(500);
  const d=await p.evaluate(()=>({t:__sdom.U.t/__sdom.U.sr, v:__sdom.vida, notasPassadas:__sdom.W.sources.flatMap(s=>s.notes).filter(n=>n.start<__sdom.U.t-__sdom.U.sr).length}));
  console.log(`parada ~3 s: ao voltar o mundo andou ${(d.t-c).toFixed(2)} s · congelamentos ${d.v.congelamentos} · último pulo ${d.v.ultimoPuloS.toFixed(2)} s · notas antigas pendentes ${d.notasPassadas}`);
  console.log(erros.length? 'ERROS: '+erros.join(' | ') : 'sem erros no console');
  await fechar();
})();
