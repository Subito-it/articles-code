import {test, expect, Page} from '@playwright/test';

test.describe('Google Visual Regression Test', () => {
    test('google.it homepage should match visual baseline', async ({page}) => {
        await page.goto('https://google.it');

        // Block Google Tag Manager to avoid loading external resources
        await page.route(/\/gtm.js/, (route) => route.abort());

        // Hide the Google doodle
        await page.addStyleTag({
            content: `#hplogo { display: none !important; }`,
        });

        // Force to load the lazy images:
        await forceLoadLazyImages(page)

        await page.waitForLoadState('networkidle');

        await expect(page).toHaveScreenshot('google-homepage.png');
    });
});


async function forceLoadLazyImages(page: Page): Promise<void> {
    const images = document.querySelectorAll('img[loading="lazy"]');
    return page.evaluate(() => {
        for (const image of images) {
            image.setAttribute('loading', 'eager');
        }
    });
}
