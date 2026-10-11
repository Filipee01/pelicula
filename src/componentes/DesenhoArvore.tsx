import { Filme, urlPoster } from "../dados";
import { ArvoreSplay } from "../estruturas/ArvoreSplay";

export interface NoDesenho {
  filme: Filme;
  nivel: number;
  /** Posição dentro do nível, de 0 a 2^nivel - 1. */
  indice: number;
  /** Na animação das rotações: o nó que sobe, o pai e o avô. */
  papel?: "no" | "pai" | "avo";
}

const NOME_PAPEL = { no: "nó", pai: "pai", avo: "avô" };

/** Fotografa os primeiros níveis da árvore, para desenhar ou comparar depois. */
export function fotografar(arvore: ArvoreSplay<string, Filme>, niveis: number): NoDesenho[] {
  return arvore.topo(niveis).map((t) => ({ filme: t.no.valor, nivel: t.nivel, indice: t.indice }));
}

interface Props {
  nos: NoDesenho[];
  niveis: number;
  /** Distância vertical entre os níveis, em px. */
  passo: number;
  /** Filme a realçar em qualquer nível (por exemplo, a raiz anterior). */
  marcado?: Filme;
  aoClicar?: (filme: Filme) => void;
  /** Se ligado, cada pôster desliza para a nova posição quando o desenho muda. */
  movel?: boolean;
}

export function DesenhoArvore({ nos, niveis, passo, marcado, aoClicar, movel }: Props) {
  // no modo móvel a chave é o filme, para o mesmo pôster deslizar até a posição nova
  const vezes = new Map<number, number>();
  const chave = (n: NoDesenho) => {
    if (!movel) return `${n.nivel}:${n.indice}`;
    const k = (vezes.get(n.filme.id) ?? 0) + 1;
    vezes.set(n.filme.id, k);
    return `${n.filme.id}:${k}`;
  };
  // Posição horizontal do nó, em % da largura do desenho.
  const x = (nivel: number, indice: number) => ((indice + 0.5) / 2 ** nivel) * 100;

  return (
    <div className={`arvore ${movel ? "movel" : ""}`} style={{ height: passo * niveis }}>
      <svg viewBox={`0 0 100 ${passo * niveis}`} preserveAspectRatio="none">
        {nos
          .filter((n) => n.nivel > 0)
          .map((n) => (
            <line
              key={`${n.nivel}:${n.indice}`}
              x1={x(n.nivel - 1, n.indice >> 1)}
              y1={(n.nivel - 1) * passo + 40}
              x2={x(n.nivel, n.indice)}
              y2={n.nivel * passo + 20}
            />
          ))}
      </svg>
      {nos.map((n) => (
        <button
          key={chave(n)}
          className={`no ${n.nivel === 0 && !movel ? "raiz" : ""} ${n.filme === marcado ? "marcado" : ""} ${n.papel ? `papel-${n.papel}` : ""}`}
          style={{ left: `${x(n.nivel, n.indice)}%`, top: n.nivel * passo }}
          title={`${n.filme.titulo} (${n.filme.ano})`}
          onClick={() => aoClicar?.(n.filme)}
        >
          {n.papel && <em className="papel">{NOME_PAPEL[n.papel]}</em>}
          <img src={urlPoster(n.filme, 92)} alt="" />
          <span>{n.filme.titulo}</span>
        </button>
      ))}
    </div>
  );
}
