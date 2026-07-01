import { expect, test } from '@playwright/test';
import { clearDraft, dragPaletteToCanvas } from './helpers';

test('rule: if age is empty hide smoking', async ({ page }) => {
  await clearDraft(page);
  await page.goto('/design');

  // Add two sliders: age (alias: age), smoking (alias: smoking)
  await dragPaletteToCanvas(page, 'slider', '.qnn-canvas');
  await page.getByLabel('Alias').fill('age');
  await page.getByLabel('Friendly name').fill('Age');

  await dragPaletteToCanvas(page, 'slider', '.qnn-canvas');
  await page.locator('[data-testid^="cell-"]').nth(1).click();
  await page.getByLabel('Alias').fill('smoking');
  await page.getByLabel('Friendly name').fill('Smoking');

  // Open Rules tab and add one rule
  await page.locator('.qnn-canvas').click({ position: { x: 4, y: 4 } });
  await page.getByRole('tab', { name: 'Rules' }).click();
  await page.getByRole('button', { name: '+ Add rule' }).click();
  await page.getByRole('button', { name: '+ Add condition' }).click();
  // ref: age | op: is empty  (no RHS needed)
  await page.locator('.ant-select').nth(1).click();
  await page.locator('.ant-select-dropdown').getByText('age', { exact: true }).click();
  await page.locator('.ant-select').nth(2).click();
  await page.locator('.ant-select-dropdown').getByText('is empty', { exact: true }).click();

  // then: hide field: smoking
  await page.getByRole('button', { name: '+ Add action' }).click();
  // action default = Hide + field: age; switch target to smoking
  await page.locator('.ant-select').last().click();
  await page.locator('.ant-select-dropdown').getByText('field: smoking').click();

  // Preview: age starts with no answer (empty) so smoking should be hidden
  await page.getByTestId('topbar-preview').click();
  const modal = page.locator('.ant-modal-content');
  await expect(modal.getByText('Age', { exact: true })).toBeVisible();
  await expect(modal.getByText('Smoking', { exact: true })).toHaveCount(0);
});
