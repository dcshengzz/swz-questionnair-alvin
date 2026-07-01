import { expect, test } from '@playwright/test';
import { clearDraft } from './helpers';

test.describe('palette click-to-add', () => {
  test('clicking a palette item appends a row to the bottom of the canvas', async ({ page }) => {
    await clearDraft(page);
    await page.goto('/');
    await page.waitForURL('**/design');

    await expect(page.locator('.qnn-cell')).toHaveCount(0);

    await page.getByTestId('palette-textbox').click();
    await expect(page.locator('.qnn-cell')).toHaveCount(1);

    await page.getByTestId('palette-text').click();
    await expect(page.locator('.qnn-cell')).toHaveCount(2);

    const cells = page.locator('.qnn-cell');
    await expect(cells.nth(0)).toHaveAttribute('data-testid', /^cell-textbox_/);
    await expect(cells.nth(1)).toHaveAttribute('data-testid', /^cell-text_/);
  });

  test('clicking a palette rail item appends a row to the canvas', async ({ page }) => {
    await clearDraft(page);
    await page.goto('/');
    await page.waitForURL('**/design');

    await page.getByTestId('palette-collapse').click();
    await expect(page.getByTestId('palette-rail-expand')).toBeVisible();

    await page.getByTestId('palette-rail-textbox').click();
    await expect(page.locator('.qnn-cell')).toHaveCount(1);
  });
});
