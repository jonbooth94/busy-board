import { type Art, P, hitRect, play, q } from './types';

// Each notch has its own color, shown by a dot around the knob and by the light above it.
const NOTCHES = [
  { sprite: 'light_red', color: P.terracotta },
  { sprite: 'light_yellow', color: '#ecc45a' },
  { sprite: 'light_green', color: P.sage },
  { sprite: 'light_blue', color: P.blue },
] as const;

const CX = 100;
const CY = 130;

export const colorKnob: Art<'color-knob'> = {
  markup: () => `
    ${hitRect(36, 14, 128, 178)}
    <circle class="halo" cx="100" cy="40" r="34" stroke="none" fill-opacity="0.45"/>
    <circle class="light" cx="100" cy="40" r="20"/>
    <rect x="90" y="58" width="20" height="10" rx="3" fill="${P.woodDark}"/>
    <circle cx="${CX}" cy="${CY}" r="60" fill="${P.plum}"/>
    ${NOTCHES.map((n, i) => {
      const a = (i * Math.PI) / 2 - Math.PI / 2;
      return `<circle cx="${CX + 50 * Math.cos(a)}" cy="${CY + 50 * Math.sin(a)}" r="6" fill="${n.color}" stroke-width="3"/>`;
    }).join('')}
    <g class="knob">
      <circle cx="${CX}" cy="${CY}" r="36" fill="${P.cream}"/>
      <circle cx="${CX}" cy="${CY}" r="24" fill="none" stroke-width="3" stroke-opacity="0.4"/>
      <path d="M${CX} ${CY - 6} V${CY - 30}" fill="none" stroke-width="8"/>
    </g>`,
  mount(svg) {
    const knob = q(svg, '.knob');
    const light = q(svg, '.light');
    let index = 0;
    let angle = 0;
    return {
      center: { x: CX, y: CY },
      sprite(name) {
        const next = NOTCHES.findIndex((n) => n.sprite === name);
        if (next < 0) return;
        const diff = (next - index + 4) % 4;
        angle += diff === 3 ? -90 : diff * 90; // turn back if that's the short way
        index = next;
        knob.style.transform = `rotate(${angle}deg)`;
      },
      anims: {
        turn() {
          play(light, [{ transform: 'scale(1)' }, { transform: 'scale(1.15)', offset: 0.4 }, { transform: 'scale(1)' }], 360);
        },
      },
    };
  },
};
