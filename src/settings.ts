// Parent settings, saved in localStorage. Anything missing or invalid falls back to the defaults
// in src/config/settings.json, so a bad value can never stop the board from loading.

import type { Settings, SettingsConfig, VolumeLevel } from './config/types';

export const SETTINGS_KEY = 'bb.settings';

type Store = Pick<Storage, 'getItem' | 'setItem'>;

function safeStorage(): Store | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

export function loadSettings(cfg: SettingsConfig, objectIds: readonly string[], store: Store | null = safeStorage()): Settings {
  const d = cfg.defaults;
  let raw: Partial<Settings> = {};
  try {
    const text = store?.getItem(SETTINGS_KEY);
    const parsed: unknown = text ? JSON.parse(text) : {};
    if (parsed && typeof parsed === 'object') raw = parsed as Partial<Settings>;
  } catch {
    raw = {};
  }
  const hidden = Array.isArray(raw.hidden) ? raw.hidden.filter((id) => objectIds.includes(id)) : d.hidden;
  return {
    sessionMinutes: cfg.sessionOptions.includes(raw.sessionMinutes as number | null) && raw.sessionMinutes !== undefined ? raw.sessionMinutes : d.sessionMinutes,
    // Never hide everything: the board must always have something to play with.
    hidden: hidden.length >= objectIds.length ? d.hidden : hidden,
    volume: (['low', 'medium', 'high'] as VolumeLevel[]).includes(raw.volume as VolumeLevel) ? (raw.volume as VolumeLevel) : d.volume,
    coPlayPrompts: typeof raw.coPlayPrompts === 'boolean' ? raw.coPlayPrompts : d.coPlayPrompts,
  };
}

export function saveSettings(s: Settings, store: Store | null = safeStorage()): void {
  try {
    store?.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // storage unavailable: settings still apply for this launch
  }
}

/** Test hooks (set in localStorage "bb.debug" as JSON): shorter sessions, hints and gate holds. */
export interface DebugOverrides {
  sessionMs?: number;
  windDownMs?: number;
  idleHintMs?: number;
  gateHoldMs?: number;
  /** Record every sound name played in window.__bbSounds. */
  recordSounds?: boolean;
}

export function loadDebug(store: Pick<Storage, 'getItem'> | null = safeStorage()): DebugOverrides {
  try {
    const parsed: unknown = JSON.parse(store?.getItem('bb.debug') ?? '{}');
    return parsed && typeof parsed === 'object' ? (parsed as DebugOverrides) : {};
  } catch {
    return {};
  }
}
