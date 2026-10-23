import { type Art, P, hitRect, play, q } from './types';

// Pose lives in CSS (style.css): [data-sprite="zip_open"] slides the pull right and folds the flap away.
const flower = `
  <g class="flower">
    <path d="M100 150 V176" fill="none" stroke="${P.sageDark}" stroke-width="6"/>
    <path d="M100 166 Q86 158 82 168 Q92 174 100 166" fill="${P.sage}" stroke-width="3.5"/>
    ${[0, 72, 144, 216, 288].map((a) => `<circle cx="${100 + 18 * Math.sin((a * Math.PI) / 180)}" cy="${128 - 18 * Math.cos((a * Math.PI) / 180)}" r="13" fill="${P.terracotta}" stroke-width="3.5"/>`).join('')}
    <circle cx="100" cy="128" r="12" fill="${P.mustard}" stroke-width="3.5"/>
    <circle cx="96" cy="126" r="2" fill="${P.ink}" stroke="none"/>
    <circle cx="104" cy="126" r="2" fill="${P.ink}" stroke="none"/>
    <path d="M96 132 Q100 135 104 132" fill="none" stroke-width="2.5"/>
  </g>`;

export const zipper: Art<'zipper'> = {
  markup: () => `
    ${hitRect(18, 46, 164, 140)}
    <rect class="pouch" x="18" y="56" width="164" height="130" rx="18" fill="${P.mustard}"/>
    <rect x="32" y="80" width="136" height="96" rx="8" fill="${P.cream}"/>
    ${flower}
    <rect class="flap" x="32" y="80" width="136" height="96" rx="8" fill="${P.mustardDark}"/>
    <path d="M32 80 H168" fill="none" stroke-width="7" stroke-dasharray="3 4"/>
    <g class="pull">
      <rect x="24" y="72" width="18" height="16" rx="4" fill="${P.cream}"/>
      <path d="M33 88 V96" fill="none" stroke-width="4"/>
      <circle cx="33" cy="104" r="10" fill="${P.terracotta}"/>
    </g>`,
  mount(svg) {
    const body = q(svg, '.pouch');
    const flowerEl = q(svg, '.flower');
    return {
      anims: {
        reveal() {
          play(flowerEl, [{ transform: 'scale(0.7)' }, { transform: 'scale(0.7)', offset: 0.4 }, { transform: 'scale(1.12) rotate(6deg)', offset: 0.75 }, { transform: 'none' }], 700);
        },
        jiggle() {
          play(body, [{ transform: 'none' }, { transform: 'scaleX(1.03)', offset: 0.6 }, { transform: 'none' }], 420);
        },
      },
    };
  },
};
