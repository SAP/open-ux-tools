import { rm, stat, symlink } from 'fs/promises';
import { join } from 'path';

import { getPortPromise } from 'portfinder';
import { setup, teardown } from 'jest-dev-server';

import type { FrameLocator } from '@sap-ux-private/playwright';
import { test as base, expect } from '@sap-ux-private/playwright';

import { SERVER_TIMEOUT, TIMEOUT } from './constant';
import {
    ADAPTATION_EDITOR_PATH,
    generateUi5Project,
    generateAdpProject,
    SIMPLE_APP,
    type ProjectConfig
} from './project';
import { satisfies } from 'semver';

export type TestOptions = {
    previewFrame: FrameLocator;
    testSkipper: boolean;
};

// Avoid installing npm packages every time, but use symlink instead
const PACKAGE_ROOT = join(__dirname, '..', '..', '..', 'fixtures', 'projects', 'mock');
export type WorkerFixtures = {
    projectCopy: string;
    projectServer: number;
    ui5Version: string;
    projectConfig: ProjectConfig;

    log: (message: string) => void;
};

let i = 0;
let j = 0;

const RESET = '\x1b[0m';

function colorize(color: number) {
    return (text: string) => `\x1b[3${color + 1}m${text}${RESET}`;
}

function createLogger(index: number) {
    const timestamp = new Date().toISOString();
    return (message: string) => console.log('[' + colorize(index)(timestamp) + ']', colorize(index)(message));
}

export const test = base.extend<TestOptions, WorkerFixtures>({
    ui5Version: ['1.71.75', { option: true, scope: 'worker' }],
    testSkipper: [
        async ({ ui5Version, log }, use, testInfo) => {
            // test setup takes time, so we should check and skip the test before that
            const annotation = testInfo.annotations.find((annotation) => annotation.type === 'skipUI5Version');
            if (annotation?.description) {
                const skip = satisfies(ui5Version, annotation.description, { loose: true });
                if (skip) {
                    log(`skipping ${testInfo.title}`);
                }
                testInfo.skip(skip, `Test is not supported in this UI5 version`);
            }

            await use(true);
        },
        {
            scope: 'test',
            auto: true
        }
    ],
    projectConfig: [SIMPLE_APP, { option: true, scope: 'worker' }],
    log: [
        async ({}, use, testInfo) => {
            const logger = createLogger(testInfo.parallelIndex);
            await use(logger);
        },
        { scope: 'worker' }
    ],
    projectCopy: [
        async ({ ui5Version, projectConfig, log }, use, workerInfo) => {
            log(
                `Using UI5 version: ${ui5Version} workerIndex: ${workerInfo.workerIndex} parallel: ${workerInfo.parallelIndex}`
            );

            if (projectConfig.type === 'generated') {
                if (projectConfig.kind === 'adp') {
                    await generateUi5Project(projectConfig.baseApp, workerInfo.parallelIndex.toString(), ui5Version);
                    const root = await generateAdpProject(
                        projectConfig,
                        workerInfo.parallelIndex.toString(),
                        ui5Version,
                        'http://localhost:3050',
                        35750 + workerInfo.parallelIndex
                    );
                    const targetPath = join(root, 'node_modules');
                    log(`Linking ${PACKAGE_ROOT} -> ${targetPath}`);
                    try {
                        await stat(targetPath);
                        await rm(targetPath, { recursive: true });
                    } catch (error) {
                        if (error?.code !== 'ENOENT') {
                            console.log(error);
                        }
                    } finally {
                        // type required for windows
                        await symlink(join(PACKAGE_ROOT, 'node_modules'), targetPath, 'junction');
                    }

                    log(`Copying project to ${root} time = ${++i}`);

                    await use(root);
                    return;
                }
            }
            throw new Error(`Unsupported project kind: ${projectConfig.kind}`);
        },
        { timeout: TIMEOUT, scope: 'worker' }
    ],
    projectServer: [
        async ({ projectCopy, log }, use, workerInfo) => {
            log(`Starting ui5 tooling to ${projectCopy} time = ${++j}`);

            const start = 3000 + workerInfo.parallelIndex * 100;
            const port = await getPortPromise({ port: start });

            process.env.FIORI_TOOLS_USER = 'test';
            process.env.FIORI_TOOLS_PASSWORD = 'test';
            const server = await setup({
                command: `cd ${projectCopy} && npx ui5 serve --port=${port}`,
                launchTimeout: SERVER_TIMEOUT,
                port: port,
                host: 'localhost',
                protocol: 'http',
                usedPortAction: 'error',
                debug: false
            });

            await use(port);
            log(`Stopping server for ${projectCopy}`);
            await teardown(server);
        },
        { timeout: TIMEOUT, scope: 'worker' }
    ],
    // Override default "page" fixture.
    page: async ({ page, projectServer, ui5Version }, use) => {
        await page.goto(
            `http://localhost:${projectServer}${ADAPTATION_EDITOR_PATH}?fiori-tools-rta-mode=true#app-preview`
        );
        if (satisfies(ui5Version, '1.84.0 - 1.130.0')) {
            // Sync clones are created which trigger sync views warning
            await expect.soft(page.getByText('Synchronous views are')).toBeVisible({ timeout: 15_000 });
            await page.getByRole('button', { name: 'OK' }).click();
            await expect.soft(page.locator('.ms-Overlay')).toBeHidden();
        }
        await expect(page.getByRole('button', { name: 'UI Adaptation' })).toBeEnabled({ timeout: 15_000 });
        // Each test will get a "page" that already has the person name.
        await use(page);
    },
    previewFrame: [
        async ({ page }, use) => {
            await use(page.locator('iframe[title="Application Preview"]').contentFrame());
        },
        { scope: 'test' }
    ]
});
