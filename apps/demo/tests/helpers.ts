import { expect, Locator, Page } from '@playwright/test';

export async function clearDraft(page: Page) {
  await page.addInitScript(() => { try { localStorage.clear(); } catch {} });
}

export async function dragPaletteToCanvas(page: Page, pluginType: string, targetSelector: string) {
  const src = page.locator(`[data-testid="palette-${pluginType}"]`).first();
  const dst = page.locator(targetSelector).first();
  await expect(src).toBeVisible();
  await expect(dst).toBeVisible();
  const s = await src.boundingBox();
  const d = await dst.boundingBox();
  if (!s || !d) throw new Error('Boxes not found');
  const sx = s.x + s.width / 2;
  const sy = s.y + s.height / 2;
  const dx = d.x + d.width / 2;
  const dy = d.y + d.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  // dnd-kit requires an initial movement beyond the activation distance
  await page.mouse.move(sx + 12, sy + 12, { steps: 5 });
  await page.mouse.move(dx, dy, { steps: 25 });
  await page.mouse.up();
}

export async function setPropertyInput(page: Page, label: string, value: string) {
  const input = page.getByLabel(label, { exact: false }).first();
  await input.fill(value);
}
