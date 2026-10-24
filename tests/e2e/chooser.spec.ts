import { expect, test } from '@playwright/test';
import {
  choose,
  drawStroke,
  goChooser,
  goToAnimals,
  holdGate,
  logRows,
  openAnimal,
  openCritters,
  openDoors,
  sounds,
  state,
  tap,
  useDebug,
  waitForStored,
} from './helpers.ts';

test('the doors open on the chooser; each plate opens its app and home comes back', async ({ page }) => {
  await useDebug(page);
  await page.goto('./');
  await openDoors(page);
  await expect(page.locator('#board')).toBeHidden();
  await expect(page.locator('#picker')).toBeHidden();

  await choose(page, 'board');
  await tap(page, 'light-switch');
  expect(await state(page, 'light-switch')).toBe('on');
  await goChooser(page);

  await choose(page, 'critters');
  await openAnimal(page, 'dog');
  expect(await sounds(page)).toEqual(expect.arrayContaining([expect.stringMatching(/^chime_/)]));
  await goToAnimals(page);
  await goChooser(page);

  // The board kept its state while she was away.
  await choose(page, 'board');
  expect(await state(page, 'light-switch')).toBe('on');

  await expect
    .poll(async () => (await logRows(page)).filter((r) => r.event === 'navigate').map((r) => r.stateAfter))
    .toEqual(['chooser', 'board', 'chooser', 'picker', 'coloring:dog', 'picker', 'chooser', 'board']);
});

test('a second quick tap while the doors open does not pick an app', async ({ page }) => {
  await useDebug(page);
  await page.goto('./');
  const vp = page.viewportSize()!;
  await page.mouse.click(vp.width / 2, vp.height / 2);
  const plate = (await page.locator('.choice[data-app="board"]').boundingBox())!;
  await page.mouse.click(plate.x + plate.width / 2, plate.y + plate.height / 2);
  await page.waitForTimeout(300);
  await expect(page.locator('#chooser')).toBeVisible();
});

test('idle hints only come while the board is showing', async ({ page }) => {
  await useDebug(page, { idleHintMs: 800 });
  await page.goto('./');
  await openCritters(page);
  await page.waitForTimeout(2500);
  expect((await logRows(page)).filter((r) => r.event === 'idleHint')).toEqual([]);
  await goChooser(page);
  await choose(page, 'board');
  await expect.poll(async () => (await logRows(page)).filter((r) => r.event === 'idleHint').length, { timeout: 5000 }).toBeGreaterThanOrEqual(1);
});

test('one session timer covers Color Critters: goodnight saves the drawing, and the next session starts on the chooser', async ({ page }) => {
  await useDebug(page, { sessionMs: 7000, windDownMs: 4000, gateHoldMs: 300 });
  await page.goto('./');
  await openCritters(page);
  await openAnimal(page, 'pig');

  // Wind-down dims Color Critters too, and she can keep coloring.
  await expect(page.locator('body')).toHaveClass(/winding-down/, { timeout: 6000 });
  await drawStroke(page, [0.1, 0.5], [0.9, 0.5]);

  // Goodnight closes the doors over the coloring screen; the drawing is saved.
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'goodnight', { timeout: 8000 });
  await waitForStored(page, 'pig');
  expect(await sounds(page)).toEqual(expect.arrayContaining([expect.stringMatching(/^goodnight_/)]));

  await holdGate(page, 500);
  await page.getByRole('button', { name: 'Start a new session' }).click();
  await openDoors(page);
  await expect(page.locator('#coloring')).toBeHidden();
  await expect(page.locator('body')).not.toHaveClass(/winding-down/);
});
