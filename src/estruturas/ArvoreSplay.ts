// Árvore afunilada (splay tree).
//
// As rotações e o afunilamento (zig, zig-zig, zig-zag) são os clássicos.
// As modificações que fizemos na árvore são duas:
//
// 4. Consulta por prefixo sem afunilar: é o método aPartirDe, marcado com
//    "MODIFICAÇÃO 4". Na árvore clássica toda busca afunila. Como o
//    autocompletar busca a cada letra digitada, fizemos uma consulta que só lê
//    a árvore, sem rotação nenhuma.
//
// 5. Várias chaves por filme: fica no arquivo dados.ts (função chavesDoFilme),
//    marcado com "MODIFICAÇÃO 5". Cada filme entra na árvore mais de uma vez,
//    com o título inteiro e com os finais do título.
//
// (A numeração continua a da lista com saltos, que tem as modificações 1, 2 e 3.)

export class NoSplay<K, V> {
  esq: NoSplay<K, V> | null = null;
  dir: NoSplay<K, V> | null = null;
  pai: NoSplay<K, V> | null = null;

  constructor(
    public chave: K,
    public valor: V,
  ) {}
}

export type PassoSplay = "zig" | "zig-zig" | "zig-zag";

export interface OperacaoSplay {
  comparacoes: number;
  // profundidade em que o nó estava antes de subir para a raiz
  profundidade: number;
  passos: PassoSplay[];
}

// Um quadro da animação das rotações: o pedaço da árvore em volta do nó, antes ou
// depois de um passo do afunilamento. Serve só para a tela; não muda o algoritmo.
export interface QuadroSplay<V> {
  passo: PassoSplay;
  momento: "antes" | "depois";
  // profundidade do nó que está subindo, neste quadro
  profundidade: number;
  nos: { valor: V; nivel: number; indice: number; papel?: "no" | "pai" | "avo" }[];
}

export interface NoNoTopo<K, V> {
  no: NoSplay<K, V>;
  nivel: number;
  // posição dentro do nível, de 0 a 2^nivel - 1 (para desenhar a árvore)
  indice: number;
}

export class ArvoreSplay<K, V> {
  raiz: NoSplay<K, V> | null = null;
  tamanho = 0;
  // guarda o que a última busca ou inserção fez, só para mostrar na tela
  ultimaOperacao: OperacaoSplay = { comparacoes: 0, profundidade: 0, passos: [] };
  // quando ligado, o afunilamento guarda um "antes" e um "depois" de cada passo
  // (usado só pela animação da tela Estruturas)
  gravarQuadros = false;
  quadros: QuadroSplay<V>[] = [];

  constructor(private comparar: (a: K, b: K) => number) {}

  // rotação simples: sobe x um nível, girando em cima do pai
  private rotacionar(x: NoSplay<K, V>): void {
    const p = x.pai!;
    const avo = p.pai;
    if (p.esq === x) {
      p.esq = x.dir;
      if (x.dir) x.dir.pai = p;
      x.dir = p;
    } else {
      p.dir = x.esq;
      if (x.esq) x.esq.pai = p;
      x.esq = p;
    }
    p.pai = x;
    x.pai = avo;
    if (!avo) this.raiz = x;
    else if (avo.esq === p) avo.esq = x;
    else avo.dir = x;
  }

  // Afunilamento clássico: sobe x até a raiz com zig, zig-zig e zig-zag.
  // Devolve a lista dos passos só para a tela mostrar.
  private afunilar(x: NoSplay<K, V>): PassoSplay[] {
    const passos: PassoSplay[] = [];
    if (this.gravarQuadros) this.quadros = [];
    let profundidade = this.gravarQuadros ? this.profundidadeDe(x) : 0;
    while (x.pai) {
      const p = x.pai;
      const avo = p.pai;
      const passo: PassoSplay = !avo ? "zig" : (avo.esq === p) === (p.esq === x) ? "zig-zig" : "zig-zag";
      if (this.gravarQuadros) this.gravarQuadro(passo, "antes", profundidade, avo ?? p, x, p, avo);

      if (passo === "zig") {
        // o pai é a raiz
        this.rotacionar(x);
      } else if (passo === "zig-zig") {
        // x e o pai estão do mesmo lado
        this.rotacionar(p);
        this.rotacionar(x);
      } else {
        // x e o pai estão em lados opostos
        this.rotacionar(x);
        this.rotacionar(x);
      }
      passos.push(passo);

      profundidade -= passo === "zig" ? 1 : 2;
      if (this.gravarQuadros) this.gravarQuadro(passo, "depois", profundidade, x, x, p, avo);
    }
    return passos;
  }

  private profundidadeDe(x: NoSplay<K, V>): number {
    let d = 0;
    for (let y = x.pai; y; y = y.pai) d++;
    return d;
  }

