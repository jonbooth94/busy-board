// Validation rules for src/config. Used by the build (scripts/validate-config.ts) and by the
// unit tests. Plain TypeScript (no enums/namespaces) so Node can run it directly.

import { BEHAVIOR_TYPES } from '../src/config/types.ts';

export interface ArtInfo {
  sprites: readonly string[];
  anims: readonly string[];
  zones: readonly string[];
}

export interface Known {
  sounds: ReadonlySet<string>;
  art: Readonly<Record<string, ArtInfo>>;
}

export interface ConfigFiles {
  board: string;
  settings: string;
  /** Object config file name (e.g. "lever.json") to contents. */
  objects: Record<string, string>;
}

const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** Longest any one animation or timed run may last (spec: timed objects up to 3 seconds). */
const MAX_RUN_MS = 3000;
const MIN_PADDING = 24;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function parse(json: string, where: string, errors: string[]): unknown {
  try {
    return JSON.parse(json);
  } catch (e) {
    errors.push(`${where} is not valid JSON: ${(e as Error).message}`);
    return undefined;
  }
}

function checkSounds(sounds: unknown, where: string, known: Known, errors: string[]): void {
  if (!Array.isArray(sounds)) {
    errors.push(`${where}: "sounds" must be a list`);
    return;
  }
  if (sounds.length < 2 || sounds.length > 3) errors.push(`${where}: give 2 or 3 sound variants (got ${sounds.length})`);
  for (const s of sounds) {
    if (typeof s !== 'string' || !known.sounds.has(s)) errors.push(`${where}: unknown sound ${JSON.stringify(s)}`);
  }
}

function checkReaction(r: unknown, where: string, art: ArtInfo | undefined, known: Known, errors: string[]): void {
  if (r === undefined) return;
  if (!isObj(r)) {
    errors.push(`${where}: must be an object`);
    return;
  }
  if (r.sounds !== undefined) checkSounds(r.sounds, where, known, errors);
  if (r.anim !== undefined && art && !art.anims.includes(r.anim as string)) {
    errors.push(`${where}: the drawing has no animation ${JSON.stringify(r.anim)} (it has: ${art.anims.join(', ') || 'none'})`);
  }
  if (r.sprite !== undefined && art && !art.sprites.includes(r.sprite as string)) {
    errors.push(`${where}: the drawing has no pose ${JSON.stringify(r.sprite)}`);
  }
  if (r.cues !== undefined) {
    if (!Array.isArray(r.cues)) errors.push(`${where}: "cues" must be a list`);
    else
      r.cues.forEach((c: unknown, i) => {
        const w = `${where} cue ${i + 1}`;
        if (!isObj(c)) return void errors.push(`${w}: must be an object`);
        if (!isNum(c.atMs) || c.atMs < 0 || c.atMs > MAX_RUN_MS) errors.push(`${w}: "atMs" must be 0 to ${MAX_RUN_MS}`);
        checkSounds(c.sounds, w, known, errors);
      });
  }
}

