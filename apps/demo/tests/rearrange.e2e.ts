import { expect, test } from '@playwright/test';
import { clearDraft, dragPaletteToCanvas } from './helpers';

async function dragCellBy(
  page: import('@playwright/test').Page,
  handleTestId: string,
  dx: number,
  dy: number,
) {
  const handle = page.getByTestId(handleTestId);
  const box = await handle.boundingBox();
  if (!box) throw new Error(`${handleTestId} not found`);
  const sx = box.x + box.width / 2;
  const sy = box.y + box.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  // dnd-kit MouseSensor activation threshold is 3px — start with a small
  // nudge before the main move so the drag actually registers.
  await page.mouse.move(sx + 6, sy + 6, { steps: 4 });
  await page.mouse.move(sx + dx, sy + dy, { steps: 20 });
  await page.mouse.up();
}

test.describe('canvas rearrange (regression: controls must not disappear)', () => {
  test('dragging a control to the bottom gap leaves it on the canvas', async ({ page }) => {
    await clearDraft(page);
    await page.goto('/');
    await page.waitForURL('**/design');

    await dragPaletteToCanvas(page, 'textbox', '.qnn-canvas');
    await dragPaletteToCanvas(page, 'text', '.qnn-canvas');
    await expect(page.locator('.qnn-cell')).toHaveCount(2);

    // Drag the first cell's handle downward past both rows into the trailing gap.
    const firstCell = page.locator('.qnn-cell').first();
    const firstHandle = firstCell.locator('.qnn-cell-handle');
    const firstBox = await firstCell.boundingBox();
    const handleBox = await firstHandle.boundingBox();
    if (!firstBox || !handleBox) throw new Error('missing boxes');
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      handleBox.x + handleBox.width / 2 + 6,
      handleBox.y + handleBox.height / 2 + 6,
      { steps: 4 },
    );
    // Jump to well below both rows to land on the bottom gap.
    await page.mouse.move(
      firstBox.x + firstBox.width / 2,
      firstBox.y + firstBox.height * 2 + 40,
      { steps: 20 },
    );
    await page.mouse.up();

    // Critical assertion: still 2 controls on the canvas.
    await expect(page.locator('.qnn-cell')).toHaveCount(2);
  });

  test('dragging a control to the top gap leaves it on the canvas', async ({ page }) => {
    await clearDraft(page);
    await page.goto('/');
    await page.waitForURL('**/design');

    await dragPaletteToCanvas(page, 'textbox', '.qnn-canvas');
    await dragPaletteToCanvas(page, 'text', '.qnn-canvas');
    await expect(page.locator('.qnn-cell')).toHaveCount(2);

    // Drag the second (lower) cell upward past the first cell to hit the top gap.
    const secondCell = page.locator('.qnn-cell').nth(1);
    const secondHandle = secondCell.locator('.qnn-cell-handle');
    const secondBox = await secondCell.boundingBox();
    const handleBox = await secondHandle.boundingBox();
    if (!secondBox || !handleBox) throw new Error('missing boxes');
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      handleBox.x + handleBox.width / 2 + 6,
      handleBox.y + handleBox.height / 2 + 6,
      { steps: 4 },
    );
    // Jump well above the first row to land on the top gap.
    await page.mouse.move(
      secondBox.x + secondBox.width / 2,
      secondBox.y - secondBox.height * 2 - 40,
      { steps: 20 },
    );
    await page.mouse.up();

    await expect(page.locator('.qnn-cell')).toHaveCount(2);
  });
});
