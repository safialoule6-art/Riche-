const { test, expect } = require('@playwright/test');

const BASE = process.env.SUNAMI_URL || 'https://sunami-rho.vercel.app';
const report = [];

function note(kind, message, extra = '') {
  report.push(`${kind}: ${message}${extra ? ` — ${extra}` : ''}`);
  console.log(`${kind}: ${message}${extra ? ` — ${extra}` : ''}`);
}

test.beforeEach(async ({ page }) => {
  page.on('console', msg => {
    if (msg.type() === 'error') note('BUG', 'Console error', msg.text());
  });
  page.on('pageerror', err => note('BUG', 'Page error', err.message));
  page.on('requestfailed', req => note('BUG', 'Network request failed', `${req.method()} ${req.url()} :: ${req.failure()?.errorText || 'unknown'}`));
});

test('agent audits Sunami production homepage on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto(BASE, { waitUntil: 'networkidle', timeout: 45000 });
  expect(response && response.ok()).toBeTruthy();
  await page.screenshot({ path: 'artifacts/home-mobile.png', fullPage: true });

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  if (overflow) note('BUG', 'Horizontal overflow detected on production homepage');
  else note('OK', 'Homepage has no horizontal overflow at 390px');

  const title = await page.title();
  note('INFO', 'Production homepage loaded', title);
});

test('agent audits creative engine and catches the mobile card bug class', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto(`${BASE}/creative.html`, { waitUntil: 'networkidle', timeout: 45000 });
  expect(response && response.ok()).toBeTruthy();
  await page.screenshot({ path: 'artifacts/creative-before.png', fullPage: true });

  const generate = page.locator('#generate');
  await expect(generate).toBeVisible();
  await expect(page.locator('#brief')).toHaveValue(/anglais/i);

  const cssProblem = await page.evaluate(() => {
    const card = document.querySelector('.variant');
    const button = document.querySelector('.pick');
    if (!card || !button) return null;
    const cr = card.getBoundingClientRect();
    const br = button.getBoundingClientRect();
    return { cardHeight: cr.height, buttonHeight: br.height, viewport: window.innerWidth };
  });
  if (cssProblem && cssProblem.buttonHeight > 500) {
    note('BUG', 'Concept selection button is stretching vertically', JSON.stringify(cssProblem));
  } else {
    note('OK', 'Concept card layout is not vertically stretched');
  }

  const links = await page.locator('script[src]').evaluateAll(xs => xs.map(x => x.src));
  note('INFO', 'Creative engine scripts loaded', links.join(', '));
});

test.afterAll(async () => {
  const fs = require('fs');
  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync('artifacts/sunami-agent-report.md', `# Sunami QA Agent\n\nTarget: ${BASE}\n\n${report.map(x => `- ${x}`).join('\n')}\n`);
});
