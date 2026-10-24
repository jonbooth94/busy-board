import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { clearSounds, holdGate, logRows, openBoard, sounds, tap, useDebug } from './helpers.ts';

test('the parent gate ignores a quick tap and opens after a 3-second hold', async ({ page }) => {
  await useDebug(page);
  await page.goto('./');
  await openBoard(page);
  await holdGate(page, 400);
  await page.waitForTimeout(300);
  await expect(page.locator('#parent')).toBeHidden();

  // While holding, the ring is visibly filling.
  const box = (await page.locator('#gate').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1500);
  const offset = await page.locator('#gate .ring circle').evaluate((c) => parseFloat((c as SVGElement).style.strokeDashoffset));
  expect(offset).toBeLessThan(100);
  await page.waitForTimeout(1700);
  await page.mouse.up();
  await expect(page.locator('#parent')).toBeVisible();

  // "Back to playing" resumes play.
  await page.getByRole('button', { name: 'Back to playing' }).click();
  await expect(page.locator('#parent')).toBeHidden();
  await tap(page, 'light-switch');
  await expect(page.locator('.cell[data-id="light-switch"]')).toHaveAttribute('data-state', 'on');
});

test('settings: hide a toy, change length, volume and prompts; they persist', async ({ page }) => {
  await useDebug(page, { gateHoldMs: 300 });
  await page.goto('./');
  await openBoard(page);
  await holdGate(page, 500);
  const panel = page.locator('#parent');
  await expect(panel).toBeVisible();

  await panel.getByText('Gears', { exact: true }).click();
  await panel.getByText('10 min').click();
  await panel.getByText('Low', { exact: true }).click();
  await expect(panel.getByText('Things to say while playing')).toBeVisible();
  await expect(panel.locator('.card')).not.toContainText('Gears:');
  await panel.getByText('Hide', { exact: true }).click();
  await expect(panel.getByText('Things to say while playing')).toBeHidden();

  await panel.getByRole('button', { name: 'Back to playing' }).click();
  await expect(page.locator('.cell[data-id]')).toHaveCount(11);
  await expect(page.locator('.cell.empty')).toHaveCount(1);
  await expect(page.locator('.cell[data-id="gears"]')).toHaveCount(0);

  await page.reload();
  await openBoard(page);
  await expect(page.locator('.cell[data-id="gears"]')).toHaveCount(0);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bb.settings')!));
  expect(saved).toEqual({ sessionMinutes: 10, hidden: ['gears'], volume: 'low', coPlayPrompts: false });
});

test('an idle board gives one object a small wiggle hint', async ({ page }) => {
  await useDebug(page, { idleHintMs: 1000 });
  await page.goto('./');
  await openBoard(page);
  await expect.poll(async () => (await logRows(page)).filter((r) => r.event === 'idleHint').length, { timeout: 5000 }).toBeGreaterThanOrEqual(1);
});

test('the session winds down, says goodnight, and stays closed until the parent gate', async ({ page }) => {
  await useDebug(page, { sessionMs: 7000, windDownMs: 5000, gateHoldMs: 300 });
  await page.goto('./');
  await openBoard(page);
  await tap(page, 'light-switch');

  // Wind-down: the screen dims and objects fall asleep one at a time.
  await expect(page.locator('body')).toHaveClass(/winding-down/, { timeout: 5000 });
  await expect.poll(() => page.locator('.cell.asleep').count()).toBeGreaterThan(0);
  const partly = await page.locator('.cell.asleep').count();
  expect(partly).toBeLessThan(12);

  // An asleep object ignores taps.
  const asleepId = (await page.locator('.cell.asleep').first().getAttribute('data-id'))!;
  const stateBefore = await page.locator(`.cell[data-id="${asleepId}"]`).getAttribute('data-state');
  await tap(page, asleepId);
  expect(await page.locator(`.cell[data-id="${asleepId}"]`).getAttribute('data-state')).toBe(stateBefore);

  // Goodnight: the board closes.
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'goodnight', { timeout: 8000 });
  expect(await sounds(page)).toEqual(expect.arrayContaining([expect.stringMatching(/^goodnight_/)]));
  await clearSounds(page);
  const vp = page.viewportSize()!;
  await page.mouse.click(vp.width / 2, vp.height / 2);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => document.body.dataset.screen)).toBe('goodnight');
  expect(await sounds(page)).toEqual([]);

  // Still goodnight after a relaunch.
  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'goodnight');

  // The parent starts a new session from the gate.
  await holdGate(page, 500);
  await page.getByRole('button', { name: 'Start a new session' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'cover');
  await openBoard(page);
  await expect(page.locator('.cell.asleep')).toHaveCount(0);

  const rows = await logRows(page);
  const events = rows.map((r) => r.event);
  expect(events).toEqual(expect.arrayContaining(['sessionStart', 'windDown', 'sessionEnd']));
  const ids = [...new Set(rows.map((r) => r.sessionId))];
  expect(ids.length).toBeGreaterThanOrEqual(2); // a new session id after restarting
});

test('the playtest log exports as CSV', async ({ page }) => {
  await useDebug(page, { gateHoldMs: 300 });
  await page.goto('./');
  await openBoard(page);
  await tap(page, 'light-switch');
  await tap(page, 'big-button');
  await holdGate(page, 500);
  await expect(page.locator('#parent [data-count]')).toContainText('events recorded');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSV' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^busy-board-log-\d{4}-\d{2}-\d{2}\.csv$/);
  const csv = readFileSync((await file.path())!, 'utf8');
  const lines = csv.trim().split(/\r\n/);
  expect(lines[0]).toBe('timestamp,sessionId,objectId,event,stateAfter');
  expect(csv).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3},s\d{3},light-switch,tap,on/);
  expect(csv).toMatch(/,board,sessionStart,play/);
});
