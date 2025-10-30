import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    outputDir: './test/visual/output/results',
    testDir: './test/visual',
    retries: 2,
    use: {
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
    },
    expect: {
        toHaveScreenshot: {
            threshold: 0.2,
            maxDiffPixels: 1000,
        }
    },
    projects: [
        {
            name: 'Desktop Chrome',
            use: { ...devices['Desktop Chrome'] }
        },
        {
            name: 'Android Chrome',
            use: { ...devices['Pixel 7'] },
        }
    ]
});
