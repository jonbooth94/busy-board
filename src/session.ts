// Session flow: cover -> play -> wind-down (last 30 s) -> goodnight. The game ends its own
// sessions, so the parent never has to take the iPad away mid-tap. Restarting after goodnight
// needs the parent gate; that survives reloads and updates via a stored "resting" flag.

import type { AudioEngine } from './audio/engine';
import type { Board } from './board';
import type { BoardConfig } from './config/types';
import type { ObjectController } from './engine/controller';
import type { TouchRouter } from './engine/router';
import type { EventLog } from './log';

export type Screen = 'cover' | 'play' | 'goodnight';

const RESTING_KEY = 'bb.resting';
const TICK_MS = 200;

export interface SessionDeps {
  board: Board;
  router: TouchRouter;
  audio: AudioEngine;
  log: EventLog;
  cfg: BoardConfig;
  cover: HTMLElement;
  /** Session length in ms (null = no limit), read fresh so settings changes apply. */
  sessionMs(): number | null;
  windDownMs: number;
  idleHintMs: number;
  onScreen(screen: Screen): void;
}

export class Session {
  screen: Screen = 'cover';
  private paused = false;
  private playedMs = 0;
  private lastTick = 0;
  private lastTouch = 0;
  private windDownAt: number | null = null;
  private sleepPlan: { at: number; c: ObjectController }[] = [];
  private hinted = new Map<string, number>();
  private timer = 0;

  constructor(private readonly d: SessionDeps) {
    d.cover.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.screen === 'cover' && !this.paused) this.open();
    });
  }

  /** Where a fresh launch starts: the closed cover, or goodnight if the last session ended. */
  start(): void {
    if (isResting()) this.showGoodnight(false);
    else this.showCover();
  }

  showCover(): void {
    setResting(false);
    this.stopTimer();
    this.d.router.enabled = false;
    this.d.router.releaseAll();
    this.setScreen('cover');
  }

  /** The child's first tap: open the board (and unlock audio on the web build). */
  private open(): void {
    this.d.audio.unlock();
    this.d.audio.playAny(this.d.cfg.coverOpen.sounds);
    this.d.log.newSession();
    this.d.log.log('board', 'sessionStart', 'play');
    this.playedMs = 0;
    this.windDownAt = null;
    this.sleepPlan = [];
    this.hinted.clear();
    this.lastTouch = performance.now();
    this.d.router.enabled = true;
    this.d.router.invalidate();
    this.setScreen('play');
    this.lastTick = performance.now();
    this.timer = window.setInterval(() => this.tick(), TICK_MS);
  }

  touched(): void {
    this.lastTouch = performance.now();
  }

  /** The parent panel is open, or the app is in the background: the clock stops. */
  pause(): void {
    this.paused = true;
    this.d.router.releaseAll();
  }

  resume(): void {
    this.paused = false;
    this.lastTick = performance.now();
    this.lastTouch = performance.now();
    this.d.router.invalidate();
  }

  /** Board was rebuilt (settings changed) mid-session: re-plan who falls asleep. */
  rebuilt(): void {
    this.hinted.clear();
    if (this.windDownAt !== null) this.planSleep(this.windDownAt);
  }

  private tick(): void {
    const now = performance.now();
    const dt = now - this.lastTick;
    this.lastTick = now;
    if (this.screen !== 'play' || this.paused || document.visibilityState !== 'visible') return;
    this.playedMs += dt;

    const total = this.d.sessionMs();
    if (total !== null) {
      const windStart = Math.max(0, total - this.d.windDownMs);
      if (this.windDownAt === null && this.playedMs >= windStart) this.windDown();
      while (this.sleepPlan.length && this.playedMs >= this.sleepPlan[0]!.at) {
        const { c } = this.sleepPlan.shift()!;
        c.sleep();
        this.d.audio.playAny(this.d.cfg.fallAsleep.sounds);
      }
      if (this.playedMs >= total) return this.goodnight();
    }

    if (this.windDownAt === null && now - this.lastTouch >= this.d.idleHintMs) {
      this.lastTouch = now;
      this.hint();
    }
  }

  private hint(): void {
    const awake = this.d.board.awake;
    if (!awake.length) return;
    // The object hinted longest ago (or never) goes next, so hints rotate around the board.
    const next = awake.reduce((a, b) => ((this.hinted.get(b.id) ?? -1) < (this.hinted.get(a.id) ?? -1) ? b : a));
    this.hinted.set(next.id, performance.now());
    next.hint();
  }

  private windDown(): void {
    this.windDownAt = this.playedMs;
    this.d.board.el.classList.add('winding-down');
    this.d.log.log('board', 'windDown', 'windDown');
    this.planSleep(this.playedMs);
  }

  /** Objects fall asleep one at a time, evenly spread over the wind-down, in random order. */
  private planSleep(from: number): void {
    const total = this.d.sessionMs() ?? from;
    const awake = shuffle(this.d.board.awake);
    const span = Math.max(0, total - from);
    this.sleepPlan = awake.map((c, i) => ({ at: from + (span * (i + 1)) / (awake.length + 1), c }));
  }

  private goodnight(): void {
    this.d.log.log('board', 'sessionEnd', 'goodnight');
    void this.d.log.flush();
    this.d.audio.playAny(this.d.cfg.goodnight.sounds);
    this.showGoodnight(true);
  }

  private showGoodnight(animate: boolean): void {
    setResting(true);
    this.stopTimer();
    this.d.router.enabled = false;
    this.d.router.releaseAll();
    this.d.cover.classList.toggle('instant', !animate);
    this.setScreen('goodnight');
  }

  private stopTimer(): void {
    clearInterval(this.timer);
    this.timer = 0;
  }

  private setScreen(screen: Screen): void {
    this.screen = screen;
    document.body.dataset.screen = screen;
    this.d.onScreen(screen);
  }
}

function shuffle<T>(list: readonly T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function isResting(): boolean {
  try {
    return localStorage.getItem(RESTING_KEY) === '1';
  } catch {
    return false;
  }
}

function setResting(on: boolean): void {
  try {
    if (on) localStorage.setItem(RESTING_KEY, '1');
    else localStorage.removeItem(RESTING_KEY);
  } catch {
    // storage unavailable: a reload would show the cover instead of goodnight
  }
}
