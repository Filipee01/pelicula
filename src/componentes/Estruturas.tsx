import { ReactNode, useMemo, useRef, useState } from "react";
import { numero } from "../App";
import { Acervo, Filme, Genero, aPartirDoAno, normalizar, urlPoster } from "../dados";
import { OperacaoSplay, PassoSplay, QuadroSplay } from "../estruturas/ArvoreSplay";
import { AcessoLista } from "../estruturas/ListaMTF";
import { Salto } from "../estruturas/SkipList";
import { useFlip } from "../useFlip";
import { ArvoreAnimada } from "./ArvoreAnimada";
import { ComparacaoArvores } from "./ComparacaoArvores";
import { DesenhoArvore, NoDesenho, fotografar } from "./DesenhoArvore";
import { ListaPontas } from "./ListaPontas";
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

interface AcessoAnimado {
  antes: Genero[]; // ordem da lista antes do acesso
  posicao: number; // onde o gênero estava (começa em 0)
  id: number;
}

function AbaLista({ acervo, genero, ultimoAcesso, aoEscolherGenero }: Props) {
  const ref = useRef<HTMLOListElement>(null);
  const contador = useRef(0);
  const generos = acervo.generos.paraVetor();
  const [acesso, setAcesso] = useState<AcessoAnimado | null>(null);

  // A lista já faz o acesso na hora; a animação repete a busca sequencial nó por nó:
  // um passo por comparação e um último passo para mover o nó para o início.
  const seq = usePassoAPasso(acesso ? acesso.posicao + 2 : 0, acesso?.id, {
    intervalo: 380,
    tocarAoMudar: true,
  });
  const animando = acesso !== null && !seq.terminou;
  const comparados = acesso ? Math.min(seq.passo, acesso.posicao + 1) : 0;
  const achou = acesso !== null && comparados === acesso.posicao + 1;
  const exibidos = animando ? acesso.antes : generos;
  useFlip(ref, exibidos.map((g) => g.id).join());

  function acessar(g: Genero) {
    const antes = acervo.generos.paraVetor();
    setAcesso({ antes, posicao: antes.indexOf(g), id: ++contador.current });
    aoEscolherGenero(g);
  }

  const textoSeq = !animando
    ? undefined
    : seq.passo === 0
      ? "a busca começa pelo primeiro nó da lista"
      : achou
        ? `achou “${acesso.antes[acesso.posicao].nome}”: agora o nó vai para o início`
        : `comparou com “${acesso.antes[comparados - 1].nome}”: não é, segue para o próximo nó`;

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
          {acesso && <ControlesPasso anim={seq} texto={textoSeq} />}
          <ol className="encadeada" ref={ref}>
            {exibidos.map((g, i) => (
              <li key={g.id} data-flip={g.id}>
                <button
                  className={
                    animando
                      ? i < comparados - 1
                        ? "visto"
                        : i === comparados - 1
                          ? achou
                            ? "achado"
                            : "comparando"
                          : ""
                      : g === genero
                        ? "ativo"
                        : ""
                  }
                  onClick={() => acessar(g)}
                >
                  <small>{i + 1}</small>
                  {g.nome}
                </button>
              </li>
            ))}
          </ol>
          {animando ? (
            <div className="numeros">
              <Numero valor={achou ? `${acesso.posicao + 1}ª` : "…"} rotulo="posição em que estava" />
              <Numero
                valor={String(comparados)}
                rotulo={comparados === 1 ? "comparação" : "comparações na busca sequencial"}
                destaque
              />
              <Numero valor="…" rotulo="posição depois do acesso" />
            </div>
          ) : ultimoAcesso ? (
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

  // A trilha é o caminho da busca clássica, casa por casa (nó e nível), na ordem em que
  // a busca passa: descendo um nível ou avançando para o próximo nó.
  const trilha = useMemo(() => {
    let no = lista.cabeca;
    let nivelAtual = lista.niveis - 1;
    const trilha = [{ no, nivel: nivelAtual }];
    for (const visita of classica.visitas) {
      while (nivelAtual > visita.nivel) trilha.push({ no, nivel: --nivelAtual });
      no = visita.no;
      trilha.push({ no, nivel: visita.nivel });
    }
    while (nivelAtual > 0) trilha.push({ no, nivel: --nivelAtual });
    return trilha;
  }, [lista, classica]);

  // animação do caminho: a cada passo a busca anda uma casa
  const busca = usePassoAPasso(trilha.length, `${ano}:${nivelMinimo}`, { intervalo: 420 });
  // a truncada termina quando a trilha desce abaixo do nível mínimo
  const parada = trilha.findIndex((t) => t.nivel < nivelMinimo);
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

  const saltos: Salto[] = [];
  const noK = lista.porPosicao(k - 1, saltos);
  // animação dos saltos: aparecem um por um, com a soma das larguras crescendo
  const pulos = usePassoAPasso(saltos.length, k, { intervalo: 700 });
  const somaAteAgora = saltos.slice(0, pulos.passo).reduce((total, s) => total + s.largura, 0);

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

          <ListaPontas
            lista={lista}
            trilha={trilha}
            passo={busca.passo}
            nivelMinimo={nivelMinimo}
            resultadoClassica={classica.no}
            resultadoTruncada={truncada.no}
            classicaPronta={busca.terminou}
            truncadaPronta={truncadaPronta}
          />
          <p className="legenda-caminho">
            <span className="amostra comum" /> caminho até o nível {nivelMinimo} (as duas buscas)
            <span className="amostra so-classica" /> o que só a clássica percorre
            <span className="amostra alvo-classica" /> resultado da clássica
            <span className="amostra alvo-truncada" /> resultado da truncada
          </p>
          <p className="dica">
            A lista vai da cabeça ao fim. Aparecem os 10 primeiros filmes, os filmes em que a busca
            pisou, os dois resultados e os 10 últimos; cada reticência diz quantos filmes ficaram escondidos ali. Cada
            coluna é um filme e a altura é a torre dele. A seta contínua é um ponteiro direto entre
            dois filmes do desenho; a tracejada indica que há filmes escondidos no caminho.
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
          <ControlesPasso
            anim={pulos}
            texto={
              pulos.terminou
                ? undefined
                : `já pulou ${numero(somaAteAgora)} filmes; faltam ${numero(k - somaAteAgora)} para chegar ao filme ${numero(k)}`
            }
          />
          <p className="soma">
            {saltos.slice(0, pulos.passo).map((s, i) => (
              <span key={i} title={`salto no nível ${s.nivel}`}>
                {numero(s.largura)}
                <small>nível {s.nivel}</small>
              </span>
            ))}
            <b>= {numero(somaAteAgora)}</b>
          </p>
          <div className="numeros">
            <Numero valor={numero(k)} rotulo="passos andando pelo nível 0" />
            <Numero valor={String(pulos.passo)} rotulo="saltos somando as larguras" destaque />
            {pulos.terminou ? (
              <NumeroFilme valor={String(noK?.valor.ano ?? "")} rotulo={`“${noK?.valor.titulo ?? ""}”`} filme={noK?.valor} />
            ) : (
              <Numero valor="…" rotulo="o filme aparece no último salto" />
            )}
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
  // pedaços da árvore antes e depois de cada passo, para a animação das rotações
  quadros: QuadroSplay<Filme>[];
}

const EXPLICA_PASSO: Record<PassoSplay, string> = {
  zig: "o pai é a raiz: uma rotação simples sobe o nó um nível",
  "zig-zig": "nó e pai do mesmo lado: gira primeiro o pai, depois o nó; o nó sobe dois níveis",
  "zig-zag": "nó e pai em lados opostos: gira o nó duas vezes; o nó sobe dois níveis",
};

// Mostra o afunilamento passo a passo: para cada rotação, o pedaço da árvore em volta
// do nó antes e depois dela. Os pôsteres deslizam para as posições novas.
function RotacoesPassoAPasso({ ultimo }: { ultimo: Afunilamento }) {
  const { quadros } = ultimo;
  // passo 0 mostra o primeiro quadro; cada clique avança uma rotação
  const anim = usePassoAPasso(Math.max(0, quadros.length - 1), ultimo, { intervalo: 1100 });
  if (quadros.length === 0) return null;
  const quadro = quadros[Math.min(anim.passo, quadros.length - 1)];
  const totalPassos = ultimo.operacao.passos.length;
  const fundo = quadros[0].profundidade; // de onde o nó começou a subir
  const nos: NoDesenho[] = quadro.nos.map((n) => ({
    filme: n.valor,
    nivel: n.nivel,
    indice: n.indice,
    papel: n.papel,
  }));

  return (
    <div className="rotacoes">
      <h4>Rotações passo a passo</h4>
      <ControlesPasso anim={anim} />
      <p className="legenda-rotacao">
        <b>
          Passo {quadro.numeroPasso} de {totalPassos} · {quadro.passo}
        </b>
        <span className="acao">{quadro.momento === "antes" ? "antes das rotações deste passo" : quadro.acao}</span>
        <span>{EXPLICA_PASSO[quadro.passo]}</span>
      </p>
      <div className="rotacoes-palco">
        <div className="regua" title="profundidade do nó que está subindo">
          <span>raiz</span>
          <div className="trilho">
            {Array.from({ length: fundo + 1 }, (_, d) => (
              <i
                key={d}
                className={d === quadro.profundidade ? "atual" : d > quadro.profundidade ? "subiu" : ""}
                style={{ top: `${(d / Math.max(1, fundo)) * 100}%` }}
              />
            ))}
            <b style={{ top: `${(quadro.profundidade / Math.max(1, fundo)) * 100}%` }}>
              {quadro.profundidade}
            </b>
          </div>
          <span>{fundo}</span>
        </div>
        <ArvoreAnimada nos={nos} niveis={4} passo={96} girou={quadro.girou} />
      </div>
      <p className="legenda-caminho">
        <span className="amostra linha-no" /> ligação do nó
        <span className="amostra linha-pai" /> pai com o avô
        <span className="amostra linha-girou" /> ligação que acabou de girar
      </p>
      <p className="dica">
        À esquerda, a régua mostra a profundidade do nó: ele começa lá embaixo e sobe a cada
        rotação até a raiz. O desenho mostra só o pedaço da árvore em volta dele. A animação
        repete o que a árvore já fez; ela não mexe na árvore de novo.
      </p>
    </div>
  );
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
    // liga a gravação dos quadros só durante este afunilamento
    arvore.gravarQuadros = true;
    const operacao = aoAfunilar(filme);
    arvore.gravarQuadros = false;
    setUltimo({
      filme,
      operacao,
      antes,
      depois: fotografar(arvore, NIVEIS_ARVORE),
      quadros: arvore.quadros,
    });
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
          titulo="4 · Consulta por prefixo sem afunilar"
          classico="toda busca afunila o nó encontrado."
          nosso="o autocompletar desce até a primeira chave ≥ prefixo e anda pelos sucessores em ordem, sem mexer na árvore. Só abrir um filme afunila."
          codigo="ArvoreSplay.ts · aPartirDe(inicio, continuar, limite)"
        />
        <Modificacao
          titulo="5 · Várias chaves por filme"
          classico="uma chave por registro."
          nosso="cada filme entra com o título completo e com os finais do título (“the dark knight”, “dark knight”, “knight”), todos apontando para o mesmo filme."
          codigo="dados.ts · chavesDoFilme()"
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
              <RotacoesPassoAPasso ultimo={ultimo} />
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
