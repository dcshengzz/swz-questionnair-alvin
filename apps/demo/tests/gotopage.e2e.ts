import { expect, test } from '@playwright/test';
import { clearDraft, dragPaletteToCanvas } from './helpers';

test('rule: gotoPage skips a page on Next', async ({ page }) => {
  await clearDraft(page);
  await page.goto('/design');

  // Add textbox to Page 1
  await dragPaletteToCanvas(page, 'textbox', '.qnn-canvas');
  await page.getByLabel('Alias').fill('a1');
  await page.getByLabel('Friendly name').fill('A1');

  // Add Page 2 and Page 3 — the add button is the ".qnn-addpage" button.
  await page.locator('.qnn-addpage').click();
  await page.locator('.qnn-addpage').click();

  // Switch back to page 1, add a rule: when true → gotoPage Page 3
  await page.getByText('Page 1').click();
  await page.locator('.qnn-canvas').click({ position: { x: 4, y: 4 } });
  await page.getByRole('tab', { name: 'Rules' }).click();
  await page.getByRole('button', { name: '+ Add rule' }).click();
  await page.getByRole('button', { name: '+ Add action' }).click();
  // default action = Hide; switch to Go to page
  await page.locator('.ant-select').nth(0).click();
  await page.locator('.ant-select-dropdown').getByText('Go to page').click();
  // select page: Page 3
  await page.locator('.ant-select').last().click();
  await page.locator('.ant-select-dropdown').getByText('Page 3').click();

  // Preview and hit Next on page 1 — should land on Page 3
  await page.getByTestId('topbar-preview').click();
  const modal = page.locator('.ant-modal-content');
  await expect(modal.getByText('Page 1')).toBeVisible();
  await modal.locator('[data-testid="runtime-next"]').click();
  await expect(modal.getByText('Page 3')).toBeVisible();
});
