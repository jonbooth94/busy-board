import { type Art, P, hitRect, play, q, rotateAbout } from './types';

const CX = 100;
const CY = 116;
const R = 66;
const SEGMENTS = 8;
const COLORS = [P.terracotta, P.mustard, P.sage, P.blue];
/** Speed is proportional to time left, so the wheel slows smoothly and stops exactly at the end.
 *  With a 2.4 s run this gives about two turns. */
const SPEED_PER_MS_LEFT = 0.00025; // degrees per ms, per ms remaining

function wedge(i: number): string {
  const a0 = (i / SEGMENTS) * 2 * Math.PI;
  const a1 = ((i + 1) / SEGMENTS) * 2 * Math.PI;
  const x0 = CX + R * Math.cos(a0);
  const y0 = CY + R * Math.sin(a0);
  const x1 = CX + R * Math.cos(a1);
  const y1 = CY + R * Math.sin(a1);
  return `<path d="M${CX} ${CY} L${x0.toFixed(1)} ${y0.toFixed(1)} A${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z" fill="${COLORS[i % COLORS.length]}" stroke-width="4"/>`;
}

export const spinnerWheel: Art<'spinner-wheel'> = {
  markup: () => `
    ${hitRect(30, 30, 140, 160)}
    <path d="M72 190 L100 ${CY} L128 190" fill="none" stroke-width="10"/>
    <path d="M72 190 L100 ${CY} L128 190" fill="none" stroke="${P.woodDark}" stroke-width="4"/>
    <g class="wheel spin">
      <circle cx="${CX}" cy="${CY}" r="${R}" fill="${P.cream}"/>
      ${Array.from({ length: SEGMENTS }, (_, i) => wedge(i)).join('')}
      <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke-width="6"/>
    </g>
    <circle cx="${CX}" cy="${CY}" r="11" fill="${P.cream}"/>
    <path class="flapper" d="M88 36 H112 L100 60 Z" fill="${P.blueDark}"/>`,
  mount(svg) {
    const wheel = q(svg, '.wheel');
    const flapper = q(svg, '.flapper');
    let angle = 0;
    const segment = 360 / SEGMENTS;
    return {
      anims: {},
      tick(dt, remaining) {
        const before = Math.floor(angle / segment);
        angle += SPEED_PER_MS_LEFT * remaining * dt;
        rotateAbout(wheel, angle % 360, CX, CY);
        const clicks = Math.floor(angle / segment) - before;
        if (clicks > 0) play(flapper, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-18deg)', offset: 0.3 }, { transform: 'rotate(0deg)' }], 90);
        return clicks;
      },
    };
  },
};
