import { expect, test } from '@playwright/test';
import {
  clearSounds,
  collectErrors,
  logRows,
  objectIds,
  openBoard,
  pointOn,
  sounds,
  state,
  tap,
  useDebug,
  waitForServiceWorker,
} from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await useDebug(page);
  await page.goto('./');
});

test('loads with zero console errors, opens with one tap, and the service worker takes control', async ({ page }) => {
  // Let the first install finish (WebKit aborts sw.js with an error if reloaded mid-install), then relaunch.
  await waitForServiceWorker(page);
  const errors = collectErrors(page);
  await page.reload();
  await waitForServiceWorker(page);
  await openBoard(page);
  await expect(page.locator('.cell[data-id]')).toHaveCount(12);
  expect(await sounds(page)).toEqual(expect.arrayContaining([expect.stringMatching(/^cover_open_/)]));
  for (const id of objectIds) await tap(page, id);
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

test('every object reacts on touch-down, before the finger lifts, with a sound and a log entry', async ({ page }) => {
  await openBoard(page);
  for (const id of objectIds) {
    const before = await state(page, id);
    await clearSounds(page);
    const p = await pointOn(page, id);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    // Still pressed: the reaction has already happened.
    await expect.poll(() => sounds(page), { message: `${id} made no sound on touch-down` }).not.toEqual([]);
    if (!['three-keys', 'slide-whistle'].includes(id)) {
      expect(await state(page, id), `${id} did not change state on touch-down`).not.toBe(before);
    }
    await page.mouse.up();
  }
  await expect.poll(async () => new Set((await logRows(page)).filter((r) => r.event === 'tap').map((r) => r.objectId)).size).toBe(12);
  const rows = await logRows(page);
  expect(rows.find((r) => r.objectId === 'light-switch' && r.event === 'tap')).toMatchObject({ stateAfter: 'on', sessionId: expect.stringMatching(/^s\d{3,}$/) });
});

test('a cooldown stops machine-gun repeats, and is logged', async ({ page }) => {
  await openBoard(page);
  const p = await pointOn(page, 'color-knob');
  await page.mouse.click(p.x, p.y);
  await page.mouse.click(p.x, p.y); // well inside 250 ms
  expect(await state(page, 'color-knob')).toBe('yellow');
  await page.waitForTimeout(300);
  await page.mouse.click(p.x, p.y);
  expect(await state(page, 'color-knob')).toBe('green');
  await expect.poll(async () => (await logRows(page)).filter((r) => r.objectId === 'color-knob').map((r) => r.event)).toEqual(['tap', 'ignoredCooldown', 'tap']);
});

test('taps on empty board space get a soft wooden tap; the edge dead zone is ignored entirely', async ({ page }) => {
  await openBoard(page);
  const vp = page.viewportSize()!;
  await clearSounds(page);
  await page.mouse.click(20, vp.height / 2); // where a hand grips the edge
  await page.mouse.click(vp.width / 2, vp.height - 20);
  await page.waitForTimeout(200);
  expect(await sounds(page)).toEqual([]);

  // The corner of a plate, far from the drawn object.
  const cell = (await page.locator('.cell[data-id="big-button"]').boundingBox())!;
  await page.mouse.click(cell.x + 8, cell.y + 8);
  await expect.poll(() => sounds(page)).toEqual([expect.stringMatching(/^wood_tap_/)]);
  await expect.poll(async () => (await logRows(page)).filter((r) => r.objectId === 'empty')).toHaveLength(1);
  expect(await state(page, 'big-button')).toBe('idle');
});

test('a near miss within the hit padding still counts', async ({ page }) => {
  await openBoard(page);
  const box = (await page.locator('.cell[data-id="lock-and-key"] .hit').boundingBox())!;
  await page.mouse.click(box.x - 16, box.y + box.height / 2);
  expect(await state(page, 'lock-and-key')).toBe('open');
});

test('optional gestures: swiping the switch, sliding across keys, turning the knob', async ({ page }) => {
  await openBoard(page);

  // Swipe up turns the switch on (the touch-down already flipped it), swipe down turns it off.
  const sw = await pointOn(page, 'light-switch', 0.5, 0.7);
  await page.mouse.move(sw.x, sw.y);
  await page.mouse.down();
  expect(await state(page, 'light-switch')).toBe('on');
  await page.mouse.move(sw.x, sw.y + 40, { steps: 6 });
  await page.mouse.up();
  await expect.poll(() => state(page, 'light-switch')).toBe('off');

  // Sliding across the three keys plays a run.
  await clearSounds(page);
  const a = await pointOn(page, 'three-keys', 0.15, 0.6);
  const b = await pointOn(page, 'three-keys', 0.9, 0.6);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) {
    await page.mouse.move(a.x + ((b.x - a.x) * i) / 20, a.y);
    await page.waitForTimeout(20); // a toddler-speed slide, not faster than the 80 ms key cooldown
  }
  await page.mouse.up();
  const played = (await sounds(page)).map((s) => s.replace(/_\d$/, ''));
  expect(played).toEqual(['key_c', 'key_e', 'key_g']);

  // A circular drag around the knob turns it more than one notch.
  const c = await pointOn(page, 'color-knob', 0.5, 0.65);
  const r = 45;
  await page.mouse.move(c.x + r, c.y);
  await page.mouse.down();
  for (let i = 1; i <= 24; i++) {
    const ang = (i / 24) * 2 * Math.PI;
    await page.mouse.move(c.x + r * Math.cos(ang), c.y + r * Math.sin(ang));
  }
  await page.mouse.up();
  await expect.poll(async () => (await logRows(page)).filter((row) => row.objectId === 'color-knob' && row.event === 'drag').length).toBeGreaterThanOrEqual(3);
});

test('several objects respond together, each owns one finger, and a sixth finger is ignored', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'multi-touch is driven through the Chrome DevTools protocol');
  await openBoard(page);
  const cdp = await page.context().newCDPSession(page);
  const ids = ['big-button', 'light-switch', 'doorbell', 'lever', 'color-knob', 'lock-and-key'];
  const pts = await Promise.all(ids.map((id) => pointOn(page, id)));
  const touches = pts.map((p, i) => ({ ...p, id: i + 1, radiusX: 5, radiusY: 5 }));
  // Fingers land one at a time and all stay down.
  for (let n = 1; n <= touches.length; n++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touches.slice(0, n) });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

  const tapped = async () => new Set((await logRows(page)).filter((r) => r.event === 'tap').map((r) => r.objectId));
  await expect.poll(tapped).toEqual(new Set(ids.slice(0, 5)));
  expect(await state(page, 'lock-and-key')).toBe('locked'); // the sixth finger did nothing

  // A second finger on an object that already has one is ignored (waiting out the cooldown first).
  const p = await pointOn(page, 'zipper');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p, id: 1 }] });
  await page.waitForTimeout(700);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p, id: 1 }, { x: p.x + 10, y: p.y, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(700);
  expect(await state(page, 'zipper')).toBe('open');

  // Pinching didn't zoom the page.
  expect(await page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(1);
});

