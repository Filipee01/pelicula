import { useMemo } from "react";
import { numero } from "../App";
import { Filme, urlPoster } from "../dados";
import { NoSkip, SkipList } from "../estruturas/SkipList";

// Desenho da lista com saltos da cabeça ao fim: a cabeça, as torres dos primeiros
// filmes, uma reticência no lugar dos filmes do meio, as torres dos últimos e o fim.
// As setas são os ponteiros de cada nível.

const PONTA = 10; // quantos filmes aparecem em cada ponta

// medidas do desenho (o SVG estica para a largura da tela)
const LARGURA = 1000;
const MARGEM = 50; // espaço dos rótulos "nível n"
const ALTURA_LINHA = 21;
const TOPO = 8;
const CELULA = 28; // largura de cada andar da torre

type Coluna =
  | { tipo: "cabeca" | "fim" | "meio" }
  | { tipo: "filme"; no: NoSkip<Filme>; posicao: number };

export function ListaPontas({ lista, nivelDestacado }: { lista: SkipList<Filme>; nivelDestacado: number }) {
  const { colunas, ocultos } = useMemo(() => {
    const cabeTudo = lista.tamanho <= PONTA * 2;
    const primeiros = lista.percorrer(0, lista.primeiro(0), cabeTudo ? lista.tamanho : PONTA).nos;
    // os últimos são alcançados direto pela posição (modificação 2), sem andar a lista toda
    const inicioDoFim = lista.tamanho - PONTA;
    const ultimos = cabeTudo ? [] : lista.percorrer(0, lista.porPosicao(inicioDoFim), PONTA).nos;

    const colunas: Coluna[] = [{ tipo: "cabeca" }];
    primeiros.forEach((no, i) => colunas.push({ tipo: "filme", no, posicao: i + 1 }));
    if (!cabeTudo) {
      colunas.push({ tipo: "meio" });
      ultimos.forEach((no, i) => colunas.push({ tipo: "filme", no, posicao: inicioDoFim + i + 1 }));
    }
    colunas.push({ tipo: "fim" });

    // quantos filmes de cada nível ficaram escondidos no meio
    const ocultos = Array.from({ length: lista.niveis }, (_, n) => {
      const visiveis = [...primeiros, ...ultimos].filter((no) => no.altura > n).length;
      return lista.nosPorNivel[n] - visiveis;
    });
    return { colunas, ocultos };
  }, [lista]);

  const niveis = lista.niveis;
  const passo = (LARGURA - MARGEM - 6) / colunas.length;
  const xCol = (i: number) => MARGEM + i * passo + (passo - CELULA) / 2;
  const yNivel = (n: number) => TOPO + (niveis - 1 - n) * ALTURA_LINHA;
  const base = TOPO + niveis * ALTURA_LINHA;

  // em um nível, a coluna "segura" um ponteiro se tem um andar ali
  const temAndar = (c: Coluna, n: number) => {
    if (c.tipo === "filme") return c.no.altura > n;
    if (c.tipo === "meio") return ocultos[n] > 0;
    return true; // a cabeça e o fim têm todos os níveis
  };

  return (
    <svg className="lista-pontas" viewBox={`0 0 ${LARGURA} ${base + 86}`}>
      {Array.from({ length: niveis }, (_, n) => {
        const y = yNivel(n);
        const meio = y + ALTURA_LINHA / 2;
        // as colunas que têm andar neste nível, na ordem: cada uma aponta para a seguinte
        const presentes = colunas.map((c, i) => ({ c, i })).filter(({ c }) => temAndar(c, n));
        return (
          <g key={n} className={n === nivelDestacado ? "nivel destacado" : "nivel"}>
            <text className="rotulo-nivel" x={MARGEM - 8} y={meio + 4}>
              nível {n}
            </text>
            {presentes.slice(0, -1).map(({ i }, k) => {
              const de = xCol(i) + CELULA;
              const para = xCol(presentes[k + 1].i);
              return (
                <g key={i}>
                  <line className="ponteiro" x1={de} y1={meio} x2={para - 4} y2={meio} />
                  <path className="ponta-seta" d={`M ${para - 5} ${meio - 3} L ${para} ${meio} L ${para - 5} ${meio + 3} Z`} />
                </g>
              );
            })}
            {presentes.map(({ c, i }) =>
              c.tipo === "meio" ? (
                <text key={i} className="reticencia" x={xCol(i) + CELULA / 2} y={meio + 4}>
                  ⋯
                </text>
              ) : (
                <rect
                  key={i}
                  className={c.tipo === "filme" ? "andar" : "andar sentinela"}
                  x={xCol(i)}
                  y={y + 3}
                  width={CELULA}
                  height={ALTURA_LINHA - 6}
                  rx={3}
                />
              ),
            )}
          </g>
        );
      })}

      {colunas.map((c, i) => {
        const centro = xCol(i) + CELULA / 2;
        if (c.tipo === "filme") {
          return (
            <g key={i}>
              <title>{`${c.no.valor.titulo} (${c.no.valor.ano}) · torre de altura ${c.no.altura}`}</title>
              <text className="ano" x={centro} y={base + 14}>
                {c.no.valor.ano}
              </text>
              <image
                href={urlPoster(c.no.valor, 92)}
                x={centro - 15}
                y={base + 20}
                width={30}
                height={45}
                preserveAspectRatio="xMidYMid slice"
              />
              <text className="posicao" x={centro} y={base + 79}>
                {numero(c.posicao)}º
              </text>
            </g>
          );
        }
        return (
          <g key={i}>
            <text className="nome-ponta" x={centro} y={base + 16}>
              {c.tipo === "cabeca" ? "cabeça" : c.tipo === "fim" ? "fim" : "⋯"}
            </text>
            {c.tipo === "meio" && (
              <>
                <text className="no-meio" x={centro} y={base + 38}>
                  {numero(lista.tamanho - PONTA * 2)}
                </text>
                <text className="no-meio" x={centro} y={base + 52}>
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
