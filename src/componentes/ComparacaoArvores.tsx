import { useState } from "react";
import { numero } from "../App";
import { Comparacao, SEMENTE_PADRAO, compararArvores } from "../comparacao";
import { Filme } from "../dados";
import { ArvoreSplay } from "../estruturas/ArvoreSplay";

const media = (n: number) => n.toFixed(1).replace(".", ",");

function Barra(props: { rotulo: string; valor: number; maximo: number; vence: boolean }) {
  return (
    <div className={`medida ${props.vence ? "vence" : ""}`}>
      <span>{props.rotulo}</span>
      <i style={{ width: `${(props.valor / props.maximo) * 100}%` }} />
      <b>{media(props.valor)}</b>
    </div>
  );
}

/** Roda os mesmos acessos na árvore afunilada e em uma AVL e mostra as comparações. */
export function ComparacaoArvores({ arvore }: { arvore: ArvoreSplay<string, Filme> }) {
  const [resultado, setResultado] = useState<Comparacao | null>(null);
  const [rodando, setRodando] = useState(false);

  // semente padrão: sempre o mesmo resultado; outra semente: outro sorteio de buscas
  function rodar(semente: number) {
    setRodando(true);
    // O intervalo deixa o aviso "montando" aparecer antes do cálculo, que trava a tela.
    setTimeout(() => {
      setResultado(compararArvores(arvore, semente));
      setRodando(false);
    }, 40);
  }

  const outroSorteio = () => rodar(1 + Math.floor(Math.random() * 1_000_000));

  // No cenário do filme repetido, vence quem somar menos comparações.
  const somar = (serie: number[] = []) => serie.reduce((total, n) => total + n, 0);
  const somaAVL = somar(resultado?.repetido.avl);
  const somaAfunilada = somar(resultado?.repetido.afunilada);

  return (
    <>
      <p className="dica">
        A AVL não é usada pelo catálogo. Ela entra aqui só como referência: as duas árvores
        recebem as mesmas chaves e respondem às mesmas buscas, e contamos as comparações de cada
        uma. O teste roda em cópias, sem mexer na árvore do catálogo.
      </p>
      <div className="acoes-comparacao">
        <button className="botao primario" onClick={() => rodar(SEMENTE_PADRAO)} disabled={rodando}>
          {rodando ? "Montando as duas árvores…" : "Rodar comparação"}
        </button>
        <button className="botao" onClick={outroSorteio} disabled={rodando}>
          Rodar com outro sorteio
        </button>
        {resultado && (
          <span className="sorteio">
            {resultado.semente === SEMENTE_PADRAO
              ? "sorteio padrão (sempre o mesmo resultado)"
              : `sorteio nº ${numero(resultado.semente)}`}
          </span>
        )}
      </div>

      {resultado && (
        <>
          <div className="numeros">
            <div className="numero">
              <strong>{numero(resultado.chaves)}</strong>
              <span>chaves em cada árvore</span>
            </div>
            <div className="numero">
              <strong>{resultado.alturaAVL}</strong>
              <span>altura da AVL (balanceada por construção)</span>
            </div>
            <div className="numero">
              <strong>{resultado.alturaAfunilada}</strong>
              <span>altura da afunilada ao final (sem garantia)</span>
            </div>
          </div>

          <div className="cenarios">
            {resultado.cenarios.map((c) => {
              const maximo = Math.max(c.avl, c.afunilada);
              return (
                <div key={c.nome} className="cenario">
                  <h4>{c.nome}</h4>
                  <p>{c.descricao}. Média de comparações por busca:</p>
                  <Barra rotulo="AVL" valor={c.avl} maximo={maximo} vence={c.avl < c.afunilada} />
                  <Barra
                    rotulo="Afunilada"
                    valor={c.afunilada}
                    maximo={maximo}
                    vence={c.afunilada < c.avl}
                  />
                </div>
              );
            })}
            <div className="cenario">
              <h4>O mesmo filme {resultado.repetido.avl.length} vezes seguidas</h4>
              <p>“{resultado.repetido.filme.titulo}”. Comparações em cada busca:</p>
              <div className={`serie ${somaAVL < somaAfunilada ? "vence" : ""}`}>
                <span>AVL</span>
                {resultado.repetido.avl.map((n, i) => (
                  <b key={i}>{n}</b>
                ))}
              </div>
              <div className={`serie ${somaAfunilada < somaAVL ? "vence" : ""}`}>
                <span>Afunilada</span>
                {resultado.repetido.afunilada.map((n, i) => (
                  <b key={i}>{n}</b>
                ))}
              </div>
            </div>
          </div>

          <p className="dica">
            A AVL garante altura logarítmica e custa quase o mesmo em qualquer busca. A afunilada
            não garante a altura, mas se adapta ao uso: o que foi acessado há pouco fica perto da
            raiz. Montagem e buscas levaram {numero(Math.round(resultado.tempoMs))} ms.
          </p>
        </>
      )}
    </>
  );
}
