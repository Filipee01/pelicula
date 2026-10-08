# Película: catálogo de filmes com estruturas de dados

Trabalho de Estrutura de Dados e Algoritmos II (Interface de Visualização de Base de Dados).

Grupo: Luiz Filipe, Luiz Augusto, Gabriel Liszt e João Henrique.

## A aplicação

A Película é um catálogo web, no estilo de um serviço de streaming, para explorar 65.975
filmes em 19 gêneros. Tudo o que aparece na tela sai de uma estrutura de dados implementada à
mão, e a tela "Estruturas" mostra o que cada uma faz por dentro.

| Na tela | Estrutura | Tipo |
| --- | --- | --- |
| Faixa de gêneros (topo) | Lista encadeada com movimentação ao início | linear |
| Filmes de um gênero (grade e banner) | Lista com saltos, uma por gênero | linear |
| Busca por título e "Topo da árvore" | Árvore afunilada (splay) | hierárquica |

- **Gêneros.** O gênero clicado vai para o início da faixa.
- **Profundidade da exploração.** O controle escolhe em que nível da lista com saltos a grade
  caminha: no nível 0 aparecem todos os filmes do gênero; em cada nível acima, cerca de metade;
  no último, só os poucos que estão "por cima".
- **Ir para o ano.** Salta para o primeiro filme a partir de um ano, mantendo o nível escolhido.
- **Banner.** Mostra o filme mais votado dentre os que estão nos níveis mais altos da lista com
  saltos do gênero.
- **Surpreenda-me.** Abre um filme sorteado do gênero atual.
- **Busca.** Autocompleta por qualquer final do título ("knight" encontra "The Dark Knight").
- **Topo da árvore.** Todo filme aberto é afunilado até a raiz. A lateral direita, que começa
  recolhida e abre pela aba na borda da tela, desenha os três primeiros níveis da árvore com os
  pôsteres, e os nós são clicáveis.

### Tela "Estruturas"

O botão "Estruturas", no topo, troca o catálogo por uma tela feita para a apresentação, com uma
aba por estrutura. Cada aba lista as modificações (o que a clássica faz e o que a nossa faz, com
o trecho do código) e tem demonstrações que rodam sobre as estruturas reais do catálogo:

- **Lista encadeada com movimentação ao início.** Os nós encadeados dos gêneros; clicar em um mostra a posição em que estava, as
  comparações e a ida para o início.
- **Lista com saltos.** O caminho da busca desenhado nível a nível, comparando a busca clássica,
  a truncada e a sequencial; o acesso ao k-ésimo filme com a soma das larguras dos saltos; e a
  quantidade de filmes em cada nível.
- **Árvore afunilada.** A consulta por prefixo (com zero rotações), o afunilamento de um
  título, com os passos zig, zig-zig e zig-zag e o topo da árvore antes e depois, e a
  comparação com uma AVL nos mesmos acessos.

## Modificações nos algoritmos clássicos

São cinco. No código, cada uma está marcada com um comentário que começa com
`MODIFICAÇÃO` e o número dela (por exemplo `// MODIFICAÇÃO 1: busca truncada`). Para achar
todas, é só buscar por `MODIFICAÇÃO` na pasta `src/` (no VS Code, Ctrl+Shift+F).

| # | Modificação | Estrutura | Onde está no código |
| --- | --- | --- | --- |
| 1 | Busca truncada | Lista com saltos | `SkipList.ts`, método `buscar` |
| 2 | Lista indexada (larguras) | Lista com saltos | `SkipList.ts`, campo `largura`, métodos `inserir`, `buscar`, `localizar` e `porPosicao` |
| 3 | Navegação por nível | Lista com saltos | `SkipList.ts`, método `percorrer` e campo `nosPorNivel` |
| 4 | Consulta por prefixo sem afunilar | Árvore afunilada | `ArvoreSplay.ts`, método `aPartirDe` |
| 5 | Várias chaves por filme | Árvore afunilada | `dados.ts`, função `chavesDoFilme` |

O que não é modificação também está dito nos comentários: o afunilamento da árvore, o sorteio
das alturas, a lista de gêneros e a AVL seguem o algoritmo clássico.

O detalhe de cada uma:

**Lista com saltos** (`src/estruturas/SkipList.ts`)

