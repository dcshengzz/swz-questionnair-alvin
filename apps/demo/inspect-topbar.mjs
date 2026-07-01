import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', m => console.log('[console]', m.type(), m.text()));
await page.goto('http://localhost:4173/');
await page.waitForTimeout(1500);
const url = page.url();
const html = await page.evaluate(() => {
  const bar = document.querySelector('.qnn-topbar');
  return bar ? bar.outerHTML.slice(0, 2000) : '(no .qnn-topbar)';
});
console.log('URL:', url);
console.log('TOPBAR HTML:');
console.log(html);
await browser.close();
