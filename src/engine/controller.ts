// One object on the board: its state machine drives sound, animation and logging.
// Every call into the drawing is guarded, so one broken object can't break the others.

import type { AudioEngine } from '../audio/engine';
import type { ArtHandle } from '../art/types';
import { drawArt } from '../art';
import type { Direction, ObjectConfig, Reaction } from '../config/types';
import type { EventName } from '../log';
import { Cooldown, Cycle, type Effect, type Machine, Timed, Toggle, createMachine } from './behaviors';
import type { Point, Target, Touchable } from './router';

export interface ControllerDeps {
  audio: AudioEngine;
  log(objectId: string, event: EventName, stateAfter?: string): void;
  /** Something started moving: make sure the animation loop is running. */
  wake(): void;
}

/** Each 80 px of swipe on a timed object adds time, like flicking a wheel again. */
const SWIPE_EXTEND_PX = 80;

export class ObjectController implements Touchable {
  readonly id: string;
  readonly hasGesture: boolean;
  readonly svg: SVGSVGElement;
  asleep = false;
  private readonly handle: ArtHandle;
  private readonly machine: Machine;
  private readonly cooldown: Cooldown;
  private readonly hit: SVGGraphicsElement;

  // Drag state
  private anchor: Point = { x: 0, y: 0 };
  private lastAngle = 0;
  private turned = 0;
  private travel = 0;
  private zone: string | null = null;

  constructor(
    readonly cfg: ObjectConfig,
    readonly cell: HTMLElement,
    private readonly deps: ControllerDeps,
  ) {
    this.id = cfg.id;
    this.hasGesture = !!cfg.optionalGesture;
    const { svg, handle } = drawArt(cfg.art);
    this.svg = svg;
    this.handle = handle;
    cell.append(svg);
    this.hit = svg.querySelector<SVGGraphicsElement>('.hit') ?? svg;
    this.machine = createMachine(cfg);
    this.cooldown = new Cooldown(cfg.cooldownMs);
    cell.dataset.state = this.machine.state;
    if (cfg.states && cfg.initial) this.setSprite(cfg.states[cfg.initial]?.sprite ?? cfg.initial);
  }

  get state(): string {
    return this.machine instanceof Toggle ? this.machine.settled : this.machine.state;
  }

