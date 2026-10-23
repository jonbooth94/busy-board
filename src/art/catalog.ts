// What each drawing in src/art supports. Object configs may only use these names; the build
// validator checks that, and each drawing's TypeScript type must implement exactly these anims.
// Plain data (no imports) so Node can read it directly.

export const ART = {
  'big-button': { sprites: ['idle', 'pressed'], anims: ['squish'], zones: [] },
  'light-switch': { sprites: ['switch_down', 'switch_up'], anims: ['lamp_glow', 'lamp_dim'], zones: [] },
  doorbell: { sprites: ['idle', 'ringing'], anims: ['peek'], zones: [] },
  lever: { sprites: ['up', 'down'], anims: ['pull'], zones: [] },
  'color-knob': { sprites: ['light_red', 'light_yellow', 'light_green', 'light_blue'], anims: ['turn'], zones: [] },
  'spinner-wheel': { sprites: ['still', 'spinning'], anims: [], zones: [] },
  gears: { sprites: ['still', 'turning'], anims: ['puff'], zones: [] },
  clock: { sprites: ['still', 'spinning'], anims: ['bird_out', 'bird_in', 'bird_bob'], zones: [] },
  'three-keys': { sprites: [], anims: ['press_c', 'press_e', 'press_g'], zones: ['c', 'e', 'g'] },
  'slide-whistle': {
    sprites: ['handle_1', 'handle_2', 'handle_3', 'handle_4', 'handle_5', 'handle_6', 'handle_7', 'handle_8'],
    anims: ['note'],
    zones: ['1', '2', '3', '4', '5', '6', '7', '8'],
  },
  zipper: { sprites: ['zip_closed', 'zip_open'], anims: ['jiggle', 'reveal'], zones: [] },
  'lock-and-key': { sprites: ['lock_closed', 'lock_open'], anims: ['settle', 'sparkle'], zones: [] },
} as const;

export type ArtId = keyof typeof ART;
export type AnimOf<A extends ArtId> = (typeof ART)[A]['anims'][number];