  // fotografa 4 níveis a partir de "topo", marcando o nó que sobe, o pai e o avô
  private gravarQuadro(
    passo: PassoSplay,
    momento: "antes" | "depois",
    profundidade: number,
    topo: NoSplay<K, V>,
    x: NoSplay<K, V>,
    p: NoSplay<K, V>,
    avo: NoSplay<K, V> | null,
  ): void {
    const papel = (n: NoSplay<K, V>) => (n === x ? "no" : n === p ? "pai" : n === avo ? "avo" : undefined);
    const nos: QuadroSplay<V>["nos"] = [];
    let fila = [{ no: topo, nivel: 0, indice: 0 }];
    while (fila.length) {
      const proxima: typeof fila = [];
      for (const item of fila) {
        nos.push({ valor: item.no.valor, nivel: item.nivel, indice: item.indice, papel: papel(item.no) });
        if (item.nivel === 3) continue;
        if (item.no.esq) proxima.push({ no: item.no.esq, nivel: item.nivel + 1, indice: item.indice * 2 });
        if (item.no.dir) proxima.push({ no: item.no.dir, nivel: item.nivel + 1, indice: item.indice * 2 + 1 });
      }
      fila = proxima;
    }
    this.quadros.push({ passo, momento, profundidade, nos });
  }

  // desce pela árvore procurando a chave; devolve o nó dela ou o último visitado
  private descer(chave: K): { no: NoSplay<K, V> | null; achou: boolean; comparacoes: number } {
    let x = this.raiz;
    let ultimo: NoSplay<K, V> | null = null;
    let comparacoes = 0;
    while (x) {
      ultimo = x;
      comparacoes++;
      const c = this.comparar(chave, x.chave);
      if (c === 0) return { no: x, achou: true, comparacoes };
      x = c < 0 ? x.esq : x.dir;
    }
    return { no: ultimo, achou: false, comparacoes };
  }

  // inserção clássica: insere como numa árvore binária de busca e afunila o nó novo
  inserir(chave: K, valor: V): NoSplay<K, V> {
    const { no: pai, achou, comparacoes } = this.descer(chave);
    let no: NoSplay<K, V>;
    if (achou) {
      no = pai!;
      no.valor = valor;
    } else {
      no = new NoSplay(chave, valor);
      no.pai = pai;
      if (!pai) this.raiz = no;
      else if (this.comparar(chave, pai.chave) < 0) pai.esq = no;
      else pai.dir = no;
      this.tamanho++;
    }
    const passos = this.afunilar(no);
    this.ultimaOperacao = { comparacoes, profundidade: comparacoes - 1, passos };
    return no;
  }

  // busca clássica: afunila o nó encontrado (ou o último visitado, se não achar)
  buscar(chave: K): NoSplay<K, V> | null {
    const { no, achou, comparacoes } = this.descer(chave);
    if (!no) return null;
    const passos = this.afunilar(no);
    this.ultimaOperacao = { comparacoes, profundidade: comparacoes - 1, passos };
    return achou ? no : null;
  }

  // próximo nó em ordem crescente (usado na consulta por prefixo)
  private sucessor(x: NoSplay<K, V>): NoSplay<K, V> | null {
    if (x.dir) {
      let y = x.dir;
      while (y.esq) y = y.esq;
      return y;
    }
    let y = x;
    while (y.pai && y.pai.dir === y) y = y.pai;
    return y.pai;
  }

  // MODIFICAÇÃO 4: consulta por prefixo sem afunilar.
  // Acha a primeira chave >= inicio e vai andando pelos sucessores enquanto
  // continuar(chave) for verdadeiro. Não chama o afunilar em nenhum momento,
  // então a árvore fica do jeito que estava. A árvore clássica não tem isso.
  aPartirDe(inicio: K, continuar: (chave: K) => boolean, limite: number): NoSplay<K, V>[] {
    let x = this.raiz;
    let candidato: NoSplay<K, V> | null = null;
    while (x) {
      if (this.comparar(inicio, x.chave) <= 0) {
        candidato = x;
        x = x.esq;
      } else {
        x = x.dir;
      }
    }
    const encontrados: NoSplay<K, V>[] = [];
    while (candidato && encontrados.length < limite && continuar(candidato.chave)) {
      encontrados.push(candidato);
      candidato = this.sucessor(candidato);
    }
    return encontrados;
  }

  // Devolve os primeiros níveis da árvore, percorrendo em largura. Serve para
  // desenhar o topo da árvore na tela; só lê, não muda nada.
  topo(niveis: number): NoNoTopo<K, V>[] {
    const saida: NoNoTopo<K, V>[] = [];
    if (!this.raiz) return saida;
    let fila: NoNoTopo<K, V>[] = [{ no: this.raiz, nivel: 0, indice: 0 }];
    while (fila.length) {
      const proxima: NoNoTopo<K, V>[] = [];
      for (const item of fila) {
        saida.push(item);
        if (item.nivel + 1 >= niveis) continue;
        const { esq, dir } = item.no;
        if (esq) proxima.push({ no: esq, nivel: item.nivel + 1, indice: item.indice * 2 });
        if (dir) proxima.push({ no: dir, nivel: item.nivel + 1, indice: item.indice * 2 + 1 });
      }
      fila = proxima;
    }
    return saida;
  }

  altura(): number {
    let maior = 0;
    const pilha: [NoSplay<K, V>, number][] = this.raiz ? [[this.raiz, 1]] : [];
    while (pilha.length) {
      const [no, h] = pilha.pop()!;
      if (h > maior) maior = h;
      if (no.esq) pilha.push([no.esq, h + 1]);
      if (no.dir) pilha.push([no.dir, h + 1]);
    }
    return maior;
  }
}
