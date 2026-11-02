# Sdom — robô que ouve

Simulação de um robô com dois microfones e um **Sdom — domínio representacional do sistema**,
que começa vazio. O que ele ouve é representado num grafo: uma estrutura é
**percorrida de novo** quando chegam estímulos semelhantes aos que a criaram, e
**criada** quando um estímulo não encontra caminho.

- `web/index.html` — simulação completa numa página só. Publicada no GitHub Pages:
  https://paulosince.github.io/CLEAR/sdom/web/
- `tests/convergencia.js` — experimento automático piano → viola (Playwright).
- `tests/decaimento.js` — aprender, pular no tempo, ouvir de novo (Playwright).
- `tests/poda.js` — arestas inertes, acesso e poda (Playwright).
- `GLOSSARIO.md` — os nomes combinados (aprovados e propostos).

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
2. **Nível 1** nasce de cada lóbulo positivo da onda que nenhum nó do ouvido captou:
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
- A ligação ouvido → nível 1 é transdução fixa: não aprende nem decai.

## Poda (v0.5)

- **Aresta inerte** (peso < 0,01) vira **candidata à poda**. Inerte por 7 dias, é podada.
- **Nó** só é podado quando fica **órfão**: sem nenhuma aresta.
- **Acesso:** se o nó de origem dispara e a incidência passa por uma candidata, ela
  ganha +0,1 no peso basal, +3 h de janela de consolidação e sai da fila da poda.
- Os nós do nível 1 nunca ficam órfãos: a ligação ouvido → nível 1 é transdução fixa.

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

Esquecimento (`tests/decaimento.js`): nós novos ao ouvir o piano de novo depois
do pulo (0 = reconheceu; ~22 = reaprendeu do zero).

| repetições | consolidadas | 10 min | 2 h | 1 dia | 7 dias | 28 dias |
|---|---|---|---|---|---|---|
| 1× | 0/39 | 16 | 22 | 22 | 22 | 22 |
| 3× | 62/125 | 1 | 10 | 18 | 22 | 22 |
| 6× | 116/131 | 0 | 0 | 5 | 11 | 22 |

Observação: ouvido uma vez só, o caminho já falha em 10 min. O limiar do nó novo é
80% do que o criou; com meia-vida de 1 h, o peso cai abaixo disso em ~20 min.

Poda (`tests/poda.js`): ouvido 1×, depois de 1 dia as 39 arestas aprendidas são
candidatas. Ouvir de novo acessa 17 delas (as que saem do nível 1), mas o reforço
de acesso (0,11) não basta para o caminho disparar: nascem 22 nós novos. Uma semana
depois, tudo o que foi aprendido está podado (103 arestas, 36 nós); restam os 4
nós do nível 1. Ouvido 6×, a estrutura resiste a 4 semanas (só 15 arestas podadas)
e some entre 4 e 14 semanas.

Seletividade: num nó detector do período do dó, as arestas de um receptor
foram a ~0,99 (0,80 consolidado) e as de outro ficaram em ~0,46 e ~0,24.
