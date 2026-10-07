import { numero } from "../App";
import { Acervo, Filme } from "../dados";
import { DesenhoArvore, fotografar } from "./DesenhoArvore";

interface Props {
  acervo: Acervo;
  aberta: boolean;
  aoAbrirFilme: (filme: Filme) => void;
  aoAlternar: () => void;
}

const NIVEIS = 3;

/**
 * Lateral do catálogo: os filmes que estão no topo da árvore afunilada.
 * Fica recolhida até o clique na aba da borda direita.
 */
export function PainelEstruturas({ acervo, aberta, aoAbrirFilme, aoAlternar }: Props) {
  return (
    <>
      {!aberta && (
        <button className="aba-lateral" onClick={aoAlternar} title="Mostrar o topo da árvore">
          <i>‹</i> Topo da árvore
        </button>
      )}
      <aside className="painel" aria-hidden={!aberta}>
        <div className="secao-titulo">
          <h2>Topo da árvore</h2>
          <span>árvore afunilada · o último filme aberto é a raiz</span>
          <button className="recolher" onClick={aoAlternar} title="Recolher" aria-label="Recolher">
            ›
          </button>
        </div>
        {/* Recolhida, a lateral não desenha a árvore (nem pede os pôsteres). */}
        {aberta && (
          <>
            <DesenhoArvore
              nos={fotografar(acervo.titulos, NIVEIS)}
              niveis={NIVEIS}
              passo={104}
              aoClicar={aoAbrirFilme}
            />
            <p className="nota">
              {numero(acervo.titulos.tamanho)} chaves · altura atual {acervo.titulos.altura()}.
              Cada filme aberto é afunilado até a raiz; clique em um pôster para abri-lo.
            </p>
            <p className="nota">
              Estruturas montadas em {Math.round(acervo.tempoMontagemMs)} ms. Os detalhes de cada
              operação estão na tela “Estruturas”.
            </p>
          </>
        )}
      </aside>
    </>
  );
}
