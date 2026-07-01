import { expect, test } from '@playwright/test';
import { clearDraft, dragPaletteToCanvas } from './helpers';

test('build → export → import → preview round-trips', async ({ page }, testInfo) => {
  await clearDraft(page);
  await page.goto('/');
  await page.waitForURL('**/design');

  await dragPaletteToCanvas(page, 'textbox', '.qnn-canvas');
  await expect(page.locator('[data-testid^="cell-textbox_"]')).toHaveCount(1);
  await dragPaletteToCanvas(page, 'single', '.qnn-canvas');
  await expect(page.locator('[data-testid^="cell-"]')).toHaveCount(2);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    (async () => {
      await page.getByTestId('topbar-export').click();
      await page.getByRole('button', { name: 'Export' }).click();
    })(),
  ]);
  const path = await download.path();
  expect(path).toBeTruthy();

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('[data-testid^="cell-"]')).toHaveCount(0);

  const filePath = path!;
  await page.getByTestId('topbar-import').click();
  await page.locator('[data-testid="topbar-import-input"]').setInputFiles(filePath);
  await expect(page.locator('[data-testid^="cell-"]')).toHaveCount(2);

  await page.getByTestId('topbar-preview').click();
  await expect(page.getByTestId('runtime-next')).toBeVisible();
});
