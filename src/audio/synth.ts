// Tiny offline synthesizer: every sound is computed into a mono Float32Array at startup, then
// copied into pre-decoded AudioBuffers, so playback starts with no decoding or file loading.
// Plain TypeScript with no DOM use, so Node (validator) and Vitest can run it.

export const SR = 44100;

/** Deterministic random numbers (mulberry32), so each variant sounds the same every launch. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clip(seconds: number): Float32Array {
  return new Float32Array(Math.ceil(seconds * SR));
}

export interface ToneOpts {
  at?: number;
  dur: number;
  freq: number;
  /** Glide (exponential) to this frequency over the tone's duration. */
  to?: number;
  amp: number;
  attack?: number;
  /** How fast it fades: the envelope is exp(-decay * t / dur). 7 is about -60 dB at the end. */
  decay?: number;
  /** [frequency ratio, level, extra decay] for each partial. Default: a pure sine. */
  partials?: [number, number, number?][];
  vibrato?: { rate: number; depth: number };
}

export function tone(out: Float32Array, o: ToneOpts): void {
  const start = Math.floor((o.at ?? 0) * SR);
  const n = Math.min(Math.floor(o.dur * SR), out.length - start);
  const attack = o.attack ?? 0.004;
  const decay = o.decay ?? 7;
  const partials = o.partials ?? [[1, 1]];
  const phases = partials.map(() => 0);
  const ratio = o.to ? o.to / o.freq : 1;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let f = o.to ? o.freq * Math.pow(ratio, t / o.dur) : o.freq;
    if (o.vibrato) f *= 1 + o.vibrato.depth * Math.sin(2 * Math.PI * o.vibrato.rate * t);
    const rise = t < attack ? t / attack : 1;
    let s = 0;
    for (let p = 0; p < partials.length; p++) {
      const [mult, level, extra = 1] = partials[p]!;
      phases[p]! += (2 * Math.PI * f * mult) / SR;
      s += Math.sin(phases[p]!) * level * Math.exp((-decay * extra * t) / o.dur);
    }
    out[start + i]! += s * rise * o.amp;
  }
}

export interface NoiseOpts {
  at?: number;
  dur: number;
  amp: number;
  seed: number;
  /** Low-pass cutoff in Hz, optionally sweeping to `lpTo`. */
  lp?: number;
  lpTo?: number;
  /** High-pass cutoff in Hz. */
  hp?: number;
  attack?: number;
  decay?: number;
  /** Amplitude wobble (e.g. a rolling ball). */
  wobble?: { rate: number; depth: number };
}

export function noise(out: Float32Array, o: NoiseOpts): void {
  const rand = rng(o.seed);
  const start = Math.floor((o.at ?? 0) * SR);
  const n = Math.min(Math.floor(o.dur * SR), out.length - start);
  const attack = o.attack ?? 0.002;
  const decay = o.decay ?? 7;
  const hpA = o.hp ? Math.exp((-2 * Math.PI * o.hp) / SR) : 0;
  let lpY = 0;
  let hpX = 0;
  let hpY = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let x = rand() * 2 - 1;
    if (o.lp) {
      const fc = o.lpTo ? o.lp * Math.pow(o.lpTo / o.lp, t / o.dur) : o.lp;
      const a = 1 - Math.exp((-2 * Math.PI * fc) / SR);
      lpY += a * (x - lpY);
      x = lpY;
    }
    if (o.hp) {
      hpY = hpA * (hpY + x - hpX);
      hpX = x;
      x = hpY;
    }
    const rise = t < attack ? t / attack : 1;
    const wob = o.wobble ? 1 - o.wobble.depth * (0.5 + 0.5 * Math.sin(2 * Math.PI * o.wobble.rate * t)) : 1;
    out[start + i]! += x * o.amp * rise * wob * Math.exp((-decay * t) / o.dur);
  }
}

/** Normalizes to a quiet peak and adds short fades so no clip starts or ends with a click. */
export function finish(out: Float32Array, peak: number): Float32Array {
  let max = 0;
  for (const v of out) max = Math.max(max, Math.abs(v));
  const gain = max > 0 ? peak / max : 0;
  const fade = Math.floor(0.004 * SR);
  for (let i = 0; i < out.length; i++) {
    let g = gain;
    if (i < fade) g *= i / fade;
    if (i > out.length - fade) g *= (out.length - i) / fade;
    out[i]! *= g;
  }
  return out;
}

/** Pentatonic scale (C D E G A) in Hz. Every musical object uses these, so any mix sounds pleasant. */
export const NOTE = {
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  G4: 392.0,
  A4: 440.0,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
  A5: 880.0,
  C6: 1046.5,
  D6: 1174.66,
  E6: 1318.51,
  G6: 1567.98,
} as const;
