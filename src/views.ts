// What shows while the doors are open: the chooser, the busy board, or Color Critters (its
// animal picker and coloring screen). One view at a time; the cover doors close over all of them.

export type View = 'chooser' | 'board' | 'picker' | 'coloring';
export type App = 'board' | 'critters';

export class Views {
  view: View = 'chooser';
  private readonly els: Record<View, HTMLElement>;

  constructor(private readonly onChange: (view: View) => void) {
    const el = (id: string) => document.getElementById(id) as HTMLElement;
    this.els = { chooser: el('chooser'), board: el('board-view'), picker: el('picker'), coloring: el('coloring') };
  }

  show(view: View): void {
    for (const [name, el] of Object.entries(this.els)) el.hidden = name !== view;
    this.view = view;
    document.body.dataset.view = view;
    this.onChange(view);
  }
}

// ---------- Chooser: two big plates, no words ----------

// A corner of the board (the same drawing as the app icon).
const boardArt = `
  <svg viewBox="212 212 600 600" aria-hidden="true">
    <g stroke="#4a3426" stroke-width="22" stroke-linecap="round" stroke-linejoin="round">
      <rect x="232" y="232" width="268" height="268" rx="48" fill="#f0cf9f"/>
      <rect x="524" y="232" width="268" height="268" rx="48" fill="#f0cf9f"/>
      <rect x="232" y="524" width="268" height="268" rx="48" fill="#f0cf9f"/>
      <rect x="524" y="524" width="268" height="268" rx="48" fill="#f0cf9f"/>
      <ellipse cx="366" cy="410" rx="92" ry="36" fill="#a8723f"/>
      <path d="M286 352 V392 A80 32 0 0 0 446 392 V352 Z" fill="#b85f45"/>
      <ellipse cx="366" cy="352" rx="80" ry="32" fill="#d9775a"/>
      <rect x="610" y="282" width="96" height="170" rx="22" fill="#e3b04b"/>
      <rect x="636" y="312" width="44" height="110" rx="14" fill="#6b4a35"/>
      <rect x="630" y="316" width="56" height="46" rx="12" fill="#f6ead2"/>
      <circle cx="366" cy="658" r="88" fill="#ad86a6"/>
      <circle cx="366" cy="658" r="54" fill="#f6ead2"/>
      <path d="M366 650 V614" stroke-width="18"/>
      <rect x="560" y="586" width="60" height="150" rx="16" fill="#d9775a"/>
      <rect x="628" y="586" width="60" height="150" rx="16" fill="#e3b04b"/>
      <rect x="696" y="586" width="60" height="150" rx="16" fill="#7fa3bf"/>
    </g>
  </svg>`;

// A half-colored cat on a sheet of paper, with a crayon.
const crittersArt = `
  <svg viewBox="0 0 1024 1024" aria-hidden="true">
    <rect x="140" y="110" width="744" height="804" rx="44" fill="#fff" stroke="#4a3426" stroke-width="22"/>
    <g transform="translate(130 120) scale(0.75)" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M340 205 L350 270 M684 205 L674 270 M360 300 C440 262 590 262 666 300 M330 470 C350 520 400 545 470 550 M694 470 C674 520 624 545 554 550" stroke="#fb8c00" stroke-width="64"/>
      <path d="M410 640 C470 620 560 640 620 630 M380 720 C470 700 580 720 650 712" stroke="#1e88e5" stroke-width="64"/>
      <g stroke="#4a3426" stroke-width="22">
        <path d="M330 295 C210 400 290 600 512 605 C734 600 814 400 694 295 L714 150 L584 225 C540 212 484 212 440 225 L310 150 Z"/>
        <ellipse cx="435" cy="395" rx="40" ry="48"/><circle cx="438" cy="401" r="15"/>
        <ellipse cx="589" cy="395" rx="40" ry="48"/><circle cx="592" cy="401" r="15"/>
        <path d="M495 468 H529 L512 488 Z M512 488 Q495 518 470 503 M512 488 Q529 518 554 503"/>
        <path d="M390 575 C330 650 315 760 335 860 H689 C709 760 694 650 634 575"/>
        <path d="M689 830 C800 840 860 760 810 690 C780 650 735 680 765 712"/>
      </g>
    </g>
    <g transform="translate(640 790) rotate(-32)" stroke="#4a3426" stroke-width="16" stroke-linejoin="round">
      <path d="M-200 0 L-140 -46 V46 Z" fill="#e53935"/>
      <rect x="-146" y="-56" width="330" height="112" rx="26" fill="#e53935"/>
      <path d="M-80 -56 V56 M120 -56 V56" fill="none"/>
    </g>
  </svg>`;

/** Fills the chooser. Plates react on touch-down, like everything on the board. */
export function setupChooser(el: HTMLElement, onPick: (app: App) => void): void {
  el.innerHTML = `
    <button class="choice" type="button" data-app="board" aria-label="Busy Board">${boardArt}</button>
    <button class="choice" type="button" data-app="critters" aria-label="Color Critters">${crittersArt}</button>`;
  for (const btn of el.querySelectorAll<HTMLButtonElement>('.choice')) {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      onPick(btn.dataset.app as App);
    });
  }
}
