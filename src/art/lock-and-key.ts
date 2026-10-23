import { type Art, P, hitRect, play, q, spawn } from './types';

// Pose lives in CSS (style.css): opening turns the key first, then lifts the shackle;
// closing drops the shackle first, then turns the key back.
export const lockAndKey: Art<'lock-and-key'> = {
  markup: () => `
    ${hitRect(44, 28, 112, 158)}
    <path class="star template" display="none" d="M0 -10 L3 -3 L10 0 L3 3 L0 10 L-3 3 L-10 0 L-3 -3 Z" fill="${P.mustard}" stroke-width="3"/>
    <g class="shackle">
      <path d="M72 104 V72 A28 28 0 0 1 128 72 V104" fill="none" stroke-width="20"/>
      <path d="M72 104 V72 A28 28 0 0 1 128 72 V104" fill="none" stroke="${P.cream}" stroke-width="10"/>
    </g>
    <g class="body">
      <rect x="50" y="96" width="100" height="84" rx="16" fill="${P.mustard}"/>
      <rect x="62" y="106" width="76" height="8" rx="4" fill="#fff" fill-opacity="0.35" stroke="none"/>
    </g>
    <g class="key">
      <rect x="95" y="128" width="10" height="20" rx="3" fill="${P.shadow}"/>
      <ellipse cx="100" cy="146" rx="15" ry="22" fill="${P.terracotta}"/>
      <circle cx="100" cy="140" r="5" fill="${P.mustard}"/>
    </g>`,
  mount(svg) {
    const body = q(svg, '.body');
    const star = q<SVGElement>(svg, '.star');
    return {
      anims: {
        sparkle() {
          [[60, 50], [140, 46], [150, 88]].forEach(([x, y], i) =>
            spawn(star, [
              { transform: `translate(${x}px, ${y}px) scale(0)`, opacity: 1 },
              { transform: `translate(${x}px, ${y}px) scale(1.1) rotate(45deg)`, opacity: 1, offset: 0.5 },
              { transform: `translate(${x}px, ${y}px) scale(0) rotate(90deg)`, opacity: 0 },
            ], 450, { delay: 300 + i * 70 }),
          );
        },
        settle() {
          play(body, [{ transform: 'none' }, { transform: 'translateY(3px)', offset: 0.6 }, { transform: 'none' }], 300, { delay: 250 });
        },
      },
    };
  },
};
