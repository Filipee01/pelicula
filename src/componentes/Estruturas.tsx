import { ReactNode, useMemo, useRef, useState } from "react";
import { numero } from "../App";
import { Acervo, Filme, Genero, aPartirDoAno, normalizar, urlPoster } from "../dados";
import { OperacaoSplay } from "../estruturas/ArvoreSplay";
import { AcessoLista } from "../estruturas/ListaMTF";
import { NoSkip, Salto } from "../estruturas/SkipList";
import { useFlip } from "../useFlip";
import { ComparacaoArvores } from "./ComparacaoArvores";
import { DesenhoArvore, NoDesenho, fotografar } from "./DesenhoArvore";
import { ControlesPasso, usePassoAPasso } from "./PassoAPasso";

type Aba = "lista" | "saltos" | "arvore";

interface Props {
  acervo: Acervo;
  genero: Genero;
  ultimoAcesso: AcessoLista<Genero> | null;
  aoEscolherGenero: (genero: Genero) => void;
  /** Busca o filme na árvore (afunilando) e devolve o que a operação fez. */
  aoAfunilar: (filme: Filme) => OperacaoSplay;
}

const ABAS: { id: Aba; numero: number; nome: string; tipo: string }[] = [
  { id: "lista", numero: 1, nome: "Lista encadeada com movimentação ao início", tipo: "gêneros do catálogo" },
  { id: "saltos", numero: 2, nome: "Lista com saltos", tipo: "filmes de cada gênero" },
  { id: "arvore", numero: 3, nome: "Árvore afunilada", tipo: "busca por título" },
];

/** Cartão que contrapõe o algoritmo clássico ao que foi implementado. */
function Modificacao(props: { titulo: string; classico: string; nosso: string; codigo: string }) {
  return (
    <article className="modificacao">
      <h3>{props.titulo}</h3>
      <p>
        <span>Clássica</span>
        {props.classico}
      </p>
      <p className="nosso">
        <span>A nossa</span>
        {props.nosso}
      </p>
      <code>{props.codigo}</code>
    </article>
  );
}

function Demonstracao(props: { titulo: string; children: ReactNode }) {
  return (
    <section className="demonstracao">
      <h3>{props.titulo}</h3>
      {props.children}
    </section>
  );
}

function Numero(props: { valor: string; rotulo: string; destaque?: boolean }) {
  return (
    <div className={`numero ${props.destaque ? "forte" : ""}`}>
      <strong>{props.valor}</strong>
      <span>{props.rotulo}</span>
    </div>
  );
}

// número grande com o pôster do filme ao lado
function NumeroFilme(props: { valor: string; rotulo: string; filme?: Filme | null; destaque?: boolean }) {
  return (
    <div className={`numero com-filme ${props.destaque ? "forte" : ""}`}>
      {props.filme && <img src={urlPoster(props.filme, 92)} alt="" />}
      <div>
        <strong>{props.valor}</strong>
        <span>{props.rotulo}</span>
      </div>
    </div>
  );
}

/* ---------- 1. lista encadeada com movimentação ao início ---------- */

function AbaLista({ acervo, genero, ultimoAcesso, aoEscolherGenero }: Props) {
  const ref = useRef<HTMLOListElement>(null);
  const generos = acervo.generos.paraVetor();
  useFlip(ref, generos.map((g) => g.id).join());

  return (
    <div className="aba">
      <aside className="explicacao">
        <p className="resumo-aba">
          Os 19 gêneros ficam em uma lista encadeada. Acessar um gênero faz uma busca sequencial e
          move o nó encontrado para o início, então os mais usados ficam sempre na frente.
        </p>
        <article className="modificacao sem">
          <h3>Sem modificação</h3>
          <p>
            Esta é a estrutura clássica. O algoritmo só devolve as comparações e a posição
            anterior para a tela poder mostrá-las.
          </p>
          <code>ListaMTF.ts · acessar()</code>
        </article>
      </aside>

      <div className="palco">
        <Demonstracao titulo="Clique em um gênero para acessá-lo">
          <ol className="encadeada" ref={ref}>
            {generos.map((g, i) => (
              <li key={g.id} data-flip={g.id}>
                <button className={g === genero ? "ativo" : ""} onClick={() => aoEscolherGenero(g)}>
                  <small>{i + 1}</small>
                  {g.nome}
                </button>
              </li>
            ))}
          </ol>
          {ultimoAcesso ? (
            <div className="numeros">
              <Numero valor={`${ultimoAcesso.posicaoAnterior + 1}ª`} rotulo="posição em que estava" />
              <Numero
                valor={String(ultimoAcesso.comparacoes)}
                rotulo={ultimoAcesso.comparacoes === 1 ? "comparação" : "comparações na busca sequencial"}
                destaque
              />
              <Numero valor="1ª" rotulo={`posição de “${ultimoAcesso.valor.nome}” agora`} />
            </div>
          ) : (
            <p className="dica">
              Escolha um gênero do fim da lista para ver quantas comparações custa e para onde ele
              vai.
            </p>
          )}
        </Demonstracao>
      </div>
    </div>
  );
}

