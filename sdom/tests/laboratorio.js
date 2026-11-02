// Roda um roteiro no laboratório (Web Worker) e imprime a evolução por segundo de mundo.
// Uso: node laboratorio.js [roteiro=casa] [segundos=10] [semente=2026] [taxa=16000]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const [scen='casa', dur='10', seed='2026', sr='16000'] = process.argv.slice(2);
(async () => {
  // serve a pasta web por http (o navegador não deixa criar Worker a partir de file://)
  const root = path.resolve(__dirname, '../web');
  const srv = http.createServer((q, r) => { const f = path.join(root, q.url === '/' ? 'index.html' : q.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, {'content-type': 'text/html'}); r.end(d); } }); }).listen(0);
  const port = srv.address().port;
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('crash', () => errs.push('PÁGINA TRAVOU (crash)')); p.on('load', () => errs.push('página recarregou'));
  await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(500); errs.length = 0;
  await p.evaluate(s => { const i = document.querySelector('#params input[data-k="sr"]'); if (i) i.value = s; }, sr);
  const ok = await p.evaluate(([a, d, s]) => window.__sdom.lab.start(a, +d, +s), [scen, dur, seed]);
  if (!ok) throw new Error('não iniciou');
  const t0 = Date.now(); let last = 0;
  while (await p.evaluate(() => window.__sdom.lab.busy)) {
    await p.waitForTimeout(2000);
    const S = await p.evaluate(() => window.__sdom.lab.series.slice(-1)[0]);
    if (S && S.t - last >= 30) { last = S.t; console.log(`  … ${S.t} s de mundo · ${S.wallS} s reais · Sdom ${S.sdom} · arestas ${S.edges} · disparos/s ${S.firesPerS}`); }
    if (errs.length) break;
  }
  const r = await p.evaluate(() => { const L = window.__sdom.lab, U = window.__sdom.U;
    return { res: L.result, series: L.series, adopted: { t: U.t / U.sr, nodes: U.nodes.filter(n => n.lvl >= 2 && n.diedAt === Infinity).length, sources: window.__sdom.W.sources.map(s => s.label + ':' + s.inst) } }; });
  await p.waitForTimeout(1500);
  const live = await p.evaluate(() => window.__sdom.U.t / window.__sdom.U.sr);
  console.log(`roteiro ${scen} · ${dur} s · semente ${seed} · ${sr} Hz`);
  console.log(`tempo real total: ${((Date.now() - t0) / 1000).toFixed(1)} s · resultado:`, r.res);
  const step = Math.max(1, Math.round(r.series.length / 20));
  console.log('t(s)  Sdom  arestas  disparos/s  s_reais');
  r.series.forEach((x, i) => { if (i % step === 0 || i === r.series.length - 1) console.log(String(x.t).padStart(5), String(x.sdom).padStart(5), String(x.edges).padStart(8), String(x.firesPerS).padStart(10), String(x.wallS).padStart(8)); });
  console.log('adotado na página:', r.adopted, '· depois de 1,5 s o universo segue vivo em', live.toFixed(2), 's');
  console.log(errs.length ? 'ERROS: ' + errs.join(' | ') : 'sem erros no console');
  const mem = await p.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null);
  console.log('memória JS da página (MB):', mem);
  const st = await p.evaluate(async () => { const S = window.__sdom.Store; const L = await S.list(); const m = L.find(x => x.id === S.uid); if (!m) return null;
    const cnt = async s => (await S.getAllFor(s, m.id)).length;
    return { label: m.label, worldTimeS: m.worldTimeS, nodes: m.nodes, labSeries: m.lab && m.lab.series ? m.lab.series.length : 0, gravados: { nodes: await cnt('nodes'), activity: await cnt('activity'), stimuli: await cnt('stimuli'), weights: await cnt('weights') } }; });
  console.log('gravação (IndexedDB):', st);
  await b.close(); srv.close();
})();
