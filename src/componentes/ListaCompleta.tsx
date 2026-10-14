import { useMemo } from "react";
import { numero } from "../App";
import { Filme, aPartirDoAno } from "../dados";
import { NoSkip, SkipList } from "../estruturas/SkipList";

// Desenho da lista com saltos inteira: a cabeça à esquerda, o fim à direita e uma
// linha para cada nível. Cada risco é um filme, na posição dele na ordem cronológica.
// Por cima vai o caminho da busca, que começa no topo da cabeça.

// posição (começa em 0) de cada nó e, para cada nível, as posições dos nós que chegam nele
export function mapearLista(lista: SkipList<Filme>) {
  const posicao = new Map<NoSkip<Filme>, number>();
  const porNivel: number[][] = Array.from({ length: lista.niveis }, () => []);
  let i = 0;
  for (let x = lista.primeiro(0); x; x = x.prox[0]) {
    posicao.set(x, i);
    for (let n = 0; n < x.altura; n++) porNivel[n].push(i);
    i++;
  }
  return { posicao, porNivel };
}

export interface PontoCaminho {
  pos: number; // -1 é a cabeça
  nivel: number;
}

interface Props {
  lista: SkipList<Filme>;
  porNivel: number[][];
  // o caminho inteiro da busca clássica, casa por casa
  caminho: PontoCaminho[];
  // quantas casas do caminho já foram andadas (para a animação)
  passo: number;
  nivelMinimo: number;
  // posição dos resultados; null enquanto a animação não chegou neles
  alvoClassica: number | null;
  alvoTruncada: number | null;
}

// medidas do desenho (o SVG estica para a largura da tela)
const LARGURA = 1000;
const ESQ = 104; // onde a lista começa, logo depois da cabeça
const DIR = 880; // onde termina, logo antes do fim
const LINHA = 27;
const TOPO = 10;
// acima disso os riscos encostam um no outro, então desenhamos uma barra
const MUITOS = 420;

export function ListaCompleta({ lista, porNivel, caminho, passo, nivelMinimo, alvoClassica, alvoTruncada }: Props) {
  const niveis = lista.niveis;
  const alturaLinhas = niveis * LINHA;
  const y = (n: number) => TOPO + (niveis - 1 - n) * LINHA + LINHA / 2;
  const x = (pos: number) => ESQ + ((pos + 1) / (lista.tamanho + 1)) * (DIR - ESQ);

  // marcações de ano embaixo, para dar noção de onde cada época fica na lista
  const anos = useMemo(() => {
    const primeiro = lista.primeiro(0)?.valor.ano ?? 0;
    const ultimo = lista.porPosicao(lista.tamanho - 1)?.valor.ano ?? 0;
    const passoAnos = ultimo - primeiro > 60 ? 20 : 10;
    const marcas: { ano: number; pos: number }[] = [];
    // só entra a marca que não encosta na anterior nem no nome "cabeça"
    let ultimoX = ESQ + 26;
    for (let a = Math.ceil(primeiro / passoAnos) * passoAnos; a <= ultimo; a += passoAnos) {
      const pos = lista.buscar(aPartirDoAno(a)).posicao;
      const px = ESQ + ((pos + 1) / (lista.tamanho + 1)) * (DIR - ESQ);
      if (px - ultimoX < 44 || px > DIR - 30) continue;
      marcas.push({ ano: a, pos });
      ultimoX = px;
    }
    return marcas;
  }, [lista]);

  // os riscos de cada nível não mudam com a animação, então são calculados uma vez
  const linhas = useMemo(
    () =>
      porNivel.map((posicoes, n) => {
        const meio = TOPO + (niveis - 1 - n) * LINHA + LINHA / 2;
        const px = (pos: number) => ESQ + ((pos + 1) / (lista.tamanho + 1)) * (DIR - ESQ);
        return (
          <g key={n}>
            <text className="rotulo-nivel" x={ESQ - 34} y={meio + 4}>
              nível {n}
            </text>
            {/* o encadeamento do nível: sai da cabeça e vai até o fim */}
            <line className="fio" x1={ESQ - 6} y1={meio} x2={DIR + 6} y2={meio} />
            <path className="seta" d={`M ${DIR + 1} ${meio - 3} L ${DIR + 6} ${meio} L ${DIR + 1} ${meio + 3} Z`} />
            {posicoes.length > MUITOS ? (
              <rect
                className="muitos"
                x={px(posicoes[0])}
                y={meio - 5}
                width={px(posicoes[posicoes.length - 1]) - px(posicoes[0])}
                height={10}
              />
            ) : (
              posicoes.map((pos) => <rect key={pos} className="risco" x={px(pos) - 1} y={meio - 7} width={2} height={14} />)
            )}
            <text className="contagem-nivel" x={DIR + 38} y={meio + 4}>
              {numero(posicoes.length)}
            </text>
          </g>
        );
      }),
    [porNivel, niveis, lista],
  );

  const andado = caminho.slice(0, passo);
  const aqui = andado[andado.length - 1];

  return (
    <svg className="lista-completa" viewBox={`0 0 ${LARGURA} ${TOPO + alturaLinhas + 46}`}>
      {/* a cabeça e o fim atravessam todos os níveis */}
      <rect className="sentinela" x={ESQ - 24} y={TOPO} width={18} height={alturaLinhas} rx={4} />
      <rect className="sentinela" x={DIR + 6} y={TOPO} width={18} height={alturaLinhas} rx={4} />
      <text className="nome-sentinela" x={ESQ - 15} y={TOPO + alturaLinhas + 18}>
        cabeça
      </text>
      <text className="nome-sentinela" x={DIR + 15} y={TOPO + alturaLinhas + 18}>
        fim
      </text>

      {linhas}

      {anos.map((m) => (
        <g key={m.ano}>
          <line className="marca-ano" x1={x(m.pos)} y1={TOPO + alturaLinhas} x2={x(m.pos)} y2={TOPO + alturaLinhas + 5} />
          <text className="ano" x={x(m.pos)} y={TOPO + alturaLinhas + 18}>
            {m.ano}
          </text>
        </g>
      ))}

      {/* o caminho da busca: anda para a direita e desce */}
      {andado.slice(1).map((p, i) => {
        const anterior = andado[i];
        return (
          <line
            key={i}
            className={p.nivel >= nivelMinimo ? "trecho comum" : "trecho so-classica"}
            x1={x(anterior.pos)}
            y1={y(anterior.nivel)}
            x2={x(p.pos)}
            y2={y(p.nivel)}
          />
        );
      })}
      {alvoClassica !== null && <circle className="alvo classica" cx={x(alvoClassica)} cy={y(0)} r={6} />}
      {alvoTruncada !== null && <circle className="alvo truncada" cx={x(alvoTruncada)} cy={y(nivelMinimo)} r={6} />}
      {aqui && passo < caminho.length && <circle className="marcador" cx={x(aqui.pos)} cy={y(aqui.nivel)} r={5} />}
    </svg>
  );
}
