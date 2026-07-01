import { expect, test } from '@playwright/test';
import { clearDraft, dragPaletteToCanvas } from './helpers';

test.describe('collapsed palette rail trash', () => {
  test('turns red when a canvas control is dragged onto it', async ({ page }) => {
    await clearDraft(page);
    await page.goto('/');
    await page.waitForURL('**/design');

    await dragPaletteToCanvas(page, 'textbox', '.qnn-canvas');
    await expect(page.locator('.qnn-cell')).toHaveCount(1);

    await page.getByTestId('palette-collapse').click();
    const trash = page.getByTestId('palette-trash');
    await expect(trash).toBeVisible();
    await expect(trash).not.toHaveClass(/qnn-dropactive/);

    const trashBox = await trash.boundingBox();
    if (!trashBox) throw new Error('trash not found');
    const handle = page.locator('.qnn-cell').first().locator('.qnn-cell-handle');
    const hb = await handle.boundingBox();
    if (!hb) throw new Error('handle not found');
    const sx = hb.x + hb.width / 2;
    const sy = hb.y + hb.height / 2;

    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await page.mouse.move(sx + 6, sy + 6, { steps: 4 });
    await page.mouse.move(
      trashBox.x + trashBox.width / 2,
      trashBox.y + trashBox.height / 2,
      { steps: 10 },
    );
    await expect(trash).toHaveClass(/qnn-dropactive/);
    // Allow the 120ms bg transition to settle before sampling computed style.
    await page.waitForTimeout(200);
    const bg = await trash.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe('rgb(220, 38, 38)');

    await page.mouse.up();
    await expect(page.locator('.qnn-cell')).toHaveCount(0);
    await expect(trash).not.toHaveClass(/qnn-dropactive/);
  });
});
