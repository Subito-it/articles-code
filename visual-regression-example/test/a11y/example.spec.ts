import { test } from '@playwright/test';
import { generateAxeReport } from '../utils/axe';

test('Google page', async ({ page }) => {
    await page.goto('https://www.google.it');
    await page.waitForLoadState('domcontentloaded');
    await generateAxeReport('login-page', page, false);
});
