import { type Art, P, hitRect, play, q, rotateAbout } from './types';

const CX = 100;
const CY = 128;
const SPEED = 0.5; // minute hand, degrees per ms
const SLOWDOWN_MS = 400;
const TICK_DEG = 60;

export const clock: Art<'clock'> = {
  markup: () => `
    ${hitRect(36, 18, 128, 170)}
    <path d="M40 80 L100 30 L160 80 Z" fill="${P.blueDark}"/>
    <rect x="88" y="52" width="24" height="24" rx="4" fill="${P.shadow}"/>
    <g class="bird">
      <ellipse cx="100" cy="60" rx="17" ry="14" fill="${P.mustard}"/>
      <path d="M86 62 Q92 54 98 64" fill="none" stroke-width="3.5"/>
      <path d="M116 58 L128 62 L116 66 Z" fill="${P.terracotta}" stroke-width="3.5"/>
      <circle cx="108" cy="56" r="3" fill="${P.ink}" stroke="none"/>
    </g>
    <circle cx="${CX}" cy="${CY}" r="58" fill="${P.blue}"/>
    <circle cx="${CX}" cy="${CY}" r="46" fill="${P.cream}"/>
    ${Array.from({ length: 12 }, (_, i) => {
      const a = (i * Math.PI) / 6;
      const r0 = i % 3 === 0 ? 34 : 38;
      return `<path d="M${(CX + r0 * Math.sin(a)).toFixed(1)} ${(CY - r0 * Math.cos(a)).toFixed(1)} L${(CX + 42 * Math.sin(a)).toFixed(1)} ${(CY - 42 * Math.cos(a)).toFixed(1)}" stroke-width="${i % 3 === 0 ? 5 : 3}"/>`;
    }).join('')}
    <path class="hour spin" d="M${CX} ${CY} V${CY - 22}" stroke-width="8"/>
    <path class="minute spin" d="M${CX} ${CY} V${CY - 34}" stroke-width="5"/>
    <circle cx="${CX}" cy="${CY}" r="6" fill="${P.terracotta}"/>`,
  mount(svg) {
    const bird = q(svg, '.bird');
    const hour = q(svg, '.hour');
    const minute = q(svg, '.minute');
    let angle = 0;
    rotateAbout(hour, 300, CX, CY); // start at ten o'clock-ish, so it reads as a clock
    bird.style.transform = 'translateY(14px) scale(0)';
    const show = (to: string, ms: number) => {
      const from = bird.style.transform || 'none';
      bird.style.transform = to;
      play(bird, [{ transform: from }, { transform: to }], ms);
    };
    return {
      anims: {
        bird_out() {
          bird.style.transform = 'none';
          play(bird, [{ transform: 'translateY(14px) scale(0)' }, { transform: 'translateY(-14px) scale(1.15)', offset: 0.65 }, { transform: 'none' }], 420);
        },
        bird_in() {
          show('translateY(14px) scale(0)', 320);
        },
        bird_bob() {
          play(bird, [{ transform: 'none' }, { transform: 'translateY(-6px) rotate(-10deg)', offset: 0.4 }, { transform: 'none' }], 360);
        },
      },
      tick(dt, remaining) {
        const before = Math.floor(angle / TICK_DEG);
        angle += SPEED * Math.min(1, remaining / SLOWDOWN_MS) * dt;
        rotateAbout(minute, angle, CX, CY);
        rotateAbout(hour, 300 + angle / 12, CX, CY);
        return Math.floor(angle / TICK_DEG) - before;
      },
    };
  },
};
