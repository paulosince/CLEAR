# Sdom — robô que ouve

Simulação de um robô com dois microfones e um domínio representacional (Sdom)
que começa vazio. O que ele ouve é representado num grafo: uma estrutura é
**percorrida de novo** quando chegam estímulos semelhantes aos que a criaram, e
**criada** quando um estímulo não encontra caminho.

- `web/index.html` — simulação completa numa página só (abrir no navegador).
- `tests/convergencia.js` — experimento automático piano → viola (Playwright).

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
6. Ainda sem aprendizado, divisão e arestas inibitórias.

## Resultado do experimento (parâmetros padrão)

Nós nascidos durante cada nota (n1/n2/n3/n4):

| nota | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| piano | 4/3/0/0 | 0/0/3/2 | 0/0/0/2 | 0/0/0/0 | 0/0/0/0 | 0/0/0/0 |
| viola | 2/7/8/4 | 0/0/9/5 | 0/0/1/4 | 0/0/0/2 | 0/0/0/1 | 0/0/0/0 |
| piano de novo | 0/3/12/2 | 0/0/5/5 | | | | |

O piano passa a ser só percorrido a partir da 4ª nota. A viola reaproveita parte
e cria o resto. Depois da viola, o piano volta a gerar estrutura: nós nascidos
com a viola também disparam no piano, e ele passa a ser relacionado a ela.

## Próximos passos

- Reforço: vias percorridas de novo baixam o **limiar** do nó.
- Decaimento: vias não percorridas enfraquecem **até ficarem inertes**; a estrutura permanece.
- Gravação dos universos no Neon para análise (arquitetura em discussão).
