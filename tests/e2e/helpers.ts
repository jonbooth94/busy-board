import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, type Page } from '@playwright/test';

export const ROOT = join(import.meta.dirname, '..', '..');
export const UPDATE_DIRS = { 'update-a': 'dist-update-a', 'update-b': 'dist-update-b' } as const;

export const objectIds: string[] = (JSON.parse(readFileSync(join(ROOT, 'src', 'config', 'board.json'), 'utf8')) as { objects: string[] }).objects;

export interface Debug {
  sessionMs?: number;
  windDownMs?: number;
  idleHintMs?: number;
  gateHoldMs?: number;
}

/** Test hooks for every page load: record sounds, plus optional shorter timings. */
export async function useDebug(page: Page, debug: Debug = {}): Promise<void> {
  await page.addInitScript((d) => localStorage.setItem('bb.debug', JSON.stringify({ recordSounds: true, ...d })), debug);
}

/** Collects console errors and uncaught page errors. */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

export async function waitForServiceWorker(page: Page): Promise<void> {
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15_000 });
}

export async function screen(page: Page): Promise<string | undefined> {
  return page.evaluate(() => document.body.dataset.screen);
}

/** Taps the closed cover and waits for the board. */
export async function openBoard(page: Page): Promise<void> {
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'cover');
  const vp = page.viewportSize()!;
  await page.mouse.click(vp.width / 2, vp.height / 2);
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'play');
  await expect(page.locator('.cell[data-id]').first()).toBeVisible();
  await page.waitForTimeout(900); // doors finish sliding open
}

/** Page coordinates of a point given as fractions (0..1) of an object's drawn bounds. */
export async function pointOn(page: Page, id: string, fx = 0.5, fy = 0.5): Promise<{ x: number; y: number }> {
  const box = await page.locator(`.cell[data-id="${id}"] .hit`).boundingBox();
  if (!box) throw new Error(`${id} not visible`);
  return { x: box.x + box.width * fx, y: box.y + box.height * fy };
}

export async function tap(page: Page, id: string, fx = 0.5, fy = 0.5): Promise<void> {
  const p = await pointOn(page, id, fx, fy);
  await page.mouse.click(p.x, p.y);
}

export async function state(page: Page, id: string): Promise<string | undefined> {
  return (await page.locator(`.cell[data-id="${id}"]`).getAttribute('data-state')) ?? undefined;
}

export async function sounds(page: Page): Promise<string[]> {
  return page.evaluate(() => [...((window as unknown as { __bbSounds?: string[] }).__bbSounds ?? [])]);
}

export async function clearSounds(page: Page): Promise<void> {
  await page.evaluate(() => (window as unknown as { __bbSounds?: string[] }).__bbSounds?.splice(0));
}

export interface Row {
  timestamp: string;
  sessionId: string;
  objectId: string;
  event: string;
  stateAfter: string;
}

/** Every logged event (the app writes in small batches, so poll with expect.poll). */
export async function logRows(page: Page): Promise<Row[]> {
  return page.evaluate(
    () =>
      new Promise<Row[]>((resolve) => {
        const req = indexedDB.open('busy-board');
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('events')) {
            db.close();
            resolve([]);
            return;
          }
          const all = db.transaction('events').objectStore('events').getAll();
          all.onsuccess = () => {
            resolve(all.result as Row[]);
            db.close();
          };
          all.onerror = () => resolve([]);
        };
        req.onerror = () => resolve([]);
      }),
  );
}

/** Holds the parent moon for `ms`. */
export async function holdGate(page: Page, ms: number): Promise<void> {
  const box = (await page.locator('#gate').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}
