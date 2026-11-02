// Regrava tests/fixtures/referencia-<versão>.json. Só use quando uma regra mudou de propósito.
import fs from 'node:fs';
import { cenarios } from './referencia.js';
import { CODE_VERSION } from '../web/js/core/params.js';
const out={g1:cenarios.g1(), g2:cenarios.g2(), g3:cenarios.g3()};
const f=new URL(`./fixtures/referencia-${CODE_VERSION}.json`, import.meta.url);
fs.writeFileSync(f, JSON.stringify(out,null,1)); console.log('referência gravada em', f.pathname);
