# Desenho: marcapasso de recursos (para conferência antes de programar)

Status: **em revisão pelo Paulo**. Nada disto está no código ainda.
Método: (1) o raciocínio levanta hipóteses; (2) as hipóteses buscam respaldo na neurobiologia;
(3) o que sobrevive vira arquitetura agnóstica de substrato.

Termos aprovados usados aqui (ver `GLOSSARIO.md`): **marcapasso de recursos**, **recurso operacional**,
**reserva operacional**, **piso** (de aprender, de disparar), **eferência**, **transdução endógena**.

---

## 1. Objetivo

Ter no robô algo que cumpra as funções do coração **sem simular um coração**: dependência real,
consequências reais e adaptação real. Se o marcapasso de recursos parar, o Sdom para de verdade;
se ele acelerar, o Sdom ganha capacidade de verdade.

## 2. O que o coração faz (e o respaldo)

| função | o que a biologia mostra | fonte |
|---|---|---|
| ritmo próprio | o coração bate sem o cérebro; sem os dois controles (bloqueio por remédio), sobra a frequência intrínseca | Jose & Taylor (JCI); Cumming & Mir, 1970 |
| ajustado, não comandado | acelerador (simpático) e freio (vago) atuam juntos; em repouso o freio vence (aos 16 anos: repouso 81, sem freio 128, sem os dois 102 bpm) | Cumming & Mir, 1970 |
| o que é acessado mexe no ritmo | som novo desacelera (resposta de orientação), e a resposta se habitua; associação aprendida (som pareado com glicose passa a acelerar o coração de bebês) | Chase & Graham, 1967; Graham & Clifton, 1966; revisão em Frontiers 2021 |
| quem faz a ponte | rede autonômica central (ínsula, amígdala, hipotálamo…) com interconexões recíprocas; estimular a ínsula muda a frequência | Benarroch, 1993; Tian et al., 2025 |
| distribui o que o cérebro gasta | o fluxo é controlado localmente por neurônios e astrócitos; a região ativa recebe mais do que gasta | Attwell et al., 2010; Raichle & Gusnard, 2002 |
| o gasto vem de sinalizar | disparos e sinapses consomem a maior parte; o gasto cresce com a taxa de disparos | Attwell & Laughlin, 2001 |
| dependência imediata | interrupções breves na produção local de ATP prejudicam a sinapse | Rangaraju, Calloway & Ryan, 2014 |
| na falta, aprender cai primeiro | mosca faminta desliga a memória de longo prazo cara; forçá-la reduz a sobrevivência em ~1/3 | Plaçais & Preat, 2013 |
| na falta, o "longe" cai antes do "perto" | hipoglicemia: córtex antes de estruturas profundas; anestesia: córtex auditivo primário preservado, regiões de ordem mais alta atenuadas. (Padrão, não prova de mecanismo) | Pramming et al. (PMC2545293); PMC7261054 |
| adaptação | exercício aumenta vasos na região usada (em ~1 mês); a oferta acompanha a demanda que se mantém | Black et al., 1990; Isaacs et al., 1992 |
| é sentido | barorreceptores codificam força e momento de cada batida na sístole; a fase cardíaca muda a percepção (medo mais intenso na sístole) | Garfinkel et al., 2014 |
| participa da atividade espontânea | sinais do coração e do estômago organizam parte da atividade espontânea; respostas às batidas na rede padrão codificam relevância para si em pensamentos espontâneos | Azzalini, Rebollo & Tallon-Baudry, 2019; Tallon-Baudry (palestras) |
| também é glândula | o coração solta hormônio próprio (ANF/ANP) e regula a própria carga | de Bold et al., 1981; Ogawa & de Bold, 2014 |

## 3. Decisões do Paulo (2 nov 2026)

1. **Dependência real.** O que não cabe no recurso operacional entregue **não acontece**.
2. **Moeda: operações contadas** (opção B). A falta é real para o Sdom e o resultado se repete com a mesma semente.
3. **O mundo não muda; muda o sistema.** O relógio do mundo nunca mais desacelera por falta de capacidade.
4. **Manter não gasta.** Gastam: **disparar** (acessar) e **aprender**.
5. **Na falta: aprender cai primeiro** (inclusive criar nós e arestas); **depois o acesso, aos poucos, do mais longe para o mais perto da transdução.**
6. **Reserva operacional por nó** (não global). "Local" é definido pelo grafo, nunca pela posição no desenho.
7. **Pisos em degraus:** piso de aprender (o mais alto); piso de disparar crescendo com a distância da transdução.
8. **O Sdom ajusta o marcapasso por incidências** (eferência): excitatórias aceleram, inibitórias freiam. Ele não obedece; soma os empurrões.
9. **As ligações da eferência são aprendidas**, pela mesma regra de criação de sempre, quando o sinal do próprio ritmo coincide com a atividade de representações.
10. **Em repouso, o freio prevalece.**
11. **Moduladores ficam para depois**, mas o transporte é feito genérico (o recurso operacional é a primeira coisa transportada).

