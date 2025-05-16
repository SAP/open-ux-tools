import { writeFile } from 'fs/promises';
import { join } from 'path';

import { getPortPromise } from 'portfinder';
import { setup, teardown } from 'jest-dev-server';

import {
    startServer,
    teardownServer,
    copyProject,
    getDestinationProjectRoot,
    getPort,
    expect
} from '@sap-ux-private/playwright';
import type { Page } from '@sap-ux-private/playwright';
import { test as base } from '@sap-ux-private/playwright';

import { SERVER_TIMEOUT, TIMEOUT } from './utils/constant';
import { generateUi5Project, SIMPLE_APP, type ProjectConfig } from '../project';

export type TestOptions = {
    // projectConfig: {
    //     root: string;
    // };
};

export type WorkerFixtures = {
    project: {
        root: string;
        port: number;
    };
    ui5Version: string;
    projectConfig: ProjectConfig;
};

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

const adaptUi5Yaml = async (root: string, ui5Version: string) => {
    const yamlPath = join(root, 'ui5.yaml');
    await writeFile(yamlPath, getYamlContent(ui5Version));
};

let i = 0;

export const test = base.extend<TestOptions, WorkerFixtures>({
    ui5Version: ['1.71.75', { option: true, scope: 'worker' }],
    projectConfig: [SIMPLE_APP, { option: true, scope: 'worker' }],
    project: [
        async ({ ui5Version, projectConfig }, use, testInfo) => {
            console.log(
                `Using UI5 version: ${ui5Version} workerIndex: ${testInfo.workerIndex} parallel: ${testInfo.parallelIndex}`
            );
            if (projectConfig.type === 'generated') {
                throw new Error(`Unsupported project kind: ${projectConfig.kind}`);
            }
            const root = join(__dirname, '..', 'fixtures', projectConfig.root);
            const testCwd = await copyProject({
                projectRoot: root,
                id: testInfo.parallelIndex.toString(),
                cb: async (root) => {
                    await adaptUi5Yaml(root, ui5Version);
                }
            });

            console.log(`Copying project to ${testCwd} time = ${++i}`);

            const start = 3000 + testInfo.parallelIndex * 100;
            const port = await getPortPromise({ port: start });

            const server = await setup({
                command: `cd ${testCwd} && npx ui5 serve --port ${port}`,
                launchTimeout: SERVER_TIMEOUT,
                port: port,
                host: 'localhost',
                protocol: 'http',
                usedPortAction: 'error',
                debug: false
            });

            await use({
                port,
                root: testCwd
            });
            console.log(`Stopping server for ${testCwd}`);
            await teardown(server);
        },
        { timeout: TIMEOUT, scope: 'worker' }
    ],
    // Override default "page" fixture.
    page: async ({ page, project }, use) => {
        await page.goto(`http://localhost:${project.port}/my/custom/path/preview.html#app-preview`);
        // Each test will get a "page" that already has the person name.
        await use(page);
    }
});
