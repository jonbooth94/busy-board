// The touch router decides which object a finger belongs to. Rules (from the spec):
// act on touch-down; hit padding around each object; ignore an edge dead zone, palms and any
// touch beyond 5; each object owns one finger at a time; movement over 12 px turns a touch
// into a drag, only on objects with an optional gesture.

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Target {
  id: string;
  rect: Rect;
  padding: number;
}

export interface RouterRules {
  edgeDeadZone: number;
  maxTouches: number;
  palmSize: number;
  dragThreshold: number;
}

export function inDeadZone(x: number, y: number, width: number, height: number, zone: number): boolean {
  return x < zone || y < zone || x > width - zone || y > height - zone;
}

/** Large contact areas are palms. Mice and pens report tiny sizes, and some platforms report 0 or 1. */
export function isPalm(e: { pointerType: string; width: number; height: number }, palmSize: number): boolean {
  return e.pointerType === 'touch' && Math.max(e.width, e.height) > palmSize;
}

/** The object whose padded rect contains the point; when padded rects overlap, the nearest one. */
export function pickTarget<T extends Target>(x: number, y: number, targets: readonly T[]): T | null {
  let best: T | null = null;
  let bestDist = Infinity;
  for (const t of targets) {
    const r = t.rect;
    const p = t.padding;
    if (x < r.left - p || x > r.right + p || y < r.top - p || y > r.bottom + p) continue;
    // Distance to the drawn rect (0 inside), so a point inside one object always wins over a near miss.
    const dx = Math.max(r.left - x, 0, x - r.right);
    const dy = Math.max(r.top - y, 0, y - r.bottom);
    const d = Math.hypot(dx, dy);
    if (d < bestDist) {
      best = t;
      bestDist = d;
    }
  }
  return best;
}

export function isDrag(dx: number, dy: number, threshold: number): boolean {
  return Math.hypot(dx, dy) > threshold;
}

// ---------- DOM binding ----------

export interface Point {
  x: number;
  y: number;
}

export interface Touchable {
  readonly id: string;
  readonly hasGesture: boolean;
  /** The drawn object's rect on screen, plus its hit padding. */
  target(): Target;
  down(p: Point, now: number): void;
  dragStart(start: Point, p: Point, now: number): void;
  drag(p: Point, now: number): void;
  up(now: number): void;
}

interface Finger {
  owner: Touchable | null;
  start: Point;
  dragging: boolean;
}

export interface RouterEvents {
  /** Any touch on the screen at all (for the idle timer), even ignored ones. */
  onAnyTouch(): void;
  /** A touch on empty board space. */
  onEmpty(p: Point): void;
}

export class TouchRouter {
  private readonly fingers = new Map<number, Finger>();
  private objects: Touchable[] = [];
  private targets: (Target & { obj: Touchable })[] | null = null;
  enabled = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly rules: RouterRules,
    private readonly events: RouterEvents,
  ) {
    root.addEventListener('pointerdown', (e) => this.onDown(e));
    root.addEventListener('pointermove', (e) => this.onMove(e));
    root.addEventListener('pointerup', (e) => this.onUp(e));
    root.addEventListener('pointercancel', (e) => this.onUp(e));
    root.addEventListener('lostpointercapture', (e) => this.onUp(e));
    window.addEventListener('resize', () => this.invalidate());
    window.addEventListener('orientationchange', () => this.invalidate());
  }

  setObjects(objects: Touchable[]): void {
    this.releaseAll();
    this.objects = objects;
    this.invalidate();
  }

  /** Recompute hit rects (after layout changes). */
  invalidate(): void {
    this.targets = null;
  }

  releaseAll(): void {
    const now = performance.now();
    for (const f of this.fingers.values()) f.owner?.up(now);
    this.fingers.clear();
  }

  private hitTargets(): (Target & { obj: Touchable })[] {
    this.targets ??= this.objects.map((obj) => ({ ...obj.target(), obj }));
    return this.targets;
  }

  private onDown(e: PointerEvent): void {
    e.preventDefault();
    if (!this.enabled) return;
    this.events.onAnyTouch();
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (this.fingers.size >= this.rules.maxTouches) return; // screen-banging
    if (isPalm(e, this.rules.palmSize)) return;
    if (inDeadZone(e.clientX, e.clientY, window.innerWidth, window.innerHeight, this.rules.edgeDeadZone)) return; // gripping hands

    const p = { x: e.clientX, y: e.clientY };
    const hit = pickTarget(p.x, p.y, this.hitTargets());
    const owner = hit && !this.ownedBy(hit.obj) ? hit.obj : null;
    if (hit && !owner) return; // that object already has a finger on it
    this.fingers.set(e.pointerId, { owner, start: p, dragging: false });
    try {
      this.root.setPointerCapture(e.pointerId);
    } catch {
      // capture is best-effort
    }
    if (owner) owner.down(p, performance.now());
    else this.events.onEmpty(p);
  }

  private ownedBy(obj: Touchable): boolean {
    for (const f of this.fingers.values()) if (f.owner === obj) return true;
    return false;
  }

  private onMove(e: PointerEvent): void {
    const f = this.fingers.get(e.pointerId);
    if (!f?.owner?.hasGesture) return;
    const p = { x: e.clientX, y: e.clientY };
    const now = performance.now();
    if (!f.dragging) {
      if (!isDrag(p.x - f.start.x, p.y - f.start.y, this.rules.dragThreshold)) return;
      f.dragging = true;
      f.owner.dragStart(f.start, p, now);
      return;
    }
    f.owner.drag(p, now);
  }

  private onUp(e: PointerEvent): void {
    const f = this.fingers.get(e.pointerId);
    if (!f) return;
    this.fingers.delete(e.pointerId);
    f.owner?.up(performance.now());
  }
}
