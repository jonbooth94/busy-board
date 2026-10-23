import { type Art, P, hitRect, noteShape, play, q, spawn } from './types';

// Eight zones along the tube, low on the left to high on the right.
const X0 = 34;
const X1 = 174;
const ZONES = 8;
const zoneWidth = (X1 - X0) / ZONES;
const zoneCenter = (i: number) => X0 + (i + 0.5) * zoneWidth;

export const slideWhistle: Art<'slide-whistle'> = {
  markup: () => `
    ${hitRect(8, 60, 186, 92)}
    <g class="note template" display="none" transform="translate(30 70)">${noteShape(P.sage)}</g>
    <rect x="8" y="94" width="26" height="30" rx="8" fill="${P.cream}"/>
    <rect class="tube" x="24" y="90" width="166" height="38" rx="19" fill="${P.sage}"/>
    <rect x="40" y="90" width="16" height="10" rx="3" fill="${P.shadow}"/>
    <path d="M${X0 + 6} 136 H${X1 - 6}" fill="none" stroke-width="3" stroke-dasharray="1 ${(zoneWidth - 1).toFixed(2)}" stroke-opacity="0.5"/>
    <g class="handle">
      <rect x="${zoneCenter(0) - 12}" y="78" width="24" height="62" rx="12" fill="${P.mustard}"/>
      <circle cx="${zoneCenter(0)}" cy="88" r="4" fill="#fff" fill-opacity="0.5" stroke="none"/>
    </g>`,
  mount(svg) {
    const handle = q(svg, '.handle');
    const note = q<SVGElement>(svg, '.note');
    return {
      zoneAt(x) {
        const i = Math.min(ZONES - 1, Math.max(0, Math.floor((x - X0) / zoneWidth)));
        return String(i + 1);
      },
      sprite(name) {
        const i = Number(name.replace('handle_', '')) - 1;
        if (i >= 0) handle.style.transform = `translateX(${(zoneCenter(i) - zoneCenter(0)).toFixed(1)}px)`;
      },
      anims: {
        note() {
          play(q(svg, '.tube'), [{ transform: 'none' }, { transform: 'scaleY(1.04)', offset: 0.4 }, { transform: 'none' }], 200);
          spawn(note, [
            { transform: 'translate(0, 6px) scale(0.6)', opacity: 0 },
            { transform: 'translate(-4px, -6px) scale(1)', opacity: 1, offset: 0.25 },
            { transform: 'translate(-14px, -40px) scale(1)', opacity: 0 },
          ], 700);
        },
      },
    };
  },
};
