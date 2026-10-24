import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, type Page } from '@playwright/test';

export const ROOT = join(import.meta.dirname, '..', '..');
export const UPDATE_DIRS = { 'update-a': 'dist-update-a', 'update-b': 'dist-update-b' } as const;

export const objectIds: string[] = (JSON.parse(readFileSync(join(ROOT, 'src', 'config', 'board.json'), 'utf8')) as { objects: string[] }).objects;

export const animalIds: string[] = (
  JSON.parse(readFileSync(join(ROOT, 'src', 'critters', 'animals', 'animals.json'), 'utf8')) as { id: string }[]
).map((a) => a.id);

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

/** Taps the closed cover and waits for the doors to open on the chooser. */
export async function openDoors(page: Page): Promise<void> {
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'cover');
  const vp = page.viewportSize()!;
  await page.mouse.click(vp.width / 2, vp.height / 2);
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'play');
  await expect(page.locator('#chooser')).toBeVisible();
  await page.waitForTimeout(900); // doors finish sliding open
}

/** Taps a plate on the chooser. */
export async function choose(page: Page, app: 'board' | 'critters'): Promise<void> {
  await page.locator(`.choice[data-app="${app}"]`).click();
  await expect(page.locator(app === 'board' ? '#board' : '#picker')).toBeVisible();
}

/** Taps the closed cover, then the Busy Board plate, and waits for the board. */
export async function openBoard(page: Page): Promise<void> {
  await openDoors(page);
  await choose(page, 'board');
  await expect(page.locator('.cell[data-id]').first()).toBeVisible();
}

/** Taps the closed cover, then the Color Critters plate, and waits for the animals. */
export async function openCritters(page: Page): Promise<void> {
  await openDoors(page);
  await choose(page, 'critters');
  await expect(page.locator('.tile').first()).toBeVisible();
}

/** The home button on the board or the animal picker. */
export async function goChooser(page: Page): Promise<void> {
  await page.locator('.home-btn.corner:visible').click();
  await expect(page.locator('#chooser')).toBeVisible();
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

// ---------- Color Critters ----------

export type RGB = [number, number, number];
export const WHITE: RGB = [255, 255, 255];

export async function openAnimal(page: Page, id: string): Promise<void> {
  await page.locator(`.tile[data-id="${id}"]`).click();
  await expect(page.locator('#coloring')).toBeVisible();
  await expect(page.locator('#paint[data-ready="true"]')).toBeAttached();
  await expect.poll(() => page.locator('#outline').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
}

/** The coloring screen's home button: back to the animals. */
export async function goToAnimals(page: Page): Promise<void> {
  await page.locator('#coloring-home').click();
  await expect(page.locator('#picker')).toBeVisible();
}

/** Page coordinates for a point given as a fraction (0..1) of the canvas. */
export async function canvasPoint(page: Page, fx: number, fy: number): Promise<{ x: number; y: number }> {
  const box = await page.locator('#paint').boundingBox();
  if (!box) throw new Error('canvas not visible');
  return { x: box.x + box.width * fx, y: box.y + box.height * fy };
}

/** Draws a stroke with the mouse between two canvas fractions. */
export async function drawStroke(page: Page, from: [number, number], to: [number, number]): Promise<void> {
  const a = await canvasPoint(page, ...from);
  const b = await canvasPoint(page, ...to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 12 });
  await page.mouse.up();
}

/** Reads a pixel from the 1024x1024 color layer at a canvas fraction. */
export async function pixelAt(page: Page, fx: number, fy: number): Promise<RGB> {
  return page.locator('#paint').evaluate(
    (c: HTMLCanvasElement, [x, y]) => {
      const d = c.getContext('2d')!.getImageData(Math.round(x * 1024), Math.round(y * 1024), 1, 1).data;
      return [d[0], d[1], d[2]] as [number, number, number];
    },
    [fx, fy] as const,
  );
}

export async function selectColor(page: Page, name: string): Promise<void> {
  await page.locator(`.swatch[data-color="${name}"]`).click();
  await expect(page.locator(`.swatch[data-color="${name}"]`)).toHaveAttribute('aria-pressed', 'true');
}

/** Waits until the drawing for an animal is stored in IndexedDB (or removed, if expectSaved=false). */
export async function waitForStored(page: Page, id: string, expectSaved = true): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(
          (animalId) =>
            new Promise<boolean>((resolve) => {
              const req = indexedDB.open('color-critters');
              req.onsuccess = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains('drawings')) {
                  db.close();
                  resolve(false);
                  return;
                }
                const get = db.transaction('drawings').objectStore('drawings').get(animalId);
                get.onsuccess = () => {
                  resolve(get.result !== undefined);
                  db.close();
                };
                get.onerror = () => resolve(false);
              };
              req.onerror = () => resolve(false);
            }),
          id,
        ),
      { timeout: 10_000 },
    )
    .toBe(expectSaved);
}

export function isColor(px: RGB, expected: RGB, tolerance = 12): boolean {
  return px.every((v, i) => Math.abs(v - expected[i]!) <= tolerance);
}

export const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
