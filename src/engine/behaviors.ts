// The five behavior types, implemented once. Each is a small state machine driven by config.
// They are pure logic: time is passed in, and they return what happened so the controller can
// play sounds and animations. No DOM, so they're unit tested directly.

import type { ObjectConfig } from '../config/types';

export type Effect =
  | { kind: 'enter'; state: string }
  | { kind: 'zone'; zone: string }
  | { kind: 'extend' }
  | { kind: 'queued' }
  | { kind: 'busy' };

export interface Machine {
  readonly state: string;
  /** A tap (zone is the instrument zone under the finger). */
  press(now: number, zone?: string): Effect[];
  /** Advance timers. */
  update(now: number): Effect[];
  /** True while an animation or run is in progress (the board keeps animating). */
  busy(now: number): boolean;
}

function otherState(cfg: ObjectConfig): [string, string] {
  const names = Object.keys(cfg.states ?? {});
  const initial = cfg.initial ?? names[0]!;
  const other = names.find((n) => n !== initial) ?? initial;
  return [initial, other];
}

/** idle, then active, then back to idle after its animation. Taps while active are ignored. */
export class Momentary implements Machine {
  state: string;
  private until = 0;
  private readonly idle: string;
  private readonly active: string;

  constructor(private readonly cfg: ObjectConfig) {
    [this.idle, this.active] = otherState(cfg);
    this.state = this.idle;
  }

  press(now: number): Effect[] {
    if (this.state === this.active) return [{ kind: 'busy' }];
    this.state = this.active;
    this.until = now + (this.cfg.durationMs ?? 400);
    return [{ kind: 'enter', state: this.active }];
  }

  update(now: number): Effect[] {
    if (this.state === this.active && now >= this.until) {
      this.state = this.idle;
      return [{ kind: 'enter', state: this.idle }];
    }
    return [];
  }

  busy(): boolean {
    return this.state === this.active;
  }
}

/** Flips between two states on each tap. A tap during the flip animation is queued until it ends. */
export class Toggle implements Machine {
  state: string;
  private animUntil = 0;
  private pending: string | null = null;
  private readonly a: string;
  private readonly b: string;

  constructor(private readonly cfg: ObjectConfig) {
    [this.a, this.b] = otherState(cfg);
    this.state = this.a;
  }

  private other(s: string): string {
    return s === this.a ? this.b : this.a;
  }

  press(now: number): Effect[] {
    return this.goTo(this.other(this.pending ?? this.state), now);
  }

  /** Swipe: go to a specific state (no-op if already there or already queued). */
  set(target: string, now: number): Effect[] {
    if ((this.pending ?? this.state) === target) return [];
    return this.goTo(target, now);
  }

  private goTo(target: string, now: number): Effect[] {
    if (now < this.animUntil) {
      // Busy: remember where to end up. Tapping again before it runs cancels it out.
      this.pending = target === this.state ? null : target;
      return [{ kind: 'queued' }];
    }
    this.state = target;
    this.animUntil = now + (this.cfg.animMs ?? 300);
    return [{ kind: 'enter', state: target }];
  }

  update(now: number): Effect[] {
    if (this.pending !== null && now >= this.animUntil) {
      const target = this.pending;
      this.pending = null;
      return this.goTo(target, now);
    }
    return [];
  }

  busy(now: number): boolean {
    return now < this.animUntil || this.pending !== null;
  }

  /** The state a viewer will see once queued taps have run. */
  get settled(): string {
    return this.pending ?? this.state;
  }
}

/** Advances one step through N states, wrapping around. Taps while busy advance again at once. */
export class Cycle implements Machine {
  private index = 0;
  private readonly order: string[];

  constructor(cfg: ObjectConfig) {
    this.order = cfg.order ?? Object.keys(cfg.states ?? {});
    this.index = Math.max(0, this.order.indexOf(cfg.initial ?? this.order[0]!));
  }

  get state(): string {
    return this.order[this.index]!;
  }

  press(): Effect[] {
    return this.step(1);
  }

  /** Circular drag: +1 clockwise, -1 counter-clockwise. */
  step(dir: 1 | -1): Effect[] {
    const n = this.order.length;
    this.index = (this.index + dir + n) % n;
    return [{ kind: 'enter', state: this.state }];
  }

  update(): Effect[] {
    return [];
  }

  busy(): boolean {
    return false;
  }
}

/** Runs for a set time, then rests. Taps while running add time, up to a cap. */
export class Timed implements Machine {
  state: string;
  private endAt = 0;
  private startedAt = 0;
  private readonly rest: string;
  private readonly run: string;

  constructor(private readonly cfg: ObjectConfig) {
    [this.rest, this.run] = otherState(cfg);
    this.state = this.rest;
  }

  press(now: number): Effect[] {
    if (this.state === this.run) return this.extend(now);
    this.state = this.run;
    this.startedAt = now;
    this.endAt = now + (this.cfg.durationMs ?? 2000);
    return [{ kind: 'enter', state: this.run }];
  }

  /** Add time (a tap or swipe while running). Returns [] if already at the cap. */
  extend(now: number): Effect[] {
    if (this.state !== this.run) return this.press(now);
    const cap = now + (this.cfg.capMs ?? 3000);
    const next = Math.min(this.endAt + (this.cfg.addMs ?? 800), cap);
    if (next <= this.endAt) return [];
    this.endAt = next;
    return [{ kind: 'extend' }];
  }

  update(now: number): Effect[] {
    if (this.state === this.run && now >= this.endAt) {
      this.state = this.rest;
      return [{ kind: 'enter', state: this.rest }];
    }
    return [];
  }

  busy(): boolean {
    return this.state === this.run;
  }

  /** Milliseconds left in the current run (0 when resting). */
  remaining(now: number): number {
    return this.state === this.run ? Math.max(0, this.endAt - now) : 0;
  }

  elapsed(now: number): number {
    return this.state === this.run ? now - this.startedAt : 0;
  }
}

/** No lasting state: each zone plays its note every time. */
export class Instrument implements Machine {
  readonly state = 'ready';
  private readonly zones: Set<string>;

  constructor(cfg: ObjectConfig) {
    this.zones = new Set((cfg.zones ?? []).map((z) => z.id));
  }

  press(_now: number, zone?: string): Effect[] {
    return zone && this.zones.has(zone) ? [{ kind: 'zone', zone }] : [];
  }

  update(): Effect[] {
    return [];
  }

  busy(): boolean {
    return false;
  }
}

export function createMachine(cfg: ObjectConfig): Machine {
  switch (cfg.type) {
    case 'momentary':
      return new Momentary(cfg);
    case 'toggle':
      return new Toggle(cfg);
    case 'cycle':
      return new Cycle(cfg);
    case 'timed':
      return new Timed(cfg);
    case 'instrument':
      return new Instrument(cfg);
  }
}

/** Per-object cooldown: stops machine-gun repeats. */
export class Cooldown {
  private last = -Infinity;
  constructor(private readonly ms: number) {}

  /** True (and starts a new cooldown) if a tap at `now` is allowed. */
  take(now: number): boolean {
    if (now - this.last < this.ms) return false;
    this.last = now;
    return true;
  }
}
