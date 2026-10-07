import { RefObject, useLayoutEffect, useRef } from "react";

/**
 * Anima a troca de posição dos filhos de uma lista (marcados com data-flip)
 * sempre que `gatilho` muda. É o que deixa visível a movimentação ao início.
 */
export function useFlip(ref: RefObject<HTMLElement>, gatilho: unknown): void {
  const anteriores = useRef(new Map<string, [number, number]>());

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const atuais = new Map<string, [number, number]>();
    for (const filho of Array.from(el.children) as HTMLElement[]) {
      const id = filho.dataset.flip;
      if (!id) continue;
      const x = filho.offsetLeft;
      const y = filho.offsetTop;
      atuais.set(id, [x, y]);
      const antes = anteriores.current.get(id);
      if (antes && (antes[0] !== x || antes[1] !== y)) {
        filho.animate(
          [{ transform: `translate(${antes[0] - x}px, ${antes[1] - y}px)` }, { transform: "none" }],
          { duration: 480, easing: "cubic-bezier(.2,.8,.2,1)" },
        );
      }
    }
    anteriores.current = atuais;
  }, [ref, gatilho]);
}
