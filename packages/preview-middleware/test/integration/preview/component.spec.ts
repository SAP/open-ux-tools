import {
    test,
    startServer,
    teardownServer,
    copyProject,
    getDestinationProjectRoot,
    getPort,
    expect
} from '@sap-ux-private/playwright';
import type { Page } from '@sap-ux-private/playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { UI5Version } from '@sap-ux/ui5-info';
import { TIMEOUT } from '../utils/constant';

const buildUrl =
    (port = 3000) =>
    () =>
        `http://localhost:${port}`;
let getUrl: () => string;

const cwd = join(__dirname, '..', '..', 'fixtures', 'simple-component');
const testCwd = getDestinationProjectRoot(cwd);

const adaptUi5Yaml = async (ui5Version: string) => {
    const yamlPath = join(testCwd, 'ui5.yaml');
    const content = await readFile(yamlPath, 'utf-8');
    await writeFile(yamlPath, content.replace(/^(\s+version:\s*)[\w.]+$/m, `$1${ui5Version}`));
};

const prepare = async (ui5Version: string) => {
    await copyProject({
        projectRoot: cwd,
        cb: async () => {
            await adaptUi5Yaml(ui5Version);
        }
    });
    const port = await getPort();
    getUrl = buildUrl(port);
    await startServer({
        command: `cd ${testCwd} && npx ui5 serve --port ${port}`,
        launchTimeout: TIMEOUT,
        port: port,
        host: 'localhost',
        protocol: 'http',
        usedPortAction: 'error',
        debug: false
    });
};

const checkFlp = async (param: { page: Page }) => {
    const { page } = param;
    const client = await page.context().newCDPSession(page);
    await client.send('Network.clearBrowserCache');
    await page.goto(`${getUrl()}/test-resources/my/fe/v2/app/my/custom/path/preview.html#app-preview`);
    await page.getByRole('button', { name: 'Go', exact: true }).click();
    await expect(page.getByText('Product_0', { exact: true })).toBeVisible();
};

const checkQUnit = async (param: { page: Page }) => {
    const { page } = param;
    const client = await page.context().newCDPSession(page);
    await client.send('Network.clearBrowserCache');
    await page.goto(`${getUrl()}/test-resources/my/fe/v2/app/unitTests.qunit.html`);
    await expect(page.locator('#qunit')).toBeVisible();
};

const checkOPA5 = async (param: { page: Page }) => {
    const { page } = param;
    const client = await page.context().newCDPSession(page);
    await client.send('Network.clearBrowserCache');
    await page.goto(`${getUrl()}/test-resources/my/fe/v2/app/opaTests.qunit.html`);
    await expect(page.locator('#qunit-banner.qunit-pass')).toBeVisible({ timeout: 60000 });
};

const allUI5Versions = JSON.parse(process.env.UI5Versions ?? '[]') as UI5Version[];

// Limit to 3 representative versions instead of the full maintained set (as preview.spec.ts does).
// Each component test requires a fresh npm install + UI5 CLI v5 server start on Node >=22,
// making a full version matrix exceed the 60-minute CI timeout.
// - latest: catches regressions against current UI5
// - 1.120.x: LTS representative from the middle of the supported range
// - 1.84.x: kept because we fixed a component-loader race condition specific to this version
const COMPONENT_TEST_VERSIONS = new Set(['1.84', '1.120', allUI5Versions[0]?.version]);
const UI5Versions = allUI5Versions.filter(({ version }) =>
    [...COMPONENT_TEST_VERSIONS].some((v) => version.startsWith(v))
);

// @ui5/cli@5 (used for type:component) requires Node >=22
const isNode22Plus = parseInt(process.versions.node.split('.')[0], 10) >= 22;

for (const { version } of UI5Versions) {
    test.describe(`UI5 version: ${version}`, () => {
        test.skip(!isNode22Plus, 'Requires Node >=22 for @ui5/cli@5');

        test.beforeAll(async () => {
            if (!isNode22Plus) {
                return;
            }
            test.setTimeout(TIMEOUT);
            await prepare(version);
        });

        test.afterAll(async () => {
            if (!isNode22Plus) {
                return;
            }
            await teardownServer();
        });

        test('FLP page loads app and displays data', async ({ page }) => {
            await checkFlp({ page });
        });

        test('virtual QUnit page is served and boots correctly', async ({ page }) => {
            await checkQUnit({ page });
        });

        test('virtual OPA5 page runs a journey and loads app data', async ({ page }) => {
            test.setTimeout(TIMEOUT);
            await checkOPA5({ page });
        });
    });
}