## 4. Proposta de arquitetura (para conferir)

Os números abaixo são **pontos de partida meus**, não medidos. Ficam no arquivo de parâmetros
com a origem anotada, e mudam com experimento.

### 4.1 Marcapasso de recursos
- **Ritmo próprio**: frequência intrínseca `f0` (proposta: 1,7 batida/s de mundo ≈ 100 bpm, para a intuição bater com a humana).
- **Ajuste pela eferência**: as incidências que chegam nele numa janela somam um empurrão `u` (excitatórias +, inibitórias −); a frequência muda devagar em direção a `f0 · e^(k·u)`, sem nunca passar de limites mínimo e máximo. Não há comando direto: só o empurrão.
- **Entrega por batida**: `V` unidades de recurso operacional por batida (proposta inicial: força fixa; o ajuste da força pode vir depois — na biologia, o simpático também aumenta a força).
- **Oferta por segundo** = frequência × `V`.

### 4.2 Distribuição (a cada batida)
- Cada nó recebe uma parte **base** (para ninguém zerar) mais uma parte **proporcional ao que gastou desde a última batida**, com **sobra** (fator > 1), como o sangue que chega a mais na região ativa.
- Se os pedidos somam mais do que a batida entrega, todos recebem proporcionalmente menos.
- A reserva operacional de cada nó tem um **teto** (a capacidade local).

### 4.3 Gastos (operações contadas)
| operação | quem paga | custo inicial proposto |
|---|---|---|
| disparar | o nó que dispara | 1 + 1 por incidência entregue (por aresta de saída) |
| reforço / enfraquecimento | o nó que recebe a aresta | 1 por mudança de peso |
| consolidação | o nó que recebe a aresta | 20 (a mais cara do aprender, como a memória de longo prazo) |
| criar nó e arestas | os nós cujos disparos foram relacionados, divididos igualmente | 10 + 2 por aresta |

A transdução (fibras) fica **fora** do orçamento: ela não é Sdom.

### 4.4 Pisos
- Medidos como fração do teto da reserva operacional do nó.
- **Piso de aprender**: 0,6. Abaixo disso, o nó não aprende nem participa de criação.
- **Piso de disparar**: `0,05 + 0,04 × (distância − 2)`, limitado a 0,5. O nó mais longe da transdução precisa de mais reserva para disparar.
- Quando o nó atingiria o limiar mas está abaixo do piso de disparar, **ele não dispara**; as incidências seguem a regra normal da janela de integração.

### 4.5 Adaptação
- O teto da reserva de cada nó **cresce devagar** quando ele fica abaixo do piso de disparar com frequência (demanda maior que oferta) e **diminui devagar** quando sobra.
- Escala de dias a semanas, calculada pelo tempo passado (como o decaimento): o **pulo no tempo** continua funcionando.

### 4.6 Transdução endógena (o circuito se fecha)
- **Batida**: a cada batida, fibras endógenas disparam (tudo-ou-nada, magnitude 1); quanto mais forte a batida, mais fibras disparam. O ritmo aparece no intervalo entre disparos.
- **Nível geral de recurso**: a média das reservas operacionais é sentida por fibras com limiares escalonados (como as 3 fibras de cada canal da cóclea), que disparam junto com a batida quando o nível está acima do limiar delas.
- Essas incidências entram no Sdom como qualquer outra e são relacionadas pela regra de criação de sempre.

### 4.7 Eferência
- Quando a regra de criação relaciona disparos que incluem fibras endógenas, o nó novo ganha também uma **ligação de eferência** até o marcapasso de recursos.
- O efeito dessa ligação (acelera ou freia) é **aprendido** — ver aberto 1.

### 4.8 Consequências esperadas (a verificar)
- Em silêncio, o Sdom deixa de ficar parado: as batidas chegam sempre (primeira fonte endógena).
- Com muito som, a reserva baixa onde há atividade: primeiro para o aprender, depois o acesso do longe para o perto.
- Com o tempo, onde a demanda se mantém, a capacidade local cresce.

