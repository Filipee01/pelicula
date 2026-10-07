// Lista encadeada com movimentação ao início (move-to-front).
//
// Esta é a estrutura clássica, não fizemos modificação nela.
// Guarda os gêneros: para achar um gênero a lista faz busca sequencial e depois
// move o nó encontrado para o início. Assim os mais usados ficam na frente.

class NoLista<T> {
  prox: NoLista<T> | null = null;
  constructor(public valor: T) {}
}

export interface AcessoLista<T> {
  valor: T;
  // quantas comparações a busca sequencial fez
  comparacoes: number;
  // posição em que o elemento estava antes de ir para o início (começa em 0)
  posicaoAnterior: number;
}

export class ListaMTF<T> {
  private cabeca: NoLista<T> | null = null;
  private cauda: NoLista<T> | null = null;
  tamanho = 0;

  inserirNoFim(valor: T): void {
    const no = new NoLista(valor);
    if (this.cauda) this.cauda.prox = no;
    else this.cabeca = no;
    this.cauda = no;
    this.tamanho++;
  }

  // busca sequencial: anda nó por nó até achar, e move o achado para o início
  acessar(igual: (valor: T) => boolean): AcessoLista<T> | null {
    let anterior: NoLista<T> | null = null;
    let x = this.cabeca;
    let posicao = 0;
    while (x && !igual(x.valor)) {
      anterior = x;
      x = x.prox;
      posicao++;
    }
    if (!x) return null;
    if (anterior) {
      anterior.prox = x.prox;
      if (this.cauda === x) this.cauda = anterior;
      x.prox = this.cabeca;
      this.cabeca = x;
    }
    return { valor: x.valor, comparacoes: posicao + 1, posicaoAnterior: posicao };
  }

  paraVetor(): T[] {
    const saida: T[] = [];
    for (let x = this.cabeca; x; x = x.prox) saida.push(x.valor);
    return saida;
  }
}
