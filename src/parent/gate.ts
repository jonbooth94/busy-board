// Parent gate: a small moon in the top corner, held for 3 seconds while a ring fills.
// A quick tap, letting go early, or sliding off cancels it.

const MOVE_CANCEL_PX = 24;

export const moonIcon = `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M62 16 A36 36 0 1 0 84 66 A30 30 0 1 1 62 16 Z" fill="#f6ead2" stroke="#4a3426" stroke-width="7" stroke-linejoin="round"/></svg>`;
const ringSvg = `<svg class="ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="45" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/></svg>`;

export function setupGate(btn: HTMLButtonElement, holdMs: number, onOpen: () => void): void {
  btn.innerHTML = moonIcon + ringSvg;
  const ring = btn.querySelector('.ring circle') as SVGCircleElement;
  let pointer: number | null = null;
  let start = 0;
  let x = 0;
  let y = 0;
  let frame = 0;

  const cancel = () => {
    cancelAnimationFrame(frame);
    pointer = null;
    ring.style.strokeDashoffset = '100';
  };

  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (pointer !== null) return;
    pointer = e.pointerId;
    x = e.clientX;
    y = e.clientY;
    try {
      btn.setPointerCapture(e.pointerId);
    } catch {
      // best-effort
    }
    start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / holdMs, 1);
      ring.style.strokeDashoffset = String(100 * (1 - progress));
      if (progress >= 1) {
        cancel();
        onOpen();
      } else {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
  });
  btn.addEventListener('pointermove', (e) => {
    if (e.pointerId === pointer && Math.hypot(e.clientX - x, e.clientY - y) > MOVE_CANCEL_PX) cancel();
  });
  const release = (e: PointerEvent) => {
    if (e.pointerId === pointer) cancel();
  };
  btn.addEventListener('pointerup', release);
  btn.addEventListener('pointercancel', release);
  btn.addEventListener('lostpointercapture', release);
}
