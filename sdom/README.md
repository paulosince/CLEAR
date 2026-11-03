# Sdom — robô que ouve

Simulação de um robô com dois microfones e um **Sdom — domínio representacional do sistema**,
que começa vazio. O que ele ouve é representado num grafo: uma estrutura é
**percorrida de novo** quando chegam estímulos semelhantes aos que a criaram, e
**criada** quando um estímulo não encontra caminho.

- `web/` — a simulação (página + módulos JavaScript, sem build). Publicada no GitHub Pages:
  https://paulosince.github.io/CLEAR/sdom/web/ — precisa ser aberta por http (não funciona por file://).
- `tests/unit/` — testes automáticos das regras (`npm test`); rodam no GitHub Actions a cada push.
- `experimentos/microfone.cjs` — ouvir com um microfone falso do Chromium e congelar fora da tela (Playwright).
- `experimentos/persistencia.cjs` — fechar e abrir a página retoma o mesmo robô, sem pulo (Playwright).
- `GLOSSARIO.md` — os nomes combinados (aprovados e propostos).

## Ouvir o mundo pelo microfone (v0.12) e proteções

O robô pode ouvir o mundo real pelo microfone do aparelho. Com o microfone ligado, quem dita o tempo é o
mundo: entram as amostras que chegaram; se o computador não der conta, o atraso acima de 0,25 s é
descartado e contado ("som perdido por atraso"). Os sons sintéticos ficam pausados, para o robô não
ouvir os próprios alto-falantes. Mono: os dois sensores recebem o mesmo som (sem direção).

**Proteções no código**
- Microfone **desligado ao abrir**; só liga pelo botão (um teste confere isso a cada push).
- Faixa vermelha fixa "Ouvindo o mundo real", com botão de parar. Depois de ligado, **continua ouvindo em segundo plano até ser parado** (decisão do Paulo, v0.14); para quando a página fecha. No computador, o navegador mostra o aviso de microfone na aba.
- **Nada sai do aparelho**: não há servidor, e a política de segurança da página (CSP) proíbe conexões com
  outros endereços e scripts de fora. Um teste falha se algum código passar a usar `fetch`, XHR, WebSocket ou `sendBeacon`.
- Sem cabeçalho de origem (`referrer`) ao abrir links.
- **Som bruto só com opção marcada** ("gravar o som bruto"); fica no IndexedDB deste navegador, não entra no
  JSON exportado, pode ser baixado à parte (WAV) e é apagado junto com o universo.
- O áudio do microfone nunca vai para o alto-falante.

**O que só o Paulo pode fazer (não é possível daqui)**
1. Ativar a autenticação em dois fatores na conta do GitHub.
2. Proteger a `main` (Settings → Branches → Add rule → `main`): proibir *force push* e exclusão; se quiser,
   exigir que o teste "Sdom — testes" passe antes de aceitar mudanças.
3. Ao permitir o microfone, preferir "permitir só desta vez": a permissão vale para todas as páginas de
   `paulosince.github.io`. Separação mais forte: publicar o Sdom num subdomínio próprio.

Limite honesto: a CSP protege contra código de terceiros, não contra quem tem permissão de escrita no repositório
(essa pessoa poderia remover a CSP). Por isso os itens 1 e 2 são os mais importantes.

Experimento com microfone falso do Chromium: `NODE_PATH=$(npm root -g) node experimentos/microfone.cjs`.

**Mono e canal mudo.** O robô só trata o som como estéreo se os dois canais têm som e não são cópias um do
outro. Se o aparelho entrega um canal mudo (ou mono), os dois sensores recebem o canal que tem som; a faixa do
topo diz qual é o caso. (Até a v0.12 havia um defeito: um canal vazio era tratado como estéreo, e só um sensor "funcionava".)

## Respiração (v0.20 — decisões do Paulo)

- **Respiração**: gerador de ritmo próprio, fora do Sdom (como o coração), com repouso de 15/min e teto de 40/min.
  A cada **inspiração** repõe o **estoque** de recurso; a cada **expiração** tira metade do **resíduo**.
- **O coração distribui o que há no estoque**: cada batida entrega no máximo o que o estoque tem; o que é entregue (gasto) vira resíduo.
- **Reflexo fixo**: resíduo acima da referência acelera a respiração na mesma proporção (até o teto); com o resíduo saindo, volta ao
  repouso. O pedido de recurso continua acelerando o coração (v0.18). Os dois juntos: grito → coração no teto, respiração 15 → ~38/min
  em ~8 s, estoque cai (300 mil → ~165 mil); depois, a respiração volta ao repouso em ~10 s e o coração em ~25 s (medido, som sintético).