/* ---------- 2. lista com saltos ---------- */

function AbaSaltos({ genero }: Props) {
  const { lista } = genero;
  const anoMin = lista.primeiro(0)?.valor.ano ?? 0;
  const anoMax = lista.porPosicao(lista.tamanho - 1)?.valor.ano ?? 0;
  const [ano, setAno] = useState(Math.min(anoMax, Math.max(anoMin, 1999)));
  const [nivelMinimo, setNivelMinimo] = useState(Math.min(3, lista.niveis - 1));
  const [k, setK] = useState(Math.ceil(lista.tamanho / 3));

  const classica = useMemo(() => lista.buscar(aPartirDoAno(ano), 0), [lista, ano]);
  const truncada = useMemo(
    () => lista.buscar(aPartirDoAno(ano), nivelMinimo),
    [lista, ano, nivelMinimo],
  );

  // Colunas do desenho: a cabeça, cada nó em que a busca pisou e os dois resultados.
  // A trilha é o caminho da busca clássica, casa por casa (coluna, nível), na ordem em
  // que a busca passa: descendo um nível ou avançando para o próximo nó.
  const { colunas, trilha } = useMemo(() => {
    const colunas: NoSkip<Filme>[] = [lista.cabeca];
    let nivelAtual = lista.niveis - 1;
    const trilha = [{ c: 0, n: nivelAtual }];
    for (const { nivel, no } of classica.visitas) {
      while (nivelAtual > nivel) trilha.push({ c: colunas.length - 1, n: --nivelAtual });
      colunas.push(no);
      trilha.push({ c: colunas.length - 1, n: nivel });
    }
    while (nivelAtual > 0) trilha.push({ c: colunas.length - 1, n: --nivelAtual });
    for (const alvo of [classica.no, truncada.no]) {
      if (alvo && !colunas.includes(alvo)) colunas.push(alvo);
    }
    return { colunas, trilha };
  }, [lista, classica, truncada]);

  // animação do caminho: a cada passo a busca anda uma casa
  const busca = usePassoAPasso(trilha.length, `${ano}:${nivelMinimo}`, { intervalo: 420 });
  const ordem = new Map(trilha.map((t, i) => [`${t.c}:${t.n}`, i]));
  // a truncada termina quando a trilha desce abaixo do nível mínimo
  const parada = trilha.findIndex((t) => t.n < nivelMinimo);
  const fimTruncada = parada === -1 ? trilha.length : parada;
  const truncadaPronta = busca.passo >= fimTruncada;
  const textoBusca = busca.terminou
    ? undefined
    : busca.passo === 0
      ? "a busca começa no topo da cabeça da lista"
      : truncadaPronta
        ? `a truncada já parou no nível ${nivelMinimo}; só a clássica continua descendo`
        : "descendo pelos níveis de cima: este trecho as duas buscas fazem";

  // alguns filmes de cada nível, espalhados pela ordem, para mostrar a amostra que o nível é
  const amostras = useMemo(
    () =>
      Array.from({ length: lista.niveis }, (_, n) => {
        const nos = lista.percorrer(n, lista.primeiro(n), lista.nosPorNivel[n]).nos;
        const quantos = Math.min(5, nos.length);
        return Array.from({ length: quantos }, (_, i) => nos[Math.floor((i * nos.length) / quantos)].valor);
      }),
    [lista],
  );

  const niveis = Array.from({ length: lista.niveis }, (_, i) => lista.niveis - 1 - i);
  const saltos: Salto[] = [];
  const noK = lista.porPosicao(k - 1, saltos);

  return (
    <div className="aba">
      <aside className="explicacao">
        <p className="resumo-aba">
          Cada gênero guarda seus filmes em uma lista com saltos, em ordem cronológica. Aqui:{" "}
          <strong>{genero.nome}</strong>, {numero(lista.tamanho)} filmes, {lista.niveis} níveis.
        </p>
        <Modificacao
          titulo="1 · Busca truncada"
          classico="desce sempre até o nível 0."
          nosso="recebe um nível mínimo e para nele: devolve o primeiro elemento ≥ alvo dentre os que existem naquele nível."
          codigo="SkipList.ts · buscar(direcao, nivelMinimo)"
        />
        <Modificacao
          titulo="2 · Lista indexada"
          classico="só sabe chegar a um elemento pela chave."
          nosso="cada ponteiro guarda quantos elementos ele pula; somando as larguras, chega ao k-ésimo e sabe a posição de qualquer elemento em O(log n)."
          codigo="SkipList.ts · largura[], porPosicao(k)"
        />
        <Modificacao
          titulo="3 · Navegação por nível"
          classico="os níveis são só um atalho interno da busca."
          nosso="cada nível pode ser percorrido como uma lista própria, a partir de um cursor. É o controle “Profundidade” do catálogo."
          codigo="SkipList.ts · percorrer(nivel, inicio, quantidade)"
        />
      </aside>

      <div className="palco">
        <Demonstracao titulo="1 · Buscar o primeiro filme a partir de um ano">
          <div className="ajustes">
            <label>
              <span>
                Ano procurado <strong>{ano}</strong>
              </span>
              <input
                type="range"
                min={anoMin}
                max={anoMax}
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
              />
            </label>
            <label>
              <span>
                Nível mínimo da busca truncada <strong>{nivelMinimo}</strong>
              </span>
              <input
                type="range"
                min={0}
                max={lista.niveis - 1}
                value={nivelMinimo}
                onChange={(e) => setNivelMinimo(Number(e.target.value))}
              />
            </label>
          </div>

          <ControlesPasso anim={busca} texto={textoBusca} />

          <div className="caminho">
            <div className="coluna rotulos">
              {niveis.map((n) => (
                <i key={n} className={n === nivelMinimo ? "atual" : ""}>
                  {n}
                </i>
              ))}
              <small>nível</small>
            </div>
            {colunas.map((no, c) => {
              const ehCabeca = c === 0;
              const papel =
                no === truncada.no && truncadaPronta
                  ? "alvo-truncada"
                  : no === classica.no && busca.terminou
                    ? "alvo-classica"
                    : "";
              return (
                <div
                  key={c}
                  className={`coluna ${papel}`}
                  title={ehCabeca ? "cabeça da lista" : `${no.valor.titulo} (${no.valor.ano})`}
                >
                  {niveis.map((n) => {
                    if (no.altura <= n) return <i key={n} />;
                    const indice = ordem.get(`${c}:${n}`);
                    const pisou = indice !== undefined && indice < busca.passo;
                    const classe = !pisou ? "" : n >= nivelMinimo ? "comum" : "so-classica";
                    const aqui = !busca.terminou && indice === busca.passo - 1;
                    return <i key={n} className={`cheia ${classe} ${aqui ? "marcador" : ""}`} />;
                  })}
                  <small>{ehCabeca ? "início" : no.valor.ano}</small>
                  {ehCabeca ? (
                    <span className="mini" />
                  ) : (
                    <img className="mini" src={urlPoster(no.valor, 92)} alt="" />
                  )}
                </div>
              );
            })}
          </div>
          <p className="legenda-caminho">
            <span className="amostra comum" /> caminho até o nível {nivelMinimo} (as duas buscas)
            <span className="amostra so-classica" /> o que só a clássica percorre
            <span className="amostra alvo-classica" /> resultado da clássica
            <span className="amostra alvo-truncada" /> resultado da truncada
          </p>
          <p className="dica">
            O desenho mostra só os nós em que a busca pisou; entre uma coluna e outra há filmes que
            foram pulados.
          </p>

          <div className="numeros">
            <Numero valor={numero(classica.posicao)} rotulo="comparações em uma busca sequencial" />
            <NumeroFilme
              valor={String(classica.comparacoes)}
              rotulo={`clássica: chega em “${classica.no?.valor.titulo ?? "fim da lista"}”${classica.no ? ` (${classica.no.valor.ano})` : ""}`}
              filme={classica.no?.valor}
            />
            <NumeroFilme
              valor={String(truncada.comparacoes)}
              rotulo={`truncada no nível ${nivelMinimo}: chega em “${truncada.no?.valor.titulo ?? "fim do nível"}”${truncada.no ? ` (${truncada.no.valor.ano})` : ""}`}
              filme={truncada.no?.valor}
              destaque
            />
          </div>
        </Demonstracao>

        <Demonstracao titulo="2 · Ir direto ao k-ésimo filme pelas larguras">
          <div className="ajustes">
            <label>
              <span>
                Posição k <strong>{numero(k)}</strong>
              </span>
              <input
                type="range"
                min={1}
                max={lista.tamanho}
                value={k}
                onChange={(e) => setK(Number(e.target.value))}
              />
            </label>
          </div>
          <p className="soma">
            {saltos.map((s, i) => (
              <span key={i} title={`salto no nível ${s.nivel}`}>
                {numero(s.largura)}
                <small>nível {s.nivel}</small>
              </span>
            ))}
            <b>= {numero(k)}</b>
          </p>
          <div className="numeros">
            <Numero valor={numero(k)} rotulo="passos andando pelo nível 0" />
            <Numero valor={String(saltos.length)} rotulo="saltos somando as larguras" destaque />
            <NumeroFilme valor={String(noK?.valor.ano ?? "")} rotulo={`“${noK?.valor.titulo ?? ""}”`} filme={noK?.valor} />
          </div>
        </Demonstracao>

        <Demonstracao titulo="3 · Quantos filmes existem em cada nível">
          <div className="barras">
            {lista.nosPorNivel.slice(0, lista.niveis).map((quantidade, n) => (
              <div key={n} className="barra">
                <span>nível {n}</span>
                <i style={{ width: `${Math.max(0.4, (quantidade / lista.tamanho) * 100)}%` }} />
                <b>{numero(quantidade)}</b>
                <small>esperado ≈ {numero(Math.round(lista.tamanho / 2 ** n))}</small>
                <span className="amostra-nivel">
                  {amostras[n].map((f) => (
                    <img key={f.id} src={urlPoster(f, 92)} alt="" title={`${f.titulo} (${f.ano})`} />
                  ))}
                </span>
              </div>
            ))}
          </div>
        </Demonstracao>
      </div>
    </div>
  );
}

