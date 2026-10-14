import { useMemo } from "react";
import { numero } from "../App";
import { Filme, urlPoster } from "../dados";
import { NoSkip, SkipList } from "../estruturas/SkipList";

// Desenho da lista com saltos da cabeça ao fim, com a busca andando por cima.
// Aparecem: a cabeça, as torres dos primeiros filmes, uma reticência, os filmes em
// que a busca pisou, outra reticência, as torres dos últimos filmes e o fim.
// As setas são os ponteiros de cada nível.

const PONTA = 10; // quantos filmes aparecem em cada ponta

// medidas do desenho (o SVG estica para a largura da tela)
const LARGURA = 1000;
const MARGEM = 46; // espaço dos rótulos "nível n"
const ALTURA_LINHA = 21;
const TOPO = 8;

type Coluna =
  | { tipo: "cabeca" | "fim" }
  | { tipo: "meio"; escondidos: number }
  | { tipo: "filme"; no: NoSkip<Filme>; posicao: number };

export interface PassoDaBusca {
  no: NoSkip<Filme>; // a cabeça ou um filme
  nivel: number;
}

interface Props {
  lista: SkipList<Filme>;
  // o caminho inteiro da busca clássica, casa por casa
  trilha: PassoDaBusca[];
  // quantas casas já foram andadas (para a animação)
  passo: number;
  nivelMinimo: number;
  // os filmes devolvidos pelas duas buscas (null quando a busca chega ao fim)
  resultadoClassica: NoSkip<Filme> | null;
  resultadoTruncada: NoSkip<Filme> | null;
  // se a animação já chegou em cada resultado
  classicaPronta: boolean;
  truncadaPronta: boolean;
}

