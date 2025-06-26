import { join } from 'path';
import { readFileSync } from 'fs';
import { defineConfig, devices } from '@sap-ux-private/playwright';
import type { PlaywrightTestConfig, Project } from '@sap-ux-private/playwright';

/**
 * Read environment variables from `.env` file.
 */
import 'dotenv/config';

import type { TestOptions } from './src/fixture';

const versions = JSON.parse(readFileSync(join(__dirname, 'versions.json').toString()) as unknown as string) as string[];

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const config: PlaywrightTestConfig<TestOptions> = {
    testDir: './src',
    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 1 : 0,
    /* Opt out of parallel tests on CI. */
    workers: 4,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: [['html', { open: 'never' }]],
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',
        screenshot: 'only-on-failure'
    },
    /* Configure projects for major browsers */
    projects: versions.map((version: string) => ({
        name: `${version}`,
        use: {
            ...devices['Desktop Chrome'],
            channel: 'chrome',
            viewport: { width: 1720, height: 900 },
            ui5Version: version
        }
    })) as Project<{}, TestOptions>[],
    // timeout: 9999 * 1000,
    globalSetup: require.resolve('./src/global-setup')
    // webServer: {
    //     command: 'node server',
    //     url: 'http://localhost:3050/status',
    //     reuseExistingServer: !process.env.CI,
    //     stderr: 'pipe',
    //     stdout: 'ignore'
    // }
};
export default defineConfig(config);
