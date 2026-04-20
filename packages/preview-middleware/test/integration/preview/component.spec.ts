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
import { SERVER_TIMEOUT, TIMEOUT } from '../utils/constant';

const buildUrl =
    (port = 3000) =>
    () =>
        `http://localhost:${port}`;
let getUrl: () => string;

const cwd = join(__dirname, '..', '..', 'fixtures', 'simple-component');
const testCwd = getDestinationProjectRoot(cwd);

/**
 * This content will overwrite the existing `ui5.yaml` file content in the copied project.
 *
 * @param ui5Version UI5 version
 * @returns YAML content
 */
const getYamlContent = (ui5Version: string): string => {
    return `
specVersion: '5.0'
metadata:
    name: test-project
type: component
server:
    customMiddleware:
        - name: preview-middleware
          afterMiddleware: compression
          configuration:
              flp:
                path: /my/custom/path/preview.html
                libs: true
              test:
                - framework: QUnit
                - framework: OPA5
              debug: true
        - name: ui5-proxy-middleware
          afterMiddleware: preview-middleware
          configuration:
              ui5:
                  - path: /resources
                    url: https://ui5.sap.com
                  - path: /test-resources
                    url: https://ui5.sap.com
              version: ${ui5Version}
        - name: sap-fe-mockserver
          beforeMiddleware: csp
          configuration:
              mountPath: /
              annotations:
                  - localPath: ./src/localService/annotations.xml
                    urlPath: /sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations*
              services:
                  - urlPath: /sap/opu/odata/myservice
                    metadataPath: ./src/localService/metadata.xml
                    mockdataPath: ./src/localService/data
                    generateMockData: true
---
specVersion: "3.0"
metadata:
  name: preview-middleware
kind: extension
type: server-middleware
middleware:
  path: ../../../dist/ui5/middleware.js
---
specVersion: "3.0"
metadata:
  name: ui5-proxy-middleware
kind: extension
type: server-middleware
middleware:
  path: ../../../../ui5-proxy-middleware/dist/ui5/middleware.js
`;
};

const getYamlPath = (cwd: string): string => {
    return join(cwd, 'ui5.yaml');
};

const adaptUi5Yaml = async (ui5Version: string) => {
    const yamlPath = getYamlPath(testCwd);
    await writeFile(yamlPath, getYamlContent(ui5Version));
};

const adaptPackageJson = async () => {
    const packageJsonPath = join(testCwd, 'package.json');
    const content = JSON.parse(await readFile(packageJsonPath, 'utf-8')) as Record<string, unknown>;
    const devDependencies = content.devDependencies as Record<string, string>;
    devDependencies['@ui5/cli'] = '5.0.0-alpha.4';
    // Remove ui5-proxy-middleware from node_modules; it is registered via yaml extension pointing to local dist
    delete devDependencies['@sap-ux/ui5-proxy-middleware'];
    await writeFile(packageJsonPath, JSON.stringify(content, null, 4));
};

const prepare = async (ui5Version: string) => {
    await copyProject({
        projectRoot: cwd,
        cb: async () => {
            await adaptUi5Yaml(ui5Version);
            await adaptPackageJson();
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
    await page.goto(`${getUrl()}/test-resources/test/fe/v2/app/my/custom/path/preview.html#app-preview`);
    await page.getByRole('button', { name: 'Go', exact: true }).click();
    await expect(page.getByText('Product_0', { exact: true })).toBeVisible();
};

const checkQUnit = async (param: { page: Page }) => {
    const { page } = param;
    const client = await page.context().newCDPSession(page);
    await client.send('Network.clearBrowserCache');
    await page.goto(`${getUrl()}/test-resources/test/fe/v2/app/unitTests.qunit.html`);
    await expect(page.locator('#qunit')).toBeVisible();
};

const checkOPA5 = async (param: { page: Page }) => {
    const { page } = param;
    const client = await page.context().newCDPSession(page);
    await client.send('Network.clearBrowserCache');
    await page.goto(`${getUrl()}/test-resources/test/fe/v2/app/opaTests.qunit.html`);
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
