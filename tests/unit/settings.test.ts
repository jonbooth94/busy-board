import { describe, expect, it } from 'vitest';
import settingsJson from '../../src/config/settings.json' with { type: 'json' };
import type { SettingsConfig } from '../../src/config/types.ts';
import { SETTINGS_KEY, loadDebug, loadSettings, saveSettings } from '../../src/settings.ts';

const cfg = settingsJson as SettingsConfig;
const ids = ['a', 'b', 'c'];

function memoryStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

describe('parent settings', () => {
  it('uses the defaults on first launch', () => {
    expect(loadSettings(cfg, ids, memoryStore())).toEqual(cfg.defaults);
  });

  it('saves and loads every setting', () => {
    const store = memoryStore();
    const s = { sessionMinutes: null, hidden: ['b'], volume: 'low' as const, coPlayPrompts: false };
    saveSettings(s, store);
    expect(loadSettings(cfg, ids, store)).toEqual(s);
  });

  it('falls back per field when a saved value is invalid', () => {
    const store = memoryStore({ [SETTINGS_KEY]: JSON.stringify({ sessionMinutes: 7, volume: 'loud', hidden: ['b', 'gone'], coPlayPrompts: 'yes' }) });
    expect(loadSettings(cfg, ids, store)).toEqual({ ...cfg.defaults, hidden: ['b'] });
  });

  it('survives corrupt JSON and missing storage', () => {
    expect(loadSettings(cfg, ids, memoryStore({ [SETTINGS_KEY]: '{oops' }))).toEqual(cfg.defaults);
    expect(loadSettings(cfg, ids, null)).toEqual(cfg.defaults);
  });

  it('never hides every object', () => {
    const store = memoryStore({ [SETTINGS_KEY]: JSON.stringify({ hidden: ids }) });
    expect(loadSettings(cfg, ids, store).hidden).toEqual(cfg.defaults.hidden);
  });

  it('reads debug overrides, ignoring junk', () => {
    expect(loadDebug(memoryStore({ 'bb.debug': '{"sessionMs":5000}' }))).toEqual({ sessionMs: 5000 });
    expect(loadDebug(memoryStore({ 'bb.debug': 'nope' }))).toEqual({});
    expect(loadDebug(memoryStore())).toEqual({});
  });
});
