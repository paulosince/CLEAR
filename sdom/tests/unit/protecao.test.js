// Proteção: a página não pode falar com nenhum outro endereço (o som do microfone não sai do aparelho).
// Este teste roda a cada push no GitHub; se alguém incluir por engano um envio de dados, ele falha.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const WEB=new URL('../../web/', import.meta.url).pathname;
const arquivos=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?arquivos(path.join(d,e.name)):[path.join(d,e.name)]);

test('a página declara a política de segurança (só o próprio site, sem conexões externas)', ()=>{
  const html=fs.readFileSync(path.join(WEB,'index.html'),'utf8');
  const m=html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/); assert.ok(m,'CSP ausente');
  for(const r of ["default-src 'self'","script-src 'self'","connect-src 'self'","object-src 'none'"]) assert.ok(m[1].includes(r), `falta ${r}`);
  assert.ok(/name="referrer" content="no-referrer"/.test(html));
  assert.ok(!/<script[^>]+src="https?:/i.test(html), 'script de outro site');
});
test('nenhum código envia dados para fora (fetch, XHR, WebSocket, sendBeacon, EventSource)', ()=>{
  for(const f of arquivos(WEB).filter(f=>f.endsWith('.js'))){
    const src=fs.readFileSync(f,'utf8');
    for(const bad of [/\bfetch\s*\(/, /XMLHttpRequest/, /new\s+WebSocket/, /sendBeacon/, /new\s+EventSource/, /import\s*\(\s*['"]https?:/])
      assert.ok(!bad.test(src), `${path.relative(WEB,f)} usa ${bad}`);
  }
});
test('o microfone nunca liga sozinho: só pelo botão', ()=>{
  const app=fs.readFileSync(path.join(WEB,'js/ui/app.js'),'utf8'), mic=fs.readFileSync(path.join(WEB,'js/ui/mic.js'),'utf8');
  assert.ok(!/startMic\s*\(/.test(app), 'app.js chama startMic');
  const calls=[...mic.matchAll(/startMic\s*\(/g)].length; assert.equal(calls,2, 'startMic: só a definição e o botão');
  assert.ok(/visibilitychange/.test(mic) && /stopMic\('a aba saiu de foco'\)/.test(mic), 'tem que parar quando a aba sai de foco');
});
