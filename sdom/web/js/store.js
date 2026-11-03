import { CODE_VERSION } from './core/params.js';
import { snapshotOf } from './core/persist.js';

// ---------- gravação local (IndexedDB) — no núcleo, para a página e o laboratório gravarem igual ----------
export const Store={
  db:null, ok:false, ro:false, uid:null, nodePtr:0, meta:null, bytes:0,
  async open(){
    try{
      this.db=await new Promise((res,rej)=>{ const r=indexedDB.open('sdom',5);
        r.onupgradeneeded=()=>{ const d=r.result; if(!d.objectStoreNames.contains('universes')) d.createObjectStore('universes',{keyPath:'id'});
          for(const st of ['nodes','thr','weights','activity','stimuli','prunes','audio']){ if(!d.objectStoreNames.contains(st)){ const os=d.createObjectStore(st,{autoIncrement:true}); os.createIndex('u','u'); } }
          if(!d.objectStoreNames.contains('snapshots')) d.createObjectStore('snapshots',{keyPath:'u'}); };   // v5: o cérebro, para retomar
        r.onsuccess=()=>{ const d=r.result; d.onversionchange=()=>d.close(); res(d); }; r.onerror=()=>rej(r.error);
        r.onblocked=()=>setTimeout(()=>rej(new Error('bloqueado por outra aba antiga')),4000); });
      this.ok=true;
    }catch(e){ this.ok=false; }
  },
  begin(u,label){
    this.uid=new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'-'+Math.random().toString(36).slice(2,6);
    this.nodePtr=0;
    this.meta={id:this.uid, label:label||'#?', version:CODE_VERSION, params:u.p, sr:u.sr, createdAt:new Date().toISOString(), worldTimeS:0, nodes:0, edges:0, fires:0, ltp:0, ltd:0};
    if(this.ok&&!this.ro){ try{ this.db.transaction('universes','readwrite').objectStore('universes').put(this.meta); }catch(e){} }
  },
  // descarrega os registros; com `snap` (objeto, pode ser {}), guarda também a fotografia do cérebro, na mesma transação
  flush(u, snap){
    const nodes=u.nodes.slice(this.nodePtr), act=u.actLog, stim=u.stimLog;
    const wch={}; for(const e of u.wChanged) wch[e.id]=[+e.wF.toFixed(5), +e.wS.toFixed(5), e.lastUse]; u.wChanged.clear();
    const pr=u.pruneLog; u.pruneLog=[];
    this.nodePtr=u.nodes.length; u.actLog=[]; u.stimLog=[];
    if(!this.ok||!this.uid||this.ro){ u.audioChunks=[]; return Promise.resolve(); }
    try{
      const aud=u.audioChunks||[]; u.audioChunks=[];   // som bruto: só existe se a pessoa marcou a opção
      const id=this.uid, foto = snap ? Object.assign(snapshotOf(u), snap, {u:id, savedAt:Date.now(), nodePtr:this.nodePtr, t:u.t}) : null;
      const tx=this.db.transaction(['universes','nodes','weights','activity','stimuli','prunes','audio'].concat(foto?['snapshots']:[]),'readwrite');
      if(foto){ tx.objectStore('snapshots').put(foto); this.meta.snapAt=foto.savedAt; this.meta.snapVersion=CODE_VERSION; }
      if(aud.length){ const Au=tx.objectStore('audio'); for(const a of aud) Au.add({u:id, t0:a.t0, sr:a.sr, data:a.data}); this.meta.hasAudio=true; }
      const Pr=tx.objectStore('prunes'); for(const x of pr) Pr.add(Object.assign({u:id},x));
      const N=tx.objectStore('nodes'), Wt=tx.objectStore('weights'), A=tx.objectStore('activity'), S=tx.objectStore('stimuli');
      for(const n of nodes) N.add({u:id, id:n.id, lvl:n.lvl, ear:n.ear, W:n.W, thr:n.thr, mag:n.mag, refr:n.refr, born:n.born, x:+n.x.toFixed(1), y:+n.y.toFixed(1), origin:n.origin, in:n.in.map(e=>[e.id,e.from.id,e.d,e.mod])});
      if(Object.keys(wch).length) Wt.add({u:id, t:u.t, w:wch});
      for(const a of act) A.add({u:id, t0:a.t0, c:a.c});
      for(const st of stim) S.add(Object.assign({u:id},st));
      Object.assign(this.meta,{worldTimeS:+(u.t/u.sr).toFixed(3), nodes:u.nodes.length-2, edges:u.edges.length, fires:u.fireCount, ltp:u.ltp, ltd:u.ltd, consolidations:u.consol, prunedEdges:u.prunedE, prunedNodes:u.prunedN, accesses:u.accesses, updatedAt:new Date().toISOString()});
      tx.objectStore('universes').put(this.meta);
      if(tx.commit) try{ tx.commit(); }catch(e){}   // grava já (importante ao fechar a página)
      return new Promise(r=>{ tx.oncomplete=r; tx.onerror=r; tx.onabort=r; });
    }catch(e){ return Promise.resolve(); }
  },
  async dropSnapshot(id){ if(!this.ok||this.ro) return; const m=(await this.list()).find(x=>x.id===id);
    const tx=this.db.transaction(['snapshots','universes'],'readwrite'); tx.objectStore('snapshots').delete(id);
    if(m){ delete m.snapAt; m.destroyedAt=new Date().toISOString(); tx.objectStore('universes').put(m); if(this.meta&&this.meta.id===id){ delete this.meta.snapAt; this.meta.destroyedAt=m.destroyedAt; } }
    await new Promise(r=>{ tx.oncomplete=r; tx.onerror=r; tx.onabort=r; }); },
  async getSnapshot(id){ if(!this.ok) return null; return await new Promise(res=>{ const r=this.db.transaction('snapshots').objectStore('snapshots').get(id); r.onsuccess=()=>res(r.result||null); r.onerror=()=>res(null); }); },
  // o universo vivo mais recente (o último a ser guardado)
  async latestId(){ let best=null; for(const m of await this.list()) if(m.snapAt && (!best||m.snapAt>best.snapAt)) best=m; return best?best.id:null; },
  // passa a gravar no registro de um universo já existente (retomado)
  resume(meta,nodePtr){ this.uid=meta.id; this.meta=meta; this.nodePtr=nodePtr; },
  // Ao retomar da fotografia, o que foi registrado depois dela não aconteceu para o robô (ele volta ao
  // estado fotografado): esses registros são retirados, para o histórico gravado continuar coerente.
  async cleanAfter(id, nodePtr, t){
    if(!this.ok||this.ro) return 0;
    const rule={nodes:r=>r.id>=nodePtr, weights:r=>r.t>t, activity:r=>r.t0>=t, stimuli:r=>r.t>=t, prunes:r=>r.t>t, audio:r=>r.t0>=t};
    const tx=this.db.transaction(Object.keys(rule),'readwrite'); let n=0;
    for(const st in rule){ const c=tx.objectStore(st).index('u').openCursor(IDBKeyRange.only(id));
      c.onsuccess=()=>{ const cur=c.result; if(cur){ if(rule[st](cur.value)){ cur.delete(); n++; } cur.continue(); } }; }
    await new Promise(r=>{ tx.oncomplete=r; tx.onerror=r; tx.onabort=r; });
    return n;
  },
  async list(){ if(!this.ok) return []; return await new Promise(res=>{ const r=this.db.transaction('universes').objectStore('universes').getAll(); r.onsuccess=()=>res(r.result||[]); r.onerror=()=>res([]); }); },
  async getAllFor(store,id){ return await new Promise(res=>{ const r=this.db.transaction(store).objectStore(store).index('u').getAll(IDBKeyRange.only(id)); r.onsuccess=()=>res((r.result||[]).map(x=>{const y=Object.assign({},x); delete y.u; return y;})); r.onerror=()=>res([]); }); },
  async exportU(id){
    const meta=(await this.list()).find(m=>m.id===id);
    return {format:'sdom-universe/3', universe:meta, nodes:await this.getAllFor('nodes',id),
      weightChanges:await this.getAllFor('weights',id), prunes:await this.getAllFor('prunes',id), thresholdChanges:await this.getAllFor('thr',id),
      activity:await this.getAllFor('activity',id), stimuli:await this.getAllFor('stimuli',id)};
  },
  // som bruto gravado (só com a opção marcada), como WAV estéreo 16 bits. Não entra no JSON.
  async audioWav(id){
    const parts=(await this.getAllFor('audio',id)).sort((a,b)=>a.t0-b.t0); if(!parts.length) return null;
    const sr=parts[0].sr, n=parts.reduce((s,p)=>s+p.data.length,0), buf=new ArrayBuffer(44+2*n), v=new DataView(buf);
    const w=(o,s)=>{ for(let i=0;i<s.length;i++) v.setUint8(o+i,s.charCodeAt(i)); };
    w(0,'RIFF'); v.setUint32(4,36+2*n,true); w(8,'WAVE'); w(12,'fmt '); v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,2,true);
    v.setUint32(24,sr,true); v.setUint32(28,sr*4,true); v.setUint16(32,4,true); v.setUint16(34,16,true); w(36,'data'); v.setUint32(40,2*n,true);
    let o=44; for(const p of parts) for(let i=0;i<p.data.length;i++){ v.setInt16(o,p.data[i],true); o+=2; }
    return new Blob([buf],{type:'audio/wav'});
  },
  async del(id){
    const tx=this.db.transaction(['universes','nodes','thr','weights','activity','stimuli','prunes','audio','snapshots'],'readwrite');
    tx.objectStore('universes').delete(id); tx.objectStore('snapshots').delete(id);
    for(const st of ['nodes','thr','weights','activity','stimuli','prunes','audio']){ const c=tx.objectStore(st).index('u').openKeyCursor(IDBKeyRange.only(id)); const os=tx.objectStore(st); c.onsuccess=()=>{ const cur=c.result; if(cur){ os.delete(cur.primaryKey); cur.continue(); } }; }
    await new Promise(r=>{tx.oncomplete=r; tx.onerror=r;});
  },
};