1. *Busca truncada.* A busca clássica desce sempre até o nível 0. A nossa recebe um nível mínimo
   e para nele, devolvendo o primeiro elemento >= alvo dentre os que existem naquele nível. Com
   nível mínimo 0 ela é exatamente a clássica. É o que faz o "Ir para o ano" funcionar em
   qualquer profundidade.
2. *Lista indexada.* Na lista clássica cada ponteiro só aponta para o próximo nó. Na nossa, cada
   ponteiro guarda também a sua largura (quantos nós do nível 0 ele atravessa), mantida na
   inserção. Com isso a lista responde "qual é o k-ésimo elemento" e "em que posição está este
   elemento" em O(log n). É usada no "Surpreenda-me", na posição mostrada na ficha do filme e
   para achar o último filme de um gênero.
3. *Navegação por nível.* Na lista clássica os níveis são só um atalho interno da busca. Na
   nossa, qualquer nível pode ser percorrido como uma lista, a partir de um cursor: o nível L
   devolve uma amostra de cerca de n/2^L filmes, espalhada de modo uniforme pela ordem
   cronológica. É o controle "Profundidade da exploração"; a rolagem infinita continua do
   cursor, sem refazer a busca.

**Árvore afunilada** (`src/estruturas/ArvoreSplay.ts` e `src/dados.ts`)

4. *Consulta por prefixo sem afunilar.* Na árvore clássica toda busca afunila. O autocompletar
   desce até a primeira chave >= prefixo e anda pelos sucessores em ordem, sem nenhuma rotação.
   Como roda a cada tecla, não pode reestruturar a árvore; só abrir um filme afunila.
