// Árvore AVL clássica, sem modificação.
//
// O catálogo não usa esta árvore. Ela existe só para comparar com a árvore
// afunilada: colocamos as mesmas chaves nas duas, fazemos as mesmas buscas e
// contamos as comparações. A comparação está em src/comparacao.ts.

class NoAVL<K, V> {
  esq: NoAVL<K, V> | null = null;
  dir: NoAVL<K, V> | null = null;
  altura = 1;

  constructor(
    public chave: K,
    public valor: V,
  ) {}
}

export interface BuscaAVL<V> {
  /** null quando a chave não existe. */
  valor: V | null;
  /** Nós visitados na descida, um por comparação de chave. */
  comparacoes: number;
}

export class ArvoreAVL<K, V> {
  private raiz: NoAVL<K, V> | null = null;
  tamanho = 0;

  constructor(private comparar: (a: K, b: K) => number) {}

  get altura(): number {
    return this.alturaDe(this.raiz);
  }

  private alturaDe(no: NoAVL<K, V> | null): number {
    return no ? no.altura : 0;
  }

  private atualizar(no: NoAVL<K, V>): void {
    no.altura = 1 + Math.max(this.alturaDe(no.esq), this.alturaDe(no.dir));
  }

  private girarDireita(y: NoAVL<K, V>): NoAVL<K, V> {
    const x = y.esq!;
    y.esq = x.dir;
    x.dir = y;
    this.atualizar(y);
    this.atualizar(x);
    return x;
  }

  private girarEsquerda(x: NoAVL<K, V>): NoAVL<K, V> {
    const y = x.dir!;
    x.dir = y.esq;
    y.esq = x;
    this.atualizar(x);
    this.atualizar(y);
    return y;
  }

  /** Restaura a diferença de altura entre as subárvores para no máximo 1. */
  private balancear(no: NoAVL<K, V>): NoAVL<K, V> {
    this.atualizar(no);
    const fator = this.alturaDe(no.esq) - this.alturaDe(no.dir);
    if (fator > 1) {
      // Pesada à esquerda; se o filho pende para a direita, é rotação dupla.
      if (this.alturaDe(no.esq!.esq) < this.alturaDe(no.esq!.dir)) {
        no.esq = this.girarEsquerda(no.esq!);
      }
      return this.girarDireita(no);
    }
    if (fator < -1) {
      if (this.alturaDe(no.dir!.dir) < this.alturaDe(no.dir!.esq)) {
        no.dir = this.girarDireita(no.dir!);
      }
      return this.girarEsquerda(no);
    }
    return no;
  }

  private inserirEm(no: NoAVL<K, V> | null, chave: K, valor: V): NoAVL<K, V> {
    if (!no) {
      this.tamanho++;
      return new NoAVL(chave, valor);
    }
    const c = this.comparar(chave, no.chave);
    if (c === 0) {
      no.valor = valor;
      return no;
    }
    if (c < 0) no.esq = this.inserirEm(no.esq, chave, valor);
    else no.dir = this.inserirEm(no.dir, chave, valor);
    return this.balancear(no);
  }

  inserir(chave: K, valor: V): void {
    this.raiz = this.inserirEm(this.raiz, chave, valor);
  }

  buscar(chave: K): BuscaAVL<V> {
    let comparacoes = 0;
    let x = this.raiz;
    while (x) {
      comparacoes++;
      const c = this.comparar(chave, x.chave);
      if (c === 0) return { valor: x.valor, comparacoes };
      x = c < 0 ? x.esq : x.dir;
    }
    return { valor: null, comparacoes };
  }

  /** As chaves em ordem crescente. */
  chaves(): K[] {
    const saida: K[] = [];
    const pilha: NoAVL<K, V>[] = [];
    let x = this.raiz;
    while (x || pilha.length) {
      while (x) {
        pilha.push(x);
        x = x.esq;
      }
      x = pilha.pop()!;
      saida.push(x.chave);
      x = x.dir;
    }
    return saida;
  }

  /** Confere o invariante da AVL em toda a árvore (usado nos testes). */
  estaBalanceada(): boolean {
    const conferir = (no: NoAVL<K, V> | null): number => {
      if (!no) return 0;
      const e = conferir(no.esq);
      const d = conferir(no.dir);
      if (e < 0 || d < 0 || Math.abs(e - d) > 1) return -1;
      return 1 + Math.max(e, d);
    };
    return conferir(this.raiz) >= 0;
  }
}
