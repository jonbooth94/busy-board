import boardJson from './board.json';
import settingsJson from './settings.json';
import type { BoardConfig, ObjectConfig, SettingsConfig } from './types';

const files = import.meta.glob<ObjectConfig>('./objects/*.json', { eager: true, import: 'default' });
const byId = new Map(Object.values(files).map((o) => [o.id, o]));

export const board = boardJson as BoardConfig;
export const settingsConfig = settingsJson as SettingsConfig;

/** The objects on the board, in board.json order. (The build validator guarantees they all exist.) */
export const objects: ObjectConfig[] = board.objects.flatMap((id) => byId.get(id) ?? []);
