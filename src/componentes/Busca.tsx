import { useMemo, useState } from "react";
import { Filme, normalizar, urlPoster } from "../dados";
import { ArvoreSplay } from "../estruturas/ArvoreSplay";

interface Props {
  arvore: ArvoreSplay<string, Filme>;
  aoEscolher: (filme: Filme) => void;
}

export function Busca({ arvore, aoEscolher }: Props) {
  const [texto, setTexto] = useState("");
  const [aberta, setAberta] = useState(false);

  // Consulta por prefixo: não afunila, então digitar não reorganiza a árvore.
  // usa as modificações 4 e 5: consulta por prefixo nas várias chaves de cada filme
  const sugestoes = useMemo(() => {
    const prefixo = normalizar(texto);
    if (!prefixo) return [];
    // Um filme pode casar por mais de uma chave (finais diferentes do título).
    const achados = new Set<Filme>();
    for (const no of arvore.aPartirDe(prefixo, (k) => k.startsWith(prefixo), 400)) {
      achados.add(no.valor);
    }
    // A árvore devolve em ordem alfabética; na tela, os mais votados vêm antes.
    return [...achados].sort((a, b) => b.votos - a.votos).slice(0, 7);
  }, [arvore, texto]);

  function escolher(filme: Filme) {
    setTexto("");
    setAberta(false);
    aoEscolher(filme);
  }

  return (
    <div className="busca">
      <input
        type="search"
        placeholder="Buscar filme pelo título (ex.: Matrix, Godfather, Spirited Away)"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setAberta(true);
        }}
        onFocus={() => setAberta(true)}
        onBlur={() => setAberta(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && sugestoes[0]) escolher(sugestoes[0]);
          if (e.key === "Escape") setAberta(false);
        }}
      />
      {aberta && texto.trim() && (
        <ul className="sugestoes">
          {sugestoes.length === 0 && <li className="vazio">Nenhum título com esse início.</li>}
          {sugestoes.map((filme) => (
            // onMouseDown para agir antes do onBlur do campo fechar a lista.
            <li key={filme.id} onMouseDown={() => escolher(filme)}>
              <img src={urlPoster(filme, 92)} alt="" />
              <span className="nome">{filme.titulo}</span>
              <span className="contagem">{filme.ano}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
