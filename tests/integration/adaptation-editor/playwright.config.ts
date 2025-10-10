import { exit } from 'process';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { defineConfig, devices } from '@sap-ux-private/playwright';
import type { PlaywrightTestConfig, Project, ReporterDescription } from '@sap-ux-private/playwright';

/**
 * Read environment variables from `.env` file.
 */
import 'dotenv/config';

import type { TestOptions } from './src/fixture';

let versions;
try {
    versions = JSON.parse(readFileSync(join(__dirname, 'versions.json').toString()) as unknown as string) as string[];

    if (versions && versions.length > 0) {
        process.env.HIGHEST_UI5_VERSION = versions[0];
    }
} catch (error) {
    if (error.code === 'ENOENT') {
        console.error(
            'The versions.json file is missing. Please run "node version.js" in the tests/integration/adaptation-editor directory to generate it.'
        );
        exit(1);
    }
    throw error;
}

/**
 * Get the appropriate reporters based on environment and version.
 *
 * @returns Array of reporter configurations
 */
function getReporters(): ReporterDescription[] {
    // Always include HTML reporter
    const reporters: ReporterDescription[] = [['html', { open: 'never' }]];
    if (!process.env.CI) {
        reporters.push(['./manual-test-case-reporter.ts']);
    }

    return reporters;
}

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
    workers: 1,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: getReporters(),
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
    globalSetup: require.resolve('./src/global-setup')
};
export default defineConfig(config);
