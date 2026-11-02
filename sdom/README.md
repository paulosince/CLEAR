# Sdom — robô que ouve

Simulação de um robô com dois microfones e um **Sdom — domínio representacional do sistema**,
que começa vazio. O que ele ouve é representado num grafo: uma estrutura é
**percorrida de novo** quando chegam estímulos semelhantes aos que a criaram, e
**criada** quando um estímulo não encontra caminho.

- `web/index.html` — simulação completa numa página só. Publicada no GitHub Pages:
  https://paulosince.github.io/CLEAR/sdom/web/
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

## Aprendizado (v0.3)

Reforço e enfraquecimento agem **no mesmo lugar e em sentidos opostos: o peso da
aresta** (a modulação da magnitude, de 0 = inerte a 1 = máximo), como LTP e LTD
na sinapse. A magnitude do nó e o limiar ficam fixos: a magnitude continua
representando o que a transdução definiu.

- **Sincronia, reforço:** a incidência chegou *antes* do disparo do nó seguinte e
  contribuiu → o peso sobe `aPlus·(1−peso)·e^(−Δt/17 ms)`. O `(1−peso)` é o freio:
  quanto mais forte, menos sobe (dependência do peso observada por Bi & Poo, 1998).
- **Sincronia, enfraquecimento:** a incidência chegou *depois* de o nó já ter
  disparado → o peso desce `aMinus·peso·e^(−Δt/34 ms)`. Fica pendente: se ela
  ainda ajudar o próximo disparo, o reforço vence (modelo de Sjöström, Turrigiano
  & Nelson, 2001). Sem essa regra, em sons periódicos cada incidência era ao mesmo
  tempo "atrasada" para o disparo anterior e "a tempo" para o seguinte, e os pesos
  ficavam presos no valor de nascimento.
- **Decaimento:** sem ser percorrida, o peso cai com meia-vida de 30 s de mundo;
  abaixo de 0,01 a aresta fica inerte (a estrutura permanece).
- Arestas nascem com peso 0,5; o limiar do nó novo é calibrado com esse peso.
- A ligação ouvido → nível 1 é transdução fixa: não aprende nem decai.

Janelas de 17 ms e 34 ms: médias de Bi & Poo (1998). Todos os números são
parâmetros do universo.

### Histórico
- v0.2 tentou reforço no limiar e decaimento na magnitude. Como agiam em coisas
  diferentes, um não desfazia o outro e não havia volta. Substituído na v0.3.

## Gravação

Só local, no navegador (IndexedDB). A cada 2 s grava: o universo (versão e
parâmetros), os nós com suas arestas de entrada, as mudanças de peso das arestas
(`[peso, momento da última mudança]`, para recalcular o decaimento), a atividade
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

## Resultados da v0.3 (parâmetros padrão, `tests/`)

Nós nascidos durante cada nota (n1/n2/n3/n4):

| nota | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| piano | 4/5/7/2 | 0/1/12/5 | 0/0/0/2 | 0/0/0/2 | 0/0/0/0 | 0/0/0/0 |
| viola | 2/1/7/2 | 0/1/4/3 | 0/0/1/3 | 0/0/0/0 | 0/0/0/0 | 0/0/0/0 |
| piano de novo | 0/5/13/5 | 0/0/5/3 | | | | |

Decaimento (`tests/decaimento.js`): com o uso, o peso médio sobe de 0,5 para ~0,79.
Após 10 s de silêncio o piano ainda é só percorrido. Após 60 s os pesos caíram a
~1/4 e o piano volta a gerar estrutura nova ao lado da antiga (esqueceu e
reaprende). Após 240 s todas as arestas aprendidas estão inertes.

Exemplo de seletividade: um nó de nível 2 detector do período do dó terminou com
as duas arestas de um receptor em ~0,92 e as duas de outro em ~0,44 e ~0,22.
