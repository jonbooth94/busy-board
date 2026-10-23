import { type Art, P, hitRect, play, q } from './types';

export const lever: Art<'lever'> = {
  markup: () => `
    ${hitRect(26, 26, 160, 162)}
    <path d="M106 72 L166 136" fill="none" stroke-width="10"/>
    <path d="M106 72 L166 136" fill="none" stroke="${P.wood}" stroke-width="4"/>
    <path d="M98 66 H118" fill="none" stroke-width="8"/>
    <g class="cup">
      <path d="M142 146 L148 184 H178 L184 146 Z" fill="${P.mustard}"/>
    </g>
    <g class="ball"><circle cx="112" cy="54" r="11" fill="${P.plum}"/><circle cx="108" cy="50" r="3" fill="#fff" fill-opacity="0.6" stroke="none"/></g>
    <g class="arm">
      <rect x="59" y="62" width="12" height="90" rx="6" fill="${P.cream}"/>
      <circle cx="65" cy="56" r="18" fill="${P.terracotta}"/>
      <circle cx="59" cy="50" r="5" fill="#fff" fill-opacity="0.45" stroke="none"/>
    </g>
    <rect x="30" y="150" width="72" height="36" rx="9" fill="${P.terracottaDark}"/>
    <circle cx="65" cy="152" r="9" fill="${P.cream}"/>`,
  mount(svg) {
    const arm = q(svg, '.arm');
    const ball = q(svg, '.ball');
    const cup = q(svg, '.cup');
    return {
      anims: {
        pull() {
          play(arm, [
            { transform: 'rotate(-18deg)' },
            { transform: 'rotate(62deg)', offset: 0.17 },
            { transform: 'rotate(62deg)', offset: 0.6 },
            { transform: 'rotate(-28deg)', offset: 0.74 },
            { transform: 'rotate(-14deg)', offset: 0.84 },
            { transform: 'rotate(-18deg)' },
          ], 1500);
          play(ball, [
            { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
            { transform: 'translate(0, 0) rotate(0deg)', opacity: 1, offset: 0.14, easing: 'ease-in' },
            { transform: 'translate(52px, 66px) rotate(300deg)', opacity: 1, offset: 0.5, easing: 'ease-in' },
            { transform: 'translate(52px, 104px) rotate(330deg)', opacity: 1, offset: 0.57 },
            { transform: 'translate(52px, 98px) rotate(330deg)', opacity: 1, offset: 0.63 },
            { transform: 'translate(52px, 104px) rotate(330deg)', opacity: 1, offset: 0.68 },
            { transform: 'translate(52px, 104px) rotate(330deg)', opacity: 0, offset: 0.82 },
            { transform: 'translate(0, -20px)', opacity: 0, offset: 0.86 },
            { transform: 'translate(0, 0)', opacity: 1 },
          ], 1500, { easing: 'linear' });
          play(cup, [
            { transform: 'none' },
            { transform: 'none', offset: 0.56 },
            { transform: 'scaleY(0.9) translateY(4px)', offset: 0.62 },
            { transform: 'none', offset: 0.72 },
            { transform: 'none' },
          ], 1500);
        },
      },
    };
  },
};