/* ---------- 3. árvore afunilada ---------- */

const NIVEIS_ARVORE = 4;

interface Afunilamento {
  filme: Filme;
  operacao: OperacaoSplay;
  antes: NoDesenho[];
  depois: NoDesenho[];
}

function AbaArvore({ acervo, aoAfunilar }: Props) {
  const arvore = acervo.titulos;
  const [texto, setTexto] = useState("");
  const [ultimo, setUltimo] = useState<Afunilamento | null>(null);

  const prefixo = normalizar(texto);
  const chaves = useMemo(
    () => (prefixo ? arvore.aPartirDe(prefixo, (c) => c.startsWith(prefixo), 400) : []),
    // `ultimo` entra porque a forma da árvore muda a cada afunilamento.
    [arvore, prefixo, ultimo],
  );
  const filmes = useMemo(
    () => [...new Set(chaves.map((no) => no.valor))].sort((a, b) => b.votos - a.votos).slice(0, 8),
    [chaves],
  );
  const raiz = arvore.raiz!.valor;

  function afunilar(filme: Filme) {
    const antes = fotografar(arvore, NIVEIS_ARVORE);
    const operacao = aoAfunilar(filme);
    setUltimo({ filme, operacao, antes, depois: fotografar(arvore, NIVEIS_ARVORE) });
  }

  return (
    <div className="aba">
      <aside className="explicacao">
        <p className="resumo-aba">
          Os títulos ficam em uma árvore afunilada com {numero(arvore.tamanho)} chaves. Todo filme
          aberto é levado até a raiz por rotações, então o que foi visto há pouco fica perto do
          topo.
        </p>
        <Modificacao
          titulo="1 · Consulta por prefixo sem afunilar"
          classico="toda busca afunila o nó encontrado."
          nosso="o autocompletar desce até a primeira chave ≥ prefixo e anda pelos sucessores em ordem, sem mexer na árvore. Só abrir um filme afunila."
          codigo="ArvoreSplay.ts · aPartirDe(inicio, continuar, limite)"
        />
        <Modificacao
          titulo="2 · Várias chaves por filme"
          classico="uma chave por registro."
          nosso="cada filme entra com o título completo e com os finais do título (“the dark knight”, “dark knight”, “knight”), todos apontando para o mesmo filme."
          codigo="dados.ts · chavesDoFilme()"
        />
        <Modificacao
          titulo="3 · Topo da árvore como vitrine"
          classico="a forma da árvore é um detalhe interno."
          nosso="os primeiros níveis são lidos em largura e desenhados no catálogo; as rotações de cada acesso ficam registradas."
          codigo="ArvoreSplay.ts · topo(niveis), ultimaOperacao"
        />
      </aside>

      <div className="palco">
        <Demonstracao titulo="1 · Digite o começo de um título">
          <input
            className="campo"
            type="search"
            placeholder="ex.: knight, matrix, toy story"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          {prefixo && (
            <>
              <div className="numeros">
                <Numero valor={String(chaves.length)} rotulo="chaves com esse prefixo (até 400)" />
                <Numero valor="0" rotulo="rotações feitas pela consulta" destaque />
                <Numero valor="igual" rotulo={`a raiz continua “${raiz.titulo}”`} />
              </div>
              <div className="achados">
                {filmes.length === 0 && <p className="dica">Nenhum título com esse início.</p>}
                {filmes.map((f) => (
                  <button key={f.id} onClick={() => afunilar(f)}>
                    {f.titulo} <small>{f.ano}</small>
                  </button>
                ))}
              </div>
              {filmes.length > 0 && (
                <p className="dica">Clique em um título para buscá-lo de verdade e afunilar.</p>
              )}
            </>
          )}
        </Demonstracao>

        <Demonstracao
          titulo={ultimo ? `2 · Afunilamento de “${ultimo.filme.titulo}”` : "2 · Topo da árvore agora"}
        >
          {ultimo ? (
            <>
              <div className="numeros">
                <Numero valor={String(ultimo.operacao.profundidade)} rotulo="profundidade em que estava" />
                <Numero valor={String(ultimo.operacao.comparacoes)} rotulo="comparações para achar" />
                <Numero valor={String(ultimo.operacao.passos.length)} rotulo="passos de afunilamento" destaque />
              </div>
              <p className="passos">
                {ultimo.operacao.passos.length === 0 && <span>já era a raiz</span>}
                {ultimo.operacao.passos.map((passo, i) => (
                  <span key={i} className={passo}>
                    {passo}
                  </span>
                ))}
              </p>
              <div className="antes-depois">
                <div>
                  <h4>Antes</h4>
                  <DesenhoArvore nos={ultimo.antes} niveis={NIVEIS_ARVORE} passo={104} />
                </div>
                <div>
                  <h4>Depois</h4>
                  <DesenhoArvore
                    nos={ultimo.depois}
                    niveis={NIVEIS_ARVORE}
                    passo={104}
                    marcado={ultimo.antes[0]?.filme}
                    aoClicar={afunilar}
                  />
                </div>
              </div>
              <p className="dica">
                Contorno dourado: a raiz anterior, que desceu. Clique em qualquer nó de “Depois”
                para afunilá-lo.
              </p>
            </>
          ) : (
            <>
              <DesenhoArvore
                nos={fotografar(arvore, NIVEIS_ARVORE)}
                niveis={NIVEIS_ARVORE}
                passo={104}
                aoClicar={afunilar}
              />
              <p className="dica">
                Clique em um nó, ou busque um título acima, para ver o antes e o depois do
                afunilamento.
              </p>
            </>
          )}
        </Demonstracao>

        <Demonstracao titulo="3 · Afunilada × AVL nos mesmos acessos">
          <ComparacaoArvores arvore={arvore} />
        </Demonstracao>
      </div>
    </div>
  );
}

export function Estruturas(props: Props) {
  const [aba, setAba] = useState<Aba>("lista");

  return (
    <main className="tela-estruturas">
      <nav className="abas">
        {ABAS.map((a) => (
          <button key={a.id} className={a.id === aba ? "ativa" : ""} onClick={() => setAba(a.id)}>
            <b>{a.numero}</b>
            <span>
              {a.nome}
              <small>{a.tipo}</small>
            </span>
          </button>
        ))}
      </nav>
      {aba === "lista" && <AbaLista {...props} />}
      {/* A chave recria a aba quando o gênero muda, para os controles voltarem ao padrão. */}
      {aba === "saltos" && <AbaSaltos key={props.genero.id} {...props} />}
      {aba === "arvore" && <AbaArvore {...props} />}
    </main>
  );
}
