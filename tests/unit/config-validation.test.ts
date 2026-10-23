import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ART } from '../../src/art/catalog.ts';
import { SOUND_NAMES } from '../../src/audio/bank.ts';
import { type ConfigFiles, validateConfig } from '../../scripts/config-validation.ts';

const dir = join(import.meta.dirname, '..', '..', 'src', 'config');
const read = (p: string) => readFileSync(join(dir, p), 'utf8');
const known = { sounds: new Set(SOUND_NAMES), art: ART };

function realFiles(): ConfigFiles {
  const objects: Record<string, string> = {};
  for (const f of readdirSync(join(dir, 'objects'))) objects[f] = read(join('objects', f));
  return { board: read('board.json'), settings: read('settings.json'), objects };
}

/** Real config with one object file edited. */
function withObject(file: string, edit: (o: Record<string, unknown>) => void): ConfigFiles {
  const files = realFiles();
  const o = JSON.parse(files.objects[file]!) as Record<string, unknown>;
  edit(o);
  files.objects[file] = JSON.stringify(o);
  return files;
}

const errorsFor = (files: ConfigFiles) => validateConfig(files, known);

describe('config validation', () => {
  it('passes for the real config', () => {
    expect(errorsFor(realFiles())).toEqual([]);
  });

  it('has 12 objects covering all five behavior types', () => {
    const files = realFiles();
    const types = new Set(Object.values(files.objects).map((t) => (JSON.parse(t) as { type: string }).type));
    expect(Object.keys(files.objects)).toHaveLength(12);
    expect(types).toEqual(new Set(['momentary', 'toggle', 'cycle', 'timed', 'instrument']));
  });

  it('catches an unknown sound', () => {
    const errors = errorsFor(withObject('big-button.json', (o) => ((o.states as Record<string, { onEnter: { sounds: string[] } }>).pressed!.onEnter.sounds = ['boop_1', 'kaboom'])));
    expect(errors.join()).toMatch(/unknown sound "kaboom"/);
  });

  it('requires 2 or 3 sound variants', () => {
    const errors = errorsFor(withObject('big-button.json', (o) => ((o.states as Record<string, { onEnter: { sounds: string[] } }>).pressed!.onEnter.sounds = ['boop_1'])));
    expect(errors.join()).toMatch(/2 or 3 sound variants/);
  });

  it('catches an animation the drawing does not have', () => {
    const errors = errorsFor(withObject('lever.json', (o) => ((o.states as Record<string, { onEnter: { anim: string } }>).down!.onEnter.anim = 'explode')));
    expect(errors.join()).toMatch(/no animation "explode"/);
  });

  it('catches two objects in one slot', () => {
    const errors = errorsFor(withObject('lever.json', (o) => (o.slot = { col: 1, row: 1 })));
    expect(errors.join()).toMatch(/slot 1,1 is already used/);
  });

  it('catches a slot off the board', () => {
    expect(errorsFor(withObject('lever.json', (o) => (o.slot = { col: 5, row: 1 }))).join()).toMatch(/"slot" must be/);
  });

  it('enforces the 24 px minimum hit padding', () => {
    expect(errorsFor(withObject('lever.json', (o) => (o.hitPadding = 8))).join()).toMatch(/hitPadding/);
  });

  it('keeps timed runs at or under 3 seconds', () => {
    expect(errorsFor(withObject('gears.json', (o) => (o.capMs = 9000))).join()).toMatch(/capMs/);
  });

  it('catches a gesture that does not fit the behavior type', () => {
    expect(errorsFor(withObject('lock-and-key.json', (o) => (o.optionalGesture = { kind: 'circular' }))).join()).toMatch(/optionalGesture/);
  });

  it('catches an object file missing from the board, and a board entry with no file', () => {
    const files = realFiles();
    files.objects['extra.json'] = files.objects['lever.json']!.replace('"lever"', '"extra"');
    const board = JSON.parse(files.board) as { objects: string[] };
    board.objects.push('ghost');
    files.board = JSON.stringify(board);
    const errors = errorsFor(files).join('\n');
    expect(errors).toMatch(/objects\/extra.json is not listed/);
    expect(errors).toMatch(/lists "ghost" but objects\/ghost.json doesn't exist/);
  });

  it('reports invalid JSON instead of crashing', () => {
    const files = realFiles();
    files.objects['lever.json'] = '{ "id": "lever", ';
    expect(errorsFor(files).join()).toMatch(/lever.json is not valid JSON/);
  });
});
