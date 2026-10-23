// Fails the build if src/config has a problem. Run: npm run validate
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ART } from '../src/art/catalog.ts';
import { SOUND_NAMES } from '../src/audio/bank.ts';
import { validateConfig } from './config-validation.ts';

const dir = join(import.meta.dirname, '..', 'src', 'config');
const read = (p: string) => readFileSync(join(dir, p), 'utf8');

const objects: Record<string, string> = {};
for (const f of readdirSync(join(dir, 'objects'))) if (f.endsWith('.json')) objects[f] = read(join('objects', f));

const errors = validateConfig({ board: read('board.json'), settings: read('settings.json'), objects }, { sounds: new Set(SOUND_NAMES), art: ART });

if (errors.length) {
  console.error('Config validation failed:\n' + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
console.log(`Config validation passed (${Object.keys(objects).length} objects, ${SOUND_NAMES.length} sounds).`);
