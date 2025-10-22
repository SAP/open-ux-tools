import { rm, stat, symlink } from 'fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

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
    projectConfigAnnotation: boolean;
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

/**
 * Colorize text for console output.
 *
 * @param colorCode - ANSI color code.
 * @returns Function that takes a string and returns it wrapped in color codes for console output.
 */
function colorize(colorCode: number): (text: string) => string {
    return (text: string) => `\x1b[3${colorCode + 1}m${text}${RESET}`;
}

/**
 *  Create a logger function that prefixes messages with a timestamp and index.
 *
 * @param colorCode - ANSI color code.
 * @returns A function that takes a message and logs it with a timestamp and index.
 */
function createLogger(colorCode: number): (message: string) => void {
    const timestamp = new Date().toISOString();
    return (message: string) => console.log('[' + colorize(colorCode)(timestamp) + ']', colorize(colorCode)(message));
}

export const test = base.extend<TestOptions, WorkerFixtures>({
    ui5Version: ['1.71.75', { option: true, scope: 'worker' }],
    testSkipper: [
        async ({ ui5Version, log }, use, testInfo): Promise<void> => {
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
    // Inject projectConfig into test annotations so reporters can consume it reliably
    projectConfigAnnotation: [
        async ({ projectConfig }, use, testInfo): Promise<void> => {
            try {
                const payload = (() => {
                    try {
                        return JSON.stringify({ projectConfig });
                    } catch {
                        return JSON.stringify({ projectConfig: projectConfig.id ?? projectConfig });
                    }
                })();
                testInfo.annotations.push({
                    type: 'projectConfig',
                    description: payload
                });
            } catch {
                // ignore annotation failures
            }
            await use(true);
        },
        { scope: 'test', auto: true }
    ],
    log: [
        async ({}, use, testInfo): Promise<void> => {
            const logger = createLogger(testInfo.parallelIndex);
            await use(logger);
        },
        { scope: 'worker' }
    ],
    projectCopy: [
        async ({ ui5Version, projectConfig, log }, use, workerInfo): Promise<void> => {
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
        async ({ projectCopy, log }, use, workerInfo): Promise<void> => {
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
    page: async ({ page, projectServer, projectCopy }, use) => {
        await page.goto(
            `http://localhost:${projectServer}${ADAPTATION_EDITOR_PATH}?fiori-tools-rta-mode=true#app-preview`
        );
        await expect(
            page.getByRole('button', { name: 'UI Adaptation' }),
            'Check `UIAdaptation` mode in the toolbar is enabled'
        ).toBeEnabled({
            timeout: 15_000
        });
        // Each test will get a "page" that already has the person name.
        await use(page);

        // Clean up changes directory after each test is complete
        const changesDir = join(projectCopy, 'webapp', 'changes');
        if (existsSync(changesDir)) {
            await rm(changesDir, { recursive: true });
        }
    },
    previewFrame: [
        async ({ page }, use): Promise<void> => {
            await use(page.locator('iframe[title="Application Preview"]').contentFrame());
        },
        { scope: 'test' }
    ]
});
