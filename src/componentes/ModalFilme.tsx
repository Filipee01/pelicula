import { useEffect, useMemo } from "react";
import { numero } from "../App";
import { Filme, Genero, urlFundo, urlPoster } from "../dados";

interface Props {
  filme: Filme;
  generoAtual: Genero;
  aoFechar: () => void;
  aoEscolherGenero: (genero: Genero) => void;
}

export function ModalFilme({ filme, generoAtual, aoFechar, aoEscolherGenero }: Props) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [aoFechar]);

  // Mostra a posição na lista do gênero que está na tela, se o filme for dele.
  const genero = filme.generos.includes(generoAtual) ? generoAtual : filme.generos[0];
  const lista = genero.lista;
  // usa a modificação 2 (lista indexada) para saber a posição do filme
  const local = useMemo(() => lista.localizar(filme), [lista, filme]);
  const altura = local.no?.altura ?? 1;

  return (
    <div className="fundo-modal" onClick={aoFechar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="fechar" onClick={aoFechar} aria-label="Fechar">
          ×
        </button>
        <div
          className="modal-fundo"
          style={filme.fundo ? { backgroundImage: `url(${urlFundo(filme, 780)})` } : undefined}
        />
        <div className="modal-corpo">
          <img className="poster" src={urlPoster(filme, 342)} alt={filme.titulo} />
          <div className="ficha">
            <h2>{filme.titulo}</h2>
            <p className="meta">
              {filme.ano}
              {filme.duracao > 0 && ` · ${filme.duracao} min`}
              {filme.nota > 0 && (
                <span className="estrela">
                  ★ {filme.nota.toFixed(1)} <small>({numero(filme.votos)} votos)</small>
                </span>
              )}
            </p>
            <div className="etiquetas">
              {filme.generos.map((g) => (
                <button key={g.id} onClick={() => aoEscolherGenero(g)}>
                  {g.nome}
                </button>
              ))}
            </div>
            {filme.sinopse && <p className="sinopse">{filme.sinopse}</p>}

            <dl className="dados-estrutura">
              <dt>Na lista com saltos de “{genero.nome}”</dt>
              <dd>
                Posição <strong>{numero(local.posicao + 1)}</strong> de {numero(lista.tamanho)},
                calculada pelas larguras dos ponteiros.
              </dd>
              <dd>
                Torre de altura <strong>{altura}</strong>: aparece até o nível {altura - 1}.
              </dd>
              <dd>
                Encontrado em <strong>{local.comparacoes} comparações</strong>
                {local.posicao + 1 > local.comparacoes &&
                  `; a busca sequencial faria ${numero(local.posicao + 1)}`}
                .
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
