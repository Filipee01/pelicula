import { Filme, compararTexto } from "./dados";
import { ArvoreAVL } from "./estruturas/ArvoreAVL";
import { ArvoreSplay } from "./estruturas/ArvoreSplay";

/**
 * Comparação entre a árvore afunilada e uma AVL com as mesmas chaves.
 *
 * As duas árvores daqui são cópias montadas só para o teste, para que as
 * centenas de buscas não mexam na árvore que o catálogo está usando.
 */

export interface Cenario {
  nome: string;
  descricao: string;
  /** Média de comparações por busca. */
  avl: number;
  afunilada: number;
}

export interface Comparacao {
  chaves: number;
  alturaAVL: number;
  alturaAfunilada: number;
  cenarios: Cenario[];
  /** O mesmo filme buscado várias vezes seguidas: comparações de cada busca. */
  repetido: { filme: Filme; avl: number[]; afunilada: number[] };
  tempoMs: number;
}

const BUSCAS = 2000;
const FAVORITOS = 20;
const REPETICOES = 5;

/** Gerador determinístico, para a comparação dar o mesmo resultado sempre. */
function criarSorteio(semente: number): () => number {
  let estado = semente >>> 0;
  return () => {
    estado = (Math.imul(estado, 1664525) + 1013904223) >>> 0;
    return estado / 4294967296;
  };
}

export function compararArvores(original: ArvoreSplay<string, Filme>): Comparacao {
  const inicio = performance.now();
  const sorteio = criarSorteio(2026);

  // Todas as chaves, lidas em ordem sem afunilar a árvore do catálogo.
  const nos = original.aPartirDe("", () => true, Infinity);
  const pares = nos.map((no) => ({ chave: no.chave, filme: no.valor }));
  const filmes = pares.filter((p) => p.chave === p.filme.chave).map((p) => p.filme);

  // Inserção em ordem embaralhada, como acontece na carga do catálogo.
  for (let i = pares.length - 1; i > 0; i--) {
    const j = Math.floor(sorteio() * (i + 1));
    [pares[i], pares[j]] = [pares[j], pares[i]];
  }
  const avl = new ArvoreAVL<string, Filme>(compararTexto);
  const afunilada = new ArvoreSplay<string, Filme>(compararTexto);
  for (const { chave, filme } of pares) {
    avl.inserir(chave, filme);
    afunilada.inserir(chave, filme);
  }

  /** Faz as mesmas buscas nas duas árvores e devolve as médias de comparações. */
  function medir(escolher: () => Filme): { avl: number; afunilada: number } {
    let somaAVL = 0;
    let somaAfunilada = 0;
    for (let i = 0; i < BUSCAS; i++) {
      const { chave } = escolher();
      somaAVL += avl.buscar(chave).comparacoes;
      afunilada.buscar(chave);
      somaAfunilada += afunilada.ultimaOperacao.comparacoes;
    }
    return { avl: somaAVL / BUSCAS, afunilada: somaAfunilada / BUSCAS };
  }

  const qualquer = () => filmes[Math.floor(sorteio() * filmes.length)];
  const favoritos = [...filmes].sort((a, b) => b.votos - a.votos).slice(0, FAVORITOS);
  const popular = () =>
    sorteio() < 0.9 ? favoritos[Math.floor(sorteio() * favoritos.length)] : qualquer();

  const cenarios: Cenario[] = [
    {
      nome: "Filmes ao acaso",
      descricao: `${BUSCAS} buscas, cada uma por um filme qualquer do catálogo`,
      ...medir(qualquer),
    },
    {
      nome: "Filmes populares",
      descricao: `${BUSCAS} buscas, 90% delas entre os ${FAVORITOS} filmes mais votados`,
      ...medir(popular),
    },
  ];

  const filme = qualquer();
  const repetido = { filme, avl: [] as number[], afunilada: [] as number[] };
  for (let i = 0; i < REPETICOES; i++) {
    repetido.avl.push(avl.buscar(filme.chave).comparacoes);
    afunilada.buscar(filme.chave);
    repetido.afunilada.push(afunilada.ultimaOperacao.comparacoes);
  }

  return {
    chaves: avl.tamanho,
    alturaAVL: avl.altura,
    alturaAfunilada: afunilada.altura(),
    cenarios,
    repetido,
    tempoMs: performance.now() - inicio,
  };
}
