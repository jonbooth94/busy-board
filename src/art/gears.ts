import { type Art, P, hitRect, q, rotateAbout, spawn } from './types';

interface Gear {
  cx: number;
  cy: number;
  r: number;
  teeth: number;
  fill: string;
  /** +1 or -1: meshing gears turn opposite ways. */
  dir: number;
}

// Pitch radii add up to the distance between centers, so the teeth mesh.
const GEARS: Gear[] = [
  { cx: 76, cy: 120, r: 42, teeth: 12, fill: P.blue, dir: 1 },
  { cx: 138, cy: 84, r: 30, teeth: 9, fill: P.mustard, dir: -1 },
  { cx: 150, cy: 136, r: 22, teeth: 6, fill: P.terracotta, dir: 1 },
];
const SPEED = 0.24; // degrees per ms for the big gear
const SLOWDOWN_MS = 500;
const TICK_DEG = 30;

function gearPath(g: Gear): string {
  const depth = 7;
  const pts: string[] = [];
  for (let i = 0; i < g.teeth; i++) {
    const step = (2 * Math.PI) / g.teeth;
    const a = i * step;
    for (const [off, rad] of [[0, g.r - depth / 2], [0.12, g.r + depth / 2], [0.38, g.r + depth / 2], [0.5, g.r - depth / 2]] as const) {
      const ang = a + off * step;
      pts.push(`${(g.cx + rad * Math.cos(ang)).toFixed(1)} ${(g.cy + rad * Math.sin(ang)).toFixed(1)}`);
    }
  }
  return `M${pts.join(' L')} Z`;
}

export const gears: Art<'gears'> = {
  markup: () => `
    ${hitRect(28, 46, 156, 120)}
    <circle class="puff template" display="none" cx="138" cy="44" r="8" fill="#fff" fill-opacity="0.7" stroke-width="3"/>
    ${GEARS.map(
      (g, i) => `<g class="gear spin gear-${i}">
        <path d="${gearPath(g)}" fill="${g.fill}"/>
        <circle cx="${g.cx}" cy="${g.cy}" r="${(g.r * 0.45).toFixed(1)}" fill="none" stroke-width="3" stroke-opacity="0.45"/>
        <path d="M${g.cx} ${g.cy} L${g.cx + g.r * 0.62} ${g.cy}" stroke-width="4" stroke-opacity="0.45"/>
      </g>
      <circle cx="${g.cx}" cy="${g.cy}" r="7" fill="${P.cream}"/>`,
    ).join('')}`,
  mount(svg) {
    const els = GEARS.map((_, i) => q(svg, `.gear-${i}`));
    const puff = q<SVGElement>(svg, '.puff');
    let angle = 0;
    return {
      anims: {
        puff() {
          [0, 140, 280].forEach((delay, i) =>
            spawn(
              puff,
              [
                { transform: 'translate(0, 0) scale(0.5)', opacity: 0 },
                { transform: `translate(${i * 6 - 6}px, -10px) scale(1)`, opacity: 1, offset: 0.25 },
                { transform: `translate(${i * 10 - 10}px, -46px) scale(1.6)`, opacity: 0 },
              ],
              800,
              { delay },
            ),
          );
        },
      },
      tick(dt, remaining) {
        const before = Math.floor(angle / TICK_DEG);
        angle += SPEED * Math.min(1, remaining / SLOWDOWN_MS) * dt;
        GEARS.forEach((g, i) => rotateAbout(els[i]!, (angle * g.dir * GEARS[0]!.teeth) / g.teeth, g.cx, g.cy));
        return Math.floor(angle / TICK_DEG) - before;
      },
    };
  },
};