5. *Várias chaves por filme.* Na árvore clássica cada registro tem uma chave. Aqui cada filme
   entra com o título completo e com até quatro finais do título ("the dark knight", "dark
   knight", "knight"), todas apontando para o mesmo filme. O afunilamento usa sempre a chave do
   título completo.

As rotações e o afunilamento (zig, zig-zig, zig-zag) são os clássicos.

**O que é apoio, e não modificação**

- *Sorteio com semente* (lista com saltos): as alturas vêm de um gerador determinístico, então
  a mesma base gera sempre as mesmas torres.
- *Caminho da busca e saltos* (lista com saltos): a busca devolve os nós em que pisou, para a
  tela "Estruturas" desenhar.
- *Leitura do topo* (árvore): `topo(n)` devolve os n primeiros níveis em largura, que a
  interface desenha.
- *Registro das rotações* (árvore): cada afunilamento guarda os passos, a profundidade original
  e as comparações, exibidos na tela "Estruturas".
- *Aquecimento* (árvore): depois de montada, a árvore acessa os 12 filmes mais votados, para a
  tela inicial já ter títulos conhecidos perto da raiz.

**Estruturas sem modificação**

- *Lista encadeada com movimentação ao início* (`src/estruturas/ListaMTF.ts`): é a clássica; apenas
  devolve as comparações e a posição anterior para a interface exibir.
- *Árvore AVL* (`src/estruturas/ArvoreAVL.ts`): é a clássica e só entra na comparação abaixo.

## Comparação com a árvore AVL

Para justificar a escolha da árvore afunilada, o projeto traz também uma AVL clássica
(`src/estruturas/ArvoreAVL.ts`). Ela **não é usada pelo catálogo**: serve só de referência na
aba 3 da tela "Estruturas". As duas árvores são montadas com as mesmas 191.763 chaves, na mesma
ordem embaralhada, e respondem às mesmas buscas (sorteadas com semente fixa); conta-se uma
comparação por nó visitado. O teste roda em cópias, sem mexer na árvore do catálogo
(`src/comparacao.ts`).

| Cenário | AVL | Afunilada |
| --- | --- | --- |
| 2.000 buscas por filmes ao acaso (média) | 16,9 | 23,2 |
| 2.000 buscas, 90% entre os 20 filmes mais votados (média) | 16,8 | 7,2 |
| O mesmo filme 5 vezes seguidas | 19, 19, 19, 19, 19 | 30, 1, 1, 1, 1 |
| Altura ao final | 21 | 46 |

A AVL garante o pior caso; a afunilada se adapta ao uso e ganha quando os acessos se repetem,
que é o padrão de um catálogo. A comparação conta só comparações de chave, não o custo das
rotações que a afunilada faz a cada busca.

## Base de dados

Dataset do Kaggle
[Movies Daily Update Dataset](https://www.kaggle.com/datasets/akshaypawar7/millions-of-movies),
com dados do TMDB: um CSV de 722 mil filmes com título, gêneros, data, nota, sinopse e os
caminhos do pôster e da imagem de fundo.

`scripts/preparar_dados.py` baixa o zip do Kaggle (165 MB, sem login) e gera
`public/dados/filmes.json` (20 MB), que já vai junto com o código. Entram os filmes lançados
que têm pôster, data, gênero e pelo menos 10 votos, sem repetições: 65.975 filmes. As imagens
não ficam no projeto: a aplicação carrega cada uma de `image.tmdb.org` pelo caminho que está na
base. Por isso é preciso estar online para ver as imagens.

Particularidades da base:

- **Filmes em vários gêneros.** Um filme entra na lista com saltos de cada gênero que tem.
- **Textos em inglês.** Títulos e sinopses vêm em inglês; só os nomes dos gêneros foram
  traduzidos. As sinopses são cortadas em 240 caracteres.
- **Elenco.** A base separa os nomes do elenco com hífen, o que quebra nomes compostos
  ("Carrie-Anne Moss"); por isso o elenco não é usado.
- **Conteúdo adulto.** A base não marca filmes adultos; o script descarta os que têm
  palavras-chave desse tipo. O filtro é por palavra-chave, então pode não pegar todos.
- **Pôsteres removidos.** Se uma imagem não existir mais no TMDB, o filme some da grade.

## Como rodar

Requisito: Node 20+.

```bash
npm install
npm run dev      # abre em http://localhost:5173
npm test         # testes das estruturas de dados
```

Para gerar a base de novo (opcional, exige Python 3.10+, sem bibliotecas extras):

```bash
python scripts/preparar_dados.py
```

## Organização do código

```
scripts/preparar_dados.py     download (Kaggle) e conversão da base
src/estruturas/               as estruturas de dados e seus testes (inclui a AVL de referência)
src/comparacao.ts             mesmos acessos na árvore afunilada e na AVL
src/dados.ts                  carrega o JSON e monta as estruturas
src/App.tsx                   estado da aplicação e faixa de gêneros
src/componentes/Galeria.tsx   banner, grade de filmes, níveis, salto por ano
src/componentes/VisualSkip.tsx   desenho das torres da lista com saltos
src/componentes/PainelEstruturas.tsx   lateral recolhível do catálogo com o topo da árvore
src/componentes/Estruturas.tsx   tela de apresentação, uma aba por estrutura
src/componentes/DesenhoArvore.tsx   desenho dos primeiros níveis da árvore
src/componentes/ComparacaoArvores.tsx   quadro da comparação com a AVL
src/componentes/Busca.tsx     autocompletar de títulos
src/componentes/ModalFilme.tsx   ficha do filme
```

O JSON é lido para um vetor apenas como etapa de carga; a partir daí, toda consulta feita pela
interface passa pelas listas e pela árvore.

## Processo de desenvolvimento

O projeto foi desenvolvido com auxílio de um LLM (Claude Code), em TypeScript com React e Vite.
Tudo roda no navegador, sem servidor: assim as estruturas ficam em memória ao lado da interface
e dá para desenhá-las ao vivo.

1. Escolha da base: comparamos bases do Kaggle com imagens (arte, filmes, animes, músicas,
   astronomia, cartas) e ficamos com a de filmes, pela quantidade de dados e pelo apelo visual
   dos pôsteres e imagens de fundo.
2. Estruturas primeiro: as listas e a árvore foram escritas e testadas isoladamente (16 testes
   com Vitest, comparando com resultados calculados por força bruta).
3. Interface depois: cada funcionalidade foi desenhada a partir do que a estrutura oferece (os
   níveis viram a "profundidade", o topo da árvore vira a vitrine de filmes abertos).
4. Verificação: a aplicação foi exercitada em um Chrome automatizado (troca de gênero, níveis,
   salto por ano, busca, ficha, sorteio), conferindo os números mostrados na tela.
