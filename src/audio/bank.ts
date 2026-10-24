// Every sound in the game, by name. Names ending _1/_2/_3 (or _a/_b) are variants of one action,
// picked at random so repeats don't grate. All clips are short, mono and mastered quiet.
// Plain TypeScript with no DOM use, so Node (validator) and Vitest can run it.

import { NOTE, clip, finish, noise, tone, type ToneOpts } from './synth.ts';

type Gen = () => Float32Array;

const marimba: ToneOpts['partials'] = [[1, 1], [4, 0.22, 3], [9.9, 0.05, 6]];
const bell: ToneOpts['partials'] = [[1, 1], [2, 0.35, 1.6], [3, 0.15, 2.2], [4.16, 0.08, 3]];

const woodTap = (v: number): Gen => () => {
  const out = clip(0.12);
  noise(out, { dur: 0.05, amp: 0.6, seed: 11 + v, lp: 1500 + v * 200, hp: 300, decay: 9 });
  tone(out, { dur: 0.1, freq: 180 * (1 + v * 0.06), amp: 0.7, decay: 8 });
  return finish(out, 0.2);
};

const boop = (v: number): Gen => () => {
  const f = [NOTE.G5, NOTE.A5, NOTE.E5][v]!;
  const out = clip(0.3);
  tone(out, { dur: 0.26, freq: f, to: f * 0.55, amp: 1, partials: [[1, 1], [2, 0.12, 2]], decay: 5, attack: 0.006 });
  return finish(out, 0.42);
};

const bubblePop = (v: number): Gen => () => {
  const out = clip(0.09);
  tone(out, { dur: 0.06, freq: 650 + v * 120, to: 1500 + v * 200, amp: 1, decay: 4 });
  return finish(out, 0.25);
};

const click = (on: boolean, v: number): Gen => () => {
  const out = clip(0.08);
  noise(out, { dur: 0.014, amp: 1, seed: 21 + v + (on ? 5 : 0), hp: 1800, lp: 7000, decay: 6 });
  tone(out, { dur: 0.05, freq: (on ? 2300 : 1700) * (1 + v * 0.04), amp: 0.45, decay: 9 });
  tone(out, { dur: 0.06, freq: on ? 420 : 340, amp: 0.35, decay: 8 });
  return finish(out, 0.36);
};

const dingDong = (v: number): Gen => () => {
  const out = clip(1.4);
  const d = 1 + v * 0.004;
  tone(out, { at: 0, dur: 0.85, freq: NOTE.E5 * d, amp: 1, partials: bell, decay: 4.5 });
  tone(out, { at: 0.42, dur: 0.95, freq: NOTE.C5 * d, amp: 1, partials: bell, decay: 4.5 });
  return finish(out, 0.4);
};

const peek = (v: number): Gen => () => {
  const out = clip(0.3);
  tone(out, { dur: 0.25, freq: NOTE.G4 + v * 30, to: NOTE.D5 + v * 40, amp: 1, partials: [[1, 1], [2, 0.2]], decay: 3, attack: 0.02 });
  return finish(out, 0.3);
};

const leverCreak = (v: number): Gen => () => {
  const out = clip(0.4);
  noise(out, { dur: 0.25, amp: 0.7, seed: 31 + v, lp: 1100 - v * 150, lpTo: 400, hp: 200, decay: 3, attack: 0.02, wobble: { rate: 38 + v * 6, depth: 0.6 } });
  tone(out, { at: 0.22, dur: 0.15, freq: 120 + v * 10, amp: 0.8, decay: 7 });
  return finish(out, 0.32);
};

const roll = (v: number): Gen => () => {
  const out = clip(0.62);
  noise(out, { dur: 0.6, amp: 1, seed: 41 + v, lp: 450 + v * 60, hp: 80, decay: 1.5, attack: 0.08, wobble: { rate: 13 + v * 3, depth: 0.7 } });
  return finish(out, 0.24);
};

const cup = (v: number): Gen => () => {
  const out = clip(0.45);
  tone(out, { dur: 0.4, freq: 300 + v * 25, amp: 1, partials: [[1, 1], [2.32, 0.5, 2], [3.9, 0.2, 3]], decay: 6 });
  noise(out, { dur: 0.03, amp: 0.5, seed: 51 + v, lp: 3000, decay: 6 });
  return finish(out, 0.38);
};

const knob = (f: number, v: number): Gen => () => {
  const out = clip(0.75);
  noise(out, { dur: 0.012, amp: 0.6, seed: 61 + v, hp: 2000, lp: 6000, decay: 6 });
  tone(out, { at: 0.01, dur: 0.7, freq: f * (1 + v * 0.003), amp: 1, partials: v ? marimba : bell, decay: 5 });
  return finish(out, 0.38);
};

const spinStart = (v: number): Gen => () => {
  const out = clip(0.45);
  noise(out, { dur: 0.4, amp: 1, seed: 71 + v, lp: 600 + v * 150, lpTo: 2200, hp: 300, decay: 4, attack: 0.05 });
  return finish(out, 0.18);
};

