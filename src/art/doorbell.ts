import { type Art, P, hitRect, play, q } from './types';

// The recurring animal friend: Bear peeks out of the door.
const bear = `
  <g class="bear">
    <circle cx="76" cy="96" r="10" fill="${P.woodDark}"/>
    <circle cx="112" cy="96" r="10" fill="${P.woodDark}"/>
    <circle cx="94" cy="118" r="27" fill="${P.wood}"/>
    <ellipse cx="94" cy="128" rx="12" ry="9" fill="${P.cream}"/>
    <path d="M90 125 h8" stroke-width="6"/>
    <circle cx="84" cy="113" r="3.5" fill="${P.ink}" stroke="none"/>
    <circle cx="104" cy="113" r="3.5" fill="${P.ink}" stroke="none"/>
    <path d="M89 133 Q94 137 99 133" fill="none" stroke-width="3.5"/>
  </g>`;

export const doorbell: Art<'doorbell'> = {
  markup: (uid) => `
    ${hitRect(30, 14, 140, 174)}
    <defs><clipPath id="doorway-${uid}"><rect x="62" y="72" width="64" height="108" rx="4"/></clipPath></defs>
    <path d="M28 52 L100 16 L172 52 Z" fill="${P.terracottaDark}"/>
    <rect x="38" y="50" width="124" height="138" rx="10" fill="${P.terracotta}"/>
    <rect x="62" y="72" width="64" height="108" rx="4" fill="${P.shadow}"/>
    <g clip-path="url(#doorway-${uid})">${bear}</g>
    <g class="door">
      <rect x="62" y="72" width="64" height="108" rx="4" fill="${P.wood}"/>
      <rect x="72" y="84" width="44" height="34" rx="4" fill="none" stroke-width="3.5"/>
      <rect x="72" y="128" width="44" height="40" rx="4" fill="none" stroke-width="3.5"/>
      <circle cx="116" cy="124" r="5" fill="${P.mustard}"/>
    </g>
    <circle cx="146" cy="104" r="12" fill="${P.cream}"/>
    <circle class="bell" cx="146" cy="104" r="7" fill="${P.mustard}"/>`,
  mount(svg) {
    const door = q(svg, '.door');
    const bearEl = q(svg, '.bear');
    const bell = q(svg, '.bell');
    return {
      anims: {
        peek() {
          play(bell, [{ transform: 'scale(1)' }, { transform: 'scale(0.7)', offset: 0.4 }, { transform: 'scale(1)' }], 260);
          play(door, [
            { transform: 'scaleX(1)' },
            { transform: 'scaleX(0.12)', offset: 0.18 },
            { transform: 'scaleX(0.12)', offset: 0.82 },
            { transform: 'scaleX(1)' },
          ], 1900, { easing: 'ease-in-out' });
          play(bearEl, [
            { transform: 'translateY(70px)' },
            { transform: 'translateY(70px)', offset: 0.14 },
            { transform: 'translateY(-4px) rotate(0deg)', offset: 0.32 },
            { transform: 'translateY(0) rotate(-8deg)', offset: 0.45 },
            { transform: 'translateY(0) rotate(8deg)', offset: 0.6 },
            { transform: 'translateY(0) rotate(0deg)', offset: 0.68 },
            { transform: 'translateY(70px)', offset: 0.84 },
            { transform: 'translateY(70px)' },
          ], 1900);
        },
      },
    };
  },
};