  target(): Target {
    const r = this.hit.getBoundingClientRect();
    return { id: this.id, rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom }, padding: this.cfg.hitPadding };
  }

  // ---------- Touch ----------

  down(p: Point, now: number): void {
    this.anchor = p;
    this.travel = 0;
    this.turned = 0;
    this.lastAngle = this.angleTo(p);
    if (this.asleep) {
      this.deps.log(this.id, 'tap', 'asleep');
      return;
    }
    if (!this.cooldown.take(now)) {
      this.deps.log(this.id, 'ignoredCooldown', this.state);
      return;
    }
    const zone = this.handle.zoneAt ? this.handle.zoneAt(...this.toSvg(p)) : undefined;
    this.zone = zone ?? null;
    this.apply(this.machine.press(now, zone));
    this.deps.log(this.id, 'tap', this.zone ?? this.state);
    this.bump();
  }

  dragStart(_start: Point, p: Point, now: number): void {
    this.drag(p, now);
  }

  drag(p: Point, now: number): void {
    if (this.asleep) return;
    const g = this.cfg.optionalGesture;
    if (!g) return;
    const m = this.machine;
    let effects: Effect[] = [];

    if (g.kind === 'swipe' && m instanceof Toggle && g.directions) {
      const dx = p.x - this.anchor.x;
      const dy = p.y - this.anchor.y;
      const vertical = g.axis === 'vertical';
      const d = vertical ? dy : dx;
      if (Math.abs(d) < 12) return;
      const dir: Direction = vertical ? (d < 0 ? 'up' : 'down') : d < 0 ? 'left' : 'right';
      this.anchor = p;
      const to = g.directions[dir];
      if (to) effects = m.set(to, now);
    } else if (g.kind === 'swipe' && m instanceof Timed) {
      this.travel += Math.hypot(p.x - this.anchor.x, p.y - this.anchor.y);
      this.anchor = p;
      if (this.travel < SWIPE_EXTEND_PX) return;
      this.travel -= SWIPE_EXTEND_PX;
      effects = m.extend(now);
    } else if (g.kind === 'circular' && m instanceof Cycle) {
      const a = this.angleTo(p);
      let delta = a - this.lastAngle;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      this.lastAngle = a;
      this.turned += delta;
      const step = 360 / Math.max(2, (this.cfg.order ?? []).length || 4);
      if (Math.abs(this.turned) < step) return;
      const dir = this.turned > 0 ? 1 : -1;
      this.turned -= dir * step;
      effects = m.step(dir);
    } else if (g.kind === 'slide' && this.handle.zoneAt) {
      const zone = this.handle.zoneAt(...this.toSvg(p));
      if (zone === this.zone || !this.cooldown.take(now)) return;
      this.zone = zone;
      effects = m.press(now, zone);
      this.apply(effects, true);
      this.deps.log(this.id, 'drag', zone);
      return;
    } else {
      return; // momentary drag: the touch-down already pulled it
    }
    if (!effects.length) return;
    this.apply(effects);
    this.deps.log(this.id, 'drag', this.state);
    this.bump();
  }

  up(): void {
    this.zone = null;
  }

  // ---------- Effects ----------

  private apply(effects: Effect[], sliding = false): void {
    for (const e of effects) {
      if (e.kind === 'enter') this.enter(e.state);
      else if (e.kind === 'zone') this.react(this.cfg.zones?.find((z) => z.id === e.zone)?.onEnter, sliding ? this.id : undefined);
      else if (e.kind === 'extend') this.react(this.cfg.onExtend);
    }
    if (effects.length) this.deps.wake();
  }

  private enter(state: string): void {
    this.cell.dataset.state = state;
    const s = this.cfg.states?.[state];
    this.setSprite(s?.sprite ?? state);
    this.react(s?.onEnter);
  }

  private react(r: Reaction | undefined, group?: string): void {
    if (!r) return;
    if (r.sprite) this.setSprite(r.sprite);
    this.deps.audio.playAny(r.sounds, { group });
    for (const cue of r.cues ?? []) this.deps.audio.playAny(cue.sounds, { delayMs: cue.atMs });
    if (r.anim) this.guard(() => (this.handle.anims as Record<string, () => void>)[r.anim!]?.());
  }

  private setSprite(name: string): void {
    this.svg.dataset.sprite = name;
    this.guard(() => this.handle.sprite?.(name));
  }

  /** Advance timers and timed motion. Returns true while it still needs frames. */
  update(now: number, dt: number): boolean {
    const m = this.machine;
    if (m instanceof Timed) {
      const ticks = this.guard(() => this.handle.tick?.(dt, m.remaining(now))) ?? 0;
      if (ticks > 0) this.deps.audio.playAny(this.cfg.tick?.sounds, { group: `${this.id}:tick` });
    }
    this.apply(m.update(now));
    return m.busy(now);
  }

  // ---------- Idle hint and wind-down ----------

  hint(): void {
    if (this.asleep) return;
    this.guard(() =>
      this.svg.animate(
        [
          { transform: 'rotate(0deg)' },
          { transform: 'rotate(-5deg)', offset: 0.2 },
          { transform: 'rotate(5deg)', offset: 0.45 },
          { transform: 'rotate(-3deg)', offset: 0.7 },
          { transform: 'rotate(0deg)' },
        ],
        { duration: 700, easing: 'ease-in-out' },
      ),
    );
    this.deps.log(this.id, 'idleHint', this.state);
  }

  sleep(): void {
    this.asleep = true;
    this.cell.classList.add('asleep');
  }

  // ---------- Helpers ----------

  /** A small squash on every accepted tap, so the object always visibly moves. */
  private bump(): void {
    this.guard(() => this.cell.animate([{ transform: 'scale(1)' }, { transform: 'scale(0.97)', offset: 0.3 }, { transform: 'scale(1)' }], { duration: 220, easing: 'ease-out' }));
  }

  private toSvg(p: Point): [number, number] {
    const m = this.svg.getScreenCTM();
    if (!m) return [100, 100];
    const pt = new DOMPoint(p.x, p.y).matrixTransform(m.inverse());
    return [pt.x, pt.y];
  }

  private angleTo(p: Point): number {
    const c = this.handle.center;
    const m = this.svg.getScreenCTM();
    if (!c || !m) return 0;
    const s = new DOMPoint(c.x, c.y).matrixTransform(m);
    return (Math.atan2(p.y - s.y, p.x - s.x) * 180) / Math.PI;
  }

  private guard<T>(fn: () => T): T | undefined {
    try {
      return fn();
    } catch (err) {
      console.warn(`[${this.id}]`, err);
      return undefined;
    }
  }
}
