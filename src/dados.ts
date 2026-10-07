import { ArvoreSplay } from "./estruturas/ArvoreSplay";
import { ListaMTF } from "./estruturas/ListaMTF";
import { SkipList } from "./estruturas/SkipList";

export interface Filme {
  id: number;
  titulo: string;
  ano: number;
  generos: Genero[];
  /** Caminhos das imagens no TMDB; o fundo pode ser vazio. */
  poster: string;
  fundo: string;
  nota: number;
  votos: number;
  /** Duração em minutos; 0 quando a base não informa. */
  duracao: number;
  sinopse: string;
  /** Chave do título completo na árvore afunilada. */
  chave: string;
}

export interface Genero {
  id: number;
  nome: string;
  lista: SkipList<Filme>;
}

export interface Acervo {
  totalFilmes: number;
  generos: ListaMTF<Genero>;
  titulos: ArvoreSplay<string, Filme>;
  tempoMontagemMs: number;
}

interface Bruto {
  generos: string[];
  /** [título, ano, gêneros, pôster, fundo, nota, votos, duração, sinopse] */
  filmes: [string, number, number[], string, string, number, number, number, string][];
}

const GENEROS_PT: Record<string, string> = {
  Action: "Ação",
  Adventure: "Aventura",
  Animation: "Animação",
  Comedy: "Comédia",
  Crime: "Crime",
  Documentary: "Documentário",
  Drama: "Drama",
  Family: "Família",
  Fantasy: "Fantasia",
  History: "História",
  Horror: "Terror",
  Music: "Música",
  Mystery: "Mistério",
  Romance: "Romance",
  "Science Fiction": "Ficção científica",
  "TV Movie": "Cinema TV",
  Thriller: "Suspense",
  War: "Guerra",
  Western: "Faroeste",
};

/** Dentro de cada gênero os filmes ficam em ordem cronológica. */
export function compararFilmes(a: Filme, b: Filme): number {
  return a.ano - b.ano || compararTexto(a.titulo, b.titulo) || a.id - b.id;
}

/** Direção de busca para "primeiro filme do ano X em diante". */
export function aPartirDoAno(ano: number): (f: Filme) => number {
  return (f) => f.ano - ano;
}

export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function compararTexto(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

const TMDB = "https://image.tmdb.org/t/p/";

export function urlPoster(filme: Filme, largura: 92 | 342 | 500): string {
  return `${TMDB}w${largura}${filme.poster}`;
}

export function urlFundo(filme: Filme, largura: 780 | 1280): string {
  return `${TMDB}w${largura}${filme.fundo}`;
}

/** Quantos "finais" do título viram chave ("the dark knight", "dark knight", "knight"). */
const MAXIMO_CHAVES = 5;

// MODIFICAÇÃO 5: várias chaves por filme.
// Numa árvore normal cada registro tem uma chave só. Aqui cada filme entra com
// o título inteiro e também com os finais do título. Assim quem digita "knight"
// acha "The Dark Knight". O id no fim deixa a chave única.
function chavesDoFilme(titulo: string, id: number): string[] {
  const palavras = normalizar(titulo).split(" ");
  return palavras
    .slice(0, MAXIMO_CHAVES)
    .map((_, i) => `${palavras.slice(i).join(" ")}\t${id}`);
}

export async function carregarAcervo(): Promise<Acervo> {
  const resposta = await fetch("/dados/filmes.json");
  if (!resposta.ok) throw new Error("Base de dados não encontrada");
  const bruto: Bruto = await resposta.json();
  const inicio = performance.now();

  const generos: Genero[] = bruto.generos.map((nome, id) => ({
    id,
    nome: GENEROS_PT[nome] ?? nome,
    lista: new SkipList<Filme>(compararFilmes, id + 1),
  }));

  const arvore = new ArvoreSplay<string, Filme>(compararTexto);
  const filmes: Filme[] = [];

  for (let id = 0; id < bruto.filmes.length; id++) {
    const [titulo, ano, ids, poster, fundo, nota, votos, duracao, sinopse] = bruto.filmes[id];
    const chaves = chavesDoFilme(titulo, id);
    const filme: Filme = {
      id,
      titulo,
      ano,
      generos: ids.map((g) => generos[g]),
      poster,
      fundo,
      nota,
      votos,
      duracao,
      sinopse,
      chave: chaves[0],
    };
    filmes.push(filme);
    // Um filme de vários gêneros entra na lista com saltos de cada um.
    for (const genero of filme.generos) genero.lista.inserir(filme);
    // MODIFICAÇÃO 5: um nó na árvore para cada chave, todos do mesmo filme
    for (const chave of chaves) arvore.inserir(chave, filme);
  }

  // Lista MTF dos gêneros: começa pelos maiores acervos.
  const listaGeneros = new ListaMTF<Genero>();
  [...generos]
    .sort((a, b) => b.lista.tamanho - a.lista.tamanho)
    .forEach((g) => listaGeneros.inserirNoFim(g));

  // "Aquecimento": acessa os filmes mais votados para que comecem no topo.
  [...filmes]
    .sort((a, b) => b.votos - a.votos)
    .slice(0, 12)
    .reverse()
    .forEach((f) => arvore.buscar(f.chave));

  return {
    totalFilmes: filmes.length,
    generos: listaGeneros,
    titulos: arvore,
    tempoMontagemMs: performance.now() - inicio,
  };
}
