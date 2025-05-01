import { readFile, rm, stat, symlink, writeFile } from 'fs/promises';
import { join } from 'path';
import path from 'path';
import fs from 'fs';

import { getPortPromise } from 'portfinder';
import { setup, teardown } from 'jest-dev-server';

import express from 'express';
import ZipFile from 'adm-zip';

import type { FrameLocator, Page } from '@sap-ux-private/playwright';
import { test as base } from '@sap-ux-private/playwright';

import { SERVER_TIMEOUT, TIMEOUT } from './utils/constant';
import {
    ADAPTATION_EDITOR_PATH,
    generateUi5Project,
    generateAdpProject,
    SIMPLE_APP,
    type ProjectConfig
} from '../project';

export type TestOptions = {
    previewFrame: FrameLocator;
};

const PACKAGE_ROOT = join(__dirname, '..', 'fixtures', 'mock');
export type WorkerFixtures = {
    projectCopy: string;
    projectServer: number;
    ui5Version: string;
    // backend: string;
    projectConfig: ProjectConfig;
};

let i = 0;

export const test = base.extend<TestOptions, WorkerFixtures>({
    ui5Version: ['1.71.75', { option: true, scope: 'worker' }],
    projectConfig: [SIMPLE_APP, { option: true, scope: 'worker' }],
    // backend: [
    //     async ({}, use, testInfo) => {
    //         const app = express();
    //         const start = 3050 + testInfo.parallelIndex * 100;
    //         const port = await getPortPromise({ port: start });
    //         const mapping: Record<string, Set<string>> = {};

    //         // Define the path to the static content
    //         const staticPath = path.join(__dirname, '..', 'fixtures-copy');

    //         // Serve static files
    //         app.use((req, res, next) => {
    //             console.log('Request URL:', req.url);
    //             next();
    //         });

    //         app.use('/sap/bc/ui5_ui5/ui5/', express.static(staticPath));
    //         app.get('/sap/bc/lrep/actions/getcsrftoken', (req, res) => {
    //             res.send(200);
    //         });
    //         app.get('/sap/bc/adt/discovery', (req, res) => {
    //             const filePath = path.join(__dirname, 'responses', 'discovery.xml');
    //             const readStream = fs.createReadStream(filePath);

    //             readStream.on('open', () => {
    //                 res.setHeader('Content-Type', 'application/xml');
    //                 readStream.pipe(res);
    //             });

    //             readStream.on('error', (err) => {
    //                 console.error('Error reading file:', err);
    //                 res.status(500).send('Internal Server Error');
    //             });
    //         });

    //         app.put('/sap/bc/lrep/appdescr_variant_preview', (req, res) => {
    //             const bufferChunks: any[] = [];
    //             req.on('data', (chunk) => {
    //                 bufferChunks.push(chunk);
    //             });

    //             req.on('end', async () => {
    //                 const buffer = Buffer.concat(bufferChunks);
    //                 try {
    //                     const directory = new ZipFile(buffer);

    //                     const variant = JSON.parse(directory.readFile('manifest.appdescr_variant')!.toString('utf-8'));
    //                     const baseAppDirectory = `${variant.reference}-${testInfo.parallelIndex.toString()}`;
    //                     const manifestText = await readFile(
    //                         join(
    //                             __dirname,
    //                             '..',
    //                             'fixtures-copy',
    //                             `${variant.reference}-${testInfo.parallelIndex.toString()}`,
    //                             'webapp',
    //                             'manifest.json'
    //                         ),
    //                         'utf-8'
    //                     );

    //                     const manifest = JSON.parse(manifestText);
    //                     manifest['sap.app'].id = variant.id;
    //                     // console.log([...mapping.keys()]);
    //                     mapping[variant.reference] ??= new Set();
    //                     mapping[variant.reference].add(variant.id);

    //                     res.json({
    //                         [variant.id]: {
    //                             name: variant.reference,
    //                             manifest,
    //                             asyncHints: {
    //                                 libs: [
    //                                     // {
    //                                     //     name: 'sap.ui.core'
    //                                     // },
    //                                     // {
    //                                     //     name: 'sap.m'
    //                                     // },
    //                                     // {
    //                                     //     name: 'sap.suite.ui.generic.template'
    //                                     // },
    //                                     // {
    //                                     //     name: 'sap.uxap',
    //                                     //     lazy: true
    //                                     // },
    //                                     // {
    //                                     //     name: 'sap.ui.table',
    //                                     //     lazy: true
    //                                     // },
    //                                     // {
    //                                     //     name: 'sap.ui.commons',
    //                                     //     lazy: true
    //                                     // },
    //                                     // {
    //                                     //     name: 'sap.ui.comp'
    //                                     // },
    //                                     // {
    //                                     //     name: 'sap.ui.rta'
    //                                     // },
    //                                     // {
    //                                     //     name: 'sap.ui.generic.app'
    //                                     // }
    //                                 ]
    //                             },
    //                             url: `/sap/bc/ui5_ui5/ui5/${baseAppDirectory}/webapp`,
    //                             components: [
    //                                 {
    //                                     name: variant.id,
    //                                     url: {
    //                                         url: '/',
    //                                         final: true
    //                                     },
    //                                     lazy: true
    //                                 }
    //                             ],
    //                             minUi5Versions: ['1.71.0'],
    //                             requests: [
    //                                 {
    //                                     name: 'sap.ui.fl.changes',
    //                                     reference: variant.id,
    //                                     preview: {
    //                                         maxLayer: 'PARTNER',
    //                                         reference: variant.reference
    //                                     }
    //                                 }
    //                             ]
    //                         }
    //                     });
    //                 } catch (err) {
    //                     console.error('Error processing zip buffer:', err);
    //                     res.status(500).send('Error processing zip buffer');
    //                 }
    //             });
    //         });

    //         app.get('/sap/bc/ui2/app_index/ui5_app_info_json', (req, res) => {
    //             const baseAppDirectory = `${req.query.id}-${testInfo.parallelIndex.toString()}`;
    //             const variants = mapping[req.query.id];
    //             if (!variants) {
    //                 res.status(404).send('No variants found');
    //                 return;
    //             }
    //             res.json(
    //                 [...variants.values()].reduce((acc, key) => {
    //                     acc[key] = {
    //                         name: req.query.id,
    //                         manifest: `/sap/bc/ui5_ui5/ui5/${baseAppDirectory}/webapp/manifest.json`,
    //                         url: `/sap/bc/ui5_ui5/ui5/${baseAppDirectory}/webapp`,
    //                         components: [
    //                             {
    //                                 name: key,
    //                                 url: {
    //                                     url: '/',
    //                                     final: true
    //                                 },
    //                                 lazy: true
    //                             }
    //                         ],
    //                         minUi5Versions: ['1.71.0'],
    //                         requests: [
    //                             {
    //                                 name: 'sap.ui.fl.changes',
    //                                 reference: key,
    //                                 preview: {
    //                                     maxLayer: 'PARTNER',
    //                                     reference: req.query.id
    //                                 }
    //                             }
    //                         ]
    //                     };
    //                     return acc;
    //                 }, {} as Record<string, any>)
    //             );
    //         });

    //         // Start the server
    //         const server = app.listen(port, () => {
    //             console.log(`Mock ABAP backend is running on http://localhost:${port}`);
    //         });

    //         await use(`http://localhost:${port}`);

    //         server.close(() => {
    //             console.log(`Mock ABAP backend server closed: http://localhost:${port}`);
    //         });
    //     },
    //     { scope: 'worker' }
    // ],
    projectCopy: [
        async ({ ui5Version, projectConfig }, use, workerInfo) => {
            console.log(
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
                        35729 + workerInfo.parallelIndex
                    );
                    const targetPath = join(root, 'node_modules');
                    console.log(`Linking ${PACKAGE_ROOT} -> ${targetPath}`);
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

                    console.log(`Copying project to ${root} time = ${++i}`);

                    await use(root);
                    return;
                }
            }
            throw new Error(`Unsupported project kind: ${projectConfig.kind}`);
        },
        { timeout: TIMEOUT, scope: 'worker' }
    ],
    projectServer: [
        async ({ projectCopy }, use, workerInfo) => {
            console.log(`Starting ui5 tooling to ${projectCopy} time = ${++i}`);

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
            console.log(`Stopping server for ${projectCopy}`);
            await teardown(server);
        },
        { timeout: TIMEOUT, scope: 'worker' }
    ],
    // Override default "page" fixture.
    page: async ({ page, projectServer }, use) => {
        await page.goto(
            `http://localhost:${projectServer}${ADAPTATION_EDITOR_PATH}?fiori-tools-rta-mode=true#app-preview`
        );
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
