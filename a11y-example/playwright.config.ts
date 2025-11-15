import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    outputDir: './test/output/results',
    testDir: './test',
    retries: 2,
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
