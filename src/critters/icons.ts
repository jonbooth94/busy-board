// Inline SVG icons (no external files or fonts), drawn like the board: thick ink lines, flat warm fills.

const S = 'xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#4a3426" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"';

/** Also used by the board's and the animal picker's home buttons. */
export const homeIcon = `<svg ${S} viewBox="0 0 100 100" aria-hidden="true"><path d="M24 46 V84 H76 V46" fill="#f6ead2"/><path d="M12 52 L50 18 L88 52 Z" fill="#d9775a"/><path d="M42 84 V64 H58 V84" fill="#a8723f"/></svg>`;

export const clearIcon = `<svg ${S} viewBox="0 0 100 100" aria-hidden="true"><path d="M18 62 L52 28 Q58 22 64 28 L82 46 Q88 52 82 58 L56 84 H34 L18 68 Q12 62 18 62 Z" fill="#ad86a6"/><path d="M38 42 L68 72"/><path d="M56 84 H86"/></svg>`;

export const ringSvg = `<svg class="ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="45" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/></svg>`;

/** A horizontal crayon pointing left, filled with the given color. */
export function crayonIcon(color: string, light: boolean): string {
  const edge = light ? '#a08670' : 'rgba(74,52,38,0.5)';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 64" aria-hidden="true">
    <path d="M6 32 L32 14 V50 Z" fill="${color}" stroke="${edge}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="30" y="10" width="94" height="44" rx="10" fill="${color}" stroke="${edge}" stroke-width="3"/>
    <rect x="52" y="10" width="54" height="44" fill="rgba(255,255,255,0.28)"/>
    <path d="M52 10 V54 M106 10 V54" stroke="${edge}" stroke-width="3"/>
  </svg>`;
}
