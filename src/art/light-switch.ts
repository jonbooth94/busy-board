import { type Art, P, hitRect, play, q } from './types';

// Pose lives in CSS (style.css): [data-sprite="switch_up"] lights the lamp and raises the nub.
export const lightSwitch: Art<'light-switch'> = {
  markup: () => `
    ${hitRect(50, 14, 100, 174)}
    <circle class="glow" cx="100" cy="46" r="44" fill="#ffe7a3" stroke="none"/>
    <path d="M100 0 V20" fill="none"/>
    <circle class="bulb" cx="100" cy="46" r="24"/>
    <path d="M92 50 Q100 40 108 50" fill="none" stroke-width="4"/>
    <rect x="88" y="68" width="24" height="14" rx="4" fill="${P.woodDark}"/>
    <g class="plate">
      <rect x="64" y="100" width="72" height="88" rx="14" fill="${P.mustard}"/>
      <circle cx="100" cy="110" r="3" fill="${P.ink}" stroke="none"/>
      <circle cx="100" cy="178" r="3" fill="${P.ink}" stroke="none"/>
      <rect x="86" y="118" width="28" height="52" rx="9" fill="${P.shadow}"/>
      <rect class="nub" x="84" y="120" width="32" height="24" rx="8" fill="${P.cream}"/>
    </g>`,
  mount(svg) {
    const plate = q(svg, '.plate');
    const bulb = q(svg, '.bulb');
    const bump = () => play(plate, [{ transform: 'none' }, { transform: 'scale(0.97)', offset: 0.3 }, { transform: 'none' }], 260);
    return {
      anims: {
        lamp_glow() {
          bump();
          play(bulb, [{ transform: 'scale(1)' }, { transform: 'scale(1.12)', offset: 0.4 }, { transform: 'scale(1)' }], 420);
        },
        lamp_dim() {
          bump();
        },
      },
    };
  },
};
