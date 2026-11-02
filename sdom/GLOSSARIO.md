# Glossário do Sdom

Os nomes daqui vão para a teoria e para o artigo, por isso são combinados antes
de serem usados. **Termo novo só entra depois de aprovado pelo Paulo.**

Status: **aprovado** (definido ou aceito pelo Paulo) · **em discussão**.

## Estrutura

| termo | definição | origem | status |
|---|---|---|---|
| **Sdom** | domínio representacional do sistema: o grafo onde o que o robô percebe é representado. Nasce vazio. | Paulo | aprovado |
| **nó** | elemento do Sdom que integra incidências e dispara ao atingir o limiar. | Paulo | aprovado |
| **aresta** | ligação de um nó a outro; leva a incidência com um tempo de propagação. | Paulo | aprovado |
| **malha temporotopológica** | pedaço do grafo (num conjunto de grafos) cujos nós se relacionam, e cuja relação tem como conteúdo também o **tempo de percorrimento** entre os nós. Não é só a topologia que tem significado: o tempo também tem. Ex.: o detector do dó é definido pelos atrasos das arestas (≈3,8 ms entre entradas). | Paulo | aprovado |
| **malha (contagem no painel)** | para contar no painel: malha = estrutura **criada a partir de um mesmo estímulo**. Regra operacional provisória (v0.10): o nó novo pertence ao estímulo que começou por último antes do primeiro disparo que ele relaciona e que ainda soava. Com sons sobrepostos (ex.: chuva + fala), a atribuição pode errar. | Paulo (regra) · Claude (operacionalização) | em discussão |
| **sinapse** | junção aresta → nó. Hoje cada aresta termina em exatamente um nó, então o número de sinapses é igual ao de arestas. | Paulo | em discussão |
| **nível** | camada do Sdom (1 a 4) conforme a distância dos ouvidos. | Claude | em discussão |
| **universo** | um experimento completo, do nascimento do Sdom até ser destruído; tem versão e parâmetros. | Claude | aprovado |

## Transdução

| termo | definição | origem | status |
|---|---|---|---|
| **transdução** | traz para dentro do Sdom, já **normalizados** em incidências, os sinais que vêm de fora dele. É a primeira normalização do domínio representacional. Ex.: a cóclea no ouvido, os cones no olho — fazem parte do grupo de transdução, não do Sdom. Cada sentido tem a sua, fixa. | Paulo | aprovado |
| **exógeno / endógeno** | origem do sinal que chega à transdução: externo ao sistema (exógeno) ou interno ao sistema (endógeno). Os dois são externos ao Sdom. | Paulo | aprovado |

## Dinâmica

| termo | definição | origem | status |
|---|---|---|---|
| **incidência** | o que circula pelas arestas: excitatória ou inibitória, com magnitude. É a **moeda comum** do Sdom: tudo o que entra, de qualquer sentido, entra como incidência. | Paulo | aprovado |
| **magnitude** | intensidade da incidência, de 0 (inerte) a 1. O nó dispara com uma magnitude própria, definida pela transdução que o criou. | Paulo | aprovado |
| **limiar** | soma de incidências que faz o nó disparar. | Paulo | aprovado |
| **janela de integração** | por quanto tempo, depois de chegar, uma incidência ainda soma no nó. | Paulo | aprovado |
| **refratariedade** | tempo depois do disparo em que o nó não faz nada. | Paulo | aprovado |
| **tempo de propagação** | atraso da aresta para entregar a incidência; tem um valor basal e pode ser modulado. | Paulo | aprovado |
| **percorrer** | um estímulo semelhante ao que criou uma estrutura passa de novo por ela. | Paulo | aprovado |
| **lóbulo** | trecho positivo da onda que chega ao ouvido; um lóbulo que não encontra caminho cria um nó do nível 1. Não tem relação com lobos cerebrais: precisa de outro nome. | Claude | em discussão |
| **janela de agrupamento** | tempo em que disparos que não levaram a nenhum disparo seguinte são juntados para criar um nó novo. | Claude | em discussão |
| **absorvida** | incidência que ajudou algum nó a disparar. | Claude | aprovado |

## Aprendizado

