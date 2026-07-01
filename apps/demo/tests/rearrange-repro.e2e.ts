import { expect, test } from '@playwright/test';
import { clearDraft, dragPaletteToCanvas } from './helpers';

test('rearrange: dragging cell-0 onto cell-1 position keeps both cells', async ({ page }) => {
  await clearDraft(page);
  await page.goto('/');
  await page.waitForURL('**/design');

  await dragPaletteToCanvas(page, 'textbox', '.qnn-canvas');
  await dragPaletteToCanvas(page, 'text', '.qnn-canvas');
  await dragPaletteToCanvas(page, 'datetime', '.qnn-canvas');
  await expect(page.locator('.qnn-cell')).toHaveCount(3);

  const cells = page.locator('.qnn-cell');
  const srcHandle = cells.nth(0).locator('.qnn-cell-handle');
  const dstCell = cells.nth(2);
  const sh = await srcHandle.boundingBox();
  const db = await dstCell.boundingBox();
  if (!sh || !db) throw new Error('bounds missing');

  const sx = sh.x + sh.width / 2;
  const sy = sh.y + sh.height / 2;
  const dx = db.x + db.width / 2;
  const dy = db.y + db.height / 2;

  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + 6, sy + 6, { steps: 4 });
  await page.mouse.move(dx, dy, { steps: 25 });
  await page.mouse.up();

  await expect(page.locator('.qnn-cell')).toHaveCount(3);
});

test('rearrange: drag path crosses palette trash but drops on canvas — cell survives', async ({ page }) => {
  await clearDraft(page);
  await page.goto('/');
  await page.waitForURL('**/design');

  await dragPaletteToCanvas(page, 'textbox', '.qnn-canvas');
  await dragPaletteToCanvas(page, 'text', '.qnn-canvas');
  await expect(page.locator('.qnn-cell')).toHaveCount(2);

  const srcHandle = page.locator('.qnn-cell').first().locator('.qnn-cell-handle');
  const trash = page.getByTestId('palette-trash');
  const canvas = page.locator('.qnn-canvas');
  const sh = await srcHandle.boundingBox();
  const tb = await trash.boundingBox();
  const cb = await canvas.boundingBox();
  if (!sh || !tb || !cb) throw new Error('bounds missing');

  await page.mouse.move(sh.x + sh.width / 2, sh.y + sh.height / 2);
  await page.mouse.down();
  await page.mouse.move(sh.x + 10, sh.y + 10, { steps: 4 });
  // Travel through the trash zone mid-drag
  await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 15 });
  // Then back to a canvas gap
  await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height - 8, { steps: 15 });
  await page.mouse.up();

  await expect(page.locator('.qnn-cell')).toHaveCount(2);
});

test('rearrange: dropping in empty canvas space preserves the cell', async ({ page }) => {
  await clearDraft(page);
  await page.goto('/');
  await page.waitForURL('**/design');

  await dragPaletteToCanvas(page, 'textbox', '.qnn-canvas');
  await dragPaletteToCanvas(page, 'text', '.qnn-canvas');
  await expect(page.locator('.qnn-cell')).toHaveCount(2);

  const srcHandle = page.locator('.qnn-cell').first().locator('.qnn-cell-handle');
  const canvas = page.locator('.qnn-canvas');
  const sh = await srcHandle.boundingBox();
  const cb = await canvas.boundingBox();
  if (!sh || !cb) throw new Error('bounds missing');

  await page.mouse.move(sh.x + sh.width / 2, sh.y + sh.height / 2);
  await page.mouse.down();
  await page.mouse.move(sh.x + 10, sh.y + 10, { steps: 4 });
  // Drop in bottom empty area of canvas
  await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height - 8, { steps: 25 });
  await page.mouse.up();

  await expect(page.locator('.qnn-cell')).toHaveCount(2);
});
