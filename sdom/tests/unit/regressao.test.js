// Regressão: com a mesma semente, o resultado tem que ser idêntico ao gravado na versão atual
// (a reorganização em módulos não mudou nada; a v0.10 mudou a entrega simultânea). Se uma regra mudar DE PROPÓSITO, atualize a referência
// com: node tests/atualizar-referencia.js  — e registre o motivo no commit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cenarios, impressao } from '../referencia.js';
const REF=JSON.parse(fs.readFileSync(new URL('../fixtures/referencia-v0.10.json', import.meta.url)));

test('6 pianos + 6 violas, pulo de 8 dias e mais uma nota (semente 777)', ()=>{ assert.deepEqual(cenarios.g1(), REF.g1); });
test('laboratório, roteiro Casa, 15 s (semente 2026)', ()=>{ const g=cenarios.g2(); assert.deepEqual(g.series, REF.g2.series); assert.deepEqual(g.fp, REF.g2.fp); assert.equal(g.stim, REF.g2.stim); });
test('microfone a 8 kHz, 3 notas de piano (semente 5)', ()=>{ assert.deepEqual(cenarios.g3(), REF.g3); });
