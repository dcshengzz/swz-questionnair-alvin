import { expect, test } from '@playwright/test';
import { clearDraft, dragPaletteToCanvas } from './helpers';

test.describe('collapsible panes', () => {
  test('collapsing the palette shrinks the left column and exposes a rail of control icons', async ({ page }) => {
    await clearDraft(page);
    await page.goto('/design');

    const shell = page.locator('.qnn-shell');
    await expect(shell).not.toHaveAttribute('data-left-collapsed', /.*/);

    await page.getByTestId('palette-collapse').click();

    await expect(shell).toHaveAttribute('data-left-collapsed', '');
    await expect(page.getByTestId('palette-rail-expand')).toBeVisible();
    await expect(page.getByTestId('palette-rail-textbox')).toBeVisible();
    await expect(page.getByTestId('palette-rail-single')).toBeVisible();
  });

  test('hovering a collapsed rail icon shows the control label as a tooltip', async ({ page }) => {
    await clearDraft(page);
    await page.goto('/design');

    await page.getByTestId('palette-collapse').click();
    await page.getByTestId('palette-rail-textbox').hover();
    await expect(page.getByRole('tooltip', { name: 'Text input' })).toBeVisible();
  });

  test('dragging a control from the collapsed rail drops it onto the canvas', async ({ page }) => {
    await clearDraft(page);
    await page.goto('/design');

    await page.getByTestId('palette-collapse').click();
    await expect(page.locator('.qnn-cell')).toHaveCount(0);

    const src = page.getByTestId('palette-rail-textbox');
    const canvas = page.locator('.qnn-canvas');
    const s = await src.boundingBox();
    const d = await canvas.boundingBox();
    if (!s || !d) throw new Error('Boxes not found');
    await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
    await page.mouse.down();
    await page.mouse.move(s.x + s.width / 2 + 12, s.y + s.height / 2 + 12, { steps: 5 });
    await page.mouse.move(d.x + d.width / 2, d.y + d.height / 2, { steps: 25 });
    await page.mouse.up();

    await expect(page.locator('.qnn-cell')).toHaveCount(1);
    // Rail stays collapsed — drag doesn't auto-expand the pane.
    await expect(page.locator('.qnn-shell')).toHaveAttribute('data-left-collapsed', '');
  });

  test('inspector rail dot reflects selection state', async ({ page }) => {
    await clearDraft(page);
    await page.goto('/design');

    await page.getByTestId('inspector-collapse').click();
    await expect(page.getByTestId('inspector-rail-dot')).not.toHaveAttribute('data-selected', /.*/);

    await page.getByTestId('inspector-rail-expand').click();
    await dragPaletteToCanvas(page, 'textbox', '.qnn-canvas');
    await page.locator('.qnn-cell').first().click();
    await page.getByTestId('inspector-collapse').click();
    await expect(page.getByTestId('inspector-rail-dot')).toHaveAttribute('data-selected', '');
  });

  test('collapse state persists across reload', async ({ page }) => {
    // One-shot clear — do not use clearDraft's init script, which runs again on reload.
    await page.goto('/design');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.getByTestId('palette-collapse').click();
    await page.getByTestId('inspector-collapse').click();

    await page.reload();

    const shell = page.locator('.qnn-shell');
    await expect(shell).toHaveAttribute('data-left-collapsed', '');
    await expect(shell).toHaveAttribute('data-right-collapsed', '');
    await expect(page.getByTestId('palette-rail-expand')).toBeVisible();
    await expect(page.getByTestId('inspector-rail-expand')).toBeVisible();
  });
});
