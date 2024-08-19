import { defineConfig, devices } from '@sap-ux-private/playwright';
import type { PlaywrightTestConfig } from '@sap-ux-private/playwright';

/**
 * Read environment variables from `.env` file.
 */
import 'dotenv/config';

const timeout = 5 * 60000 + 30000;
/**
 * See https://playwright.dev/docs/test-configuration.
 */
const config: PlaywrightTestConfig = {
    testDir: './test/integration',
    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 1 : 0,
    /* Opt out of parallel tests on CI. */
    workers: 1,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: [['html', { open: 'never' }]],
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',
        screenshot: 'only-on-failure'
    },
    /* Configure projects for major browsers */
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'], viewport: { width: 1720, height: 900 } }
        }
    ],
    /* 5 min for npm i + 30000 ms default timeout */
    timeout,
    globalSetup: require.resolve('./test/integration/utils/global-setup')
};
export default defineConfig(config);
