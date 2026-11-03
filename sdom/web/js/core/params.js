/* =====================================================================
   Sdom v0.1 — núcleo
   Regras (do Paulo):
   - Incidência: excitatória ou inibitória, magnitude 0..1.
   - Nó: integra incidências; cada uma vale pela janela do nó a partir da chegada.
     Atingiu o limiar -> dispara para todas as arestas (sempre excitatório,
     com a magnitude própria do nó). Depois, refratariedade: não faz nada.
     Passada a refratariedade, incidências ainda na janela continuam valendo.
   - Aresta: atraso basal (modulável), pode manter / forçar excit. / forçar inib.,
     pode modular a magnitude.
   - Criação: quando um estímulo não encontra caminho.
   Escolhas da v0 (minhas, a revisar):
   - Ouvido = microfone: cada amostra vira incidência (sinal->efeito, |x|->magnitude).
   - Nível 1 nasce de um "lóbulo" positivo da onda que nenhum nó do ouvido captou.
   - Níveis 2+ nascem agrupando disparos do nível de baixo que ninguém absorveu
     dentro da janela de agrupamento; os atrasos das arestas são os intervalos
     observados, para que tudo chegue junto ao nó novo.
   - Sem aprendizado nem divisão ainda.
   ===================================================================== */
export const CODE_VERSION = 'v0.13';
export const DEFAULTS = {
  sr: 16000,           // taxa do microfone (amostras/s); botão alterna 16k/8k
  // transdução auditiva (v0.6): cóclea fixa, fora do Sdom
  cochChannels: 41,    // canais de frequência: 1 por ERB, de ~26 Hz a ~18,6 kHz (Glasberg & Moore, 1990)
  baseThr: 0.003,      // limiar da fibra mais sensível (amplitude na saída do canal)
  fiberDb2: 10,        // fibra média: 10 dB menos sensível (Liberman, 1977)
  fiberDb3: 30,        // fibra pouco sensível: 30 dB menos sensível (faixa observada: até ~70 dB)
  fiberRefrMs: 1,      // refratariedade absoluta da fibra
  // adaptação da fibra (v0.8): esgotamento e reposição de "substância" em dois reservatórios
  // (Smith & Brachman, 1982; Westerman & Smith, 1984): rápida (~5 ms) e de curto prazo (~50 ms)
  adaptCost: 0.1,      // fração do reservatório imediato gasta por disparo
  adaptTau1Ms: 5,      // reposição do reservatório imediato (adaptação rápida)
  adaptTau2Ms: 50,     // reposição do reservatório local (adaptação de curto prazo)
  ihcLowpassHz: 3000,  // célula ciliada: perda de sincronia em frequências altas
  thrFrac: 0.8,        // limiar do nó novo = fração do que o criou
  basalMs: 0.125,      // atraso basal das arestas
  // criação sem níveis (v0.7): relacionar o que acontece junto e ainda não tem relação
  bindMs: 50,          // até que distância no tempo disparos podem ser relacionados
  weber: 0.1,          // tolerância proporcional ao intervalo relacionado (propriedade escalar)
  minCoincMs: 0.25,    // tolerância mínima (escala da diferença de tempo entre os ouvidos)
  prepFrac: 0.5,       // nó que recebe ≥ 50% do limiar está preparado: o que chegou nele tem relação
  pathRule: 0,         // 1 = basta a incidência chegar a algum nó (ter caminho) para o disparo ter relação
  gapMs: 1,            // intervalo mínimo entre criações
  maxGroup: 6,         // disparos relacionados por um nó novo, no máximo
  maxDepth: 12,        // trava de segurança contra fuga (não é regra de agrupamento)
  maxNodes: 6000,
  histSeconds: 90,
  // aprendizado (v0.3): tudo no PESO da aresta (modulação da magnitude), 0 = inerte, 1 = máximo
  wBirth: 0.5,           // peso com que a aresta nasce
  aPlus: 0.005,          // reforço por sincronia: chegou ANTES do disparo do nó seguinte
  aMinus: 0.005,         // enfraquecimento por sincronia: chegou DEPOIS do disparo
  tauPlusMs: 17,         // janelas de tempo (valores médios de Bi & Poo, 1998)
  tauMinusMs: 34,
  // decaimento em duas fases (LTP inicial × tardio; etiqueta sináptica de Frey & Morris)
  fastHalfLifeS: 3600,   // peso basal: meia-vida de 1 h sem uso
  slowHalfLifeDays: 14,  // peso consolidado: meia-vida de 2 semanas sem uso
  tagHours: 3,           // janela de consolidação: reforço acumulado nela pode consolidar
  consolThr: 0.3,        // reforço acumulado dentro da janela de consolidação para consolidar
  // poda (v0.5)
  pruneDays: 7,          // aresta inerte por esse tempo é podada; nó órfão (sem arestas) também
  accessBoost: 0.1,      // acesso a uma aresta candidata à poda: reforço no peso basal
  accessWindowH: 3,      // acesso: aumento da janela de consolidação da aresta
  inertW: 0.01,          // peso abaixo disso = inerte (não entrega nada)
  actWindowMs: 100,      // janela da atividade gravada
  // marcapasso de recursos (v0.11). Desenho: sdom/DESENHO-marcapasso-de-recursos.md
  // Os valores são PONTOS DE PARTIDA do Claude (não medidos), salvo onde indicado.
  mpOn: 1,               // 1 = o Sdom depende do recurso operacional; 0 = comportamento da v0.10
  mpF0: 1.7,             // ritmo próprio (batidas/s de mundo) ≈ 102/min: frequência intrínseca aos 16 anos (Cumming & Mir, 1970)
  mpRestBpm: 81,         // repouso com o reflexo (freio) ≈ 81/min (mesma fonte)
  mpPressTauS: 2,        // reflexo fixo: o sinal das batidas se acumula e se dissipa em ~2 s
  mpRateTauS: 1,         // o ritmo muda devagar em direção ao alvo
  mpBeatOps: 15000,      // recurso operacional por batida: no roteiro Casa cobre a demanda média com som; falta nos picos (calibração: README)
  mpBaseOps: 100,        // parte base que cada nó recebe por batida (até encher a reserva)
  mpOver: 1.3,           // sobra: o nó ativo recebe mais do que gastou (como o sangue na região ativa)
  mpCap0: 1000,          // teto inicial da reserva operacional de cada nó
  mpCapMax: 10000,       // teto máximo que a adaptação pode alcançar
  mpGrowPerDay: 0.05,    // adaptação: +5% do teto por dia de falta sustentada
  mpCapHalfLifeDays: 14, // adaptação: sem falta, o teto volta ao inicial com meia-vida de 14 dias
  mpPisoAprender: 0.6,   // piso de aprender (fração do teto): o mais alto, cai primeiro
  mpPisoDisp0: 0.05,     // piso de disparar do nó mais perto da transdução (distância 2)
  mpPisoDispK: 0.04,     // piso de disparar: a mais por passo de distância da transdução
  mpPisoDispMax: 0.5,    // piso de disparar: limite
  mpCostFire: 1,         // custo de disparar (+ mpCostEdge por aresta de saída)
  mpCostEdge: 1,
  mpCostLearn: 1,        // custo de cada reforço ou enfraquecimento
  mpCostConsol: 20,      // custo da consolidação (a parte mais cara do aprender)
  mpCostCreate: 10,      // custo de criar um nó (+ mpCostCreateEdge por aresta)
  mpCostCreateEdge: 2,
};
export const PARAM_UI = [
  ['sr','taxa do microfone (Hz)'],['cochChannels','canais da cóclea'],['baseThr','limiar da fibra sensível'],['fiberDb2','fibra média (+dB)'],['fiberDb3','fibra pouco sensível (+dB)'],['fiberRefrMs','refratariedade da fibra (ms)'],['adaptCost','adaptação: gasto por disparo'],['adaptTau1Ms','adaptação rápida (ms)'],['adaptTau2Ms','adaptação curto prazo (ms)'],['ihcLowpassHz','célula ciliada: corte (Hz)'],['thrFrac','limiar do nó novo (fração)'],
  ['basalMs','atraso basal da aresta (ms)'],
  ['bindMs','alcance da relação no tempo (ms)'],['weber','tolerância proporcional (fração)'],['minCoincMs','tolerância mínima (ms)'],
  ['prepFrac','preparado a partir de (fração do limiar)'],['pathRule','regra: basta ter caminho (0/1)'],['maxGroup','disparos por nó novo (máx.)'],['maxDepth','trava de profundidade'],['maxNodes','teto de nós'],['histSeconds','histórico gravado (s)'],
  ['wBirth','peso de nascimento da aresta'],['aPlus','reforço (chegou antes)'],['aMinus','enfraquecimento (chegou depois)'],
  ['tauPlusMs','janela do reforço (ms)'],['tauMinusMs','janela do enfraquecimento (ms)'],
  ['fastHalfLifeS','meia-vida do peso basal (s)'],['slowHalfLifeDays','meia-vida do peso consolidado (dias)'],['tagHours','janela de consolidação (h)'],['consolThr','reforço acumulado para consolidar'],
  ['pruneDays','poda: dias inerte até podar'],['accessBoost','acesso: reforço da candidata'],['accessWindowH','acesso: +janela de consolidação (h)'],['inertW','peso inerte abaixo de'],['actWindowMs','janela da atividade gravada (ms)'],
  ['mpOn','marcapasso de recursos ligado (0/1)'],['mpF0','marcapasso: ritmo próprio (batidas/s)'],['mpRestBpm','marcapasso: repouso com o reflexo (bpm)'],['mpBeatOps','recurso operacional por batida'],['mpBaseOps','parte base por nó e batida'],['mpOver','sobra para o nó ativo (×)'],
  ['mpCap0','teto inicial da reserva operacional'],['mpCapMax','teto máximo da reserva'],['mpGrowPerDay','adaptação: crescimento por dia de falta'],['mpCapHalfLifeDays','adaptação: meia-vida da volta (dias)'],
  ['mpPisoAprender','piso de aprender (fração do teto)'],['mpPisoDisp0','piso de disparar perto da transdução'],['mpPisoDispK','piso de disparar: + por distância'],['mpPisoDispMax','piso de disparar: máximo'],
  ['mpCostFire','custo: disparar'],['mpCostEdge','custo: por aresta de saída'],['mpCostLearn','custo: reforço/enfraquecimento'],['mpCostConsol','custo: consolidação'],['mpCostCreate','custo: criar nó'],['mpCostCreateEdge','custo: por aresta criada'],
];
