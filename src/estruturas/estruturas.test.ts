import { describe, expect, it } from "vitest";
import { ArvoreAVL } from "./ArvoreAVL";
import { ArvoreSplay } from "./ArvoreSplay";
import { ListaMTF } from "./ListaMTF";
import { SkipList } from "./SkipList";

function embaralhar(n: number): number[] {
  const v = Array.from({ length: n }, (_, i) => i);
  let s = 42;
  for (let i = n - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [v[i], v[j]] = [v[j], v[i]];
  }
  return v;
}

describe("SkipList", () => {
  const N = 5000;
  const lista = new SkipList<number>((a, b) => a - b, 7);
  for (const v of embaralhar(N)) lista.inserir(v * 2); // só pares

  it("mantém o nível 0 ordenado e completo", () => {
    const { nos } = lista.percorrer(0, lista.primeiro(0), N + 10);
    expect(nos.map((n) => n.valor)).toEqual(Array.from({ length: N }, (_, i) => i * 2));
    expect(lista.tamanho).toBe(N);
  });

  it("acessa por posição usando as larguras", () => {
    for (const k of [0, 1, 17, 2499, N - 1]) expect(lista.porPosicao(k)!.valor).toBe(k * 2);
    expect(lista.porPosicao(N)).toBeNull();
    expect(lista.porPosicao(-1)).toBeNull();
  });

  it("localiza valores e informa a posição", () => {
    const r = lista.localizar(1234);
    expect(r.encontrado).toBe(true);
    expect(r.posicao).toBe(617);
    expect(r.comparacoes).toBeLessThan(80);
    expect(lista.localizar(1235).encontrado).toBe(false);
  });

  it("cada nível é uma subsequência ordenada com a contagem certa", () => {
    for (let nivel = 0; nivel < lista.niveis; nivel++) {
      const { nos } = lista.percorrer(nivel, lista.primeiro(nivel), N);
      expect(nos.length).toBe(lista.nosPorNivel[nivel]);
      expect(nos.every((n) => n.altura > nivel)).toBe(true);
      for (let i = 1; i < nos.length; i++) expect(nos[i].valor).toBeGreaterThan(nos[i - 1].valor);
    }
    expect(lista.nosPorNivel[lista.niveis - 1]).toBeGreaterThan(0);
    expect(lista.nosPorNivel[lista.niveis]).toBe(0);
  });

  it("busca truncada devolve o primeiro >= alvo dentro do nível", () => {
    for (let nivel = 0; nivel < lista.niveis; nivel++) {
      const { nos } = lista.percorrer(nivel, lista.primeiro(nivel), N);
      for (const alvo of [-5, 0, 333, 5001, 9998, 20000]) {
        const esperado = nos.find((n) => n.valor >= alvo) ?? null;
        const r = lista.buscar((v) => v - alvo, nivel);
        expect(r.no).toBe(esperado);
        expect(r.posicao).toBe(esperado ? esperado.valor / 2 : N);
      }
    }
  });

  it("expõe o caminho da busca e os saltos do acesso por posição", () => {
    const r = lista.buscar((v) => v - 6001, 0);
    expect(r.visitas.length).toBe(r.caminho.reduce((s, p) => s + p.avancos, 0));
    expect(r.visitas[r.visitas.length - 1].no).toBe(r.anterior);
    for (let i = 1; i < r.visitas.length; i++) {
      expect(r.visitas[i].nivel).toBeLessThanOrEqual(r.visitas[i - 1].nivel);
      expect(r.visitas[i].no.valor).toBeGreaterThan(r.visitas[i - 1].no.valor);
    }
    // A busca truncada percorre exatamente o começo do caminho da clássica.
    const truncada = lista.buscar((v) => v - 6001, 3);
    expect(truncada.visitas).toEqual(r.visitas.filter((v) => v.nivel >= 3));

    const saltos: { nivel: number; largura: number }[] = [];
    expect(lista.porPosicao(3210, saltos)!.valor).toBe(6420);
    expect(saltos.reduce((s, x) => s + x.largura, 0)).toBe(3211);
    expect(saltos.length).toBeLessThan(60);
  });

  it("aceita chaves repetidas pelo comparador", () => {
    const l = new SkipList<{ k: number; id: number }>((a, b) => a.k - b.k || a.id - b.id);
    for (let i = 0; i < 100; i++) l.inserir({ k: i % 3, id: i });
    const r = l.buscar((v) => v.k - 1, 0);
    expect(r.no!.valor.k).toBe(1);
    expect(r.posicao).toBe(34);
  });
});

