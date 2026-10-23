import { describe, expect, it } from 'vitest';
import { inDeadZone, isDrag, isPalm, pickTarget, type Target } from '../../src/engine/router.ts';

const t = (id: string, left: number, top: number, size = 100, padding = 24): Target => ({
  id,
  rect: { left, top, right: left + size, bottom: top + size },
  padding,
});

describe('hit testing', () => {
  const targets = [t('a', 100, 100), t('b', 230, 100)];

  it('hits an object inside its drawn rect', () => {
    expect(pickTarget(150, 150, targets)?.id).toBe('a');
  });

  it('counts a near miss within the hit padding', () => {
    expect(pickTarget(80, 150, targets)?.id).toBe('a'); // 20 px left of a
    expect(pickTarget(150, 222, targets)?.id).toBe('a'); // 22 px below a
  });

  it('misses beyond the padding', () => {
    expect(pickTarget(70, 150, targets)).toBeNull();
    expect(pickTarget(150, 230, targets)).toBeNull();
  });

  it('where padded rects overlap, picks the nearer object', () => {
    // a ends at 200, b starts at 230: both paddings cover 200..230.
    expect(pickTarget(210, 150, targets)?.id).toBe('a');
    expect(pickTarget(222, 150, targets)?.id).toBe('b');
  });
});

describe('edge dead zone', () => {
  it('ignores touches within 40 px of any edge', () => {
    expect(inDeadZone(39, 400, 1180, 820, 40)).toBe(true);
    expect(inDeadZone(600, 39, 1180, 820, 40)).toBe(true);
    expect(inDeadZone(1141, 400, 1180, 820, 40)).toBe(true);
    expect(inDeadZone(600, 781, 1180, 820, 40)).toBe(true);
    expect(inDeadZone(41, 41, 1180, 820, 40)).toBe(false);
  });
});

describe('palm rejection', () => {
  it('ignores large touches, but not mice, pens or platforms that report no size', () => {
    expect(isPalm({ pointerType: 'touch', width: 120, height: 90 }, 80)).toBe(true);
    expect(isPalm({ pointerType: 'touch', width: 30, height: 30 }, 80)).toBe(false);
    expect(isPalm({ pointerType: 'touch', width: 0, height: 0 }, 80)).toBe(false);
    expect(isPalm({ pointerType: 'mouse', width: 1, height: 1 }, 80)).toBe(false);
  });
});

describe('drag promotion', () => {
  it('only movement over 12 px turns a touch into a drag', () => {
    expect(isDrag(8, 8, 12)).toBe(false); // ~11.3 px wobble stays a tap
    expect(isDrag(0, 13, 12)).toBe(true);
  });
});
