# Película: catálogo de filmes com estruturas de dados

Trabalho de Estrutura de Dados e Algoritmos II

Grupo: Luiz Filipe, Luiz Augusto, Gabriel Liszt e João Henrique.

## O que é

Um catálogo web, no estilo de um serviço de streaming, para explorar 65.975 filmes em 19
gêneros. Tudo o que aparece na tela sai de uma estrutura de dados, e a tela
"Estruturas" mostra, com animações, o que cada uma faz por dentro.

| Na tela | Estrutura | Tipo |
| --- | --- | --- |
| Faixa de gêneros | Lista encadeada com movimentação ao início | linear |
| Filmes de um gênero (grade, banner, "Ir para o ano") | Lista com saltos, uma por gênero | linear |
| Busca por título e "Vistos recentemente" | Árvore afunilada (splay) | hierárquica |

Há também uma árvore AVL clássica, que o catálogo não usa: ela serve só para comparar com a
árvore afunilada nos mesmos acessos (aba 3 da tela "Estruturas").

## Modificações nos algoritmos clássicos

São cinco. No código, cada uma está marcada com um comentário que começa com `MODIFICAÇÃO` e o
número dela; para achar todas, é só buscar por `MODIFICAÇÃO` na pasta `src/`.

| # | Modificação | O que muda em relação à clássica | Onde está no código |
| --- | --- | --- | --- |
| 1 | Busca truncada | A busca recebe um nível mínimo e para nele, em vez de descer sempre até o nível 0 | `SkipList.ts`, método `buscar` |
| 2 | Lista indexada | Cada ponteiro guarda quantos elementos pula; assim a lista acha o k-ésimo elemento e a posição de um elemento em O(log n) | `SkipList.ts`, campo `largura`, métodos `inserir`, `buscar`, `localizar` e `porPosicao` |
| 3 | Navegação por nível | Qualquer nível pode ser percorrido como uma lista própria, a partir de um cursor | `SkipList.ts`, métodos `primeiro` e `percorrer`, campo `nosPorNivel` |
| 4 | Consulta por prefixo sem afunilar | O autocompletar lê a árvore sem fazer rotações; só abrir um filme afunila | `ArvoreSplay.ts`, método `aPartirDe` |
| 5 | Várias chaves por filme | Cada filme entra na árvore com o título inteiro e com os finais do título ("knight" encontra "The Dark Knight") | `dados.ts`, função `chavesDoFilme` |

A lista encadeada com movimentação ao início, a AVL, as rotações e o afunilamento da árvore
seguem o algoritmo clássico.

## Base de dados

Dataset do Kaggle
[Movies Daily Update Dataset](https://www.kaggle.com/datasets/akshaypawar7/millions-of-movies),
com dados do TMDB (722 mil filmes). O script `scripts/preparar_dados.py` filtra os filmes
lançados que têm pôster, data, gênero e pelo menos 10 votos e gera `public/dados/filmes.json`,
que já vai junto com o código. As imagens não ficam no projeto: são carregadas de
`image.tmdb.org`, então é preciso estar online para vê-las.

## Como rodar

Requisito: Node 20+.

```bash
npm install
npm run dev      # abre em http://localhost:5173
```

## Organização do código

```
scripts/preparar_dados.py   download (Kaggle) e conversão da base
src/estruturas/             as estruturas de dados
src/dados.ts                carrega o JSON e monta as estruturas
src/comparacao.ts           mesmos acessos na árvore afunilada e na AVL
src/App.tsx                 estado da aplicação e faixa de gêneros
src/componentes/            as telas (catálogo, busca, ficha do filme e tela "Estruturas")
```

O projeto foi desenvolvido em TypeScript com React e Vite, com auxílio de um LLM (Claude Code) e Chat Gpt para a melhoria dos prompts.