const spinClick = (v: number): Gen => () => {
  const out = clip(0.04);
  noise(out, { dur: 0.015, amp: 1, seed: 81 + v, hp: 1500, lp: 5000, decay: 6 });
  tone(out, { dur: 0.025, freq: 2600 + v * 250, amp: 0.4, decay: 8 });
  return finish(out, 0.2);
};

const gearStart = (v: number): Gen => () => {
  const out = clip(0.4);
  for (let i = 0; i < 8; i++) {
    tone(out, { at: i * 0.028, dur: 0.035, freq: 1500 + i * 60 + v * 120, amp: 0.5 + i * 0.05, partials: [[1, 1], [2.7, 0.4, 2]], decay: 8 });
  }
  noise(out, { at: 0.05, dur: 0.3, amp: 0.25, seed: 91 + v, lp: 900, hp: 200, decay: 3, attack: 0.05 });
  return finish(out, 0.2);
};

const gearTick = (v: number): Gen => () => {
  const out = clip(0.05);
  tone(out, { dur: 0.04, freq: [1600, 1850, 2100][v]!, amp: 1, partials: [[1, 1], [2.7, 0.4, 2]], decay: 8 });
  return finish(out, 0.13);
};

const clockTick = (v: number): Gen => () => {
  const out = clip(0.06);
  tone(out, { dur: 0.05, freq: v ? 1000 : 1250, amp: 1, partials: [[1, 1], [3.1, 0.3, 2]], decay: 8 });
  noise(out, { dur: 0.01, amp: 0.4, seed: 101 + v, hp: 2000, decay: 6 });
  return finish(out, 0.16);
};

const chirp = (v: number): Gen => () => {
  const out = clip(0.4);
  const base = [2100, 2400, 1900][v]!;
  const count = v === 2 ? 3 : 2;
  for (let i = 0; i < count; i++) {
    tone(out, { at: i * 0.12, dur: 0.09, freq: base, to: base * 1.5, amp: 1, decay: 3, attack: 0.008, vibrato: { rate: 40, depth: 0.02 } });
  }
  return finish(out, 0.24);
};

const key = (f: number, v: number): Gen => () => {
  const out = clip(0.95);
  noise(out, { dur: 0.01, amp: 0.3, seed: 111 + v, lp: 4000, decay: 6 });
  tone(out, { dur: 0.9, freq: f * (1 + v * 0.002), amp: 1, partials: marimba, decay: 6 });
  return finish(out, 0.44);
};

const WHISTLE_NOTES = [NOTE.C5, NOTE.D5, NOTE.E5, NOTE.G5, NOTE.A5, NOTE.C6, NOTE.D6, NOTE.E6];
const whistle = (f: number, v: number): Gen => () => {
  const out = clip(0.5);
  tone(out, { dur: 0.46, freq: f * 0.96, to: f, amp: 1, attack: 0.03, decay: 3, partials: [[1, 1], [2, 0.06]], vibrato: { rate: 5.5 + v, depth: 0.006 } });
  noise(out, { dur: 0.4, amp: 0.08, seed: 121 + v, hp: 3000, decay: 4, attack: 0.03 });
  return finish(out, 0.28);
};

const zip = (open: boolean, v: number): Gen => () => {
  const out = clip(0.5);
  const teeth = 18 + v * 3;
  for (let i = 0; i < teeth; i++) {
    const p = i / teeth;
    noise(out, { at: p * 0.42, dur: 0.012, amp: 0.6 + 0.4 * Math.sin(Math.PI * p), seed: 131 + i + v * 50, hp: open ? 1500 + p * 2500 : 4000 - p * 2500, lp: 8000, decay: 6 });
  }
  return finish(out, 0.26);
};

const lock = (open: boolean, v: number): Gen => () => {
  const out = clip(0.55);
  const clunk = open ? 0.3 : 0;
  const clicks = open ? [0, 0.09] : [0.18];
  for (const at of clicks) {
    noise(out, { at, dur: 0.015, amp: 0.7, seed: 141 + v + at * 100, hp: 2500, lp: 8000, decay: 6 });
    tone(out, { at, dur: 0.04, freq: 2600 + v * 150, amp: 0.3, decay: 8 });
  }
  tone(out, { at: clunk, dur: 0.22, freq: 210 + v * 15, amp: 0.9, partials: [[1, 1], [2.4, 0.4, 2]], decay: 7 });
  noise(out, { at: clunk, dur: 0.04, amp: 0.5, seed: 151 + v, lp: 1800, decay: 6 });
  return finish(out, 0.36);
};

const coverOpen = (v: number): Gen => () => {
  const out = clip(1.3);
  noise(out, { dur: 0.3, amp: 0.5, seed: 161 + v, lp: 700, lpTo: 350, hp: 150, decay: 3, attack: 0.03, wobble: { rate: 30, depth: 0.5 } });
  const notes = v ? [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6] : [NOTE.C5, NOTE.D5, NOTE.E5, NOTE.G5];
  notes.forEach((f, i) => tone(out, { at: 0.2 + i * 0.13, dur: 0.75, freq: f, amp: 0.8, partials: marimba, decay: 5 }));
  return finish(out, 0.36);
};

