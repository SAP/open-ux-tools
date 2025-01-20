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
import { writeFile } from 'fs/promises';
import { join } from 'path';
import type { UI5Version } from '@sap-ux/ui5-info';

const buildUrl =
    (port = 3000) =>
    () =>
        `http://localhost:${port}`;
let getUrl: () => string;

const cwd = join(__dirname, '..', '..', 'fixtures', 'simple-app');
const testCwd = getDestinationProjectRoot(cwd);

/**
 * This content will overwrite existing `ui5.yaml` file content.
 *
 * @param ui5Version UI5 version
 * @returns YAML content
 */
const getYamlContent = (ui5Version: string): string => {
    return `
specVersion: '1.0'
metadata:
    name: test-project
type: application
server:
    customMiddleware:
        - name: preview-middleware
          afterMiddleware: compression
          configuration:
              flp:
                path: /my/custom/path/preview.html
                libs: true
                rta:
                  layer: CUSTOMER_BASE
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
                  - localPath: ./webapp/localService/annotations.xml
                    urlPath: /sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations*
              services:
                  - urlPath: /sap/opu/odata/myservice
                    metadataPath: ./webapp/localService/metadata.xml
                    mockdataPath: ./webapp/localService/data
                    generateMockData: true
---
specVersion: "3.0"
metadata:
  name: preview-middleware
kind: extension
type: server-middleware
middleware:
  path: ../../../dist/ui5/middleware.js
`;
};
const timeout = 50 * 1000;

const getYamlPath = (cwd: string): string => {
    return join(cwd, 'ui5.yaml');
};

const adaptUi5Yaml = async (ui5Version: string) => {
    const yamlPath = getYamlPath(testCwd);
    await writeFile(yamlPath, getYamlContent(ui5Version));
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
        launchTimeout: timeout,
        port: port,
        host: 'localhost',
        protocol: 'http',
        usedPortAction: 'error',
        debug: false
    });
};

const check = async (param: { page: Page }) => {
    const { page } = param;
    await page.goto(`${getUrl()}/my/custom/path/preview.html#app-preview`);
    await page.getByRole('button', { name: 'Go', exact: true }).click();
    await expect(page.getByText('ProductForEdit_0', { exact: true })).not.toBeVisible();
};

const UI5Versions = JSON.parse(process.env.UI5Versions ?? '[]') as UI5Version[];

for (const { version } of UI5Versions) {
    test.describe(`UI5 version: ${version}`, () => {
        test.afterEach(async () => {
            await teardownServer();
        });
        test('Click on Go button and check an element ', async ({ page }) => {
            await prepare(version);
            await check({ page });
        });
    });
}
