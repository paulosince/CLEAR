import { CODE_VERSION } from './params.js';
import { mulberry32, pow2 } from './util.js';

export class Universe{
  constructor(p, seed){
    this.p = p; const sr = this.sr = p.sr;
    const ms = v => Math.max(1, Math.round(v*sr/1000));
    this.basal = ms(p.basalMs);
    this.bindS = ms(p.bindMs); this.gapS = ms(p.gapMs); this.minW = Math.max(1, Math.round(p.minCoincMs*sr/1000));
    this.maxW = Math.max(this.minW, Math.round(p.weber*this.bindS)); this.lastCreateT = -1e12;
    this.t = 0;
    this.rng = mulberry32(seed);
    this.nodes = []; this.edges = [];
    const maxD = this.bindS + this.basal + 2*this.maxW + 8;
    this.wsize = pow2(maxD+1); this.wmask = this.wsize-1;
    this.wheel = Array.from({length:this.wsize}, ()=>[]);
    this.Qe = []; this.qh = 0; this.touched = [];
    this.lastCreate = [-1e12,-1e12,-1e12,-1e12,-1e12];
    // histórico (gravação do observador, não do robô)
    this.hCap = Math.min(6e6, Math.max(2e5, Math.round(p.histSeconds*60000)));
    this.hT = new Float64Array(this.hCap); this.hN = new Int32Array(this.hCap); this.hCount = 0;
    this.nmCap = 400000; this.nmT = new Float64Array(this.nmCap); this.nmN = new Int32Array(this.nmCap); this.nmF = new Float32Array(this.nmCap); this.nmCount = 0;
    this.aCap = Math.round(sr*p.histSeconds); this.aud = [new Float32Array(this.aCap), new Float32Array(this.aCap)];
    this.fireCount = 0; this.capHit = false;
    // aprendizado e registros para gravação
    this.hlF = Math.max(1, p.fastHalfLifeS*sr); this.hlS = Math.max(1, p.slowHalfLifeDays*86400*sr);
    this.tagLen = p.tagHours*3600*sr; this.consol = 0;
    this.pruneLen = p.pruneDays*86400*sr; this.accessWin = p.accessWindowH*3600*sr;
    this.sweepEvery = Math.round(0.5*sr); this.candidates = 0; this.prunedE = 0; this.prunedN = 0; this.accesses = 0; this.pruneLog = [];
    this.tauP = Math.max(1e-9, p.tauPlusMs*sr/1000); this.tauM = Math.max(1e-9, p.tauMinusMs*sr/1000);
    this.ltp = 0; this.ltd = 0; this.wChanged = new Set();
    this.actLog = []; this.stimLog = [];
    this.stimCount = 0; this.stimWin = [];   // estímulos recentes, para saber de qual estímulo nasceu cada nó (malha)
    this.actWin = ms(p.actWindowMs); this.actStart = 0; this.actCounts = new Map();
    // os dois ouvidos (nível 0)
    this.addNode({lvl:0, ear:0, W:0, thr:0, mag:0, refr:0, born:0, x:60, y:250});
    this.addNode({lvl:0, ear:1, W:0, thr:0, mag:0, refr:0, born:0, x:60, y:750});
    this.buildCochlea();
    this.mpOn = !!p.mpOn; this.sdomList = [];
    if(this.mpOn) this.mpInit();
  }
  addNode(o){
    const n = Object.assign({id:this.nodes.length, out:[], in:[], contrib:[], refUntil:0, fires:0, nmT:-1e9, origin:null}, o);
    n.lastFire=-1e12; n.diedAt=Infinity;
    this.nodes.push(n); return n;
  }
  addEdge(from, to, d){
    // peso (mod) só aprende em arestas que saem de nós; ouvido→nível 1 é transdução fixa
    // peso = peso basal (wF, apaga em horas) + peso consolidado (wS, apaga em semanas). Nasce só basal.
    const w0 = from.lvl===0 ? 1 : this.p.wBirth;
    const e = {id:this.edges.length, from, to, d, wF:w0, wS:0, mod:w0, acc:0, tagUntil:-1, winExtra:0, inertSince:null, diedAt:Infinity, effect:0, born:to.born, lastUse:to.born}; // effect 0 = mantém
    from.out.push(e); to.in.push(e); this.edges.push(e); return e;
  }
  // ---- peso das arestas ----
  decayEdge(e,t){
    if(e.from.lvl===0 || t<=e.lastUse) return;
    const dt=t-e.lastUse; e.wF*=Math.pow(0.5,dt/this.hlF); e.wS*=Math.pow(0.5,dt/this.hlS); e.lastUse=t; e.mod=e.wF+e.wS;
  }
  potentiate(e,t,timing){
    if(this.mpOn && !this.mpLearn(e.to,this.p.mpCostLearn)) return;   // sem recurso para aprender
    this.decayEdge(e,t);
    const dw=this.p.aPlus*(1-e.mod)*timing; if(dw<=0) return;
    e.wF+=dw;
    if(t>e.tagUntil){ e.tagUntil=t+this.tagLen+e.winExtra; e.acc=0; }   // abre a janela de consolidação
    e.acc+=dw;
    if(e.acc>=this.p.consolThr && (!this.mpOn || this.mpLearn(e.to,this.p.mpCostConsol))){ e.wS+=e.wF; e.wF=0; e.acc=0; this.consol++; }   // consolidação
    e.mod=e.wF+e.wS; this.ltp++; this.wChanged.add(e);
  }
  depress(e,t,frac){
    if(this.mpOn && !this.mpLearn(e.to,this.p.mpCostLearn)) return;
    this.decayEdge(e,t);
    let dw=frac*e.mod; const a=Math.min(dw,e.wF); e.wF-=a; dw-=a; if(dw>0) e.wS=Math.max(0,e.wS-dw);
    e.mod=e.wF+e.wS; this.ltd++; this.wChanged.add(e);
  }
  // ---- poda ----
  // acesso: o nó de origem disparou e a incidência passou por uma aresta candidata à poda
  access(e,t){
    if(this.mpOn && !this.mpLearn(e.to,this.p.mpCostLearn)) return;
    e.wF=Math.min(1-e.wS, e.wF+this.p.accessBoost); e.mod=e.wF+e.wS;
    e.winExtra+=this.accessWin; if(e.tagUntil>=t) e.tagUntil+=this.accessWin;
    e.inertSince=null; this.accesses++; this.wChanged.add(e);
  }
  crossTime(e,t){ // quando o peso cruzou o limite de inerte (por bisseção)
    let lo=e.lastUse, hi=t; if(this.wAt(e,lo)<this.p.inertW) return lo;
    for(let i=0;i<40;i++){ const m=(lo+hi)/2; if(this.wAt(e,m)<this.p.inertW) hi=m; else lo=m; }
    return hi;
  }
  sweep(t){
    let cand=0;
    for(const e of this.edges){
      if(e.diedAt!==Infinity || e.from.lvl===0) continue;
      if(this.wAt(e,t)<this.p.inertW){
        if(e.inertSince===null) e.inertSince=this.crossTime(e,t);
        if(t-e.inertSince>=this.pruneLen) this.pruneEdge(e, Math.min(t, e.inertSince+this.pruneLen)); else cand++;
      } else e.inertSince=null;
    }
    this.candidates=cand;
  }
  pruneEdge(e,when){
    e.diedAt=when; this.prunedE++; this.pruneLog.push({t:Math.round(when), kind:'aresta', id:e.id, from:e.from.id, to:e.to.id});
    e.from.out=e.from.out.filter(x=>x!==e); e.to.in=e.to.in.filter(x=>x!==e);
    for(const n of [e.from,e.to]) if(n.lvl>0 && n.diedAt===Infinity && n.in.length===0 && n.out.length===0){
      n.diedAt=when; this.prunedN++; this.pruneLog.push({t:Math.round(when), kind:'nó', id:n.id});
    }
  }
  // pulo no tempo: o mundo fica em silêncio; só o decaimento (calculado pelo tempo passado) acontece
  jump(samples){
    const t0=this.t; this.t+=samples;
    for(const b of this.wheel) b.length=0;
    for(const n of this.nodes){ n.contrib=[]; n.refUntil=0; }
    for(const st of this.cochState) st.fill(0); for(const ih of this.ihc) ih.fill(0);
    for(const F of this.fibers) for(const f of F){ f.q1=1; f.q2=1; }   // em silêncio longo, a fibra se recupera
    this.Qe=[]; this.qh=0;
    if(this.actCounts.size){ const c={}; for(const [k,v] of this.actCounts) c[k]=v; this.actLog.push({t0:this.actStart,c}); this.actCounts.clear(); }
    this.actStart=this.t;
    this.stimLog.push({t:t0, jumpS:samples/this.sr});
    if(this.mpOn) this.mpJump(samples);
    this.sweep(this.t);
  }
  // ---- TRANSDUÇÃO AUDITIVA (fora do Sdom) ----
  // Cóclea: banco de filtros gammatone de 4ª ordem (Patterson et al., 1992), um canal por ERB
  // (Glasberg & Moore, 1990). Célula ciliada: retificação de meia-onda + passa-baixa.
  // Fibras: 3 por canal, com limiares escalonados (Liberman, 1977). Cada disparo de fibra
  // entra no Sdom como incidência de magnitude fixa (tudo-ou-nada).
  buildCochlea(){
    const sr=this.sr, N=this.p.cochChannels|0;
    this.coch=[]; this.cochState=[new Float64Array(N*8), new Float64Array(N*8)]; this.ihc=[new Float64Array(N), new Float64Array(N)];
    this.ihcC=Math.exp(-2*Math.PI*this.p.ihcLowpassHz/sr);
    const thr=[0,this.p.fiberDb2,this.p.fiberDb3].map(db=>this.p.baseThr*Math.pow(10,db/20));
    const refr=Math.max(1,Math.round(this.p.fiberRefrMs*sr/1000));
    this.fibers=[[],[]];
    this.ak1=1-Math.exp(-1/(this.p.adaptTau1Ms*sr/1000)); this.ak2=1-Math.exp(-1/(this.p.adaptTau2Ms*sr/1000));
    for(let k=0;k<N;k++){
      const E=1+k*(40/Math.max(1,N-1));               // de 1 a 41 na escala ERB
      const fc=(Math.pow(10,E/21.4)-1)/0.00437;
      const erb=24.7*(4.37e-3*fc+1), b=1.019*erb;
      const a=Math.exp(-2*Math.PI*b/sr), w=2*Math.PI*fc/sr;
      const active = fc < 0.45*sr;
      this.coch.push({k, fc, erb, active, pr:a*Math.cos(w), pi:a*Math.sin(w), g:Math.pow(1-a,4)});
      for(let e=0;e<2;e++) for(let c=0;c<3;c++){
        const yb = e===0 ? 470 : 970;
        const n=this.addNode({lvl:1, depth:1, ear:e, W:1, thr:thr[c], mag:1, refr, born:0,
          x: 225 + c*45, y: yb - 430*(k/Math.max(1,N-1)), fiber:{k, fc, cls:c, db:[0,this.p.fiberDb2,this.p.fiberDb3][c], active}, q1:1, q2:1});
        this.fibers[e].push(n);
        this.addEdge(this.nodes[e], n, this.basal);
      }
    }
  }
  cochleaStep(e,x,t){
    const st=this.cochState[e], ih=this.ihc[e], C=this.coch, F=this.fibers[e], cc=this.ihcC;
    for(let k=0;k<C.length;k++){
      const ch=C[k]; if(!ch.active) continue;
      let re=x, im=0; const o=k*8;
      for(let s=0;s<4;s++){
        const pr=st[o+2*s], pi=st[o+2*s+1];
        const yr=re+ch.pr*pr-ch.pi*pi, yi=im+ch.pr*pi+ch.pi*pr;
        st[o+2*s]=yr; st[o+2*s+1]=yi; re=yr; im=yi;
      }
      const bm=re*ch.g;                                  // movimento da membrana basilar neste lugar
      const hc=bm>0?bm:0;                                 // meia-onda (célula ciliada)
      const v = ih[k] = cc*ih[k] + (1-cc)*hc;
      for(let c=0;c<3;c++){
        const f=F[k*3+c];
        // adaptação: o reservatório local repõe o imediato; o global (=1) repõe o local
        if(f.q1<1 || f.q2<1){ const fl=(f.q2-f.q1)*this.ak1; if(fl>0){ f.q1+=fl; f.q2-=fl; } f.q2+=(1-f.q2)*this.ak2; }
        if(t>=f.refUntil && v>=f.thr && f.q1>=this.p.adaptCost){ f.q1-=this.p.adaptCost; this.fire(f,t); }
      }
    }
  }
  // um passo de tempo = uma amostra do microfone
  step(xL, xR){
    const t = this.t;
    const xs = [xL, xR];
    for(let e=0;e<2;e++){
      let x = xs[e]; if(x>1)x=1; else if(x<-1)x=-1;
      this.aud[e][t % this.aCap] = x;
      this.cochleaStep(e,x,t);
    }
    // entrega das incidências agendadas para agora
    const b = this.wheel[t&this.wmask];
    if(b.length){
      // v0.10: primeiro chegam TODAS as incidências deste instante; depois cada nó avalia uma vez.
      // (Antes, o nó avaliava a cada chegada, e a ordem de processamento dentro do mesmo instante
      // decidia o resultado — p.ex. uma inibitória simultânea era ignorada se viesse por último.)
      const touched=this.touched; touched.length=0;
      for(let i=0;i<b.length;i++){
        const it=b[i], n=it.n;
        if(!it.chk){
          const e=it.e;
          // ENFRAQUECIMENTO (sincronia): a incidência chegou DEPOIS de o nó já ter disparado.
          // Fica pendente: se ela ainda ajudar o PRÓXIMO disparo, o reforço vence (Sjöström et al., 2001);
          // se expirar sem ajudar, o enfraquecimento é aplicado.
          if(e && n.fires>0){ const dt=t-n.lastFire; if(dt>=1 && dt<5*this.tauM) it.dep=this.p.aMinus*Math.exp(-dt/this.tauM); }
          n.contrib.push(it);
        }
        if(n.mark!==t){ n.mark=t; touched.push(n); }
      }
      b.length=0;
      for(let i=0;i<touched.length;i++) this.tryFire(touched[i],t);
    }
    if(this.mpOn) this.mpStep(t);
    // criação nos níveis 2+: disparos que ninguém absorveu
    this.groupAll(t);
    if(t%this.sweepEvery===0) this.sweep(t);
    if(t-this.actStart>=this.actWin){
      if(this.actCounts.size){ const c={}; for(const [k,v] of this.actCounts) c[k]=v; this.actLog.push({t0:this.actStart, c}); this.actCounts.clear(); }
      this.actStart=t;
    }
    this.t = t+1;
  }
  tryFire(n,t){
    if(t<n.refUntil) return;
    const c=n.contrib; let k=0;
    while(k<c.length && t-c[k].t0>=n.W){
      const x=c[k]; if(x.dep && !x.used && x.e) this.depress(x.e,t,x.dep);
      k++;
    }
    if(k) c.splice(0,k);
    let s=0; for(let i=0;i<c.length;i++) s+=c[i].v;
    if(s>=n.thr-1e-9){
      // ACESSO depende do recurso operacional: abaixo do piso de disparar (ou sem saldo), o nó não dispara
      if(this.mpOn && n.lvl>=2 && !this.mpPayFire(n)){ for(let i=0;i<c.length;i++){ const x=c[i]; if(x.ev) x.ev.a=true; } return; }
      for(let i=0;i<c.length;i++){
        const x=c[i]; if(x.ev) x.ev.a=true; x.used=true;
        // REFORÇO (sincronia): chegou ANTES do disparo e contribuiu; freio: quanto mais forte, menos sobe
        if(x.e) this.potentiate(x.e,t,Math.exp(-(t-x.t0)/this.tauP));
      }
      this.fire(n,t);
    } else if(n.lvl>=2 && s>0){
      const f=s/n.thr;
      // PREPARAÇÃO do campo representacional relacional: o que chegou junto a um nó preparado já tem relação
      if(f>=this.p.prepFrac) for(let i=0;i<c.length;i++){ const x=c[i]; if(x.ev) x.ev.a=true; }
      if(f>=0.4 && t-n.nmT>40){ n.nmT=t; const k2=this.nmCount%this.nmCap; this.nmT[k2]=t; this.nmN[k2]=n.id; this.nmF[k2]=f; this.nmCount++; }
    }
  }
  fire(n,t){
    const mag = n.mag; n.lastFire = t;   // magnitude do nó é fixa (representa o que a transdução definiu)
    n.refUntil=t+n.refr; n.fires++; this.fireCount++;
    this.actCounts.set(n.id,(this.actCounts.get(n.id)||0)+1);
    const k=this.hCount%this.hCap; this.hT[k]=t; this.hN[k]=n.id; this.hCount++;
    let ev=null;
    if((n.depth||1)<this.p.maxDepth){ ev={n, t, m:mag, a:false}; this.Qe.push(ev); }
    for(let i=0;i<n.out.length;i++){
      const o=n.out[i];
      // DECAIMENTO: o peso cai com o tempo sem a aresta ser percorrida (calculado agora, de forma preguiçosa)
      this.decayEdge(o,t);
      if(o.mod<this.p.inertW) this.access(o,t);   // candidata à poda acessada
      if(o.mod<this.p.inertW) continue;      // inerte: a estrutura fica, mas não entrega nada
      let v = mag*o.mod; if(o.effect===2) v=-Math.abs(v);
      this.wheel[(t+o.d)&this.wmask].push({n:o.to, v, ev, t0:t+o.d, e:o});
      if(ev && this.p.pathRule) ev.a=true;   // variante: a incidência encontrou um caminho
    }
    if(n.lvl>=2) this.wheel[(t+n.refr)&this.wmask].push({n, chk:true});
  }
  // ---- CRIAÇÃO: relacionar disparos que acontecem juntos e ainda não têm relação ----
  // Um disparo tem relação se ajudou um nó a disparar ou o deixou preparado. Os que não têm,
  // ao fim do alcance no tempo, são relacionados por um nó novo, com tolerância proporcional
  // ao intervalo que ele relaciona.
  tol(span){ return Math.max(this.minW, Math.round(this.p.weber*span)); }
  // a relação de um nó consigo mesmo no intervalo d já está representada se ele é definido por d
  definedBy(N,d){
    const tl=this.tol(d), I=N.in;
    for(let i=0;i<I.length;i++) for(let j=0;j<I.length;j++){
      if(i===j || I[i].from!==I[j].from) continue;
      if(Math.abs((I[i].d-I[j].d)-d)<=tl) return true;
    }
    return false;
  }
  groupAll(t){
    const Q=this.Qe, B=this.bindS; let h=this.qh;
    while(h<Q.length && t-Q[h].t>=B){
      const seed=Q[h]; h++;
      if(seed.a) continue;
      if(t-this.lastCreateT<this.gapS) continue;
      if(this.nodes.length>=this.p.maxNodes){ this.capHit=true; continue; }
      const group=[seed], used=new Set([seed.n.id]); let self=null;
      for(let j=h;j<Q.length && group.length<this.p.maxGroup;j++){
        const e=Q[j]; if(e.t-seed.t>B) break;
        if(e.n===seed.n){ if(!self && e.t>seed.t) self=e; continue; }
        if(e.a || used.has(e.n.id)) continue;
        group.push(e); used.add(e.n.id);
      }
      // sozinho: pode relacionar-se consigo mesmo no tempo, se isso ainda não estiver representado
      if(group.length===1 && self && !this.definedBy(seed.n, self.t-seed.t)) group.push(self);
      if(group.length>=2) this.createGroup(group,t,h);
    }
    if(h>4096){Q.splice(0,h);h=0}
    this.qh=h;
  }
  createGroup(group,t,h){
    let mpStart=0;
    if(this.mpOn){ mpStart=this.mpPayCreate(group); if(mpStart<0) return; }   // sem recurso para criar (aprender cai primeiro)
    let tLast=-1e12, tFirst=1e12, sm=0, sy=0, dep=1;
    for(const e of group){ if(e.t>tLast)tLast=e.t; if(e.t<tFirst)tFirst=e.t; sm+=e.m; sy+=e.n.y; dep=Math.max(dep,(e.n.depth||1)); }
    const span=tLast-tFirst, W=this.tol(span), depth=dep+1;
    const n=this.addNode({lvl:Math.min(4,depth), depth, W, refr:W, thr:this.p.thrFrac*sm*this.p.wBirth, mag:Math.min(1,sm/group.length), born:t,
      x: Math.min(1150, 330 + 175*(depth-1)) + this.rng()*110, y: Math.max(20,Math.min(980, sy/group.length + (this.rng()-0.5)*40)),
      origin:{span:span*1000/this.sr, k:group.length, tolMs:W*1000/this.sr, self:group.length===2&&group[0].n===group[1].n}});
    n.malha=this.malhaAt(tFirst);
    if(this.mpOn){ n.cap=this.p.mpCap0; n.res=mpStart; n.spent=0; n.blocked=false; this.sdomList.push(n); }
    for(const e of group){ this.addEdge(e.n, n, tLast-e.t+this.basal); e.a=true; }
    this.lastCreateT=t;
    this.retroAbsorb(n,h);
  }
  // O nó recém-nascido "reconhece" o que aconteceu enquanto ele se formava,
  // para não nascerem cópias do mesmo padrão.
  retroAbsorb(n,h){
    const Q=this.Qe, bySrc=new Map();
    for(let j=Math.max(0,h-64);j<Q.length;j++){const e=Q[j]; let a=bySrc.get(e.n.id); if(!a){a=[];bySrc.set(e.n.id,a)} a.push(e)}
    const taus=new Set();
    for(const ed of n.in){ const a=bySrc.get(ed.from.id); if(a) for(const e of a) if(!e.a) taus.add(e.t+ed.d); }
    for(const tau of taus){
      let s=0; const used=[];
      for(const ed of n.in){ const a=bySrc.get(ed.from.id); if(!a)continue;
        for(const e of a){ const arr=e.t+ed.d; if(tau-arr>=0 && tau-arr<n.W){ s+=e.m*ed.mod; used.push(e); } } }
      if(s>=this.p.prepFrac*n.thr-1e-9) for(const e of used) e.a=true;
    }
  }
  // ---- MARCAPASSO DE RECURSOS (v0.11) ----
  // Fora do Sdom, com ritmo próprio. A cada batida entrega recurso operacional às reservas
  // operacionais dos nós. Reflexo fixo (à maneira do barorreflexo): o sinal das batidas freia
  // o ritmo, então em repouso o freio prevalece. Nada liga representações ao marcapasso
  // (a eferência ainda não existe nesta versão). Ver sdom/DESENHO-marcapasso-de-recursos.md.
  mpInit(){
    const p=this.p, sr=this.sr, fRest=p.mpRestBpm/60, tau=p.mpPressTauS;
    this.mp={ f:p.mpF0, phase:0, press:fRest*tau, stopped:false, beats:0, lastBeat:0, u:0,
      kB: Math.log(p.mpF0/fRest)/(fRest*tau), level:1,
      blockedFire:0, blockedLearn:0, blockedCreate:0, opsSpent:0, opsDelivered:0, lastDelivered:0, lastRequested:0 };
    this.mpPressK=Math.exp(-64/(tau*sr)); this.mpRateK=1-Math.exp(-64/(p.mpRateTauS*sr));
    this.mpHl=p.mpCapHalfLifeDays*86400*sr;
    // transdução endógena: fibras da batida (mais forte → mais fibras) e do nível geral de recurso (limiares escalonados)
    this.endoFibers=[];
    const mk=(kind,thr,i,y)=>{ const n=this.addNode({lvl:1, depth:1, ear:-1, W:1, thr:0, mag:1, refr:1, born:0, x:225+i*30, y, endo:{kind,thr}}); this.endoFibers.push(n); return n; };
    [0.25,0.5,0.75].forEach((th,i)=>mk('batida',th,i,500));
    [0.2,0.4,0.6,0.8].forEach((th,i)=>mk('nivel',th,i,525));
  }
  pisoFire(n){ const p=this.p; return Math.min(p.mpPisoDispMax, p.mpPisoDisp0+p.mpPisoDispK*Math.max(0,(n.depth||2)-2)); }
  mpPayFire(n){
    const cost=this.p.mpCostFire+this.p.mpCostEdge*n.out.length;
    if(n.res<this.pisoFire(n)*n.cap || n.res<cost){ n.blocked=true; this.mp.blockedFire++; return false; }
    n.res-=cost; n.spent+=cost; this.mp.opsSpent+=cost; return true;
  }
  mpLearn(n,cost){
    if(!n || n.lvl<2 || n.res===undefined) return true;           // fora do Sdom (não deveria acontecer)
    if(n.res<this.p.mpPisoAprender*n.cap || n.res<cost){ n.blocked=true; this.mp.blockedLearn++; return false; }
    n.res-=cost; n.spent+=cost; this.mp.opsSpent+=cost; return true;
  }
  // criar paga quem é relacionado (nós do Sdom); se só há fibras, o nó novo paga com a reserva com que nasce (cheia).
  // Devolve a reserva inicial do nó novo, ou -1 se não há recurso para aprender.
  mpPayCreate(group){
    const p=this.p, cost=p.mpCostCreate+p.mpCostCreateEdge*group.length, src=[];
    for(const e of group) if(e.n.lvl>=2 && src.indexOf(e.n)<0) src.push(e.n);
    if(src.length){
      for(const n of src) if(n.res<p.mpPisoAprender*n.cap || n.res<cost/src.length){ n.blocked=true; this.mp.blockedCreate++; return -1; }
      for(const n of src){ n.res-=cost/src.length; n.spent+=cost/src.length; }
      this.mp.opsSpent+=cost; return p.mpCap0;
    }
    if(this.mp.level<p.mpPisoAprender){ this.mp.blockedCreate++; return -1; }
    this.mp.opsSpent+=cost; return Math.max(0,p.mpCap0-cost);
  }
  mpStep(t){
    const mp=this.mp;
    if((t&63)===0){   // reflexo fixo e mudança lenta do ritmo
      mp.press*=this.mpPressK;
      const target=this.p.mpF0*Math.exp(-mp.kB*mp.press+mp.u);
      mp.f+=(target-mp.f)*this.mpRateK;
    }
    if(mp.stopped) return;
    mp.phase+=mp.f/this.sr;
    if(mp.phase>=1){ mp.phase-=1; this.mpBeat(t); }
  }
  mpBeat(t){
    const p=this.p, mp=this.mp, L=this.sdomList, dt=t-mp.lastBeat; mp.lastBeat=t; mp.beats++;
    const decay=Math.pow(0.5,dt/this.mpHl), grow=p.mpGrowPerDay/(86400*Math.max(0.1,mp.f));
    let req=0, alive=0, sumFrac=0;
    for(let i=0;i<L.length;i++){ const n=L[i]; if(n.diedAt!==Infinity) continue;
      // adaptação: falta sustentada aumenta o teto; sem falta, ele volta devagar ao inicial
      n.cap = n.blocked ? Math.min(p.mpCapMax, n.cap*(1+grow)) : p.mpCap0+(n.cap-p.mpCap0)*decay;
      alive++; sumFrac+=Math.max(0,n.res)/n.cap;   // nível geral medido ANTES da reposição (o ponto mais baixo do ciclo)
      n.want=Math.max(0,Math.min(n.cap-n.res, p.mpBaseOps+p.mpOver*n.spent)); req+=n.want; }
    const give=p.mpBeatOps, k= req>0 ? Math.min(1,give/req) : 0;
    let delivered=0;
    for(let i=0;i<L.length;i++){ const n=L[i]; if(n.diedAt!==Infinity) continue;
      const g=n.want*k; n.res+=g; delivered+=g; n.spent=0; n.blocked=false; }
    mp.level = alive? sumFrac/alive : 1; mp.opsDelivered+=delivered; mp.lastDelivered=delivered; mp.lastRequested=req;
    mp.press+=1;   // força da batida fixa nesta versão
    // transdução endógena: a batida e o nível geral entram no Sdom como incidências
    for(const f of this.endoFibers){ const e=f.endo; if(e.kind==='batida' ? 1>=e.thr : mp.level>=e.thr) this.fire(f,t); }
  }
  mpJump(samples){
    const p=this.p, mp=this.mp, decay=Math.pow(0.5,samples/this.mpHl);
    for(const n of this.sdomList){ if(n.diedAt!==Infinity) continue; n.cap=p.mpCap0+(n.cap-p.mpCap0)*decay; n.res=n.cap; n.spent=0; n.blocked=false; }
    const fRest=p.mpRestBpm/60; mp.f=fRest; mp.press=fRest*p.mpPressTauS; mp.level=1; mp.lastBeat=this.t; mp.phase=0;
  }
  // ---- estímulos e malhas ----
  // Registra um estímulo (nota, sílaba, gota…) que começa em rec.t e soa até t1 (amostras).
  addStimulus(rec,t1){
    rec.id=this.stimCount++; this.stimLog.push(rec);
    this.stimWin.push({id:rec.id, t0:rec.t, t1});
    if(this.stimWin.length>256){ const lim=this.t-2*this.sr; this.stimWin=this.stimWin.filter(s=>s.t1>=lim); }
    return rec.id;
  }
  // Malha (provisório, regra combinada com o Paulo: "malha = criada por um estímulo"):
  // o nó novo pertence ao estímulo que começou por último antes do primeiro disparo que ele relaciona
  // e que ainda soava nesse momento. -1 = nenhum estímulo identificado.
  malhaAt(t){ let best=-1, bt=-Infinity;
    for(const s of this.stimWin) if(s.t0<=t && s.t1>=t && s.t0>bt){ bt=s.t0; best=s.id; }
    return best; }
  malhaCount(){ const m=new Set(); for(const n of this.nodes) if(n.lvl>=2 && n.diedAt===Infinity && n.malha!==undefined && n.malha>=0) m.add(n.malha); return m.size; }
  // ---- consultas para o observador ----
  histRange(){ const lo=Math.max(0,this.hCount-this.hCap); return lo; }
  firstHistIdx(time){ // primeiro índice com tempo >= time
    let lo=Math.max(0,this.hCount-this.hCap), hi=this.hCount;
    while(lo<hi){const m=(lo+hi)>>1; if(this.hT[m%this.hCap]<time) lo=m+1; else hi=m;}
    return lo;
  }
  firstNmIdx(time){
    let lo=Math.max(0,this.nmCount-this.nmCap), hi=this.nmCount;
    while(lo<hi){const m=(lo+hi)>>1; if(this.nmT[m%this.nmCap]<time) lo=m+1; else hi=m;}
    return lo;
  }
  visibleCount(time){ let lo=0,hi=this.nodes.length; while(lo<hi){const m=(lo+hi)>>1; if(this.nodes[m].born<=time) lo=m+1; else hi=m;} return lo; }
  visibleEdges(time){ let lo=0,hi=this.edges.length; while(lo<hi){const m=(lo+hi)>>1; if(this.edges[m].born<=time) lo=m+1; else hi=m;} return lo; }
  earliestViewable(){
    const a=Math.max(0,this.t-this.aCap+1);
    const lo=Math.max(0,this.hCount-this.hCap);
    const h = this.hCount>this.hCap ? this.hT[lo%this.hCap] : 0;
    return Math.max(a,h);
  }
  wAt(e,time){ // peso efetivo da aresta em `time` (null se a última mudança é posterior)
    if(e.lastUse>time) return null;
    if(e.from.lvl===0) return e.mod;
    const dt=time-e.lastUse; return e.wF*Math.pow(0.5,dt/this.hlF)+e.wS*Math.pow(0.5,dt/this.hlS);
  }
  wsAt(e,time){ if(e.lastUse>time) return null; return e.wS*Math.pow(0.5,(time-e.lastUse)/this.hlS); }
  toJSON(){
    return {version:CODE_VERSION, params:this.p, worldTimeS:this.t/this.sr,
      nodes:this.nodes.map(n=>({id:n.id,lvl:n.lvl,ear:n.ear,W:n.W,thr:+n.thr.toFixed(5),mag:+n.mag.toFixed(4),refr:n.refr,born:n.born,fires:n.fires,
        in:n.in.map(e=>[e.from.id,e.d,+this.wAt(e,this.t).toFixed(4)])}))};
  }
}
