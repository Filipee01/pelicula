import { useEffect, useState } from "react";

// Controle das animações "passo a passo" da tela Estruturas.
// A operação já foi feita pela estrutura; aqui só repetimos os passos dela devagar.
// Por padrão mostra o estado final (passo = total), igual à tela sem animação.

export interface Animacao {
  passo: number;
  total: number;
  tocando: boolean;
  terminou: boolean;
  reproduzir: () => void;
  pausar: () => void;
  proximo: () => void;
  recomecar: () => void;
}

// chave: muda quando a operação muda (outro ano, outro nível...), e aí a animação reinicia.
// tocarAoMudar: começa a tocar sozinha quando a chave muda (usado na lista de gêneros).
export function usePassoAPasso(
  total: number,
  chave: unknown,
  { intervalo = 600, tocarAoMudar = false }: { intervalo?: number; tocarAoMudar?: boolean } = {},
): Animacao {
  const [passo, setPasso] = useState(total);
  const [tocando, setTocando] = useState(false);

  useEffect(() => {
    if (tocarAoMudar) {
      setPasso(0);
      setTocando(true);
    } else {
      setPasso(total);
      setTocando(false);
    }
    // só reinicia quando a operação muda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  useEffect(() => {
    if (!tocando) return;
    if (passo >= total) {
      setTocando(false);
      return;
    }
    const t = setTimeout(() => setPasso((p) => p + 1), intervalo);
    return () => clearTimeout(t);
  }, [tocando, passo, total, intervalo]);

  return {
    passo: Math.min(passo, total),
    total,
    tocando,
    terminou: passo >= total,
    reproduzir: () => {
      setPasso((p) => (p >= total ? 0 : p));
      setTocando(true);
    },
    pausar: () => setTocando(false),
    proximo: () => {
      setTocando(false);
      setPasso((p) => (p >= total ? 1 : p + 1));
    },
    recomecar: () => {
      setTocando(false);
      setPasso(0);
    },
  };
}

export function ControlesPasso({ anim, texto }: { anim: Animacao; texto?: string }) {
  return (
    <div className="controles-passo">
      <button className="botao primario" onClick={anim.tocando ? anim.pausar : anim.reproduzir}>
        {anim.tocando ? "❚❚ Pausar" : "▶ Reproduzir"}
      </button>
      <button className="botao" onClick={anim.proximo}>
        Próximo passo
      </button>
      <button className="botao" onClick={anim.recomecar}>
        ↺ Recomeçar
      </button>
      <span className="contador">
        passo {anim.passo} de {anim.total}
      </span>
      {texto && <span className="explica">{texto}</span>}
    </div>
  );
}
