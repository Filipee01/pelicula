import { useMemo } from "react";
import { Filme } from "../dados";
import { NoSkip, SkipList } from "../estruturas/SkipList";

const JANELA = 32;

interface Props {
  lista: SkipList<Filme>;
  nivel: number;
  inicio: NoSkip<Filme> | null;
}

/** Desenha as torres dos nós do nível 0 a partir do primeiro filme exibido. */
export function VisualSkip({ lista, nivel, inicio }: Props) {
  const nos = useMemo(() => lista.percorrer(0, inicio, JANELA).nos, [lista, inicio]);
  if (nos.length === 0) return null;

  const niveis = Array.from({ length: lista.niveis }, (_, i) => lista.niveis - 1 - i);
  const noComeco = inicio === lista.primeiro(0);
  // o desenho é uma janela da lista: depois do último nó mostrado ou ela continua ou acaba
  const chegouAoFim = nos[nos.length - 1].prox[0] === null;

  return (
    <details className="visual-skip" open>
      <summary>
        Lista com saltos por dentro
        <span>
          cada coluna é um filme, cada linha um nível; o nível {nivel} (em destaque) é o que está
          na tela. É uma janela da lista: “⋯” indica que ela continua
        </span>
      </summary>
      <div className="torres">
        <div className="coluna rotulos">
          {niveis.map((n) => (
            <i key={n} className={n === nivel ? "atual" : ""}>
              {n}
            </i>
          ))}
          <small />
        </div>
        <div className="coluna">
          {niveis.map((n) => (
            <i key={n} className={noComeco ? `cheia cabeca ${n === nivel ? "ativa" : ""}` : ""} />
          ))}
          <small>{noComeco ? "início" : "⋯"}</small>
        </div>
        {nos.map((no) => (
          <div
            key={no.valor.id}
            className={`coluna ${no.altura > nivel ? "" : "pulada"}`}
            title={`${no.valor.titulo} (${no.valor.ano}) · torre de altura ${no.altura}`}
          >
            {niveis.map((n) => (
              <i
                key={n}
                className={no.altura > n ? (n === nivel ? "cheia ativa" : "cheia") : ""}
              />
            ))}
            <small>{no.valor.ano}</small>
          </div>
        ))}
        <div className="coluna" title={chegouAoFim ? "fim da lista" : "a lista continua"}>
          {niveis.map((n) => (
            <i key={n} className={chegouAoFim ? "cheia cabeca" : ""} />
          ))}
          <small>{chegouAoFim ? "fim" : "⋯"}</small>
        </div>
      </div>
    </details>
  );
}
