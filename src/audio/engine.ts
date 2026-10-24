// Web Audio playback with pre-decoded buffers: touch-to-sound latency is just the output latency.
// At most `maxVoices` sounds play at once; the oldest is cut when another starts.

import { renderAll } from './bank';
import { SR } from './synth';

interface Voice {
  src: AudioBufferSourceNode;
  gain: GainNode;
  ends: number;
  group?: string;
}

export interface PlayOptions {
  delayMs?: number;
  /** Starting a sound in a group cuts the previous one in that group (e.g. spinner clicks). */
  group?: string;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private readonly buffers = new Map<string, AudioBuffer>();
  private voices: Voice[] = [];
  private volume = 1;
  /** Test hook: called with each sound name that starts. */
  onPlay: ((name: string) => void) | null = null;

  /** Every sound, rendered once at launch, before the board appears. */
  private readonly samples: Map<string, Float32Array>;

  constructor(private readonly maxVoices: number) {
    this.samples = renderAll();
  }

  get names(): string[] {
    return [...this.samples.keys()];
  }

  get running(): boolean {
    return this.ctx?.state === 'running';
  }

  /** Create/resume the AudioContext. Must run inside a user gesture (iPad and Android both require it). */
  unlock(): void {
    try {
      if (!this.ctx) {
        // Play through the silent switch on iPad, like a toy would.
        const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
        if (session) session.type = 'playback';
        this.ctx = new AudioContext({ latencyHint: 'interactive' });
        this.master = this.ctx.createGain();
        this.master.gain.value = this.volume;
        this.master.connect(this.ctx.destination);
        for (const [name, data] of this.samples) {
          const buf = this.ctx.createBuffer(1, data.length, SR);
          buf.copyToChannel(data as Float32Array<ArrayBuffer>, 0);
          this.buffers.set(name, buf);
        }
      }
      if (this.ctx.state !== 'running') void this.ctx.resume();
      document.documentElement.dataset.audio = this.ctx.state;
      this.ctx.onstatechange = () => {
        if (this.ctx) document.documentElement.dataset.audio = this.ctx.state;
      };
    } catch {
      this.ctx = null;
    }
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  /** Play one of `names` at random. */
  playAny(names: readonly string[] | undefined, opts?: PlayOptions): void {
    if (!names?.length) return;
    this.play(names[Math.floor(Math.random() * names.length)]!, opts);
  }

  play(name: string, opts: PlayOptions = {}): void {
    this.onPlay?.(name);
    const ctx = this.ctx;
    const buffer = this.buffers.get(name);
    if (!ctx || !this.master || !buffer || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    this.voices = this.voices.filter((v) => v.ends > now);
    if (opts.group) for (const v of this.voices.filter((v) => v.group === opts.group)) this.stop(v, now);
    while (this.voices.length >= this.maxVoices) this.stop(this.voices[0]!, now);

    const start = now + (opts.delayMs ?? 0) / 1000;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    src.connect(gain).connect(this.master);
    src.start(start);
    const voice: Voice = { src, gain, ends: start + buffer.duration, group: opts.group };
    src.onended = () => {
      this.voices = this.voices.filter((v) => v !== voice);
    };
    this.voices.push(voice);
  }

  /** An optional bundled audio file (Color Critters animal sounds), at the same volume cap. */
  playFile(url: string): void {
    if (!this.running) return;
    const audio = new Audio(url);
    audio.volume = this.volume;
    audio.play().catch(() => undefined);
  }

  private stop(v: Voice, now: number): void {
    this.voices = this.voices.filter((x) => x !== v);
    try {
      // A 15 ms fade instead of a hard cut, so stopping never clicks.
      v.gain.gain.setValueAtTime(v.gain.gain.value, now);
      v.gain.gain.linearRampToValueAtTime(0, now + 0.015);
      v.src.stop(now + 0.02);
    } catch {
      // already stopped
    }
  }
}
