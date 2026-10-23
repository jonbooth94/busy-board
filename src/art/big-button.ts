import { type Art, P, hitRect, play, q, spawn } from './types';

export const bigButton: Art<'big-button'> = {
  markup: () => `
    ${hitRect(30, 70, 140, 110)}
    <circle class="bubble template" display="none" cx="100" cy="78" r="15" fill="#fff" fill-opacity="0.55" stroke-width="4"/>
    <ellipse cx="100" cy="152" rx="74" ry="28" fill="${P.woodDark}"/>
    <g class="btn">
      <path d="M40 116 V140 A60 24 0 0 0 160 140 V116 Z" fill="${P.terracottaDark}"/>
      <ellipse cx="100" cy="116" rx="60" ry="24" fill="${P.terracotta}"/>
      <ellipse cx="80" cy="109" rx="18" ry="6" fill="#fff" fill-opacity="0.45" stroke="none"/>
    </g>`,
  mount(svg) {
    const btn = q(svg, '.btn');
    const bubble = q<SVGElement>(svg, '.bubble');
    return {
      anims: {
        squish() {
          play(btn, [{ transform: 'none' }, { transform: 'translateY(12px) scaleY(0.82)', offset: 0.35 }, { transform: 'none' }], 340);
          spawn(
            bubble,
            [
              { transform: 'translateY(10px) scale(0.4)', opacity: 0 },
              { transform: 'translateY(-10px) scale(0.9)', opacity: 1, offset: 0.2 },
              { transform: 'translate(8px, -90px) scale(1.1)', opacity: 1, offset: 0.92 },
              { transform: 'translate(8px, -96px) scale(1.5)', opacity: 0 },
            ],
            1250,
            { easing: 'ease-out' },
          );
        },
      },
    };
  },
};
