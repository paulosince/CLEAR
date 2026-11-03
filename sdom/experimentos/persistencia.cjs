// Recarregar a página não apaga o robô; só "Destruir universo" cria outro.
// Uso: NODE_PATH=$(npm root -g) node experimentos/persistencia.cjs
const { abrir } = require('./servidor.cjs');
const estado=p=>p.evaluate(()=>({id:__sdom.Store.uid, label:__sdom.Store.meta.label, nos:__sdom.U.nodes.length, t:__sdom.U.t/__sdom.U.sr, rs:__sdom.U.rs, ro:__sdom.Store.ro,
  aviso:document.getElementById('resumeMsg').hidden?'':document.getElementById('resumeMsg').textContent}));
(async()=>{
  const { page:p, erros, fechar } = await abrir({});
  await p.evaluate(()=>document.querySelector('.chip[data-k="conversa"]').click());
  await p.waitForTimeout(6000);
  const a=await estado(p); console.log(`1) antes de recarregar: ${a.label} ${a.id} · ${a.nos} nós · ${a.t.toFixed(1)} s de mundo`);
  // recarregar sem salvar à mão: quem guarda é o fechamento da página (pagehide / aba escondida)
  await p.reload(); await p.waitForFunction(()=>window.__sdom && window.__sdom.U && window.__sdom.Store.uid); await p.waitForTimeout(1500);
  const b=await estado(p); console.log(`2) depois de recarregar: ${b.label} ${b.id} · ${b.nos} nós · ${b.t.toFixed(1)} s de mundo\n   aviso: ${b.aviso}`);
  console.log(`   mesmo robô: ${a.id===b.id} · nós mantidos: ${b.nos>=a.nos} · o tempo continuou: ${b.t>a.t}`);
  // segunda aba: não pode gravar no mesmo robô
  const p2=await p.context().newPage(); await p2.goto(p.url()); await p2.waitForFunction(()=>window.__sdom && window.__sdom.U); await p2.waitForTimeout(800);
  const c=await estado(p2); console.log(`3) segunda aba: só leitura=${c.ro} · aviso: ${c.aviso}`); await p2.close();
  // destruir: dois toques
  await p.evaluate(()=>document.getElementById('reset').click()); await p.waitForTimeout(200); await p.evaluate(()=>document.getElementById('reset').click()); await p.waitForTimeout(1500);
  const d=await estado(p); const foto=await p.evaluate(id=>__sdom.Store.getSnapshot(id).then(x=>!!x), b.id);
  console.log(`4) destruído: novo ${d.label} ${d.id} · ${d.nos} nós · fotografia do antigo ainda existe: ${foto}`);
  await p.reload(); await p.waitForFunction(()=>window.__sdom && window.__sdom.U && window.__sdom.Store.uid); await p.waitForTimeout(1000);
  const e=await estado(p); console.log(`5) recarregar de novo retoma o novo: ${e.id===d.id} (${e.label})`);
  console.log(erros.length? 'ERROS: '+erros.join(' | ') : 'sem erros no console');
  await fechar();
})();