function checkObject(file: string, raw: unknown, board: Obj, known: Known, errors: string[]): void {
  const where = `objects/${file}`;
  if (!isObj(raw)) return void errors.push(`${where}: must be an object`);
  const o = raw;
  const id = o.id;
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) errors.push(`${where}: "id" must be lowercase letters, numbers and dashes`);
  else if (`${id}.json` !== file) errors.push(`${where}: file name must match its id ("${id}.json")`);
  if (typeof o.name !== 'string' || !o.name.trim()) errors.push(`${where}: needs a "name" (shown to the parent only)`);
  if (typeof o.prompt !== 'string' || !o.prompt.trim()) errors.push(`${where}: needs a co-play "prompt"`);

  const type = o.type as string;
  if (!BEHAVIOR_TYPES.includes(type as never)) errors.push(`${where}: "type" must be one of ${BEHAVIOR_TYPES.join(', ')}`);

  const art = typeof o.art === 'string' ? known.art[o.art] : undefined;
  if (!art) errors.push(`${where}: unknown drawing ${JSON.stringify(o.art)} (see src/art/catalog.ts)`);

  const slot = o.slot;
  const cols = board.cols as number;
  const rows = board.rows as number;
  if (!isObj(slot) || !Number.isInteger(slot.col) || !Number.isInteger(slot.row) || (slot.col as number) < 1 || (slot.col as number) > cols || (slot.row as number) < 1 || (slot.row as number) > rows) {
    errors.push(`${where}: "slot" must be {col: 1-${cols}, row: 1-${rows}}`);
  }
  if (!isNum(o.hitPadding) || o.hitPadding < MIN_PADDING) errors.push(`${where}: "hitPadding" must be at least ${MIN_PADDING}`);
  if (!isNum(o.cooldownMs) || o.cooldownMs < 0 || o.cooldownMs > 1000) errors.push(`${where}: "cooldownMs" must be 0 to 1000`);
  if (o.idleHint !== undefined && o.idleHint !== 'wiggle') errors.push(`${where}: "idleHint" must be "wiggle"`);

  const states = o.states;
  const stateNames = isObj(states) ? Object.keys(states) : [];
  if (type === 'instrument') {
    if (states !== undefined) errors.push(`${where}: instruments have zones, not states`);
    const zones = o.zones;
    if (!Array.isArray(zones) || zones.length === 0) errors.push(`${where}: an instrument needs "zones"`);
    else {
      const ids = zones.map((z: unknown) => (isObj(z) ? z.id : undefined));
      if (art && JSON.stringify(ids) !== JSON.stringify(art.zones)) {
        errors.push(`${where}: zones must be ${JSON.stringify(art.zones)} to match the drawing (got ${JSON.stringify(ids)})`);
      }
      zones.forEach((z: unknown, i) => checkReaction(isObj(z) ? z.onEnter : undefined, `${where} zone ${i + 1}`, art, known, errors));
    }
  } else if (BEHAVIOR_TYPES.includes(type as never)) {
    if (!isObj(states)) errors.push(`${where}: needs "states"`);
    else {
      const two = type === 'momentary' || type === 'toggle' || type === 'timed';
      if (two && stateNames.length !== 2) errors.push(`${where}: a ${type} object has exactly 2 states (got ${stateNames.length})`);
      if (type === 'cycle' && stateNames.length < 2) errors.push(`${where}: a cycle needs at least 2 states`);
      if (typeof o.initial !== 'string' || !stateNames.includes(o.initial)) errors.push(`${where}: "initial" must be one of its states`);
      for (const name of stateNames) {
        const s = states[name];
        const w = `${where} state "${name}"`;
        if (!isObj(s)) {
          errors.push(`${w}: must be an object`);
          continue;
        }
        const sprite = (s.sprite as string | undefined) ?? name;
        if (art && !art.sprites.includes(sprite)) errors.push(`${w}: the drawing has no pose ${JSON.stringify(sprite)}`);
        checkReaction(s.onEnter, w, art, known, errors);
      }
    }
    if (type === 'cycle') {
      const order = o.order;
      if (!Array.isArray(order) || order.length !== stateNames.length || !stateNames.every((n) => order.includes(n))) {
        errors.push(`${where}: "order" must list every state exactly once`);
      }
    }
    if (type === 'momentary' || type === 'timed') {
      if (!isNum(o.durationMs) || o.durationMs < 200 || o.durationMs > MAX_RUN_MS) errors.push(`${where}: "durationMs" must be 200 to ${MAX_RUN_MS}`);
    }
    if (type === 'toggle' && (!isNum(o.animMs) || o.animMs < 200 || o.animMs > 600)) errors.push(`${where}: "animMs" must be 200 to 600`);
    if (type === 'timed') {
      if (!isNum(o.addMs) || o.addMs <= 0) errors.push(`${where}: "addMs" must be a positive number`);
      if (!isNum(o.capMs) || o.capMs > MAX_RUN_MS || (isNum(o.durationMs) && o.capMs < o.durationMs)) {
        errors.push(`${where}: "capMs" must be between durationMs and ${MAX_RUN_MS}`);
      }
      if (o.tick !== undefined) checkReaction(o.tick, `${where} tick`, art, known, errors);
      checkReaction(o.onExtend, `${where} onExtend`, art, known, errors);
    }
  }

  const g = o.optionalGesture;
  if (g !== undefined) {
    const allowed: Record<string, string[]> = {
      momentary: ['drag'],
      toggle: ['swipe'],
      cycle: ['circular'],
      timed: ['swipe'],
      instrument: ['slide'],
    };
    if (!isObj(g) || !(allowed[type] ?? []).includes(g.kind as string)) {
      errors.push(`${where}: "optionalGesture" for a ${type} object must be ${(allowed[type] ?? []).join(' or ')}`);
    } else if (type === 'toggle') {
      const dirs = g.directions;
      const okDirs = g.axis === 'vertical' ? ['up', 'down'] : ['left', 'right'];
      if (!isObj(dirs) || Object.keys(dirs).some((d) => !okDirs.includes(d)) || Object.values(dirs).some((s) => !stateNames.includes(s as string))) {
        errors.push(`${where}: a toggle swipe needs "directions" mapping ${okDirs.join('/')} to its states`);
      }
    }
  }
}