describe("ArvoreSplay", () => {
  function emOrdem(a: ArvoreSplay<number, string>): number[] {
    return a.aPartirDe(-Infinity, () => true, Infinity).map((n) => n.chave);
  }

  it("mantém a ordem e leva o nó acessado para a raiz", () => {
    const a = new ArvoreSplay<number, string>((x, y) => x - y);
    const chaves = embaralhar(2000);
    for (const k of chaves) a.inserir(k, `v${k}`);
    expect(a.tamanho).toBe(2000);
    expect(emOrdem(a)).toEqual(Array.from({ length: 2000 }, (_, i) => i));

    for (const k of [0, 1999, 777, 778, 3]) {
      expect(a.buscar(k)!.valor).toBe(`v${k}`);
      expect(a.raiz!.chave).toBe(k);
      expect(a.raiz!.pai).toBeNull();
    }
    expect(emOrdem(a)).toEqual(Array.from({ length: 2000 }, (_, i) => i));
  });

  it("busca sem sucesso afunila o último nó visitado", () => {
    const a = new ArvoreSplay<number, string>((x, y) => x - y);
    for (const k of [10, 20, 30, 40, 50]) a.inserir(k, "");
    expect(a.buscar(35)).toBeNull();
    expect([30, 40]).toContain(a.raiz!.chave);
  });

  it("registra zig, zig-zig e zig-zag", () => {
    const a = new ArvoreSplay<number, string>((x, y) => x - y);
    for (const k of [1, 2, 3, 4, 5]) a.inserir(k, ""); // vira uma "escada" à esquerda
    a.buscar(1);
    expect(a.ultimaOperacao.passos).toEqual(["zig-zig", "zig-zig"]);
    expect(a.ultimaOperacao.profundidade).toBe(4);
    a.buscar(1);
    expect(a.ultimaOperacao.passos).toEqual([]);
  });

  it("consulta por prefixo não mexe na árvore", () => {
    const a = new ArvoreSplay<string, number>((x, y) => (x < y ? -1 : x > y ? 1 : 0));
    ["monet", "manet", "munch", "matisse", "mondrian", "picasso", "goya"].forEach((n, i) =>
      a.inserir(n, i),
    );
    const raiz = a.raiz;
    const achados = a.aPartirDe("mon", (k) => k.startsWith("mon"), 10).map((n) => n.chave);
    expect(achados).toEqual(["mondrian", "monet"]);
    expect(a.aPartirDe("z", (k) => k.startsWith("z"), 10)).toEqual([]);
    expect(a.aPartirDe("m", (k) => k.startsWith("m"), 2).length).toBe(2);
    expect(a.raiz).toBe(raiz);
  });

  it("topo devolve os primeiros níveis em largura", () => {
    const a = new ArvoreSplay<number, string>((x, y) => x - y);
    for (const k of embaralhar(100)) a.inserir(k, "");
    a.buscar(50);
    const topo = a.topo(3);
    expect(topo[0]).toMatchObject({ nivel: 0, indice: 0 });
    expect(topo[0].no.chave).toBe(50);
    expect(topo.length).toBeLessThanOrEqual(7);
    expect(topo.every((t) => t.nivel < 3 && t.indice < 2 ** t.nivel)).toBe(true);
    expect(a.altura()).toBeGreaterThanOrEqual(7);
  });
});

describe("ListaMTF", () => {
  it("MTF move o elemento acessado para o início", () => {
    const l = new ListaMTF<string>();
    ["a", "b", "c", "d"].forEach((x) => l.inserirNoFim(x));
    const r = l.acessar((x) => x === "c")!;
    expect(r).toMatchObject({ comparacoes: 3, posicaoAnterior: 2 });
    expect(l.paraVetor()).toEqual(["c", "a", "b", "d"]);
    l.acessar((x) => x === "d");
    expect(l.paraVetor()).toEqual(["d", "c", "a", "b"]);
    l.inserirNoFim("e"); // a cauda precisa ter sido atualizada
    expect(l.paraVetor()).toEqual(["d", "c", "a", "b", "e"]);
    expect(l.acessar((x) => x === "z")).toBeNull();
    expect(l.acessar((x) => x === "d")!.comparacoes).toBe(1);
  });
});

describe("ArvoreAVL", () => {
  const N = 5000;
  const ordenado = Array.from({ length: N }, (_, i) => i);

  it("fica balanceada com inserção em ordem, que é o pior caso de uma árvore comum", () => {
    const a = new ArvoreAVL<number, string>((x, y) => x - y);
    for (const k of ordenado) a.inserir(k, `v${k}`);
    expect(a.tamanho).toBe(N);
    expect(a.estaBalanceada()).toBe(true);
    expect(a.chaves()).toEqual(ordenado);
    // 5000 chaves cabem em 13 níveis; a AVL pode passar disso em no máximo ~44%.
    expect(a.altura).toBeLessThanOrEqual(18);
  });

  it("fica balanceada com inserção embaralhada e ignora chaves repetidas", () => {
    const a = new ArvoreAVL<number, string>((x, y) => x - y);
    for (const k of embaralhar(N)) a.inserir(k, `v${k}`);
    a.inserir(42, "novo");
    expect(a.tamanho).toBe(N);
    expect(a.estaBalanceada()).toBe(true);
    expect(a.chaves()).toEqual(ordenado);
    expect(a.buscar(42).valor).toBe("novo");
  });

  it("busca contando as comparações, limitadas pela altura", () => {
    const a = new ArvoreAVL<number, string>((x, y) => x - y);
    for (const k of embaralhar(N)) a.inserir(k * 2, `v${k}`);
    for (const k of [0, 1, 2499, N - 1]) {
      const r = a.buscar(k * 2);
      expect(r.valor).toBe(`v${k}`);
      expect(r.comparacoes).toBeGreaterThanOrEqual(1);
      expect(r.comparacoes).toBeLessThanOrEqual(a.altura);
    }
    const ausente = a.buscar(777);
    expect(ausente.valor).toBeNull();
    expect(ausente.comparacoes).toBeLessThanOrEqual(a.altura);
    expect(new ArvoreAVL<number, string>((x, y) => x - y).buscar(1)).toEqual({
      valor: null,
      comparacoes: 0,
    });
  });
});
