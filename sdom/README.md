# Sdom — robô que ouve

Simulação de um robô com dois microfones e um domínio representacional (Sdom)
que começa vazio. O que ele ouve é representado num grafo: uma estrutura é
**percorrida de novo** quando chegam estímulos semelhantes aos que a criaram, e
**criada** quando um estímulo não encontra caminho.

- `web/index.html` — simulação completa numa página só. Publicada no GitHub Pages:
  https://paulosince.github.io/clear/sdom/web/
- `tests/convergencia.js` — experimento automático piano → viola (Playwright).
- `tests/decaimento.js` — aprender, ficar em silêncio, ouvir de novo (Playwright).

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

## Aprendizado (v0.2)

- **Reforço** (definido pelo Paulo: o limiar): quando o nó é percorrido de novo, o
  limiar cai 5%, até um piso de 30% do valor de nascimento. *Escolha do Claude:* só
  conta como nova travessia um disparo depois de ≥ 100 ms sem disparar — senão um
  nó que dispara a cada ciclo de um tom chegaria ao piso em décimos de segundo.
- **Decaimento** (definido pelo Paulo: a magnitude, até inerte; a estrutura fica):
  a magnitude que o nó entrega cai com meia-vida de 30 s de mundo desde o último
  disparo; abaixo de 1% da magnitude de nascimento o nó fica inerte (entrega 0).
  *Escolha do Claude:* disparar renova o nó (o relógio do decaimento recomeça).

Todos os números acima são parâmetros do universo.

## Gravação

Só local, no navegador (IndexedDB). A cada 2 s grava: o universo (versão e
parâmetros), os nós com suas arestas de entrada, as mudanças de limiar, a
atividade resumida (disparos por nó a cada 100 ms) e os estímulos tocados.
"Baixar JSON" exporta um universo no formato `sdom-universe/1`.

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

## Observações da v0.2

- Com o reforço, a convergência piorou: o piano não para mais de criar estrutura
  depois de 4 repetições. Hipótese: com limiar mais baixo, nós disparam com padrões
  parciais e em momentos novos, e isso é novidade para o nível de cima.
- Depois de ~4 min de silêncio tudo fica inerte, inclusive o nível 1. A primeira
  nota depois disso quase não passa do nível 1 (só "acorda" os nós); a segunda já
  percorre. Um som realmente novo, nesse estado, também não seria aprendido na
  primeira vez.
