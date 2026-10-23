import type { AnimOf, ArtId } from './catalog';

/** The warm, muted palette on a wood-toned board. One color per behavior type. */
export const P = {
  ink: '#4a3426',
  terracotta: '#d9775a', // momentary
  terracottaDark: '#b85f45',
  mustard: '#e3b04b', // toggle
  mustardDark: '#c99434',
  sage: '#8fae7a', // instrument
  sageDark: '#6f8f5c',
  blue: '#7fa3bf', // timed
  blueDark: '#5f86a3',
  plum: '#ad86a6', // cycle
  cream: '#f6ead2',
  wood: '#d8a46a',
  woodDark: '#a8723f',
  shadow: '#6b4a35',
} as const;

export interface ArtHandle<A extends ArtId = ArtId> {
  /** Named animations, triggered by "anim" in the object's config. */
  anims: Record<AnimOf<A>, () => void>;
  /** Called after the pose (data-sprite) changes, for poses CSS can't express. */
  sprite?(name: string): void;
  /** Instruments: which zone a point (in viewBox units) is in. Points off the drawing snap to the nearest zone. */
  zoneAt?(x: number, y: number): string;
  /** Timed objects: advance by dt ms with `remaining` ms left in the run. Returns how many clicks/ticks were crossed. */
  tick?(dt: number, remaining: number): number;
  /** Circular drags turn around this point (viewBox units). */
  center?: { x: number; y: number };
}

export interface Art<A extends ArtId = ArtId> {
  /** Inner SVG markup for a 200 x 200 viewBox. Must include one `.hit` rect: the drawn object's bounds. */
  markup(uid: string): string;
  mount(svg: SVGSVGElement, uid: string): ArtHandle<A>;
}

export const EASE_OUT = 'cubic-bezier(0.22, 0.8, 0.3, 1)';

export function q<T extends Element = SVGGraphicsElement>(root: ParentNode, sel: string): T {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
}

/** Web Animations with the board's defaults: ease-out, nothing left behind afterwards. */
export function play(el: Element, keyframes: Keyframe[], ms: number, opts: KeyframeAnimationOptions = {}): Animation | null {
  try {
    return el.animate(keyframes, { duration: ms, easing: EASE_OUT, ...opts });
  } catch {
    return null; // an animation failing must never break the object
  }
}

/** Clones a hidden template (e.g. a bubble), animates it, and removes it, so several can be in flight.
 *  The clone is wrapped in a <g> that gets the animation, so the template keeps its own transform. */
export function spawn(template: SVGElement, keyframes: Keyframe[], ms: number, opts: KeyframeAnimationOptions = {}): void {
  const wrap = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const el = template.cloneNode(true) as SVGElement;
  el.removeAttribute('display');
  el.removeAttribute('class');
  wrap.appendChild(el);
  template.parentNode?.insertBefore(wrap, template);
  const a = play(wrap, keyframes, ms, { fill: 'backwards', ...opts });
  if (a) a.onfinish = () => wrap.remove();
  else wrap.remove();
}

/** Rotates an element about a point by setting its transform attribute (cheap enough for every frame). */
export function rotateAbout(el: Element, deg: number, cx: number, cy: number): void {
  el.setAttribute('transform', `rotate(${deg.toFixed(2)} ${cx} ${cy})`);
}

export const hitRect = (x: number, y: number, w: number, h: number) =>
  `<rect class="hit" x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="none"/>`;

/** A small music note (used by the instruments), drawn at the origin. */
export const noteShape = (fill: string) =>
  `<ellipse cx="0" cy="0" rx="9" ry="7" fill="${fill}" transform="rotate(-20)"/><path d="M8 -3 V-34 Q18 -30 20 -20" fill="none"/>`;