test('portrait shows a turn-the-device picture instead of the board', async ({ page }) => {
  const vp = page.viewportSize()!;
  await page.setViewportSize({ width: vp.height, height: vp.width });
  await expect(page.locator('#rotate')).toBeVisible();
  await page.setViewportSize(vp);
  await expect(page.locator('#rotate')).toBeHidden();
});

test('works offline: reload and play', async ({ page, context }) => {
  await waitForServiceWorker(page);
  await context.setOffline(true);
  try {
    await page.reload();
    await openBoard(page);
    await tap(page, 'light-switch');
    expect(await state(page, 'light-switch')).toBe('on');
  } finally {
    await context.setOffline(false);
  }
});

test('manifest is valid and the app is installable', async ({ page, browserName }) => {
  await waitForServiceWorker(page);
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const res = await page.request.get(new URL(href!, page.url()).href);
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest).toMatchObject({ name: 'Busy Board', display: 'fullscreen', orientation: 'landscape', start_url: '/busy-board/' });
  for (const icon of manifest.icons as { src: string }[]) {
    expect((await page.request.get(new URL(icon.src, res.url()).href)).ok()).toBe(true);
  }
  const touchIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  expect((await page.request.get(new URL(touchIcon!, page.url()).href)).ok()).toBe(true);

  if (browserName === 'chromium') {
    const cdp = await page.context().newCDPSession(page);
    const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
    expect(installabilityErrors).toEqual([]);
  }
});

test('makes no requests to other hosts', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname) && !['blob:', 'data:'].includes(url.protocol)) external.push(req.url());
  });
  await page.reload();
  await openBoard(page);
  for (const id of objectIds) await tap(page, id);
  expect(external).toEqual([]);
});