export function validateConfig(files: ConfigFiles, known: Known): string[] {
  const errors: string[] = [];
  const board = parse(files.board, 'board.json', errors);
  const settings = parse(files.settings, 'settings.json', errors);
  if (!isObj(board)) {
    if (board !== undefined) errors.push('board.json must be an object');
    return errors;
  }

  for (const k of ['cols', 'rows', 'edgeDeadZone', 'maxTouches', 'palmSize', 'dragThreshold', 'idleHintMs', 'windDownMs', 'gateHoldMs', 'maxVoices']) {
    if (!isNum(board[k]) || (board[k] as number) <= 0) errors.push(`board.json: "${k}" must be a positive number`);
  }
  for (const k of ['emptyTap', 'coverOpen', 'fallAsleep', 'goodnight']) {
    checkSounds(isObj(board[k]) ? board[k].sounds : undefined, `board.json ${k}`, known, errors);
  }

  const listed = Array.isArray(board.objects) ? (board.objects as unknown[]) : [];
  if (!Array.isArray(board.objects) || listed.length === 0) errors.push('board.json: "objects" must list the objects on the board');
  if (new Set(listed).size !== listed.length) errors.push('board.json: an object is listed twice');

  const slots = new Map<string, string>();
  for (const id of listed) {
    const file = `${String(id)}.json`;
    const text = files.objects[file];
    if (text === undefined) {
      errors.push(`board.json lists "${String(id)}" but objects/${file} doesn't exist`);
      continue;
    }
    const raw = parse(text, `objects/${file}`, errors);
    if (raw === undefined) continue;
    checkObject(file, raw, board, known, errors);
    const slot = isObj(raw) && isObj(raw.slot) ? `${String(raw.slot.col)},${String(raw.slot.row)}` : null;
    if (slot) {
      const other = slots.get(slot);
      if (other) errors.push(`objects/${file}: slot ${slot} is already used by ${other}`);
      slots.set(slot, String(id));
    }
  }
  for (const file of Object.keys(files.objects)) {
    if (!listed.includes(file.replace(/\.json$/, ''))) errors.push(`objects/${file} is not listed in board.json "objects"`);
  }

  if (isObj(settings)) {
    const d = settings.defaults;
    const levels = settings.volumeLevels;
    const opts = settings.sessionOptions;
    if (!isObj(d)) errors.push('settings.json: needs "defaults"');
    if (!isObj(levels) || !['low', 'medium', 'high'].every((k) => isNum(levels[k]) && (levels[k] as number) > 0 && (levels[k] as number) <= 1)) {
      errors.push('settings.json: "volumeLevels" needs low, medium and high between 0 and 1');
    }
    if (!Array.isArray(opts) || !opts.every((m) => m === null || (isNum(m) && m > 0))) errors.push('settings.json: "sessionOptions" must be minutes or null');
    if (isObj(d)) {
      if (Array.isArray(opts) && !opts.includes(d.sessionMinutes)) errors.push('settings.json: default "sessionMinutes" must be one of "sessionOptions"');
      if (!['low', 'medium', 'high'].includes(d.volume as string)) errors.push('settings.json: default "volume" must be low, medium or high');
      if (!Array.isArray(d.hidden) || d.hidden.some((h) => !listed.includes(h))) errors.push('settings.json: default "hidden" must list board objects');
      if (typeof d.coPlayPrompts !== 'boolean') errors.push('settings.json: default "coPlayPrompts" must be true or false');
    }
  } else if (settings !== undefined) {
    errors.push('settings.json must be an object');
  }
  return errors;
}