| termo | definição | origem | status |
|---|---|---|---|
| **peso** | quanto a aresta modula a magnitude que passa por ela (0 a 1). Incidência entregue = magnitude do nó × peso. | Paulo (nome) | aprovado |
| **peso basal / peso consolidado** | as duas partes do peso: o basal se apaga em horas, o consolidado em semanas. Toda aresta nasce só com peso basal. | Claude (Paulo: "basal") | aprovado |
| **reforço / enfraquecimento** | o peso sobe quando a incidência chegou antes do disparo do nó seguinte e ajudou; desce quando chegou depois sem ajudar. | Claude | aprovado |
| **consolidação** | passagem do peso basal para o consolidado. | Claude | aprovado |
| **janela de consolidação** | tempo, a partir do primeiro reforço, em que o reforço acumulado pode consolidar. | Paulo | aprovado |
| **decaimento** | perda de peso com o tempo sem a aresta ser percorrida. | Paulo | aprovado |
| **inerte** | aresta com peso perto de zero (não entrega nada); nó que não participa da dinâmica. | Paulo | aprovado |

## Antecipação

| termo | definição | origem | status |
|---|---|---|---|
| **campo representacional relacional** | conjunto de representações interligadas por relações (ex.: hospital → médico, enfermeiro; não açougueiro, a não ser que seja paciente). Definido pelas relações, não pelo significado. | Paulo | aprovado |
| **preparação do campo representacional relacional** | o caminho que está sendo percorrido deixa preparado o que se relaciona a ele. Mecânica: um nó que recebeu incidências dentro da janela de integração, sem atingir o limiar, está preparado — usa as mesmas peças da dinâmica. Não é um estado futuro representado. | Paulo | aprovado |
| **previsão** | reservado: projeção de um estado em tempo futuro, calculada a partir de dados históricos (probabilidade). **Não** usar para a preparação do campo representacional relacional. | Paulo | aprovado |

## Marcapasso de recursos (em desenho, v0.11)

| termo | definição | origem | status |
|---|---|---|---|
| **marcapasso de recursos** | o equivalente funcional do coração. Fica **fora do Sdom** e tem **ritmo próprio** (não depende do Sdom para bater). A cada batida, **entrega recurso** ao Sdom: o Sdom depende disso de verdade, porque disparar e aprender gastam recurso, e o que não cabe no que foi entregue não acontece (manter a estrutura não gasta). O Sdom o **ajusta sem comandá-lo**: arestas levam incidências até ele, e as excitatórias aceleram, as inibitórias freiam; em repouso, o freio prevalece. As arestas que chegam até ele são **aprendidas**. O ritmo dele e o nível geral de recurso **voltam ao Sdom** pela transdução endógena. | Paulo | aprovado |
| **recurso operacional** | o que o marcapasso de recursos entrega a cada batida e o que o Sdom gasta para disparar e para aprender (manter não gasta). É medido em operações contadas, para que o resultado possa ser repetido com a mesma semente. "Quanto chega a cada batida" é só o recurso operacional entregue por batida. | Paulo | aprovado |
| **reserva operacional** | quanto recurso operacional cada nó tem guardado. Recebe mais onde há atividade. Quando está baixa, o nó deixa primeiro de aprender (inclusive de criar estruturas) e depois de disparar; o limiar para disparar cresce com a distância da transdução, então o mais longe cai antes. | Paulo | aprovado |

## Poda

| termo | definição | origem | status |
|---|---|---|---|
| **poda** | eliminação do Sdom de arestas inertes por um certo tempo, e dos nós que ficam órfãos. | Paulo | aprovado |
| **candidata à poda** | aresta inerte, ainda não podada. | Paulo | aprovado |
| **órfão** | nó sem nenhuma aresta; é podado. | Paulo | aprovado |
| **acesso** | o nó de origem dispara e a incidência passa por uma aresta candidata à poda: reforça o peso, aumenta a janela de consolidação e tira a aresta da fila da poda. | Paulo | aprovado |

## Observação

| termo | definição | origem | status |
|---|---|---|---|
| **pulo no tempo** | avançar o mundo em silêncio; só o decaimento acontece, calculado pelo tempo passado. | Claude | em discussão |
