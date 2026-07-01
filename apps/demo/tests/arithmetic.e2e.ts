import { expect, test } from '@playwright/test';
import { clearDraft, dragPaletteToCanvas } from './helpers';

/** Fill an AntD-Form-Item input located by visible label substring. */
async function fillByLabel(page: import('@playwright/test').Page, labelSubstr: string, value: string) {
  const input = page.locator(
    `//label[contains(., "${labelSubstr}")]/ancestor::div[contains(@class,"ant-form-item")]//input`,
  ).first();
  await input.fill(value);
}

test('arithmetic control computes a value from other fields in preview', async ({ page }) => {
  await clearDraft(page);
  await page.goto('/design');

  // Arrange: three controls on the canvas.
  await dragPaletteToCanvas(page, 'textbox', '.qnn-canvas');
  await dragPaletteToCanvas(page, 'textbox', '.qnn-canvas');
  await dragPaletteToCanvas(page, 'arithmetic', '.qnn-canvas');
  await expect(page.locator('.qnn-cell')).toHaveCount(3);

  // Rename the first two textboxes to `price` and `qty`.
  await page.locator('.qnn-cell').nth(0).click();
  await fillByLabel(page, 'Alias', 'price');
  await page.locator('.qnn-cell').nth(1).click();
  await fillByLabel(page, 'Alias', 'qty');

  // Configure the arithmetic field.
  await page.locator('.qnn-cell').nth(2).click();

  // Start the formula — click the "Start with a number" affordance.
  await page.getByTestId('arith-start').click();

  // Convert root to a group (×) via the wrap-operator dropdown.
  await page.locator('[data-testid="arith-wrap-op"]').selectOption('*');
  // Pick an option out of the currently-open AntD Select dropdown.
  // AntD renders the visible option as `.ant-select-item-option` (the `role="option"`
  // twin is an a11y-only zero-sized node). After a prior Select closes, its dropdown
  // lingers in the DOM with `.ant-select-dropdown-hidden` — filter it out and take
  // the last (most recently opened) match.
  const pickOption = async (title: string) => {
    const opt = page
      .locator(`.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option[title="${title}"]`)
      .last();
    await expect(opt).toBeVisible();
    await opt.click();
  };

  // LHS (first child in the group) — set to field ref `price`.
  const lhsKind = page.locator('.qnn-arith-children [data-testid="arith-node-kind"]').first();
  await lhsKind.selectOption('ref');
  const lhsAlias = page.locator('.qnn-arith-children [data-testid="arith-node-alias"]').first();
  await lhsAlias.click();
  await pickOption('price');
  // RHS — set to field ref `qty`.
  const rhsKind = page.locator('.qnn-arith-children [data-testid="arith-node-kind"]').nth(1);
  await rhsKind.selectOption('ref');
  const rhsAlias = page.locator('.qnn-arith-children [data-testid="arith-node-alias"]').nth(1);
  await rhsAlias.click();
  await pickOption('qty');

  // Preview string in the inspector shows the formula.
  await expect(page.getByTestId('arith-preview-string')).toHaveText('= (price × qty)');

  // Open Preview modal and enter values.
  await page.getByTestId('topbar-preview').click();
  const modal = page.locator('.ant-modal');
  await expect(modal.locator('.qnn-preview-field')).toHaveCount(3);
  const priceInput = modal.locator('.ant-input').nth(0);
  const qtyInput = modal.locator('.ant-input').nth(1);
  await priceInput.fill('5');
  await qtyInput.fill('3');

  // Value is computed and displayed.
  const arithValue = modal.locator('.qnn-arith-value').first();
  await expect(arithValue).toHaveText('15');

  // Configure formatting: prefix "$" and 2 decimals.
  await page.keyboard.press('Escape');  // close modal
  await fillByLabel(page, 'Decimals', '2');
  await fillByLabel(page, 'Prefix', '$');

  // Re-open preview and re-enter values (the draft is fresh each open).
  await page.getByTestId('topbar-preview').click();
  const modal2 = page.locator('.ant-modal');
  await modal2.locator('.ant-input').nth(0).fill('5');
  await modal2.locator('.ant-input').nth(1).fill('3');
  await expect(modal2.locator('.qnn-arith-value').first()).toHaveText('$15.00');
});
