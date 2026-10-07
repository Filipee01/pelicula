import { useEffect, useMemo, useRef, useState } from "react";
import { numero } from "../App";
import { Filme, Genero, aPartirDoAno, urlFundo, urlPoster } from "../dados";
import { NoSkip, SkipList } from "../estruturas/SkipList";
import { VisualSkip } from "./VisualSkip";

const PAGINA = 60;
/** O destaque sai dos níveis mais altos da lista com saltos. */
const NIVEIS_DO_DESTAQUE = 6;

interface Props {
  genero: Genero;
  aoAbrir: (filme: Filme) => void;
}

interface Pagina {
  nos: NoSkip<Filme>[];
  cursor: NoSkip<Filme> | null;
}

/** O filme mais votado dentre os que estão "por cima" na lista com saltos. */
function escolherDestaque(lista: SkipList<Filme>): Filme | null {
  const nivel = Math.max(0, lista.niveis - NIVEIS_DO_DESTAQUE);
  let melhor: Filme | null = null;
  for (let x = lista.primeiro(nivel); x; x = x.prox[nivel]) {
    if (x.valor.fundo && (!melhor || x.valor.votos > melhor.votos)) melhor = x.valor;
  }
  return melhor;
}

/** Some da grade se o pôster não existir mais no TMDB. */
function Cartao({ filme, aoAbrir }: { filme: Filme; aoAbrir: (filme: Filme) => void }) {
  const [quebrado, setQuebrado] = useState(false);
  if (quebrado) return null;
  return (
    <button className="cartao" onClick={() => aoAbrir(filme)}>
      <img
        src={urlPoster(filme, 342)}
        alt={filme.titulo}
        loading="lazy"
        onError={() => setQuebrado(true)}
      />
      {filme.nota > 0 && <span className="nota">{filme.nota.toFixed(1)}</span>}
      <span className="legenda">
        <strong>{filme.titulo}</strong>
        <span>{filme.ano}</span>
      </span>
    </button>
  );
}