export function ListaPontas({
  lista,
  trilha,
  passo,
  nivelMinimo,
  resultadoClassica,
  resultadoTruncada,
  classicaPronta,
  truncadaPronta,
}: Props) {
  const alvoClassica = classicaPronta ? resultadoClassica : null;
  const alvoTruncada = truncadaPronta ? resultadoTruncada : null;

  // as colunas só mudam quando muda a busca, não a cada passo da animação
  const colunas = useMemo(() => {
    const posicaoDe = new Map<NoSkip<Filme>, number>();
    const cabeTudo = lista.tamanho <= PONTA * 2;
    const inicioDoFim = lista.tamanho - PONTA;
    lista
      .percorrer(0, lista.primeiro(0), cabeTudo ? lista.tamanho : PONTA)
      .nos.forEach((no, i) => posicaoDe.set(no, i));
    if (!cabeTudo) {
      // os últimos são alcançados direto pela posição (modificação 2)
      lista.percorrer(0, lista.porPosicao(inicioDoFim), PONTA).nos.forEach((no, i) => posicaoDe.set(no, inicioDoFim + i));
    }
    // os filmes em que a busca pisou; a posição de cada um vem das larguras (modificação 2)
    // e os dois filmes que as buscas devolvem
    const daBusca = [...trilha.map((t) => t.no), resultadoClassica, resultadoTruncada];
    for (const no of daBusca) {
      if (no && no !== lista.cabeca && !posicaoDe.has(no)) posicaoDe.set(no, lista.localizar(no.valor).posicao);
    }

    const filmes = [...posicaoDe.entries()].sort((a, b) => a[1] - b[1]);
    const colunas: Coluna[] = [{ tipo: "cabeca" }];
    filmes.forEach(([no, posicao], i) => {
      const anterior = i === 0 ? -1 : filmes[i - 1][1];
      // a reticência entra onde acaba o bloco do início e onde começa o bloco do fim
      const saiDoInicio = anterior < PONTA && posicao >= PONTA;
      const entraNoFim = anterior < inicioDoFim && posicao >= inicioDoFim;
      if (!cabeTudo && posicao - anterior > 1 && (saiDoInicio || entraNoFim)) {
        colunas.push({ tipo: "meio", escondidos: posicao - anterior - 1 });
      }
      colunas.push({ tipo: "filme", no, posicao: posicao + 1 });
    });
    colunas.push({ tipo: "fim" });
    return colunas;
  }, [lista, trilha, resultadoClassica, resultadoTruncada]);

  const niveis = lista.niveis;
  const largura = (LARGURA - MARGEM - 4) / colunas.length;
  const celula = Math.min(30, largura - 5);
  const xCol = (i: number) => MARGEM + i * largura + (largura - celula) / 2;
  const yNivel = (n: number) => TOPO + (niveis - 1 - n) * ALTURA_LINHA;
  const base = TOPO + niveis * ALTURA_LINHA;
  const alturaPoster = celula * 1.5;

  const noDe = (c: Coluna) => (c.tipo === "cabeca" ? lista.cabeca : c.tipo === "filme" ? c.no : null);
  const temAndar = (c: Coluna, n: number) => (c.tipo === "filme" ? c.no.altura > n : c.tipo !== "meio");

  // em que momento da busca cada casa e cada ponteiro foram usados
  const casaEm = new Map<string, number>();
  const setaEm = new Map<string, number>();
  const indice = new Map(colunas.map((c, i) => [noDe(c), i]));
  trilha.forEach((t, k) => {
    const i = indice.get(t.no)!;
    casaEm.set(`${i}:${t.nivel}`, k);
    const antes = trilha[k - 1];
    if (antes && antes.nivel === t.nivel) setaEm.set(`${indice.get(antes.no)}:${t.nivel}`, k);
  });
  const terminou = passo >= trilha.length;
  const corDoNivel = (n: number) => (n >= nivelMinimo ? "comum" : "so-classica");

  return (
    <svg className="lista-pontas" viewBox={`0 0 ${LARGURA} ${base + alturaPoster + 44}`}>
      {Array.from({ length: niveis }, (_, n) => {
        const y = yNivel(n);
        const meio = y + ALTURA_LINHA / 2;
        // as colunas com andar neste nível, na ordem: cada uma aponta para a seguinte
        const presentes = colunas.map((c, i) => ({ c, i })).filter(({ c }) => temAndar(c, n));
        return (
          <g key={n}>
            <text className={n === nivelMinimo ? "rotulo-nivel atual" : "rotulo-nivel"} x={MARGEM - 6} y={meio + 4}>
              nível {n}
            </text>
            {presentes.slice(0, -1).map(({ c, i }, k) => {
              const seguinte = presentes[k + 1];
              const de = xCol(i) + celula;
              const para = xCol(seguinte.i);
              // é o ponteiro de verdade se o próximo nó deste nível é mesmo a coluna seguinte;
              // se não, há filmes escondidos no caminho e a linha fica tracejada
              const direto = noDe(c)!.prox[n] === noDe(seguinte.c);
              const usada = setaEm.get(`${i}:${n}`);
              const andada = usada !== undefined && usada < passo;
              return (
                <g key={i} className={`ponteiro ${direto ? "" : "indireto"} ${andada ? corDoNivel(n) : ""}`}>
                  <line x1={de} y1={meio} x2={para - 4} y2={meio} />
                  <path d={`M ${para - 5} ${meio - 3} L ${para} ${meio} L ${para - 5} ${meio + 3} Z`} />
                </g>
              );
            })}
            {presentes.map(({ c, i }) => {
              const quando = casaEm.get(`${i}:${n}`);
              const pisou = quando !== undefined && quando < passo;
              const aqui = !terminou && quando === passo - 1;
              const no = noDe(c);
              const alvo = no !== null && no === alvoTruncada ? "alvo-truncada" : no !== null && no === alvoClassica ? "alvo-classica" : "";
              return (
                <rect
                  key={i}
                  className={`andar ${c.tipo === "filme" ? "" : "sentinela"} ${pisou ? corDoNivel(n) : alvo} ${aqui ? "marcador" : ""}`}
                  x={xCol(i)}
                  y={y + 3}
                  width={celula}
                  height={ALTURA_LINHA - 6}
                  rx={3}
                />
              );
            })}
          </g>
        );
      })}

      {colunas.map((c, i) => {
        const centro = xCol(i) + celula / 2;
        if (c.tipo === "filme") {
          const alvo = c.no === alvoTruncada ? "alvo-truncada" : c.no === alvoClassica ? "alvo-classica" : "";
          return (
            <g key={i} className={alvo}>
              <title>{`${c.no.valor.titulo} (${c.no.valor.ano}) · ${numero(c.posicao)}º da lista · torre de altura ${c.no.altura}`}</title>
              <text className="ano" x={centro} y={base + 13}>
                {c.no.valor.ano}
              </text>
              <rect className="moldura" x={centro - celula / 2 - 1.5} y={base + 18.5} width={celula + 3} height={alturaPoster + 3} rx={3} />
              <image
                href={urlPoster(c.no.valor, 92)}
                x={centro - celula / 2}
                y={base + 20}
                width={celula}
                height={alturaPoster}
                preserveAspectRatio="xMidYMid slice"
              />
            </g>
          );
        }
        return (
          <g key={i}>
            {/* "cabeça" encosta na margem esquerda para não cobrir o ano do primeiro filme */}
            <text
              className="nome-ponta"
              x={c.tipo === "cabeca" ? centro + celula / 2 : centro}
              y={base + 14}
              textAnchor={c.tipo === "cabeca" ? "end" : "middle"}
            >
              {c.tipo === "cabeca" ? "cabeça" : c.tipo === "fim" ? "fim" : "⋯"}
            </text>
            {c.tipo === "meio" && (
              <>
                <text className="no-meio" x={centro} y={base + 32}>
                  {numero(c.escondidos)}
                </text>
                <text className="no-meio" x={centro} y={base + 44}>
                  filmes
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
