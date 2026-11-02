// Microfone: a fila não deixa o atraso crescer (o mundo não espera) e a conversão de taxa preserva o som.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MicQueue, Resampler } from '../../web/js/env/micqueue.js';

test('fila: entrega na ordem, e o atraso além do limite é descartado e contado', ()=>{
  const q=new MicQueue(100); q.push(Float32Array.from([1,2,3]), Float32Array.from([4,5,6]));
  const o=[0,0]; assert.ok(q.take(o)); assert.deepEqual(o,[1,4]);
  q.push(new Float32Array(50)); assert.equal(q.available(),52);
  assert.equal(q.dropTo(10),42); assert.equal(q.available(),10); assert.equal(q.lost,42);
});
test('fila: se encher, a amostra mais antiga sai (nunca trava)', ()=>{
  const q=new MicQueue(4); q.push(Float32Array.from([1,2,3,4,5,6])); const o=[0,0]; q.take(o);
  assert.equal(o[0],3); assert.equal(q.lost,2);
});
test('mono: os dois ouvidos recebem o mesmo som', ()=>{
  const q=new MicQueue(8); q.push(Float32Array.from([0.5])); const o=[0,0]; q.take(o); assert.equal(o[0],o[1]);
});
test('conversão de 48 kHz para 16 kHz: um tom de 440 Hz continua 440 Hz, sem saltos entre pedaços', ()=>{
  const rs=new Resampler(48000,16000); const out=[];
  for(let c=0;c<10;c++){ const L=new Float32Array(1024); for(let i=0;i<1024;i++) L[i]=Math.sin(2*Math.PI*440*(c*1024+i)/48000); out.push(...rs.process(L)[0]); }
  assert.ok(Math.abs(out.length-10240/3)<=2, `tamanho ${out.length}`);
  let maxErr=0; for(let i=0;i<out.length;i++) maxErr=Math.max(maxErr,Math.abs(out[i]-Math.sin(2*Math.PI*440*i/16000)));
  assert.ok(maxErr<0.01, `erro máximo ${maxErr}`);
});