const sleep = (v: number): Gen => () => {
  const out = clip(0.7);
  const [a, b] = ([[NOTE.G4, NOTE.E4], [NOTE.A4, NOTE.G4], [NOTE.E4, NOTE.C4]] as const)[v]!;
  tone(out, { dur: 0.65, freq: a, to: b, amp: 1, attack: 0.08, decay: 4, partials: [[1, 1], [2, 0.1]] });
  return finish(out, 0.2);
};

const goodnight = (v: number): Gen => () => {
  const out = clip(1.48);
  const notes = v ? [NOTE.E5, NOTE.D5, NOTE.C5, NOTE.G4] : [NOTE.G5, NOTE.E5, NOTE.D5, NOTE.C5];
  notes.forEach((f, i) => tone(out, { at: i * 0.28, dur: 0.6, freq: f, amp: 0.8, partials: bell, decay: 4.5, attack: 0.01 }));
  return finish(out, 0.3);
};

// ---------- Color Critters ----------

/** Soft pop for crayon taps. */
const crayonPop = (v: number): Gen => () => {
  const out = clip(0.14);
  tone(out, { dur: 0.11, freq: 620 + v * 70, to: 240 + v * 30, amp: 1, decay: 5 });
  return finish(out, 0.3);
};

/** Gentle rising chime when an animal opens. */
const chime = (v: number): Gen => () => {
  const out = clip(0.95);
  const notes = v ? [NOTE.G5, NOTE.C6, NOTE.E6] : [NOTE.C6, NOTE.E6, NOTE.G6];
  notes.forEach((f, i) => tone(out, { at: i * 0.09, dur: 0.7, freq: f, amp: 0.8, decay: 6 }));
  return finish(out, 0.24);
};

/** Soft whoosh when a drawing is cleared. */
const whoosh = (v: number): Gen => () => {
  const out = clip(0.62);
  noise(out, { dur: 0.6, amp: 1, seed: 171 + v, lp: 500 + v * 100, lpTo: 2600, hp: 300, attack: 0.24, decay: 4 });
  return finish(out, 0.34);
};

function variants(name: string, count: number, make: (v: number) => Gen, suffix: (v: number) => string = (v) => String(v + 1)): Record<string, Gen> {
  const out: Record<string, Gen> = {};
  for (let v = 0; v < count; v++) out[`${name}_${suffix(v)}`] = make(v);
  return out;
}

const ab = (v: number) => (v ? 'b' : 'a');

export const BANK: Record<string, Gen> = {
  ...variants('wood_tap', 3, woodTap),
  ...variants('boop', 3, boop),
  ...variants('bubble_pop', 2, bubblePop),
  ...variants('click_on', 2, (v) => click(true, v)),
  ...variants('click_off', 2, (v) => click(false, v)),
  ...variants('ding_dong', 2, dingDong),
  ...variants('peek', 2, peek),
  ...variants('lever', 2, leverCreak),
  ...variants('roll', 2, roll),
  ...variants('cup', 2, cup),
  ...variants('knob_c', 2, (v) => knob(NOTE.C5, v)),
  ...variants('knob_d', 2, (v) => knob(NOTE.D5, v)),
  ...variants('knob_e', 2, (v) => knob(NOTE.E5, v)),
  ...variants('knob_g', 2, (v) => knob(NOTE.G5, v)),
  ...variants('spin_start', 2, spinStart),
  ...variants('spin_click', 3, spinClick),
  ...variants('gear_start', 2, gearStart),
  ...variants('gear_tick', 3, gearTick),
  ...variants('clock_tick', 2, clockTick),
  ...variants('chirp', 3, chirp),
  ...variants('key_c', 2, (v) => key(NOTE.C5, v)),
  ...variants('key_e', 2, (v) => key(NOTE.E5, v)),
  ...variants('key_g', 2, (v) => key(NOTE.G5, v)),
  ...Object.assign({}, ...WHISTLE_NOTES.map((f, i) => variants(`whistle_${i + 1}`, 2, (v) => whistle(f, v), ab))),
  ...variants('zip_open', 2, (v) => zip(true, v)),
  ...variants('zip_close', 2, (v) => zip(false, v)),
  ...variants('lock_open', 2, (v) => lock(true, v)),
  ...variants('lock_close', 2, (v) => lock(false, v)),
  ...variants('cover_open', 2, coverOpen),
  ...variants('sleep', 3, sleep),
  ...variants('goodnight', 2, goodnight),
  ...variants('crayon_pop', 3, crayonPop),
  ...variants('chime', 2, chime),
  ...variants('whoosh', 2, whoosh),
};

export const SOUND_NAMES: readonly string[] = Object.keys(BANK);

/** Renders every sound. Takes a few tens of milliseconds; done once before the board appears. */
export function renderAll(): Map<string, Float32Array> {
  const out = new Map<string, Float32Array>();
  for (const [name, gen] of Object.entries(BANK)) out.set(name, gen());
  return out;
}
