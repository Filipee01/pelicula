import { useEffect, useMemo, useRef, useState } from "react";
import { Filme, urlPoster } from "../dados";
import { NoDesenho } from "./DesenhoArvore";

// Desenho da árvore usado na animação das rotações. Quando o quadro muda, cada pôster
// e cada linha deslizam da posição antiga para a nova, em vez de pular.

const NOME_PAPEL = { no: "nó", pai: "pai", avo: "avô" };
const DURACAO = 750; // ms de cada deslizamento

interface Ponto {
  x: number; // em % da largura
  y: number; // em px
}

interface Props {
  nos: NoDesenho[];
  niveis: number;
  // distância vertical entre os níveis, em px
  passo: number;
  // a ligação que acabou de girar, para destacar
  girou: [Filme, Filme] | null;
}

export function ArvoreAnimada({ nos, niveis, passo, girou }: Props) {
  // chave por filme: o mesmo pôster é reaproveitado e desliza até a posição nova
  const itens = useMemo(() => {
    const vezes = new Map<number, number>();
    return nos.map((n) => {
      const k = (vezes.get(n.filme.id) ?? 0) + 1;
      vezes.set(n.filme.id, k);
      const alvo: Ponto = { x: ((n.indice + 0.5) / 2 ** n.nivel) * 100, y: n.nivel * passo };
      return { ...n, chave: `${n.filme.id}:${k}`, alvo };
    });
  }, [nos, passo]);

  const atual = useRef(new Map<string, Ponto>()); // onde cada pôster está desenhado agora
  const origem = useRef(new Map<string, Ponto>()); // de onde ele está saindo
  const listaAnterior = useRef(itens);
  const inicio = useRef(-DURACAO); // começa parado
  const [, redesenhar] = useState(0);

  // quadro novo: o movimento parte de onde os pôsteres estão desenhados agora
  if (listaAnterior.current !== itens) {
    listaAnterior.current = itens;
    origem.current = new Map(atual.current);
    inicio.current = performance.now();
  }

  // redesenha a cada quadro do navegador enquanto o movimento dura
  useEffect(() => {
    let id = 0;
    const anda = () => {
      redesenhar((n) => n + 1);
      if (performance.now() - inicio.current < DURACAO) id = requestAnimationFrame(anda);
    };
    id = requestAnimationFrame(anda);
    return () => cancelAnimationFrame(id);
  }, [itens]);

  // posição de cada pôster neste instante (desacelera no fim do movimento)
  const t = Math.min(1, (performance.now() - inicio.current) / DURACAO);
  const e = 1 - (1 - t) ** 3;
  const pos = new Map<string, Ponto>();
  for (const it of itens) {
    const de = origem.current.get(it.chave) ?? it.alvo;
    pos.set(it.chave, { x: de.x + (it.alvo.x - de.x) * e, y: de.y + (it.alvo.y - de.y) * e });
  }
  atual.current = pos;

  // ligações: cada nó com o pai dele no desenho
  const porPosicao = new Map(itens.map((it) => [`${it.nivel}:${it.indice}`, it]));
  const ligacoes = itens.flatMap((filho) => {
    if (filho.nivel === 0) return [];
    const pai = porPosicao.get(`${filho.nivel - 1}:${filho.indice >> 1}`);
    if (!pai) return [];
    const papeis = [pai.papel, filho.papel];
    const acabouDeGirar =
      girou !== null &&
      ((pai.filme === girou[0] && filho.filme === girou[1]) || (pai.filme === girou[1] && filho.filme === girou[0]));
    const tipo = acabouDeGirar
      ? "girou"
      : papeis.includes("no") && papeis.some((p) => p && p !== "no")
        ? "liga-no"
        : papeis.includes("pai") && papeis.includes("avo")
          ? "liga-pai"
          : "";
    return [{ chave: `${pai.chave}-${filho.chave}`, de: pos.get(pai.chave)!, para: pos.get(filho.chave)!, tipo }];
  });

  return (
    <div className="arvore animada" style={{ height: passo * niveis }}>
      <svg viewBox={`0 0 100 ${passo * niveis}`} preserveAspectRatio="none">
        {ligacoes.map((l) => (
          <line
            key={l.chave}
            className={l.tipo}
            x1={l.de.x}
            y1={l.de.y + 40}
            x2={l.para.x}
            y2={l.para.y + 20}
          />
        ))}
      </svg>
      {itens.map((it) => {
        const p = pos.get(it.chave)!;
        return (
          <div
            key={it.chave}
            className={`no ${it.papel ? `papel-${it.papel}` : ""}`}
            style={{ left: `${p.x}%`, top: p.y }}
            title={`${it.filme.titulo} (${it.filme.ano})`}
          >
            {it.papel && <em className="papel">{NOME_PAPEL[it.papel]}</em>}
            <img src={urlPoster(it.filme, 92)} alt="" />
            <span>{it.filme.titulo}</span>
          </div>
        );
      })}
    </div>
  );
}
