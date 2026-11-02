// Abre a página do Sdom num Chromium sem tela, servida por http local
// (módulos JavaScript e Web Workers não funcionam a partir de file://).
const http=require('http'), fs=require('fs'), path=require('path');
const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
async function abrir(opts={}){
  const { chromium } = require('playwright');
  const root=path.resolve(__dirname,'../web');
  const srv=http.createServer((q,r)=>{ const u=decodeURIComponent(q.url.split('?')[0]); const f=path.join(root,u==='/'?'index.html':u);
    if(!f.startsWith(root)){ r.writeHead(403); return r.end(); }
    fs.readFile(f,(e,d)=>{ if(e){ r.writeHead(404); r.end(); } else { r.writeHead(200,{'content-type':TYPES[path.extname(f)]||'application/octet-stream'}); r.end(d); } }); }).listen(0);
  const b=await chromium.launch({args:opts.args||[]}); const ctx=await b.newContext(Object.assign(opts.viewport?{viewport:opts.viewport,deviceScaleFactor:opts.dpr||1}:{}, opts.permissions?{permissions:opts.permissions}:{}));
  const page=await ctx.newPage();
  const erros=[]; page.on('pageerror',e=>erros.push(String(e))); page.on('console',m=>{ if(m.type()==='error') erros.push(m.text()); }); page.on('crash',()=>erros.push('PÁGINA TRAVOU'));
  await page.goto(`http://127.0.0.1:${srv.address().port}/`); await page.waitForFunction(()=>window.__sdom && window.__sdom.U); await page.waitForTimeout(300);
  return { page, erros, url:`http://127.0.0.1:${srv.address().port}/`, fechar:async()=>{ await b.close(); srv.close(); } };
}
module.exports={ abrir };