- **Transdução endógena**: 5 fibras da respiração entram no Sdom como incidências — inspira, expira e nível de resíduo (1×, 2×, 4× a referência).
  A fase da respiração influencia memória e medo em humanos (Zelano et al., 2016); o ritmo nasce de uma rede no tronco (Smith et al., 1991);
  o CO₂ é o principal motor do ritmo; o córtex pode assumir por um tempo, mas o automático retoma.
- O **comando voluntário** fica para quando estudarmos aprendizado por aferências e exploração por eferência (decisão do Paulo).
- Números (entrada por respiração, tamanho do estoque, referência do resíduo, ritmos): pontos de partida do Claude, a revisar.

## Diagnóstico v0.19.2 (graves e sons contínuos)
- No modelo, com som sintético, sons graves (50–200 Hz) disparam as fibras com o mesmo limiar que os agudos, e um som contínuo
  continua sendo transduzido (≈1 360 disparos/s de fibras e ≈1 750/s no Sdom durante 2 min) enquanto os nós novos param em ~30 s.
- Suspeita: processamento do próprio aparelho/navegador (supressão de ruído, isolamento de voz, corte de graves do microfone).
  A faixa do microfone agora mostra o que o navegador diz ter aplicado, o nível, a parte grave da energia (estimativa) e o painel
  separa disparos/s das fibras e do Sdom. O pedido ao microfone também pede `voiceIsolation: false`.

## Correções v0.19.1
- "Ouvido(s)" virou **sensor(es)** na interface e no texto (decisão do Paulo; GLOSSARIO).
- O pedido de recurso ao coração passa a incluir **o que o nó precisou e não conseguiu** (falta), não só o que gastou: antes, um nó
  em falta parava de gastar e por isso parava de pedir — o coração não via a falta. O ritmo também respeita o teto nas passagens.
- O texto do painel mostra o pedido ao coração (× o que uma batida entrega).

## Regra hebbiana: disparou junto, de novo e de novo, conecta junto (v0.19 — decisões do Paulo)

Até a v0.18 o Sdom só criava nós novos (para relacionar disparos sem relação) e ajustava arestas existentes.
Agora dois nós **que já existem** e disparam juntos repetidas vezes passam a se ligar, em três etapas:

1. **Rastro**: cada vez que A dispara e B dispara até 20 ms depois, o par A → B ganha rastro. Praticamente juntos (≤ 2 ms):
   conta nas duas direções. O rastro cai pela metade a cada 2 h sem repetição: um "junto" isolado não vai além disso.
2. **Aresta em formação**: com rastro ≥ 10, nasce a aresta A → B, fraca (peso 0,1, já transmite um pouco), com o atraso observado.
   Custa recurso operacional (como criar aresta), pago pelos nós do Sdom envolvidos. No máximo 8 em formação chegando a um mesmo nó.
3. **Fecha ou recolhe**: a aresta em formação guarda a recorrência do "junto" (meia-vida de 12 h). Se cair abaixo de 3, ela **recolhe**
   (some). Se o "junto" continuar, ao completar **3 dias** (decisão do Paulo: o menor prazo da literatura) ela **fecha** e vira aresta comum.

Origem: fibra ou nó do Sdom; destino: nó do Sdom. Por disparo, contam as 24 fontes mais recentes (custo de computação).
Os eventos (em formação, fechada, recolhida) entram nos registros junto com as podas.
Respaldo: espinhas novas nascem em horas, ganham sinapse ao longo de dias, a maioria some em menos de uma semana e só as usadas de novo
se estabilizam (Knott et al., 2006; Holtmaat et al., 2005, 2006; Xu et al., 2009; Fu et al., 2012; Hill & Zito, 2013); neurônios
que respondem parecido se conectam mais, inclusive nos dois sentidos (Ko et al., 2011, 2013; Song et al., 2005).
Medido (roteiro conversa, 30 s): ~680 arestas em formação, ~280 entre nós do Sdom, 40 recíprocas; nasceram menos nós (201 contra 415);
o laboratório ficou ~40% mais lento (ainda ~3,6× mais rápido que o tempo real); em silêncio depois, a atividade não se sustenta sozinha (ainda).
Nomes "rastro", "em formação", "fechar", "recolher": aprovados pelo Paulo.

## Pedido de recurso → ritmo do coração (v0.18 — decisão do Paulo)

