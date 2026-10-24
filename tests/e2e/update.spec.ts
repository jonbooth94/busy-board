import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import {
  ROOT,
  UPDATE_DIRS,
  choose,
  drawStroke,
  goChooser,
  goToAnimals,
  logRows,
  openAnimal,
  openCritters,
  tap,
  useDebug,
  waitForServiceWorker,
  waitForStored,
} from './helpers.ts';
import { SwitchableServer } from './switchable-server.ts';

const dirA = join(ROOT, UPDATE_DIRS['update-a']);
const dirB = join(ROOT, UPDATE_DIRS['update-b']);

const version = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.dataset.version).catch(() => 'navigating');

test('an update is applied only when the doors are closed, never during play, and the log and drawings survive', async ({ page }) => {
  // Sanity: version B really ships a changed asset.
  const jsA = readdirSync(join(dirA, 'assets')).filter((f) => f.endsWith('.js')).sort();
  const jsB = readdirSync(join(dirB, 'assets')).filter((f) => f.endsWith('.js')).sort();
  expect(jsA).not.toEqual(jsB);

  await useDebug(page, { sessionMs: 16000, windDownMs: 2000 });
  const server = new SwitchableServer();
  const url = await server.start(dirA);
  try {
    // --- Version A is installed, a drawing is made and play moves to the board.
    await page.goto(url);
    await waitForServiceWorker(page);
    expect(await version(page)).toBe('update-a');
    await openCritters(page);
    await openAnimal(page, 'turtle');
    await drawStroke(page, [0.1, 0.3], [0.9, 0.3]);
    await waitForStored(page, 'turtle');
    await goToAnimals(page);
    await goChooser(page);
    await choose(page, 'board');
    await tap(page, 'light-switch');
    await page.evaluate(() => ((window as unknown as { noReload: boolean }).noReload = true));

    // --- Version B is deployed and found while the child is playing.
    server.root = dirB;
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg?.update();
    });
    await expect
      .poll(() => page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting), { timeout: 20_000 })
      .toBe(true);

    // It must NOT reload during play.
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => (window as unknown as { noReload?: boolean }).noReload)).toBe(true);
    expect(await version(page)).toBe('update-a');
    await tap(page, 'big-button');

    // --- At goodnight the update is applied, and the board stays at goodnight.
    await expect.poll(() => version(page), { timeout: 20_000 }).toBe('update-b');
    expect(await page.evaluate(() => (window as unknown as { noReload?: boolean }).noReload)).toBeUndefined();
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'goodnight');

    // --- The playtest log and the drawing survived the update.
    const rows = await logRows(page);
    expect(rows.map((r) => r.objectId)).toEqual(expect.arrayContaining(['light-switch', 'big-button']));
    await waitForStored(page, 'turtle');
  } finally {
    await server.stop();
  }
});

test('a fresh launch applies a waiting update immediately', async ({ page }) => {
  const server = new SwitchableServer();
  const url = await server.start(dirA);
  try {
    await page.goto(url);
    await waitForServiceWorker(page);
    expect(await version(page)).toBe('update-a');
    server.root = dirB;
    // Relaunch: the app opens on the closed cover, finds B, and switches to it.
    await page.reload();
    await expect.poll(() => version(page), { timeout: 20_000 }).toBe('update-b');
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'cover');
  } finally {
    await server.stop();
  }
});
