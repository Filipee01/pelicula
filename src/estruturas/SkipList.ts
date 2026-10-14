// Lista com saltos (skip list).
//
// Fizemos três modificações em cima da lista clássica. No código elas estão
// marcadas com "MODIFICAÇÃO 1", "MODIFICAÇÃO 2" e "MODIFICAÇÃO 3".
//
// 1. Busca truncada: a busca normal desce sempre até o nível 0. A nossa pode
//    parar num nível mínimo. Usamos no "Ir para o ano" do catálogo.
//
// 2. Lista indexada: cada ponteiro guarda quantos nós ele pula (a "largura").
//    Com isso dá para ir direto ao k-ésimo elemento e saber a posição de um
//    elemento sem andar pelo nível 0. Usamos no "Surpreenda-me" e na ficha do filme.
//
// 3. Navegação por nível: dá para percorrer qualquer nível como se fosse uma
//    lista, não só o nível 0. Usamos no controle "Profundidade da exploração".

export const ALTURA_MAXIMA = 20;

export class NoSkip<T> {
  prox: (NoSkip<T> | null)[];
  // MODIFICAÇÃO 2: largura[i] é quantos nós do nível 0 o ponteiro prox[i] pula.
  // A lista clássica não tem esse campo.
  largura: number[];

  constructor(
    public valor: T,
    altura: number,
  ) {
    this.prox = new Array(altura).fill(null);
    this.largura = new Array(altura).fill(0);
  }

  get altura(): number {
    return this.prox.length;
  }
}

export interface PassoBusca {
  nivel: number;
  // quantos ponteiros a busca seguiu neste nível antes de descer
  avancos: number;
}

export interface Visita<T> {
  nivel: number;
  no: NoSkip<T>;
}

export interface ResultadoBusca<T> {
  // último nó antes do alvo (pode ser a cabeça)
  anterior: NoSkip<T>;
  // primeiro nó >= alvo no nível em que a busca parou, ou null se não tiver
  no: NoSkip<T> | null;
  // MODIFICAÇÃO 2: posição do nó na lista (começa em 0). Se não achou, é o tamanho.
  posicao: number;
  comparacoes: number;
  // os dois campos abaixo servem só para desenhar o caminho da busca na tela
  caminho: PassoBusca[];
  visitas: Visita<T>[];
}

// um salto do porPosicao: em que nível foi e quantos elementos pulou
export interface Salto {
  nivel: number;
  largura: number;
}

