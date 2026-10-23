import type { ArtId } from './catalog';
import type { Art } from './types';
import { bigButton } from './big-button';
import { clock } from './clock';
import { colorKnob } from './color-knob';
import { doorbell } from './doorbell';
import { gears } from './gears';
import { lever } from './lever';
import { lightSwitch } from './light-switch';
import { lockAndKey } from './lock-and-key';
import { slideWhistle } from './slide-whistle';
import { spinnerWheel } from './spinner-wheel';
import { threeKeys } from './three-keys';
import { zipper } from './zipper';

export const ARTS: { [A in ArtId]: Art<A> } = {
  'big-button': bigButton,
  'light-switch': lightSwitch,
  doorbell,
  lever,
  'color-knob': colorKnob,
  'spinner-wheel': spinnerWheel,
  gears,
  clock,
  'three-keys': threeKeys,
  'slide-whistle': slideWhistle,
  zipper,
  'lock-and-key': lockAndKey,
};

/** Builds a drawing into an <svg>. Each instance gets its own id prefix for clip paths. */
let uid = 0;
export function drawArt(id: string): { svg: SVGSVGElement; handle: ReturnType<Art['mount']> } {
  const art = ARTS[id as ArtId] as Art | undefined;
  if (!art) throw new Error(`unknown art ${id}`);
  const key = `a${++uid}`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 200 200');
  svg.setAttribute('class', `art art-${id}`);
  svg.setAttribute('stroke', '#4a3426');
  svg.setAttribute('stroke-width', '5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = art.markup(key);
  return { svg, handle: art.mount(svg, key) };
}