## 5. Em aberto (decisões e respaldo que faltam)

1. **Sinal da eferência.** Minha hipótese: se o disparo do nó vem antes de batidas mais rápidas, a ligação vira acelerador; antes de batidas mais lentas, vira freio (aprendido pelo tempo, como o reforço). Falta respaldo.
2. **Freio em repouso com o Sdom vazio.** O Sdom nasce vazio, então no começo ninguém freia: o robô "recém-nascido" bateria na frequência intrínseca, e o freio surgiria com o aprendizado. Curiosamente, bebês têm frequência mais alta (118 bpm com 1 ano, 81 aos 16, em Cumming & Mir), mas isso não prova o mecanismo. É isso que você quer?
3. **Força da batida** também ajustável pela eferência, ou só a frequência por enquanto?
4. **Quem paga a criação** (proposta: os nós relacionados, divididos igualmente).
5. **Valores numéricos** de §4: todos são pontos de partida meus.
6. **Moduladores**: depois, ligados à teoria (não à fisiologia).
7. **Nome das arestas**: o Paulo vai propor outro.

## 6. Testes a escrever junto com o código

- **Dependência:** com o marcapasso parado, nenhum nó do Sdom dispara depois que a reserva acaba; as fibras da transdução continuam.
- **Ordem do corte:** com a reserva baixando, o aprender para antes do disparo; entre os disparos, o mais longe para antes do mais perto.
- **O mundo não espera:** com muito som, o relógio do mundo avança no tempo certo; o Sdom faz menos.
- **Adaptação:** demanda sustentada aumenta o teto local; sobra o diminui.
- **Circuito:** em silêncio, as fibras endógenas disparam a cada batida.
- **Eferência:** incidência excitatória acelera, inibitória freia; sem eferência, o ritmo vai para `f0`.
- **Repetição:** mesma semente, mesmo resultado.

## 7. Fontes

- Jose & Taylor — https://www.jci.org/articles/view/106167
- Cumming & Mir, 1970 — https://pmc.ncbi.nlm.nih.gov/articles/PMC487411
- Chase & Graham, 1967 — https://link.springer.com/article/10.3758/BF03330819
- Condicionamento e frequência cardíaca (Frontiers, 2021) — https://www.frontiersin.org/journals/behavioral-neuroscience/articles/10.3389/fnbeh.2021.639372/full
- Benarroch, 1993 — https://www.qigonginstitute.org/abstract-print/16616
- Tian et al., 2025 — https://www.frontiersin.org/articles/10.3389/fnins.2025.1665378/full
- Attwell et al., 2010 — https://ideas.repec.org/a/nat/nature/v468y2010i7321d10.1038_nature09613.html
- Raichle & Gusnard, 2002 — https://pmc.ncbi.nlm.nih.gov/articles/PMC124895
- Attwell & Laughlin, 2001 — https://pubmed.ncbi.nlm.nih.gov/11598490/
- Rangaraju, Calloway & Ryan, 2014 — https://pmc.ncbi.nlm.nih.gov/articles/3955179/
- Plaçais & Preat, 2013 — https://www.bio.espci.fr/sites/www.bio.espci.fr/IMG/pdf/placaispreat2013_.pdf
- Hipoglicemia e EEG — https://pmc.ncbi.nlm.nih.gov/articles/PMC2545293
- Anestesia e córtex auditivo — https://pmc.ncbi.nlm.nih.gov/articles/PMC7261054
- Mitrakou et al., 1991 (hierarquia de limiares) — https://experts.mcmaster.ca/scholarly-works/1575574
- Black et al., 1990 — https://pmc.ncbi.nlm.nih.gov/articles/PMC54366
- Isaacs et al., 1992 — https://researchconnect.stonybrook.edu/en/publications/exercise-and-the-brain-angiogenesis-in-the-adult-rat-cerebellum-a/
- Garfinkel et al., 2014 — https://pmc.ncbi.nlm.nih.gov/articles/PMC4012313/
- Tallon-Baudry (palestras) — https://talks.ox.ac.uk/talks/id/03228cd0-0fc2-4da6-b3df-d46a8c6835ea?format=txt
- Ogawa & de Bold, 2014 — https://pmc.ncbi.nlm.nih.gov/articles/PMC3987289
- Craig, 2002 — https://pubmed.ncbi.nlm.nih.gov/12154366/
