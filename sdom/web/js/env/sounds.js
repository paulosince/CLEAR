import { mulberry32 } from '../core/util.js';

/* =====================================================================
   Ambiente: sala 4×4 m, robô com dois microfones, fontes sonoras sintéticas
   Todos os sons são sintetizados por fórmula, amostra a amostra, sem estado:
   valor = soma de componentes [ω, amplitude, decaimento, fase, chirp, ωvibrato, profundidade]
   (+ ruído "embaralhado" por hash, para mar e carros). Nenhuma gravação real.
   ===================================================================== */
export const INST = {
  piano:{name:'Piano', letter:'P', color:'#e6c35c', tail:0.5},
  viola:{name:'Viola', letter:'V', color:'#d9805f', tail:0.15},
  tom:{name:'Tom puro', letter:'T', color:'#7fd1e8', tail:0.04},
  ruido:{name:'Ruído', letter:'R', color:'#b0b0b0', tail:0.03},
  voz:{name:'Voz (vogais)', letter:'Vz', color:'#8fd18a', tail:0.05},
  passo:{name:'Passo', letter:'Ps', color:'#b59a7a', tail:0.25, perc:true},
  porta:{name:'Porta batendo', letter:'Pt', color:'#9a7356', tail:0.9, perc:true},
  campainha:{name:'Campainha', letter:'Cp', color:'#f0d070', tail:2.5, perc:true},
  gota:{name:'Chuva (gota)', letter:'Ch', color:'#6aa0e0', tail:0.06, perc:true},
  // v0.10 — instrumentos do Cânone e sons ambiente
  violino:{name:'Violino', letter:'Vn', color:'#e09a6a', tail:0.15},
  violoncelo:{name:'Violoncelo', letter:'Vc', color:'#b8704a', tail:0.2},
  cravo:{name:'Cravo', letter:'Cr', color:'#d8c27a', tail:0.6, perc:true},
  passaro:{name:'Pássaro', letter:'Pa', color:'#9ad06a', tail:0.02},
  onda:{name:'Onda do mar', letter:'Ma', color:'#5aa8c8', tail:0},
  carro:{name:'Carro', letter:'Ca', color:'#909aa8', tail:0},
};
// Instrumentos de arco: harmônicos com uma ressonância de corpo (centro, largura em Hz) e vibrato leve.
// Centros e larguras são escolha minha, para diferenciar os timbres (não medidos).
const BOWED = { viola:[900,350,0], violino:[2500,700,1], violoncelo:[600,300,1] };
// Formantes médios das vogais (F1, F2, F3 em Hz), Peterson & Barney (1952), homens e mulheres adultos.
// Ordem: i, é (ɛ), a (ɑ), ó (ɔ), u
export const VOWELS = ['i','é','a','ó','u'];
export const FORMANTS = {
  m:[[270,2290,3010],[530,1840,2480],[730,1090,2440],[570,840,2410],[300,870,2240]],
  f:[[310,2790,3310],[610,2330,2990],[850,1220,2810],[590,920,2710],[370,950,2670]],
};
// crianças: formantes femininos × 1,15 (aproximação minha: trato vocal menor sobe os formantes)
FORMANTS.c = FORMANTS.f.map(r=>r.map(x=>Math.round(x*1.15)));
// ruído determinístico: um número em [-1,1] para cada (amostra, semente)
export function hashNoise(k,seed){ k=Math.imul((k|0)^seed^0x9e3779b9,0x85ebca6b); k^=k>>>13; k=Math.imul(k,0xc2b2ae35); k^=k>>>16; return (k>>>0)/4294967296*2-1; }
// ruído "abafado": média de m amostras seguidas (filtro passa-baixa simples, sem estado)
function lowNoise(k,m,seed){ let s=0; for(let j=0;j<m;j++) s+=hashNoise(k-j,seed); return s/Math.sqrt(m); }
export const FORM_BW = [60,100,150];   // larguras de banda dos formantes (Hz): escolha minha, valores típicos
export function makeNote(inst,f,dur,amp,sr,opt){
  opt=opt||{}; const parts=[]; const ny=0.45*sr; const T=2*Math.PI;
  const R=mulberry32((opt.seed|0)||1);
  const rnd=(a,b)=>a+(b-a)*R(), logr=(a,b)=>a*Math.exp(R()*Math.log(b/a));
  let quiet=false; // componentes com fase aleatória: normaliza pela energia, não pela soma
  if(inst==='piano'){
    for(let h=1;h<=10;h++){ const fh=f*h*Math.sqrt(1+0.0004*h*h); if(fh>ny)break; parts.push([T*fh, 1/Math.pow(h,1.1), 1.2+0.9*h, 0, 0]); }
  } else if(inst==='viola' || inst==='violino' || inst==='violoncelo'){
    const [fc,bw,vib]=BOWED[inst];
    for(let h=1;h<=14;h++){ const fh=f*h; if(fh>ny)break; const form=1+1.2*Math.exp(-Math.pow((fh-fc)/bw,2));
      if(vib) parts.push([T*fh, form/h, 0, 0, 0, T*5.5, 0.004*fh/5.5]);   // vibrato de 5,5 Hz, ±0,4%
      else parts.push([T*fh, form/h, 0, 0, 0]); }
  } else if(inst==='cravo'){
    // corda pinçada: muitos harmônicos, os agudos morrem mais rápido
    for(let h=1;h<=12;h++){ const fh=f*h; if(fh>ny)break; parts.push([T*fh, (0.6+0.4*Math.abs(Math.sin(1.7*h)))/h, 3+0.8*h, 0, 0]); }
  } else if(inst==='passaro'){
    // trinado: tom que desliza (chirp) com modulação rápida; 2º harmônico fraco
    const g=opt.glide||0, tr=opt.trill||0, dep=opt.depth||0;
    if(f<=ny) parts.push([T*f, 1, 0, 0, T*f*g/2, T*tr, tr? dep*f/tr : 0]);
    if(2*f<=ny) parts.push([T*2*f, 0.15, 0, 0, T*f*g, T*tr, tr? 2*dep*f/tr : 0]);
  } else if(inst==='carro'){
    // motor: harmônicos de f (giro), descendo de leve ao passar (efeito Doppler); o ronco vem do ruído
    const g=opt.glide||0;
    for(let h=1;h<=8;h++){ const fh=f*h; if(fh>ny)break; parts.push([T*fh, 1/h, 0, rnd(0,T), T*fh*g/2]); }
  } else if(inst==='tom'){ parts.push([T*f,1,0,0,0]); }
  else if(inst==='voz'){
    // fonte glotal harmônica (f = altura, f0) moldada por 3 ressonâncias (formantes) em cascata.
    // Inclinação da fonte (−12 dB/oitava) + radiação dos lábios (+6) = 1/h.
    const F=FORMANTS[opt.sex==='f'?'f':opt.sex==='c'?'c':'m'][(opt.v??2)%5], g=opt.glide||0;
    for(let h=1;h<=60;h++){ const fh=f*h; if(fh>ny||fh>5000)break;
      let a=1/h; for(let k=0;k<3;k++){ const Fk=F[k], B=FORM_BW[k]; a*=Fk*Fk/Math.sqrt(Math.pow(Fk*Fk-fh*fh,2)+Math.pow(B*fh,2)); }
      parts.push([T*fh, a, 0, 0, T*fh*g/2]); }   // glide: f0 varia linearmente (entonação)
  } else if(inst==='passo'){
    quiet=true;
    for(let i=0;i<14;i++){ const fr=logr(60,400); if(fr>ny)continue; parts.push([T*fr, 1, rnd(25,60), rnd(0,T), 0]); }     // baque
    for(let i=0;i<10;i++){ const fr=logr(1000,4000); if(fr>ny)continue; parts.push([T*fr, 0.3, rnd(150,300), rnd(0,T), 0]); } // arrasto
  } else if(inst==='porta'){
    quiet=true;
    for(let i=0;i<12;i++){ const fr=logr(40,200); parts.push([T*fr, 1, rnd(12,25), rnd(0,T), 0]); }        // baque grave
    for(let i=0;i<14;i++){ const fr=logr(250,2500); if(fr>ny)continue; parts.push([T*fr, 0.35, rnd(6,15), rnd(0,T), 0]); } // vibração da porta
    for(let i=0;i<6;i++){ const fr=logr(2000,5000); if(fr>ny)continue; parts.push([T*fr, 0.4, 400, rnd(0,T), 0]); }        // estalo
  } else if(inst==='campainha'){
    // barra livre-livre (carrilhão): parciais 1 : 2,756 : 5,404 : 8,933 (Rossing)
    const r=[1,2.756,5.404,8.933], A=[1,0.5,0.3,0.15], D=[1.5,3,6,10];
    for(let i=0;i<4;i++){ const fr=f*r[i]; if(fr>ny)break; parts.push([T*fr, A[i], D[i], 0, 0]); }
  } else if(inst==='gota'){
    quiet=true;
    let fr=logr(1500,6000); if(fr>ny) fr=rnd(0.5,0.9)*ny;
    parts.push([T*fr, 1, rnd(120,200), rnd(0,T), T*fr*rnd(0,3)]);
    for(let i=0;i<3;i++){ const fc=logr(3000,7000); if(fc>ny)continue; parts.push([T*fc, 0.3, 900, rnd(0,T), 0]); }   // estalo do impacto
  }
  let norm=0;
  if(quiet){ for(const p of parts) norm+=p[1]*p[1]; norm=1.5*Math.sqrt(norm); }
  else if(inst==='cravo'||inst==='carro'){ for(const p of parts) norm+=p[1]*p[1]; norm=1.2*Math.sqrt(norm); }
  else if(inst==='voz'){ let mx=0; for(const p of parts) mx=Math.max(mx,p[1]); for(const p of parts) norm+=p[1]; norm=1.4*Math.max(norm*0.6, mx); }
  else for(const p of parts) norm+=p[1];
  const nt={inst,f,dur,amp,parts,norm:norm||1};
  if(inst==='onda'||inst==='carro'){ nt.seed=(opt.seed|0)||1; nt.m=Math.max(2,Math.round((inst==='onda'?8:32)*sr/16000)); nt.rise=opt.rise||1; }
  return nt;
}
export function noteValue(nt,tt,sr){
  if(tt<0) return 0;
  const d=nt.dur; let env;
  switch(nt.inst){
    case 'piano': env=Math.min(1,tt/0.002)*(tt>d?Math.exp(-(tt-d)/0.08):1); break;
    case 'viola': env=Math.min(1,tt/0.08)*(tt>d?Math.max(0,1-(tt-d)/0.12):1); break;
    case 'tom':   env=Math.min(1,tt/0.005)*(tt>d?Math.max(0,1-(tt-d)/0.03):1); break;
    case 'voz':   env=Math.min(1,tt/0.015)*(tt>d?Math.max(0,1-(tt-d)/0.04):1); break;
    case 'ruido': { env=Math.min(1,tt/0.002)*(tt>d?Math.max(0,1-(tt-d)/0.02):1);
      let k=Math.floor(tt*sr)|0; k=Math.imul(k^0x9e3779b9,0x85ebca6b); k^=k>>>13; k=Math.imul(k,0xc2b2ae35); k^=k>>>16;
      return nt.amp*env*((k>>>0)/4294967296*2-1)*0.8; }
    case 'violino': case 'violoncelo': env=Math.min(1,tt/0.06)*(tt>d?Math.max(0,1-(tt-d)/0.12):1); break;
    case 'passaro': env=Math.min(1,tt/0.004)*(tt>d?Math.max(0,1-(tt-d)/0.008):1); break;
    case 'onda': { // ondulação: sobe (rise) e desce até o fim; ruído abafado + espuma (ruído claro) no auge
      if(tt>=d) return 0; const r=nt.rise; const e= tt<r ? Math.pow(Math.sin(Math.PI/2*tt/r),2) : Math.pow(Math.cos(Math.PI/2*(tt-r)/(d-r)),2);
      const k=Math.floor(tt*sr); return nt.amp*e*(0.55*lowNoise(k,nt.m,nt.seed)+0.18*e*hashNoise(k,nt.seed^0x5555)); }
    case 'carro': { // passagem: sobe e desce em sen²; ronco (ruído bem abafado) + motor
      if(tt>=d) return 0; const e=Math.pow(Math.sin(Math.PI*tt/d),2); const k=Math.floor(tt*sr);
      let s=0; const P=nt.parts; for(let i=0;i<P.length;i++){ const p=P[i]; s+=p[1]*Math.sin(p[0]*tt+p[3]+p[4]*tt*tt); }
      return nt.amp*e*(0.5*lowNoise(k,nt.m,nt.seed)+0.35*s/nt.norm); }
    default: env = tt>d+INST[nt.inst].tail ? 0 : Math.min(1,tt/0.0008);   // percussivos: o decaimento está em cada componente
  }
  if(env<=0) return 0;
  let s=0; const P=nt.parts;
  // vibrato/trinado: todos os componentes de uma nota têm a mesma frequência de modulação → um seno por amostra
  let sv=0, svOk=false;
  for(let i=0;i<P.length;i++){ const p=P[i]; let ph=p[0]*tt+p[3]+p[4]*tt*tt; if(p[6]){ if(!svOk){ sv=Math.sin(p[5]*tt); svOk=true; } ph+=p[6]*sv; }
    let v=p[1]*Math.sin(ph); if(p[2]) v*=Math.exp(-p[2]*tt); s+=v; }
  return nt.amp*env*s/nt.norm;
}