export function Galeria({ genero, aoAbrir }: Props) {
  const { lista } = genero;
  const [nivel, setNivel] = useState(0);
  const [ano, setAno] = useState<number | null>(null);
  const rolagem = useRef<HTMLElement>(null);
  const sentinela = useRef<HTMLDivElement>(null);

  const destaque = useMemo(() => escolherDestaque(lista), [lista]);
  // O último filme da ordem cronológica é alcançado por posição, em O(log n).
  const anoMin = lista.primeiro(0)?.valor.ano ?? 0;
  // usa a modificação 2 (lista indexada) para pegar o último filme
  const anoMax = lista.porPosicao(lista.tamanho - 1)?.valor.ano ?? 0;

  // Busca truncada: para no nível escolhido em vez de descer até o nível 0.
  // usa a modificação 1 (busca truncada)
  const busca = useMemo(
    () => (ano === null ? null : lista.buscar(aPartirDoAno(ano), nivel)),
    [lista, nivel, ano],
  );
  const inicio = busca ? busca.no : lista.primeiro(nivel);

  // usa a modificação 3 (navegação por nível): a grade anda pelo nível escolhido
  const [pagina, setPagina] = useState<Pagina>(() => lista.percorrer(nivel, inicio, PAGINA));
  const primeiraVez = useRef(true);
  useEffect(() => {
    setPagina(lista.percorrer(nivel, inicio, PAGINA));
    // Ao mudar o nível ou o ano, leva a grade para a vista (menos na abertura).
    if (primeiraVez.current) primeiraVez.current = false;
    else rolagem.current?.querySelector(".controles")?.scrollIntoView({ behavior: "smooth" });
  }, [lista, nivel, inicio]);

  // Rolagem infinita: continua do cursor, sem refazer a busca.
  useEffect(() => {
    const alvo = sentinela.current;
    if (!alvo || !pagina.cursor) return;
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return;
        setPagina((p) => {
          if (!p.cursor) return p;
          const mais = lista.percorrer(nivel, p.cursor, PAGINA);
          return { nos: [...p.nos, ...mais.nos], cursor: mais.cursor };
        });
      },
      { root: rolagem.current, rootMargin: "900px" },
    );
    observador.observe(alvo);
    return () => observador.disconnect();
  }, [lista, nivel, pagina]);

  /** Sorteia uma posição e vai direto a ela pelas larguras dos ponteiros. */
  function surpreender() {
    // usa a modificação 2 (lista indexada) para ir direto à posição sorteada
    const no = lista.porPosicao(Math.floor(Math.random() * lista.tamanho));
    if (no) aoAbrir(no.valor);
  }

  const noNivel = lista.nosPorNivel[nivel];

  return (
    <main className="galeria" ref={rolagem}>
      <section
        className="destaque"
        style={
          destaque ? { backgroundImage: `url(${urlFundo(destaque, 1280)})` } : undefined
        }
      >
        <div className="destaque-texto">
          <span className="rotulo">{genero.nome}</span>
          {destaque ? (
            <>
              <h1>{destaque.titulo}</h1>
              <p className="meta">
                {destaque.ano}
                {destaque.duracao > 0 && ` · ${destaque.duracao} min`}
                {destaque.nota > 0 && (
                  <span className="estrela">★ {destaque.nota.toFixed(1)}</span>
                )}
              </p>
              <p className="sinopse">{destaque.sinopse}</p>
              <div className="acoes">
                <button className="botao primario" onClick={() => aoAbrir(destaque)}>
                  Ver detalhes
                </button>
                <button className="botao" onClick={surpreender}>
                  Surpreenda-me
                </button>
              </div>
              <p className="origem">
                Em destaque: o mais votado entre os filmes que estão no topo da lista com saltos
                deste gênero.
              </p>
            </>
          ) : (
            <h1>{genero.nome}</h1>
          )}
        </div>
      </section>

      <div className="controles">
        <div className="resumo">
          <strong>{numero(lista.tamanho)}</strong> filmes em ordem cronológica
          <span>lista com saltos de {lista.niveis} níveis</span>
        </div>

        <label className="controle">
          <span className="controle-titulo">
            Profundidade da exploração
            <strong>
              Nível {nivel} · {numero(noNivel)} {noNivel === 1 ? "filme" : "filmes"}
            </strong>
          </span>
          <input
            type="range"
            min={0}
            max={lista.niveis - 1}
            value={nivel}
            onChange={(e) => setNivel(Number(e.target.value))}
          />
          <span className="extremos">
            <span>ver tudo</span>
            <span>só por cima</span>
          </span>
        </label>

        {anoMax > anoMin && (
          <label className="controle">
            <span className="controle-titulo">
              Ir para o ano
              <strong>{ano ?? "início"}</strong>
            </span>
            <input
              type="range"
              min={anoMin}
              max={anoMax}
              value={ano ?? anoMin}
              onChange={(e) => setAno(Number(e.target.value))}
            />
            <span className="extremos">
              <span>{anoMin}</span>
              <span>{anoMax}</span>
            </span>
          </label>
        )}
      </div>

      {busca && (
        <p className="nota-busca">
          Busca truncada no nível {nivel}: <strong>{busca.comparacoes} comparações</strong> para
          chegar à posição {numero(busca.posicao + 1)} de {numero(lista.tamanho)}
          {busca.posicao > busca.comparacoes &&
            ` (uma busca sequencial faria ${numero(busca.posicao + 1)})`}
          .{" "}
          <button className="link" onClick={() => setAno(null)}>
            voltar ao início
          </button>
        </p>
      )}

      <VisualSkip lista={lista} nivel={nivel} inicio={inicio} />

      {pagina.nos.length === 0 ? (
        <p className="vazio">Nenhum filme deste nível a partir de {ano}.</p>
      ) : (
        <div className="grade">
          {pagina.nos.map(({ valor: filme }) => (
            <Cartao key={filme.id} filme={filme} aoAbrir={aoAbrir} />
          ))}
        </div>
      )}
      <div ref={sentinela} className="sentinela">
        {pagina.cursor ? "Carregando mais…" : pagina.nos.length > 0 ? "Fim da lista." : ""}
      </div>
    </main>
  );
}
