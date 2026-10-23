import { describe, expect, it } from 'vitest';
import { SOUND_NAMES, renderAll } from '../../src/audio/bank.ts';
import { SR } from '../../src/audio/synth.ts';

const clips = renderAll();

describe('sound bank', () => {
  it('renders every sound in well under a second', () => {
    const t0 = performance.now();
    renderAll();
    expect(performance.now() - t0).toBeLessThan(1000);
  });

  it.each([...clips.entries()])('%s is a short, quiet, clean mono clip', (_name, data) => {
    expect(data).toBeInstanceOf(Float32Array); // mono
    expect(data.length / SR).toBeLessThan(1.5); // spec: under 1.5 seconds
    let peak = 0;
    for (const v of data) {
      expect(Number.isFinite(v)).toBe(true);
      peak = Math.max(peak, Math.abs(v));
    }
    expect(peak).toBeGreaterThan(0.05); // not silent
    expect(peak).toBeLessThanOrEqual(0.5); // mastered quiet
    expect(Math.abs(data[0]!)).toBeLessThan(0.01); // no click at the start
    expect(Math.abs(data[data.length - 1]!)).toBeLessThan(0.01); // or the end
  });

  it('gives every action 2 or 3 variants', () => {
    const families = new Map<string, number>();
    for (const name of SOUND_NAMES) {
      const family = name.replace(/_(\d|[ab])$/, '');
      families.set(family, (families.get(family) ?? 0) + 1);
    }
    for (const [family, count] of families) expect([family, count >= 2 && count <= 3]).toEqual([family, true]);
  });

  it('variants of one action sound different', () => {
    const a = clips.get('boop_1')!;
    const b = clips.get('boop_2')!;
    expect(a.length === b.length && a.every((v, i) => v === b[i])).toBe(false);
  });
});
