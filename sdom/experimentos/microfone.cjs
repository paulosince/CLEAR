// Testa "ouvir o mundo" com um microfone falso do Chromium (um bipe), sem tocar em microfone de verdade.
// Uso: NODE_PATH=$(npm root -g) node experimentos/microfone.cjs
const { abrir } = require('./servidor.cjs');
(async()=>{
  const { page:p, erros, fechar } = await abrir({ args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required'], permissions:['microphone'] });
  const r0=await p.evaluate(()=>({micOn:__sdom.mic.on, banner:!document.getElementById('micBanner').hidden}));
  console.log('ao abrir:', r0, '(tem que ser desligado e sem aviso)');
  await p.evaluate(()=>document.getElementById('micRec').click());
  await p.click('#micBtn'); await p.waitForTimeout(1500);
  const a=await p.evaluate(()=>({on:__sdom.mic.on, t:__sdom.U.t/__sdom.U.sr, fib:__sdom.U.nodes.filter(n=>n.fiber).reduce((s,n)=>s+n.fires,0), chipsOff:[...document.querySelectorAll('.chip')].every(b=>b.disabled), banner:!document.getElementById('micBanner').hidden, status:document.getElementById('micStatus').textContent}));
  await p.waitForTimeout(5000);
  const b=await p.evaluate(()=>({t:__sdom.U.t/__sdom.U.sr, fib:__sdom.U.nodes.filter(n=>n.fiber).reduce((s,n)=>s+n.fires,0), sdom:__sdom.U.nodes.filter(n=>n.lvl>=2).length, info:document.getElementById('micInfo').textContent, sr:__sdom.mic.ctx&&__sdom.mic.ctx.sampleRate}));
  console.log('ligado:', a); console.log('depois de 5 s reais: mundo avançou', (b.t-a.t).toFixed(2), 's · disparos de fibras', b.fib-a.fib, '· nós do Sdom', b.sdom, '· taxa do áudio', b.sr, '·', b.info);
  await p.click('#micStop'); await p.waitForTimeout(300);
  const c=await p.evaluate(async()=>{ const S=__sdom.Store; await S.flush(__sdom.U); const wav=await S.audioWav(S.uid); const json=await S.exportU(S.uid);
    return {on:__sdom.mic.on, banner:!document.getElementById('micBanner').hidden, wavBytes:wav&&wav.size, jsonTemSom: JSON.stringify(json).includes('"data"'), status:document.getElementById('micStatus').textContent}; });
  console.log('parado:', c);
  const csp=erros.filter(e=>/Content Security Policy|CSP/i.test(e));
  console.log(erros.length? 'ERROS: '+erros.join(' | ') : 'sem erros no console', csp.length? '(violações de CSP!)':'');
  await fechar();
})();
