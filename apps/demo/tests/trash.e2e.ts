import { expect, test } from '@playwright/test';
import { clearDraft, dragPaletteToCanvas } from './helpers';

async function dragFromTo(
  page: import('@playwright/test').Page,
  sourceTestId: string,
  target: { x: number; y: number },
) {
  const src = page.getByTestId(sourceTestId);
  const box = await src.boundingBox();
  if (!box) throw new Error(`${sourceTestId} not found`);
  const sx = box.x + box.width / 2;
  const sy = box.y + box.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  // dnd-kit MouseSensor threshold is 3px — nudge before the main move.
  await page.mouse.move(sx + 6, sy + 6, { steps: 4 });
  await page.mouse.move(target.x, target.y, { steps: 20 });
  await page.mouse.up();
}

test.describe('palette trash zone', () => {
  test('dropping a cell on the trash removes it from the canvas', async ({ page }) => {
    await clearDraft(page);
    await page.goto('/');
    await page.waitForURL('**/design');

    await dragPaletteToCanvas(page, 'textbox', '.qnn-canvas');
    await dragPaletteToCanvas(page, 'text', '.qnn-canvas');
    await expect(page.locator('.qnn-cell')).toHaveCount(2);

    const trashBox = await page.getByTestId('palette-trash').boundingBox();
    if (!trashBox) throw new Error('trash zone not found');

    const firstHandle = page.locator('.qnn-cell').first().locator('.qnn-cell-handle');
    const handleBox = await firstHandle.boundingBox();
    if (!handleBox) throw new Error('handle not found');
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      handleBox.x + handleBox.width / 2 + 6,
      handleBox.y + handleBox.height / 2 + 6,
      { steps: 4 },
    );
    await page.mouse.move(
      trashBox.x + trashBox.width / 2,
      trashBox.y + trashBox.height / 2,
      { steps: 20 },
    );
    await page.mouse.up();

    await expect(page.locator('.qnn-cell')).toHaveCount(1);
  });

  test('releasing away from the trash snaps the control back to the canvas', async ({ page }) => {
    await clearDraft(page);
    await page.goto('/');
    await page.waitForURL('**/design');

    await dragPaletteToCanvas(page, 'textbox', '.qnn-canvas');
    await expect(page.locator('.qnn-cell')).toHaveCount(1);

    const handle = page.locator('.qnn-cell').first().locator('.qnn-cell-handle');
    const handleBox = await handle.boundingBox();
    if (!handleBox) throw new Error('handle not found');
    const sx = handleBox.x + handleBox.width / 2;
    const sy = handleBox.y + handleBox.height / 2;

    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await page.mouse.move(sx + 6, sy + 6, { steps: 4 });
    // Drop in empty space outside every droppable — off the top-left corner.
    await page.mouse.move(2, 2, { steps: 20 });
    await page.mouse.up();

    await expect(page.locator('.qnn-cell')).toHaveCount(1);
  });

  test('dropping a palette item on the trash does not add a control', async ({ page }) => {
    await clearDraft(page);
    await page.goto('/');
    await page.waitForURL('**/design');

    await expect(page.locator('.qnn-cell')).toHaveCount(0);

    await dragFromTo(page, 'palette-textbox', await (async () => {
      const b = await page.getByTestId('palette-trash').boundingBox();
      if (!b) throw new Error('trash zone not found');
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    })());

    await expect(page.locator('.qnn-cell')).toHaveCount(0);
  });
});