- A cada batida, cada nó do Sdom pede recurso (o que gastou, com sobra, até encher a reserva). Quando o **pedido total** passa do
  que uma batida entrega, o coração **acelera** para entregar mais por minuto; quando o pedido cai, o freio fixo o traz de volta.
- O sinal do pedido sobe em ~2 s e se desfaz em ~20 s; o ritmo-alvo cresce na proporção do pedido, até o teto de 180/min.
  Esses três números são pontos de partida do Claude, a revisar (`mpPedidoSobeS`, `mpPedidoDesceS`, `mpMaxBpm`).
- O sinal é **global** (quanto o Sdom pede no total), não de uma representação: não pré-programa relação entre representações e batidas.
- Respaldo: o engajamento ativo numa tarefa mobiliza o simpático e acelera o coração (Obrist, 1981; experimento com 64 participantes e 4 níveis de dificuldade: https://archive-ouverte.unige.ch/unige:190743);
  no corpo isso vem do cérebro comandando o coração, não de um sensor de falta — aqui ficou como reflexo fixo até existir a eferência.
- Medido (som sintético, robô novo): grito → 81 → ~145/min em ~4 s, faltas de disparar caíram à metade; em silêncio volta a 81/min em ~12 s.
  Na fala, há falta local mesmo com o pedido total abaixo do que a batida entrega: aí o coração não acelera (a falta é de teto do nó, não de entrega).

## Novo, consolidado e candidato à poda na tela (v0.17 — pedido do Paulo)

- **Verde-piscina** = novo. Uma aresta é nova até a sua **primeira consolidação** (campo `consAt`, o instante em que consolidou;
  −1 = ainda não). Depois disso não volta a ser nova, mesmo que o peso consolidado caia. Um nó do Sdom é novo até **todas** as
  arestas vivas que chegam nele terem consolidado.
- **Terracota tracejada** = aresta candidata à poda (inerte, contando os dias até ser podada). Um nó fica **terracota** quando
  todas as arestas vivas que chegam nele são candidatas (quando forem podadas, ele fica órfão e é podado). Terracota vale mais que verde.
- A transdução passou de verde-água para cinza-azulado, para não confundir com o verde-piscina.
- Robôs guardados antes: aresta com peso consolidado conta como já consolidada (`persist.js`, `migrar`).

## Só o mundo real, só o agora (v0.16 — decisões do Paulo)

- **Só microfone.** Saíram da página os sons sintéticos (instrumentos, sons ambiente, sala), os experimentos manuais e o
  laboratório. O código deles continua em `web/js/env/` e `web/js/lab/` porque os **testes automáticos** usam esses sons para
  conferir as regras; os experimentos de navegador que dependiam deles (convergência, decaimento, poda, discriminação,
  laboratório, segundo plano) foram retirados (estão no histórico do git). Com a página na tela e o microfone desligado, o robô continua vivendo em silêncio (decisão do Paulo).
- **Só ao vivo.** Saíram a fita, voltar/avançar, velocidade de exibição, velocidade do mundo e "pular no tempo".
  A gravação do observador ficou só com o necessário para desenhar o agora (`histSeconds` = 3 s).
- **Universo congelado.** Página fora da tela, fechada ou recarregada: nada acontece para o robô. Ao voltar, ele continua do
  mesmo instante, sem pulo no tempo. O microfone ligado fica mudo (não desliga) e volta sozinho; o que chega enquanto a página
  está fora da tela é descartado. Nos registros, cada congelamento fica anotado (`congeladoS`), só para o observador.
  Uma parada do navegador com a página na tela (mais de 0,1 s) também não vira tempo para o robô.

## O robô não morre ao recarregar (v0.15)

Recarregar a página ou atualizar o código **retoma o mesmo robô**. Só "💥 Destruir universo" cria outro
(e então a fotografia do cérebro antigo é apagada; os registros dele continuam na lista para baixar).

- **Fotografia do cérebro**: todo o estado do robô (nós, arestas, pesos, marcas, poda, marcapasso, cóclea, sorteio)
  é guardado no aparelho (IndexedDB, loja `snapshots`) a cada 20 s, ao esconder a aba e ao fechar a página.
  Nada sai do aparelho. Num robô de ~1 000 nós a fotografia custa ≈ 0,1 s (medido em 1 núcleo de servidor; no celular pode ser mais).
- **Ao retomar**: desde a v0.16, ele continua do instante em que parou (o universo estava congelado). O microfone começa
  desligado (nunca liga sozinho).
- O que **não** volta: no máximo,
  os últimos segundos antes de fechar se o navegador não deixar terminar a gravação. Nesse caso o robô volta ao estado
  da última fotografia, e os registros posteriores a ela são retirados, para o histórico continuar coerente.
- **Duas abas**: só a primeira grava; a outra avisa e não grava nada (o mesmo robô não pode viver duas vidas).
- Robôs guardados que não são o atual (ex.: de antes de uma troca de universo que não foi "Destruir") aparecem na lista com
  "Retomar este robô".
- Para quem mexer no código: se uma versão nova acrescentar estado ao universo, escreva em `web/js/core/persist.js`
  (`migrar`) como preencher esse campo num robô guardado por uma versão anterior. Parâmetros novos recebem o padrão sozinhos.
- Robôs criados antes da v0.15 não podem ser retomados: até então não existia a fotografia, só os registros.
- Experimento: `NODE_PATH=$(npm root -g) node experimentos/persistencia.cjs`. Testes: `tests/unit/persistencia.test.js`.

## Vida em segundo plano (v0.13 — substituída na v0.16: fora da tela, o universo congela)

A simulação anda por um relógio num Web Worker, que o navegador não pausa quando a aba sai de foco; o desenho
anda pelo `requestAnimationFrame`, que é pausado. Assim, no computador, o robô continua vivendo (e os sons
continuam) com a aba em segundo plano. Se o navegador mesmo assim congelar a aba (no celular ele suspende tudo),
ao voltar o tempo perdido vira **pulo no tempo, em silêncio**, e o que deveria ter tocado nesse intervalo é
descartado: o relógio do robô volta a acompanhar o real. O microfone, se ligado, também continua em segundo plano até ser parado
(no iPhone, o Safari o corta ao sair da tela). Experimento: `NODE_PATH=$(npm root -g) node experimentos/segundo-plano.cjs`.

## Marcapasso de recursos (v0.11)

Desenho e respaldo: [`DESENHO-marcapasso-de-recursos.md`](DESENHO-marcapasso-de-recursos.md). Termos: `GLOSSARIO.md`.

- **Ritmo próprio** de 1,7 batida/s (≈ 102/min, a frequência intrínseca aos 16 anos em Cumming & Mir, 1970).
  Um **reflexo fixo**, fora do Sdom, freia o ritmo com o sinal das próprias batidas: em repouso ele se
  acomoda em ≈ 81/min (mesma fonte). Nada liga representações ao marcapasso: a eferência ainda não existe.
- **Recurso operacional** entregue a cada batida (15 mil operações) e dividido entre as **reservas
  operacionais** dos nós: uma parte base + mais para quem gastou (com sobra), até o teto de cada nó.
- **Gastos:** disparar (1 + 1 por aresta de saída), reforço/enfraquecimento (1), consolidação (20),
  criar nó (10 + 2 por aresta). Manter não gasta. A transdução não gasta.
- **Pisos:** aprender exige ≥ 60% do teto; disparar exige 5% perto da transdução, +4% por passo de
  distância (até 50%). O que não cabe **não acontece**; o relógio do mundo não muda.
- **Adaptação:** falta sustentada aumenta o teto do nó (+5% por dia de falta); sem falta, ele volta ao
  inicial com meia-vida de 14 dias.
- **Transdução endógena:** 3 fibras da batida e 4 do nível geral de reserva (20/40/60/80%) disparam
  junto com cada batida. Em silêncio total, o Sdom passa a ter atividade (as batidas).
- `mpOn: 0` desliga tudo isso e volta ao comportamento da v0.10 (os testes de regressão usam assim).

**Calibração (escolha minha, para o Paulo revisar).** Medi a demanda sem limite no roteiro Casa (semente
2026): ≈ 50 operações/s em silêncio e 30 mil–180 mil/s com som. Com 15 mil por batida a ≈ 81/min
(≈ 20 mil/s), o recurso cobre boa parte da demanda e falta nos picos.

Resultado em 19 s de Casa:
- sem limite: 437 nós;
- com o marcapasso: 358 nós;
- o que mais cai é aprender (milhares de vezes por segundo), depois criar, por último disparar.

Uma diferença em relação ao cérebro: o cérebro tem atividade de base alta e a demanda varia pouco (Raichle &
Gusnard, 2002); o Sdom em silêncio quase não gasta, e com som gasta mil vezes mais.

## Organização do código (v0.10)

Sem etapa de build: o GitHub Pages serve os módulos JavaScript diretamente.

```
sdom/
  web/index.html, web/css/app.css
  web/js/core/      núcleo do Sdom: params.js (parâmetros e origem), universe.js (nós, arestas,
                    transdução, aprendizado, poda, malhas), graph-copy.js, util.js
  web/js/env/       ambiente: sounds.js (síntese), world.js (sala e microfones), score.js (Cânone),
                    streams.js (fluxos de eventos), environment.js (liga/desliga fluxos), scenarios.js (roteiros)
  web/js/lab/       laboratório (lab.js): usado só pelos testes automáticos desde a v0.16
  web/js/store.js   gravação local (IndexedDB)
  web/js/ui/        página: app.js, sdomview.js (atividade e grafo), panels.js, controls.js, labui.js, storeui.js
  tests/unit/       testes automáticos (node:test) — `npm test` dentro de sdom/
  tests/fixtures/   referência para o teste de regressão
  experimentos/     experimentos com navegador (Playwright), que imprimem números
```

- **Testes** (`npm test`, rodam também no GitHub Actions a cada push): uma regra por teste —
  limiar, janela de integração, refratariedade, peso, efeito inibitório, magnitude fixa, reforço,
  enfraquecimento pendente, "o reforço vence", freio, consolidação, janela de consolidação,
  decaimento em duas fases, poda, órfão, acesso, cóclea (41 canais, 3 fibras), adaptação,
  ambiente repetível, coerência do Cânone, cópia do universo, malhas — e **regressão**: com a
  mesma semente, o resultado tem que ser idêntico à referência gravada.
- Mudou uma regra de propósito? `node tests/atualizar-referencia.js` e explique no commit.

### Correção na v0.10: incidências que chegam no mesmo instante

Os testes acharam um defeito: o nó avaliava o limiar a cada incidência que chegava, e a ordem de
processamento dentro do mesmo instante (mesma amostra) decidia o resultado — por exemplo, uma
incidência inibitória simultânea era ignorada se fosse processada por último, e uma excitatória
simultânea ficava de fora do reforço. Agora todas as incidências do instante chegam primeiro e
depois cada nó avalia uma vez. Efeito medido (mesma semente): 6 pianos + 6 violas, 429 → 434 nós e
338 mil → 374 mil reforços; roteiro Casa 15 s, 671 → 642 nós; discriminação piano×viola, 218 → 210 nós
(o que é comum aos dois continua em 76 nós).

## Página (v0.10)

- **Painel:** malhas, nós, arestas, sinapses e disparos por segundo.
- **Sdom:** de longe, um **mapa de atividade** (à maneira de uma fMRI: acende onde houve disparos
  nos últimos ~0,25 s; transdução e Sdom com escalas próprias). Não é um modelo de sinal BOLD.
  Ao aproximar, aparece o **grafo**. Botões: auto / atividade / grafo.
- **Controle do ambiente:** **Instrumentos** (Cânone em Ré de Pachelbel, um instrumento por fonte:
  violinos I, II e III, violoncelo e cravo) e **Sons ambiente** (pássaros, mar, carros ao fundo,
  crianças, chuva, conversa, passos e porta, campainha). Cada um só com ícone e play/pause.
  Instrumentos ligados entram juntos, no próximo ciclo da música.
- Desempenho medido (Chromium sem tela, 2 núcleos, 16 kHz): sem som, 100% do tempo real; 8 sons
  ambiente ligados, ~90%; os 5 instrumentos, ~60% (o mundo anda mais devagar que o relógio; os
  resultados não mudam, porque tudo é medido em tempo de mundo). O laboratório é mais rápido.

**Música:** transcrição **de memória** e simplificada (baixo obstinado + 3 padrões do violino em
cânone); o cravo com acordes é arranjo meu. Conferir com a partitura antes de citar. Um teste
confere que toda nota de violino no tempo forte pertence ao acorde do baixo.

**Sons ambiente sintetizados** (escolhas minhas, não validadas): pássaro = tom deslizante com
trinado (2–4,5 kHz; a 8 kHz o microfone não alcança e fica em silêncio); mar = ruído abafado
(média de amostras) que sobe e desce em ondas de 5–9 s; carro = ronco (ruído bem abafado) +
harmônicos do motor descendo de leve (Doppler); crianças = vogais com formantes femininos × 1,15
e risadas.

## Regras do modelo (definidas pelo Paulo)

**Incidência** — excitatória ou inibitória; magnitude de 0 (inerte) a 1.

**Nó**
- integra incidências; cada uma vale pela janela de integração do nó, contada da chegada;
- atingiu o limiar → dispara para todas as arestas de saída;
- o disparo é sempre excitatório, com a magnitude própria do nó
  (definida pela transdução que o criou);
- depois de disparar, refratariedade: não faz nada; passada, incidências ainda
  na janela continuam valendo (pode disparar de novo).

**Aresta** — atraso basal de propagação (pode ser modulado para atrasar ou
adiantar); quanto ao efeito: mantém, força excitatória ou força inibitória;
pode modular a magnitude.

**Ouvido** — microfone: transduz o som num fluxo digital contínuo. O robô está
sempre vivo e captando. A gravação é do observador (nós), não do robô.

**Sdom** — divide, agrupa e relaciona: o que é igual ou semelhante é agrupado e
reutilizado; o que é diferente é dividido e relacionado. Características comuns
(intensidade, frequência) tendem a virar hubs muito relacionáveis.

Todas as características de nós e arestas podem ser modificadas por aprendizado.

## Escolhas da v0.1 (do Claude, a revisar)

1. Cada amostra do microfone vira uma incidência: sinal → efeito, |x| → magnitude.
2. **Nível 1** nasce de cada lóbulo positivo da onda que nenhum nó do sensor captou:
   janela = duração do lóbulo, limiar = 80% do que ele somou, magnitude = pico.
3. **Níveis 2–4** nascem agrupando disparos do nível de baixo que ninguém absorveu
   dentro da janela de agrupamento; atrasos das arestas = intervalos observados,
   para que tudo chegue junto ao nó novo (detecção de coincidência, à la Jeffress 1948).
4. Hierarquia fixa de 4 níveis; cada nível agrupa só o de baixo.
5. Um nó recém-nascido "reconhece" retroativamente o que aconteceu enquanto se
   formava, para evitar cópias do mesmo padrão.
6. Ainda sem divisão e sem arestas inibitórias.

## Transdução auditiva (v0.6, branch `transducao`)

Fica **fora do Sdom** e é fixa; normaliza o som em incidências (a moeda comum do Sdom).

- **Cóclea:** 41 canais de frequência, um por ERB (Glasberg & Moore, 1990), de ~26 Hz a
  ~18,6 kHz, com filtros gammatone de 4ª ordem (Patterson et al., 1992). Canais acima
  do alcance do microfone (≈ 7 kHz a 16 kHz de amostragem; ≈ 3,6 kHz a 8 kHz) existem,
  mas ficam em silêncio.
- **Célula ciliada:** retificação de meia-onda e passa-baixa (perda de sincronia em
  frequências altas).
- **Fibras:** 3 por canal — sensível, média (+10 dB) e pouco sensível (+30 dB)
  (Liberman, 1977). Refratariedade de 3 ms. Cada disparo entra no Sdom como uma
  incidência de **magnitude fixa** (tudo-ou-nada).
- A criação de nós por "meia-onda" dentro do Sdom foi removida.
- Microfone em 16 kHz por padrão; botão para 8 kHz (cria um universo novo).

Observação: com a transdução nova, a regra de criação antiga (agrupar disparos sem
destino com atrasos exatos) gera estrutura demais e não converge (centenas de nós por
nota). É a regra cuja revisão está em discussão (relações + preparação do campo
representacional relacional).

## Ambiente sonoro e laboratório (v0.9, branch `transducao`)

**Sons novos** (todos sintetizados por fórmula; nenhuma gravação real):

| Som | Como é feito | Base |
|---|---|---|
| Voz (vogais) | fonte harmônica (f0) moldada por 3 formantes em cascata; sílabas de 0,12–0,25 s, frases de 1–3 s, entonação descendente | formantes médios de Peterson & Barney (1952); larguras de banda 60/100/150 Hz são escolha minha |
| Passo | baque grave (60–400 Hz) + arrasto agudo (1–4 kHz), componentes com fase aleatória e decaimento exponencial | escolha minha (não validado) |
| Porta batendo | baque (40–200 Hz) + vibração (250–2500 Hz) + estalo | escolha minha (não validado) |
| Campainha | parciais de barra livre (1 : 2,756 : 5,404 : 8,933), "ding-dong" Mi–Dó | razões de modos de barra livre (Rossing) |
| Chuva (gota) | tom curto amortecido (1,5–6 kHz) + estalo; gotas sorteadas como processo de Poisson | escolha minha (não validado) |

Não há consoantes na voz: é um "balbucio de vogais". Em 8 kHz, a parte aguda da chuva e do
arrasto some (acima de 3,6 kHz).

**Roteiros** (ambientes programados, repetíveis pela semente; cada fluxo tem seu sorteio, então
o começo de um roteiro longo é idêntico ao roteiro curto com a mesma semente):

- **Casa**: conversa (voz grave e aguda) em episódios, chuva contínua de intensidade variável,
  passos a cada 15–30 s (às vezes terminando na porta), campainha a cada 1–2 min e o mesmo
  motivo no piano (Dó Mi Sol Mi Dó) a cada 20–40 s.
- **Conversa**, **Música** (piano e viola repetindo o motivo) e **Chuva**.

**Laboratório**: roda um roteiro num Web Worker, sem desenhar. Grava no IndexedDB durante a
corrida (como a página). No fim, o universo do laboratório vira o atual: dá para ver o Sdom e
voltar no tempo (os últimos ~90 s em detalhe). As curvas (nós do Sdom e disparos por segundo
de mundo) ficam gravadas em `universe.lab.series`. "Ouvir 10 s do roteiro" toca o que chega
aos dois microfones.

Experimento: `NODE_PATH=$(npm root -g) node experimentos/laboratorio.cjs [roteiro] [segundos] [semente] [taxa]`.

### Sessão longa: roteiro Casa, 10 min de mundo, semente 2026 (headless, 2 núcleos)

| tempo de mundo | Sdom 16 kHz | Sdom 8 kHz |
|---|---|---|
| 1 min | 670 | 795 |
| 2 min | 830 | 953 |
| 5 min | 1068 | 1172 |
| 8 min | 1312 | 1384 |
| 10 min | 1481 | 1396 |
| tempo real gasto | 212 s (2,8× mais rápido que o real) | 143 s (4,2×) |

- Sem erros; memória da página ~170–180 MB; gravação completa no IndexedDB (601 pontos de curva,
  ~5 mil janelas de atividade, 9.812 estímulos).
- O crescimento desacelera, mas em 16 kHz ainda não parou em 10 min; em 8 kHz quase parou
  nos últimos 2 min (1384 → 1396).
- Os disparos por segundo crescem com o Sdom: picos de ~160 mil/s aos 9,5 min (16 kHz).
- Em silêncio total, depois de ouvir, o Sdom fica em silêncio (0 disparos em 2 s). Todas as
  arestas vão de um nó mais antigo para um mais novo: o grafo não tem ciclos.
- Mesma semente, mesmo resultado (verificado: duas corridas idênticas; universo copiado da
  thread do laboratório para a página continua idêntico ao original).

## Aprendizado (v0.4–v0.5)

Reforço e enfraquecimento agem **no mesmo lugar e em sentidos opostos: o peso da
aresta** (a modulação da magnitude, de 0 = inerte a 1 = máximo), como LTP e LTD
na sinapse. A magnitude do nó e o limiar ficam fixos: a magnitude continua
representando o que a transdução definiu.

- **Reforço:** a incidência chegou *antes* do disparo do nó seguinte e
  contribuiu → o peso sobe `aPlus·(1−peso)·e^(−Δt/17 ms)`. O `(1−peso)` é o freio:
  quanto mais forte, menos sobe (dependência do peso observada por Bi & Poo, 1998).
- **Enfraquecimento:** a incidência chegou *depois* de o nó já ter
  disparado → o peso desce `aMinus·peso·e^(−Δt/34 ms)`. Fica pendente: se ela
  ainda ajudar o próximo disparo, o reforço vence (modelo de Sjöström, Turrigiano
  & Nelson, 2001). Sem essa regra, em sons periódicos cada incidência era ao mesmo
  tempo "atrasada" para o disparo anterior e "a tempo" para o seguinte, e os pesos
  ficavam presos no valor de nascimento.
- **Decaimento em duas fases:** peso = **peso basal** + **peso consolidado**.
  O basal se apaga com meia-vida de 1 h sem uso (LTP inicial dura < 3 h); o
  consolidado, com meia-vida de 14 dias (LTP tardio dura de dias a semanas, às
  vezes meses). Abaixo de 0,01 a aresta fica inerte (a estrutura permanece).
- **Consolidação:** o primeiro reforço abre a *janela de consolidação*, de 3 h
  (inspirada na etiqueta sináptica de Frey & Morris, 1997). Se o reforço acumulado dentro da etiqueta chegar a
  0,3, o peso basal passa para o consolidado. Uma sinapse nova, sem reforço,
  só tem peso basal.
- **Pular no tempo:** como no silêncio só o decaimento acontece, e ele é calculado
  pelo tempo passado, dá para avançar 1 h, 1 dia, 1 semana ou 4 semanas na hora.
- Arestas nascem com peso 0,5 (todo basal); o limiar do nó novo é calibrado com esse peso.
- A ligação sensor → nível 1 é transdução fixa: não aprende nem decai.

## Poda (v0.5)

- **Aresta inerte** (peso < 0,01) vira **candidata à poda**. Inerte por 7 dias, é podada.
- **Nó** só é podado quando fica **órfão**: sem nenhuma aresta.
- **Acesso:** se o nó de origem dispara e a incidência passa por uma candidata, ela
  ganha +0,1 no peso basal, +3 h de janela de consolidação e sai da fila da poda.
- Os nós do nível 1 nunca ficam órfãos: a ligação sensor → nível 1 é transdução fixa.

Janelas de 17 ms e 34 ms: médias de Bi & Poo (1998). Os números de reforço,
consolidação e meias-vidas são escolhas iniciais, ajustáveis como parâmetros.

### Histórico
- v0.3 usava uma só meia-vida de 30 s (escolhida para ver o efeito rápido, sem base biológica).
- v0.2 tentou reforço no limiar e decaimento na magnitude. Como agiam em coisas
  diferentes, um não desfazia o outro e não havia volta. Substituído na v0.3.

## Gravação

Só local, no navegador (IndexedDB). A cada 2 s grava: o universo (versão e
parâmetros), os nós com suas arestas de entrada, as mudanças de peso das arestas
(`[basal, consolidado, momento da última mudança]`, para recalcular o decaimento), os pulos no tempo, a atividade
resumida (disparos por nó a cada 100 ms) e os estímulos tocados.
"Baixar JSON" exporta um universo no formato `sdom-universe/2`.

## Resultado do experimento na v0.1 (sem aprendizado)

Nós nascidos durante cada nota (n1/n2/n3/n4):

| nota | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| piano | 4/3/0/0 | 0/0/3/2 | 0/0/0/2 | 0/0/0/0 | 0/0/0/0 | 0/0/0/0 |
| viola | 2/7/8/4 | 0/0/9/5 | 0/0/1/4 | 0/0/0/2 | 0/0/0/1 | 0/0/0/0 |
| piano de novo | 0/3/12/2 | 0/0/5/5 | | | | |

O piano passa a ser só percorrido a partir da 4ª nota. A viola reaproveita parte
e cria o resto. Depois da viola, o piano volta a gerar estrutura: nós nascidos
com a viola também disparam no piano, e ele passa a ser relacionado a ela.

## Resultados da v0.4 (parâmetros padrão, `tests/`)

Convergência (nós nascidos por nota, n1/n2/n3/n4):

| nota | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| piano | 4/5/7/2 | 0/1/12/5 | 0/0/0/3 | 0/0/0/1 | 0/0/0/0 | 0/0/0/0 |
| viola | 2/1/7/2 | 0/1/4/3 | 0/0/1/4 | 0/0/0/1 | 0/0/0/0 | 0/0/0/0 |
| piano de novo | 0/5/12/5 | 0/0/2/4 | | | | |

Esquecimento (`experimentos/decaimento.cjs`): nós novos ao ouvir o piano de novo depois
do pulo (0 = reconheceu; ~22 = reaprendeu do zero).

| repetições | consolidadas | 10 min | 2 h | 1 dia | 7 dias | 28 dias |
|---|---|---|---|---|---|---|
| 1× | 0/39 | 16 | 22 | 22 | 22 | 22 |
| 3× | 62/125 | 1 | 10 | 18 | 22 | 22 |
| 6× | 116/131 | 0 | 0 | 5 | 11 | 22 |

Observação: ouvido uma vez só, o caminho já falha em 10 min. O limiar do nó novo é
80% do que o criou; com meia-vida de 1 h, o peso cai abaixo disso em ~20 min.

Poda (`experimentos/poda.cjs`): ouvido 1×, depois de 1 dia as 39 arestas aprendidas são
candidatas. Ouvir de novo acessa 17 delas (as que saem do nível 1), mas o reforço
de acesso (0,11) não basta para o caminho disparar: nascem 22 nós novos. Uma semana
depois, tudo o que foi aprendido está podado (103 arestas, 36 nós); restam os 4
nós do nível 1. Ouvido 6×, a estrutura resiste a 4 semanas (só 15 arestas podadas)
e some entre 4 e 14 semanas.

Seletividade: num nó detector do período do dó, as arestas de um receptor
foram a ~0,99 (0,80 consolidado) e as de outro ficaram em ~0,46 e ~0,24.
