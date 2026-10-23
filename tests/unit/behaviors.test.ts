import { describe, expect, it } from 'vitest';
import type { ObjectConfig } from '../../src/config/types.ts';
import { Cooldown, Cycle, Instrument, Momentary, Timed, Toggle, createMachine } from '../../src/engine/behaviors.ts';

const base = { name: 'x', art: 'x', slot: { col: 1, row: 1 }, hitPadding: 24, cooldownMs: 250, prompt: 'x' };
const momentary: ObjectConfig = { ...base, id: 'button', type: 'momentary', initial: 'idle', durationMs: 400, states: { idle: {}, pressed: {} } };
const toggle: ObjectConfig = { ...base, id: 'switch', type: 'toggle', initial: 'off', animMs: 300, states: { off: {}, on: {} } };
const cycle: ObjectConfig = { ...base, id: 'knob', type: 'cycle', initial: 'red', order: ['red', 'yellow', 'green', 'blue'], states: { red: {}, yellow: {}, green: {}, blue: {} } };
const timed: ObjectConfig = { ...base, id: 'spinner', type: 'timed', initial: 'still', durationMs: 2000, addMs: 800, capMs: 3000, states: { still: {}, spinning: {} } };
const instrument: ObjectConfig = { ...base, id: 'keys', type: 'instrument', cooldownMs: 80, zones: [{ id: 'c', onEnter: {} }, { id: 'e', onEnter: {} }] };

describe('momentary', () => {
  it('goes active on a tap and back to idle after its animation', () => {
    const m = new Momentary(momentary);
    expect(m.press(0)).toEqual([{ kind: 'enter', state: 'pressed' }]);
    expect(m.update(399)).toEqual([]);
    expect(m.update(400)).toEqual([{ kind: 'enter', state: 'idle' }]);
    expect(m.state).toBe('idle');
  });

  it('ignores taps until idle', () => {
    const m = new Momentary(momentary);
    m.press(0);
    expect(m.press(100)).toEqual([{ kind: 'busy' }]);
    expect(m.state).toBe('pressed');
    m.update(400);
    expect(m.press(500)).toEqual([{ kind: 'enter', state: 'pressed' }]);
  });
});

describe('toggle', () => {
  it('flips between two states on each tap', () => {
    const t = new Toggle(toggle);
    expect(t.press(0)).toEqual([{ kind: 'enter', state: 'on' }]);
    expect(t.press(1000)).toEqual([{ kind: 'enter', state: 'off' }]);
  });

  it('queues a tap made during the flip animation and runs it afterwards', () => {
    const t = new Toggle(toggle);
    t.press(0);
    expect(t.press(100)).toEqual([{ kind: 'queued' }]);
    expect(t.state).toBe('on');
    expect(t.settled).toBe('off');
    expect(t.update(299)).toEqual([]);
    expect(t.update(300)).toEqual([{ kind: 'enter', state: 'off' }]);
  });

  it('two taps during one animation cancel out', () => {
    const t = new Toggle(toggle);
    t.press(0);
    t.press(100);
    t.press(200);
    expect(t.update(400)).toEqual([]);
    expect(t.state).toBe('on');
    expect(t.busy(400)).toBe(false);
  });

  it('a swipe sets a specific state and ignores a swipe to where it already is', () => {
    const t = new Toggle(toggle);
    expect(t.set('off', 0)).toEqual([]);
    expect(t.set('on', 0)).toEqual([{ kind: 'enter', state: 'on' }]);
    expect(t.set('on', 1000)).toEqual([]);
  });
});

describe('cycle', () => {
  it('advances one step per tap and wraps around', () => {
    const c = new Cycle(cycle);
    const seen = [1, 2, 3, 4, 5].map(() => (c.press()[0] as { state: string }).state);
    expect(seen).toEqual(['yellow', 'green', 'blue', 'red', 'yellow']);
  });

  it('steps backwards for a counter-clockwise turn', () => {
    const c = new Cycle(cycle);
    expect(c.step(-1)).toEqual([{ kind: 'enter', state: 'blue' }]);
  });

  it('is never busy, so a tap always advances immediately', () => {
    expect(new Cycle(cycle).busy()).toBe(false);
  });
});

describe('timed', () => {
  it('runs for its duration, then rests', () => {
    const t = new Timed(timed);
    expect(t.press(0)).toEqual([{ kind: 'enter', state: 'spinning' }]);
    expect(t.remaining(500)).toBe(1500);
    expect(t.update(1999)).toEqual([]);
    expect(t.update(2000)).toEqual([{ kind: 'enter', state: 'still' }]);
    expect(t.remaining(2000)).toBe(0);
  });

  it('a tap while running adds time, up to the cap', () => {
    const t = new Timed(timed);
    t.press(0);
    expect(t.press(500)).toEqual([{ kind: 'extend' }]);
    expect(t.remaining(500)).toBe(2300);
    expect(t.press(600)).toEqual([{ kind: 'extend' }]);
    expect(t.remaining(600)).toBe(3000); // capped
    expect(t.press(600)).toEqual([]); // already at the cap: nothing to add
    expect(t.press(700)).toEqual([{ kind: 'extend' }]); // tops back up to the cap
    expect(t.remaining(700)).toBe(3000);
  });
});

describe('instrument', () => {
  it('plays the zone under the finger every time, with no lasting state', () => {
    const i = new Instrument(instrument);
    expect(i.press(0, 'c')).toEqual([{ kind: 'zone', zone: 'c' }]);
    expect(i.press(1, 'c')).toEqual([{ kind: 'zone', zone: 'c' }]);
    expect(i.press(2, 'nope')).toEqual([]);
    expect(i.state).toBe('ready');
  });
});

describe('cooldown', () => {
  it('blocks repeats inside the window and allows them after', () => {
    const c = new Cooldown(250);
    expect(c.take(0)).toBe(true);
    expect(c.take(249)).toBe(false);
    expect(c.take(250)).toBe(true);
  });
});

it('createMachine picks the class for each behavior type', () => {
  expect(createMachine(momentary)).toBeInstanceOf(Momentary);
  expect(createMachine(toggle)).toBeInstanceOf(Toggle);
  expect(createMachine(cycle)).toBeInstanceOf(Cycle);
  expect(createMachine(timed)).toBeInstanceOf(Timed);
  expect(createMachine(instrument)).toBeInstanceOf(Instrument);
});
