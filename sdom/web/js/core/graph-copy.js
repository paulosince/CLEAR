export function flattenGraph(root){
  const ids=new Map([[root,0]]), list=[root], out=[];
  const ref=o=>{ let i=ids.get(o); if(i===undefined){ i=list.length; ids.set(o,i); list.push(o); } return {$r:i}; };
  const v=x=>(x===null||typeof x!=='object') ? (typeof x==='function'?null:x) : (ArrayBuffer.isView(x)? x : ref(x));
  for(let k=0;k<list.length;k++){ const o=list[k];
    if(Array.isArray(o)) out.push(o.map(v));
    else if(o instanceof Map) out.push({$map:[...o].map(([a,b])=>[v(a),v(b)])});
    else if(o instanceof Set) out.push({$set:[...o].map(v)});
    else { const q={}; for(const key in o) q[key]=v(o[key]); out.push({$o:q}); } }
  return out;
}
export function unflattenGraph(out){
  const objs=out.map(x=>Array.isArray(x)?[]:x.$map?new Map():x.$set?new Set():{});
  const v=x=>(x&&typeof x==='object'&&!ArrayBuffer.isView(x)&&x.$r!==undefined)? objs[x.$r] : x;
  out.forEach((x,i)=>{ const o=objs[i];
    if(Array.isArray(x)) for(const y of x) o.push(v(y));
    else if(x.$map) for(const [a,b] of x.$map) o.set(v(a),v(b));
    else if(x.$set) for(const y of x.$set) o.add(v(y));
    else for(const key in x.$o) o[key]=v(x.$o[key]); });
  return objs[0];
}
// Laboratório: roda um roteiro sem desenhar, o mais rápido possível (usado dentro do Web Worker)
