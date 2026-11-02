import { CODE_VERSION } from './core/params.js';

// ---------- gravação local (IndexedDB) — no núcleo, para a página e o laboratório gravarem igual ----------
export const Store={
  db:null, ok:false, uid:null, nodePtr:0, meta:null, bytes:0,
  async open(){
    try{
      this.db=await new Promise((res,rej)=>{ const r=indexedDB.open('sdom',3);
        r.onupgradeneeded=()=>{ const d=r.result; if(!d.objectStoreNames.contains('universes')) d.createObjectStore('universes',{keyPath:'id'});
          for(const st of ['nodes','thr','weights','activity','stimuli','prunes']){ if(!d.objectStoreNames.contains(st)){ const os=d.createObjectStore(st,{autoIncrement:true}); os.createIndex('u','u'); } } };
        r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
      this.ok=true;
    }catch(e){ this.ok=false; }
  },
  begin(u,label){
    this.uid=new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'-'+Math.random().toString(36).slice(2,6);
    this.nodePtr=0;
    this.meta={id:this.uid, label:label||'#?', version:CODE_VERSION, params:u.p, sr:u.sr, createdAt:new Date().toISOString(), worldTimeS:0, nodes:0, edges:0, fires:0, ltp:0, ltd:0};
    if(this.ok){ try{ this.db.transaction('universes','readwrite').objectStore('universes').put(this.meta); }catch(e){} }
  },
  flush(u){
    const nodes=u.nodes.slice(this.nodePtr), act=u.actLog, stim=u.stimLog;
    const wch={}; for(const e of u.wChanged) wch[e.id]=[+e.wF.toFixed(5), +e.wS.toFixed(5), e.lastUse]; u.wChanged.clear();
    const pr=u.pruneLog; u.pruneLog=[];
    this.nodePtr=u.nodes.length; u.actLog=[]; u.stimLog=[];
    if(!this.ok||!this.uid) return Promise.resolve();
    try{
      const tx=this.db.transaction(['universes','nodes','weights','activity','stimuli','prunes'],'readwrite'), id=this.uid;
      const Pr=tx.objectStore('prunes'); for(const x of pr) Pr.add(Object.assign({u:id},x));
      const N=tx.objectStore('nodes'), Wt=tx.objectStore('weights'), A=tx.objectStore('activity'), S=tx.objectStore('stimuli');
      for(const n of nodes) N.add({u:id, id:n.id, lvl:n.lvl, ear:n.ear, W:n.W, thr:n.thr, mag:n.mag, refr:n.refr, born:n.born, x:+n.x.toFixed(1), y:+n.y.toFixed(1), origin:n.origin, in:n.in.map(e=>[e.id,e.from.id,e.d,e.mod])});
      if(Object.keys(wch).length) Wt.add({u:id, t:u.t, w:wch});
      for(const a of act) A.add({u:id, t0:a.t0, c:a.c});
      for(const st of stim) S.add(Object.assign({u:id},st));
      Object.assign(this.meta,{worldTimeS:+(u.t/u.sr).toFixed(3), nodes:u.nodes.length-2, edges:u.edges.length, fires:u.fireCount, ltp:u.ltp, ltd:u.ltd, consolidations:u.consol, prunedEdges:u.prunedE, prunedNodes:u.prunedN, accesses:u.accesses, updatedAt:new Date().toISOString()});
      tx.objectStore('universes').put(this.meta);
      return new Promise(r=>{ tx.oncomplete=r; tx.onerror=r; tx.onabort=r; });
    }catch(e){ return Promise.resolve(); }
  },
  async list(){ if(!this.ok) return []; return await new Promise(res=>{ const r=this.db.transaction('universes').objectStore('universes').getAll(); r.onsuccess=()=>res(r.result||[]); r.onerror=()=>res([]); }); },
  async getAllFor(store,id){ return await new Promise(res=>{ const r=this.db.transaction(store).objectStore(store).index('u').getAll(IDBKeyRange.only(id)); r.onsuccess=()=>res((r.result||[]).map(x=>{const y=Object.assign({},x); delete y.u; return y;})); r.onerror=()=>res([]); }); },
  async exportU(id){
    const meta=(await this.list()).find(m=>m.id===id);
    return {format:'sdom-universe/3', universe:meta, nodes:await this.getAllFor('nodes',id),
      weightChanges:await this.getAllFor('weights',id), prunes:await this.getAllFor('prunes',id), thresholdChanges:await this.getAllFor('thr',id),
      activity:await this.getAllFor('activity',id), stimuli:await this.getAllFor('stimuli',id)};
  },
  async del(id){
    const tx=this.db.transaction(['universes','nodes','thr','weights','activity','stimuli','prunes'],'readwrite');
    tx.objectStore('universes').delete(id);
    for(const st of ['nodes','thr','weights','activity','stimuli','prunes']){ const c=tx.objectStore(st).index('u').openKeyCursor(IDBKeyRange.only(id)); const os=tx.objectStore(st); c.onsuccess=()=>{ const cur=c.result; if(cur){ os.delete(cur.primaryKey); cur.continue(); } }; }
    await new Promise(r=>{tx.oncomplete=r; tx.onerror=r;});
  },
};
