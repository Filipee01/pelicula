import { useEffect, useRef, useState } from "react";
import { Busca } from "./componentes/Busca";
import { Estruturas } from "./componentes/Estruturas";
import { Galeria } from "./componentes/Galeria";
import { ModalFilme } from "./componentes/ModalFilme";
import { PainelEstruturas } from "./componentes/PainelEstruturas";
import { Acervo, Filme, Genero, carregarAcervo } from "./dados";
import { OperacaoSplay } from "./estruturas/ArvoreSplay";
import { AcessoLista } from "./estruturas/ListaMTF";
import { useFlip } from "./useFlip";

const fmt = new Intl.NumberFormat("pt-BR");
export const numero = (n: number) => fmt.format(n);

export default function App() {
  const [acervo, setAcervo] = useState<Acervo | null>(null);
  const [erro, setErro] = useState(false);
  const [genero, setGenero] = useState<Genero | null>(null);
  const [filmeAberto, setFilmeAberto] = useState<Filme | null>(null);
  const [tela, setTela] = useState<"catalogo" | "estruturas">("catalogo");
  // A lateral com o topo da árvore começa recolhida, para o catálogo abrir limpo.
  const [lateralAberta, setLateralAberta] = useState(false);
  const [ultimoAcesso, setUltimoAcesso] = useState<AcessoLista<Genero> | null>(null);
  const listaGenerosRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    carregarAcervo()
      .then((a) => {
        setAcervo(a);
        setGenero(a.generos.paraVetor()[0]);
      })
      .catch(() => setErro(true));
  }, []);

  const generos = acervo?.generos.paraVetor() ?? [];
  useFlip(listaGenerosRef, generos.map((g) => g.id).join());

  // A faixa de gêneros não cabe inteira na tela: a roda do mouse, que normalmente
  // rola para baixo, aqui rola a faixa para o lado.
  useEffect(() => {
    const faixa = listaGenerosRef.current;
    if (!faixa) return;
    const rolar = (e: WheelEvent) => {
      if (e.deltaY === 0 || faixa.scrollWidth <= faixa.clientWidth) return;
      e.preventDefault();
      faixa.scrollLeft += e.deltaY;
    };
    faixa.addEventListener("wheel", rolar, { passive: false });
    return () => faixa.removeEventListener("wheel", rolar);
  }, [acervo, tela]);

  // setas nas pontas da faixa: andam uns 70% da largura visível de cada vez
  function rolarGeneros(direcao: -1 | 1) {
    const faixa = listaGenerosRef.current;
    faixa?.scrollBy({ left: direcao * faixa.clientWidth * 0.7, behavior: "smooth" });
  }

  if (erro) {
    return (
      <div className="tela-cheia">
        <h1>Base de dados não encontrada</h1>
        <p>
          Rode <code>python scripts/preparar_dados.py</code> para gerar a base e recarregue a
          página.
        </p>
      </div>
    );
  }
  if (!acervo || !genero) {
    return (
      <div className="tela-cheia">
        <div className="carregando" />
        <p>Montando as estruturas de dados…</p>
      </div>
    );
  }

  function escolherGenero(escolhido: Genero) {
    const r = acervo!.generos.acessar((g) => g === escolhido);
    if (!r) return;
    setUltimoAcesso(r);
    setGenero(escolhido);
    setFilmeAberto(null);
    listaGenerosRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  }

  /** Busca o filme na árvore pela chave do título completo; com isso ele vai para a raiz. */
  function afunilar(filme: Filme): OperacaoSplay {
    acervo!.titulos.buscar(filme.chave);
    return acervo!.titulos.ultimaOperacao;
  }

  /** Clique na logo: volta ao catálogo, fecha a ficha e sobe a galeria para o topo. */
  function voltarAoInicio() {
    setTela("catalogo");
    setFilmeAberto(null);
    document.querySelector(".galeria")?.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** Todo filme aberto passa pela árvore afunilada. */
  function abrirFilme(filme: Filme) {
    afunilar(filme);
    setFilmeAberto(filme);
  }

  return (
    <div className={`app ${tela} ${lateralAberta ? "lateral-aberta" : ""}`}>
      <header className="topo">
        <div className="marca">
          <button className="marca-nome" title="Voltar ao início" onClick={voltarAoInicio}>
            Película<i>.</i>
          </button>
          <span className="marca-info">
            {numero(acervo.totalFilmes)} filmes · {acervo.generos.tamanho} gêneros
          </span>
        </div>
        <Busca arvore={acervo.titulos} aoEscolher={abrirFilme} />
        <div className="telas">
          <button className={tela === "catalogo" ? "ativa" : ""} onClick={() => setTela("catalogo")}>
            Catálogo
          </button>
          <button
            className={tela === "estruturas" ? "ativa" : ""}
            onClick={() => setTela("estruturas")}
          >
            Estruturas
          </button>
        </div>
      </header>

      {tela === "estruturas" ? (
        <Estruturas
          acervo={acervo}
          genero={genero}
          ultimoAcesso={ultimoAcesso}
          aoEscolherGenero={escolherGenero}
          aoAfunilar={afunilar}
        />
      ) : (
        <>
          <nav className="generos">
            <span className="rotulo">
              Gêneros <em>lista encadeada com movimentação ao início</em>
            </span>
            <button className="seta" onClick={() => rolarGeneros(-1)} aria-label="Gêneros anteriores">
              ‹
            </button>
            <ul ref={listaGenerosRef}>
              {generos.map((g, i) => (
                <li key={g.id} data-flip={g.id}>
                  <button className={g === genero ? "ativo" : ""} onClick={() => escolherGenero(g)}>
                    <span className="posicao">{i + 1}</span>
                    {g.nome}
                    <span className="contagem">{numero(g.lista.tamanho)}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button className="seta" onClick={() => rolarGeneros(1)} aria-label="Mais gêneros">
              ›
            </button>
          </nav>
          <Galeria key={genero.id} genero={genero} aoAbrir={abrirFilme} />
          <PainelEstruturas
            acervo={acervo}
            aberta={lateralAberta}
            aoAbrirFilme={abrirFilme}
            aoAlternar={() => setLateralAberta((v) => !v)}
          />
        </>
      )}

      {filmeAberto && (
        <ModalFilme
          filme={filmeAberto}
          generoAtual={genero}
          aoFechar={() => setFilmeAberto(null)}
          aoEscolherGenero={escolherGenero}
        />
      )}
    </div>
  );
}