// Gerador de números aleatórios com semente (mulberry32). Usamos semente para
// as torres saírem iguais toda vez que o programa abre.
function criarSorteio(semente: number): () => number {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class SkipList<T> {
  readonly cabeca: NoSkip<T>;
  tamanho = 0;
  // quantos níveis estão em uso (a altura da maior torre)
  niveis = 1;
  // MODIFICAÇÃO 3: quantos elementos existem em cada nível
  readonly nosPorNivel: number[] = new Array(ALTURA_MAXIMA).fill(0);

  private sorteio: () => number;

  constructor(
    private comparar: (a: T, b: T) => number,
    semente = 1,
  ) {
    this.cabeca = new NoSkip<T>(null as T, ALTURA_MAXIMA);
    this.sorteio = criarSorteio(semente);
  }

  // igual à lista clássica: cada nível a mais tem 50% de chance
  private sortearAltura(): number {
    let altura = 1;
    while (altura < ALTURA_MAXIMA && this.sorteio() < 0.5) altura++;
    return altura;
  }

  // Inserção normal da lista com saltos. O que muda são as partes que atualizam
  // as larguras (modificação 2) e a contagem por nível (modificação 3).
  inserir(valor: T): NoSkip<T> {
    const anteriores: NoSkip<T>[] = new Array(ALTURA_MAXIMA);
    // MODIFICAÇÃO 2: além do nó anterior de cada nível, guardamos a posição dele.
    // posicoes[i] = quantos elementos existem até anteriores[i].
    const posicoes: number[] = new Array(ALTURA_MAXIMA).fill(0);

    let x = this.cabeca;
    let percorridos = 0;
    for (let i = this.niveis - 1; i >= 0; i--) {
      while (x.prox[i] && this.comparar(x.prox[i]!.valor, valor) < 0) {
        percorridos += x.largura[i];
        x = x.prox[i]!;
      }
      anteriores[i] = x;
      posicoes[i] = percorridos;
    }

    const altura = this.sortearAltura();
    for (let i = this.niveis; i < altura; i++) {
      anteriores[i] = this.cabeca;
      posicoes[i] = 0;
      // MODIFICAÇÃO 2: num nível novo, o ponteiro da cabeça pula a lista inteira
      this.cabeca.largura[i] = this.tamanho;
    }
    if (altura > this.niveis) this.niveis = altura;

    const novo = new NoSkip(valor, altura);
    for (let i = 0; i < altura; i++) {
      const ant = anteriores[i];
      // MODIFICAÇÃO 2: o ponteiro do anterior vira dois (anterior -> novo e
      // novo -> próximo), então a largura antiga é dividida entre os dois.
      const distancia = posicoes[0] - posicoes[i];
      novo.prox[i] = ant.prox[i];
      ant.prox[i] = novo;
      novo.largura[i] = ant.largura[i] - distancia;
      ant.largura[i] = distancia + 1;
      // MODIFICAÇÃO 3: mais um elemento neste nível
      this.nosPorNivel[i]++;
    }
    // MODIFICAÇÃO 2: os ponteiros dos níveis de cima passam por cima do nó novo,
    // então cada um pula um elemento a mais.
    for (let i = altura; i < this.niveis; i++) anteriores[i].largura[i]++;

    this.tamanho++;
    return novo;
  }

  // MODIFICAÇÃO 1: busca truncada.
  // A busca clássica desce até o nível 0. Esta desce só até o nivelMinimo e
  // devolve o primeiro elemento >= alvo que existe naquele nível.
  // Com nivelMinimo = 0 ela é igual à clássica.
  // direcao(v) tem que ser negativa enquanto v vier antes do alvo.
  buscar(direcao: (valor: T) => number, nivelMinimo = 0): ResultadoBusca<T> {
    const caminho: PassoBusca[] = [];
    const visitas: Visita<T>[] = [];
    let comparacoes = 0;
    let percorridos = 0;
    let x = this.cabeca;

    // MODIFICAÇÃO 1: na clássica este laço iria até i >= 0
    for (let i = this.niveis - 1; i >= nivelMinimo; i--) {
      let avancos = 0;
      while (x.prox[i]) {
        comparacoes++;
        if (direcao(x.prox[i]!.valor) >= 0) break;
        // MODIFICAÇÃO 2: vai somando as larguras para saber a posição no final
        percorridos += x.largura[i];
        x = x.prox[i]!;
        avancos++;
        visitas.push({ nivel: i, no: x });
      }
      caminho.push({ nivel: i, avancos });
    }

    // MODIFICAÇÃO 1: o resultado é o próximo nó do nível em que a busca parou
    const no = nivelMinimo < this.niveis ? x.prox[nivelMinimo] : null;
    const posicao = no ? percorridos + x.largura[nivelMinimo] - 1 : this.tamanho;
    return { anterior: x, no, posicao, comparacoes, caminho, visitas };
  }

  // MODIFICAÇÃO 2: acha um valor e devolve também a posição dele na lista
  localizar(valor: T): ResultadoBusca<T> & { encontrado: boolean } {
    const r = this.buscar((v) => this.comparar(v, valor), 0);
    return { ...r, encontrado: r.no !== null && this.comparar(r.no.valor, valor) === 0 };
  }

  // MODIFICAÇÃO 2: devolve o k-ésimo elemento (k começa em 0) somando as
  // larguras, sem andar um por um. A lista clássica não tem essa operação.
  // Se passar o vetor "saltos", ele recebe cada salto feito (para mostrar na tela).
  porPosicao(k: number, saltos?: Salto[]): NoSkip<T> | null {
    if (k < 0 || k >= this.tamanho) return null;
    const alvo = k + 1;
    let percorridos = 0;
    let x = this.cabeca;
    for (let i = this.niveis - 1; i >= 0; i--) {
      while (x.prox[i] && percorridos + x.largura[i] <= alvo) {
        percorridos += x.largura[i];
        saltos?.push({ nivel: i, largura: x.largura[i] });
        x = x.prox[i]!;
      }
    }
    return x;
  }

  // MODIFICAÇÃO 3: o primeiro nó do nível escolhido (é por onde a navegação começa)
  primeiro(nivel = 0): NoSkip<T> | null {
    return nivel < this.niveis ? this.cabeca.prox[nivel] : null;
  }

  // MODIFICAÇÃO 3: percorre o nível escolhido a partir de um nó.
  // Devolve até "quantidade" nós e o cursor (o próximo nó), para continuar
  // depois de onde parou. Na lista clássica só se anda pelo nível 0.
  percorrer(
    nivel: number,
    inicio: NoSkip<T> | null,
    quantidade: number,
  ): { nos: NoSkip<T>[]; cursor: NoSkip<T> | null } {
    const nos: NoSkip<T>[] = [];
    let x = inicio;
    while (x && nos.length < quantidade) {
      nos.push(x);
      x = x.prox[nivel];
    }
    return { nos, cursor: x };
  }
}
