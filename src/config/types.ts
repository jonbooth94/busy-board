// Shapes of the JSON files in src/config. Plain TypeScript (no enums) so Node can import it directly.

export type BehaviorType = 'momentary' | 'toggle' | 'cycle' | 'timed' | 'instrument';
export const BEHAVIOR_TYPES: readonly BehaviorType[] = ['momentary', 'toggle', 'cycle', 'timed', 'instrument'];

/** A sound scheduled some time after the reaction starts (e.g. the ball landing in the cup). */
export interface Cue {
  atMs: number;
  sounds: string[];
}

/** What happens when a state is entered or a zone is played. One of `sounds` is picked at random. */
export interface Reaction {
  sounds?: string[];
  anim?: string;
  sprite?: string;
  cues?: Cue[];
}

export interface StateConfig {
  /** Static pose shown while in this state. Defaults to the state name. */
  sprite?: string;
  onEnter?: Reaction;
}

export interface ZoneConfig {
  id: string;
  onEnter: Reaction;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

/** Every optional gesture duplicates a tap; none is ever required. */
export type Gesture =
  | { kind: 'swipe'; axis?: 'vertical' | 'horizontal'; directions?: Partial<Record<Direction, string>> }
  | { kind: 'circular' }
  | { kind: 'drag'; axis?: 'vertical' | 'horizontal' }
  | { kind: 'slide' };

export interface ObjectConfig {
  id: string;
  name: string;
  type: BehaviorType;
  /** Which drawing in src/art renders this object. */
  art: string;
  slot: { col: number; row: number };
  hitPadding: number;
  cooldownMs: number;
  initial?: string;
  states?: Record<string, StateConfig>;
  /** Cycle only: the order the states advance in. */
  order?: string[];
  /** Momentary: how long the active state lasts. Timed: how long one run lasts. */
  durationMs?: number;
  /** Toggle: how long the flip animation takes; taps during it are queued. */
  animMs?: number;
  /** Timed: time added by a tap while running, and the most time a run can have left. */
  addMs?: number;
  capMs?: number;
  /** Timed: sound for each click/tick the drawing reports while moving. */
  tick?: { sounds: string[] };
  /** Timed: reaction when a tap adds time. */
  onExtend?: Reaction;
  /** Instrument: one entry per playable zone. */
  zones?: ZoneConfig[];
  optionalGesture?: Gesture;
  idleHint?: 'wiggle';
  /** Co-play prompt for the parent (never shown to the child). */
  prompt: string;
}

export interface BoardConfig {
  cols: number;
  rows: number;
  objects: string[];
  edgeDeadZone: number;
  maxTouches: number;
  palmSize: number;
  dragThreshold: number;
  idleHintMs: number;
  windDownMs: number;
  gateHoldMs: number;
  maxVoices: number;
  emptyTap: { sounds: string[] };
  coverOpen: { sounds: string[] };
  fallAsleep: { sounds: string[] };
  goodnight: { sounds: string[] };
}

export type VolumeLevel = 'low' | 'medium' | 'high';

export interface Settings {
  /** null = no session limit. */
  sessionMinutes: number | null;
  hidden: string[];
  volume: VolumeLevel;
  coPlayPrompts: boolean;
}

export interface SettingsConfig {
  defaults: Settings;
  sessionOptions: (number | null)[];
  volumeLevels: Record<VolumeLevel, number>;
}
