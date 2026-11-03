// Recarregar a página não apaga o robô; só "Destruir universo" cria outro.
// Uso: NODE_PATH=$(npm root -g) node experimentos/persistencia.cjs
const { abrir } = require('./servidor.cjs');
const estado=p=>p.evaluate(()=>({id:__sdom.Store.uid, label:__sdom.Store.meta.label, nos:__sdom.U.nodes.length, t:__sdom.U.t/__sdom.U.sr, rs:__sdom.U.rs, ro:__sdom.Store.ro,
  aviso:document.getElementById('resumeMsg').hidden?'':document.getElementById('resumeMsg').textContent}));
(async()=>{
  let { page:p, erros, fechar } = await abrir({ args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'], permissions:['microphone'] });
  await p.click('#micBtn'); await p.waitForTimeout(5000); await p.click('#micStop'); await p.waitForTimeout(300);
  const a=await estado(p); console.log(`1) antes de recarregar: ${a.label} ${a.id} · ${a.nos} nós · ${a.t.toFixed(1)} s de mundo`);
  // recarregar sem salvar à mão: quem guarda é o fechamento da página (pagehide / aba escondida)
  await p.waitForTimeout(3000);   // página aberta, microfone desligado: vive em silêncio
  const a2=await estado(p);
  // fechar a página, esperar 4 s e abrir de novo (mesmo navegador)
  const ctx=p.context(), url=p.url(); await p.close(); await new Promise(r=>setTimeout(r,4000));
  p=await ctx.newPage(); p.on('pageerror',e=>erros.push(String(e))); await p.goto(url);
  await p.waitForFunction(()=>window.__sdom && window.__sdom.U && window.__sdom.Store.uid && !document.getElementById('resumeMsg').hidden);
  const b=await estado(p); console.log(`2) depois de recarregar: ${b.label} ${b.id} · ${b.nos} nós · ${b.t.toFixed(1)} s de mundo\n   aviso: ${b.aviso}`);
  console.log(`   mesmo robô: ${a.id===b.id} · nós mantidos: ${b.nos>=a.nos} · tempo ao fechar ≥ ${a2.t.toFixed(2)} s → ao abrir ${b.t.toFixed(2)} s (ficou ~4 s fechada: sem pulo)`);
  const mic=await p.evaluate(()=>__sdom.mic.on); console.log(`   microfone ao abrir: ${mic?'LIGADO (erro!)':'desligado'}`);
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
