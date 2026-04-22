import { defineConfig, devices } from '@sap-ux-private/playwright';
import type { PlaywrightTestConfig } from '@sap-ux-private/playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Read environment variables from `.env` file.
 */
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    /* Global test timeout - 5 minutes to allow for npm install and UI5 loading */
    timeout: 5 * 60000,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: [['html', { open: 'never' }]],
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Action timeout - 2 minutes for slow page loads and UI5 initialization */
        actionTimeout: 2 * 60000,
        /* Navigation timeout - 2 minutes for UI5 app loading */
        navigationTimeout: 2 * 60000,
        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',
        screenshot: 'only-on-failure'
    },
    /* Configure projects for major browsers */
    projects: [
        {
            name: 'Google Chrome',
            use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1720, height: 900 } }
        }
    ],
    globalSetup: join(__dirname, './test/integration/utils/global-setup')
};
export default defineConfig(config);
