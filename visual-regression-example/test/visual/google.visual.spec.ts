import {test, expect} from '@playwright/test';

test.describe('Google Visual Regression Test', () => {
    test('google.it homepage should match visual baseline', async ({page}) => {
        await page.goto('https://google.it');

        // Block Google Tag Manager to avoid loading external resources
        await page.route(/\/gtm.js/, (route) => route.abort());

        // Hide the Google doodle
        await page.addStyleTag({
            content: `#hplogo { display: none !important; }`,
        });

        await page.waitForLoadState('networkidle');

        await expect(page).toHaveScreenshot('google-homepage.png');
    });
});
