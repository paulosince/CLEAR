// Testa "ouvir o mundo" com um microfone falso do Chromium (um bipe), sem tocar em microfone de verdade.
// Uso: NODE_PATH=$(npm root -g) node experimentos/microfone.cjs
const { abrir } = require('./servidor.cjs');
(async()=>{
  const { page:p, erros, fechar } = await abrir({ args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required'], permissions:['microphone'] });
  const r0=await p.evaluate(()=>({micOn:__sdom.mic.on, banner:!document.getElementById('micBanner').hidden}));
  console.log('ao abrir:', r0, '(tem que ser desligado e sem aviso)');
  await p.evaluate(()=>document.getElementById('micRec').click());
  await p.click('#micBtn'); await p.waitForTimeout(1500);
  const a=await p.evaluate(()=>({on:__sdom.mic.on, t:__sdom.U.t/__sdom.U.sr, fib:__sdom.U.nodes.filter(n=>n.fiber).reduce((s,n)=>s+n.fires,0), banner:!document.getElementById('micBanner').hidden, status:document.getElementById('micStatus').textContent}));
  await p.waitForTimeout(5000);
  const b=await p.evaluate(()=>({t:__sdom.U.t/__sdom.U.sr, fib:__sdom.U.nodes.filter(n=>n.fiber).reduce((s,n)=>s+n.fires,0), sdom:__sdom.U.nodes.filter(n=>n.lvl>=2).length, info:document.getElementById('micInfo').textContent, sr:__sdom.mic.ctx&&__sdom.mic.ctx.sampleRate}));
  console.log('ligado:', a); console.log('depois de 5 s reais: mundo avançou', (b.t-a.t).toFixed(2), 's · disparos de fibras', b.fib-a.fib, '· nós do Sdom', b.sdom, '· taxa do áudio', b.sr, '·', b.info);
  // página fora da tela: o universo congela, o microfone fica mudo (sem desligar) e volta sozinho
  const esconder=h=>p.evaluate(h=>{ Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>h?'hidden':'visible'}); document.dispatchEvent(new Event('visibilitychange')); },h);
  const t1=await p.evaluate(()=>__sdom.U.t/__sdom.U.sr); await esconder(true); await p.waitForTimeout(3000);
  const h=await p.evaluate(()=>({t:__sdom.U.t/__sdom.U.sr, on:__sdom.mic.on, mudo:__sdom.mic.muted, fila:__sdom.mic.queue.available()}));
  await esconder(false); await p.waitForTimeout(2000);
  const v=await p.evaluate(()=>({t:__sdom.U.t/__sdom.U.sr, on:__sdom.mic.on, mudo:__sdom.mic.muted, vida:__sdom.vida}));
  console.log(`fora da tela 3 s: o mundo andou ${(h.t-t1).toFixed(3)} s · microfone ligado=${h.on} mudo=${h.mudo} fila=${h.fila}`);
  console.log(`de volta 2 s: o mundo andou ${(v.t-h.t).toFixed(2)} s · ligado=${v.on} mudo=${v.mudo} · congelamentos ${v.vida.congelamentos} (${v.vida.ultimoCongeladoS.toFixed(1)} s)`);
  await p.click('#micStop'); await p.waitForTimeout(300);
  const c=await p.evaluate(async()=>{ const S=__sdom.Store; await S.flush(__sdom.U); const wav=await S.audioWav(S.uid); const json=await S.exportU(S.uid);
    return {on:__sdom.mic.on, banner:!document.getElementById('micBanner').hidden, wavBytes:wav&&wav.size, jsonTemSom: JSON.stringify(json).includes('"data"'), status:document.getElementById('micStatus').textContent}; });
  console.log('parado:', c);
  const csp=erros.filter(e=>/Content Security Policy|CSP/i.test(e));
  console.log(erros.length? 'ERROS: '+erros.join(' | ') : 'sem erros no console', csp.length? '(violações de CSP!)':'');
  await fechar();
})();
