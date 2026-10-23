import { type Art, P, hitRect, noteShape, play, q, spawn } from './types';

const KEYS = [
  { id: 'c', x: 22, fill: P.terracotta },
  { id: 'e', x: 76, fill: P.mustard },
  { id: 'g', x: 130, fill: P.blue },
] as const;
const W = 48;

export const threeKeys: Art<'three-keys'> = {
  markup: () => `
    ${hitRect(12, 40, 176, 148)}
    ${KEYS.map((k) => `<g class="note-${k.id} template" display="none" transform="translate(${k.x + W / 2} 50)">${noteShape(k.fill)}</g>`).join('')}
    <rect x="12" y="62" width="176" height="126" rx="16" fill="${P.sage}"/>
    ${KEYS.map(
      (k) => `<g class="key key-${k.id}">
        <rect x="${k.x}" y="54" width="${W}" height="122" rx="12" fill="${k.fill}"/>
        <rect x="${k.x + 10}" y="64" width="${W - 20}" height="10" rx="5" fill="#fff" fill-opacity="0.4" stroke="none"/>
      </g>`,
    ).join('')}`,
  mount(svg) {
    const press = (id: string) => {
      const key = q(svg, `.key-${id}`);
      const note = q<SVGElement>(svg, `.note-${id}`);
      return () => {
        play(key, [{ transform: 'none' }, { transform: 'translateY(6px) scaleY(0.96)', offset: 0.3 }, { transform: 'none' }], 240);
        spawn(note, [
          { transform: 'translate(0, 6px) scale(0.6)', opacity: 0 },
          { transform: 'translate(0, -8px) scale(1)', opacity: 1, offset: 0.25 },
          { transform: 'translate(10px, -50px) scale(1)', opacity: 0 },
        ], 800);
      };
    };
    return {
      zoneAt(x) {
        if (x < 72) return 'c';
        if (x < 126) return 'e';
        return 'g';
      },
      anims: { press_c: press('c'), press_e: press('e'), press_g: press('g') },
    };
  },
};
