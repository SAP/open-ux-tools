import { readFile } from 'fs/promises';
import { join } from 'path';
import path from 'path';
import fs from 'fs';

import express from 'express';
import ZipFile from 'adm-zip';

/**
 * Global setup.
 *
 * It fetches maintained UI5 versions and add them to `process.env` variable.
 */
async function globalSetup(): Promise<void> {
    const app = express();
    const port = 3050;
    const mapping: Record<string, Set<string>> = {};

    // Define the path to the static content
    const staticPath = path.join(__dirname, '..', 'fixtures-copy');

    const mergedManifestCache = new Map<string, object>();

    // Serve static files

    app.use('/sap/bc/ui5_ui5/ui5/', (req, res, next) => {
        const manifest = mergedManifestCache.get(req.path);
        if (manifest) {
            return res.json(manifest);
        }
        next();
    });
    app.use('/sap/bc/ui5_ui5/ui5/', express.static(staticPath));
    app.get('/sap/bc/lrep/actions/getcsrftoken', (req, res) => {
        res.sendStatus(200);
    });
    app.get('/sap/bc/adt/discovery', (req, res) => {
        const filePath = path.join(__dirname, 'responses', 'discovery.xml');
        const readStream = fs.createReadStream(filePath);

        readStream.on('open', () => {
            res.setHeader('Content-Type', 'application/xml');
            readStream.pipe(res);
        });

        readStream.on('error', (err) => {
            console.error('Error reading file:', err);
            res.status(500).send('Internal Server Error');
        });
    });

    app.put('/sap/bc/lrep/appdescr_variant_preview', (req, res) => {
        const bufferChunks: any[] = [];
        req.on('data', (chunk) => {
            bufferChunks.push(chunk);
        });

        req.on('end', async () => {
            const buffer = Buffer.concat(bufferChunks);
            try {
                const directory = new ZipFile(buffer);

                const variant = JSON.parse(
                    directory.readFile('manifest.appdescr_variant')!.toString('utf-8')
                ) as unknown as {
                    id: string;
                    reference: string;
                    appId: string;
                    appType: string;
                };

                const changes = directory
                    .getEntries()
                    .filter(
                        (entry) =>
                            // match changes from https://github.com/SAP/open-ux-tools/blob/674da278697811d72d09f64938bfd2292bfee9cf/packages/reload-middleware/src/base/livereload.ts#L77-L82
                            entry.name.endsWith('appdescr_fe_changePageConfiguration.change') ||
                            entry.name.endsWith('appdescr_ui_generic_app_changePageConfiguration.change') ||
                            entry.name.endsWith('appdescr_ui_gen_app_changePageConfig.change') ||
                            entry.name.endsWith('appdescr_app_addAnnotationsToOData.change') ||
                            entry.name.endsWith('appdescr_ui_generic_app_addNewObjectPage.change') ||
                            entry.name.endsWith('appdescr_fe_addNewPage.change')
                    )
                    .map((entry) => {
                        const change = JSON.parse(directory.readAsText(entry)) as unknown as {
                            changeType: string;
                            content: unknown;
                            layer: string;
                        };
                        return {
                            changeType: change.changeType,
                            content: change.content,
                            layer: change.layer
                        };
                    });

                const baseAppDirectory = `${variant.reference}`;
                const manifestText = await readFile(
                    join(__dirname, '..', 'fixtures-copy', `${variant.reference}`, 'webapp', 'manifest.json'),
                    'utf-8'
                );

                const manifest = JSON.parse(manifestText);
                manifest['sap.app'].id = variant.id;
                manifest['sap.ui5'].appVariantId = variant.id; // component name in version 1.84 and 1.96
                if (changes.length > 0) {
                    manifest['$sap.ui.fl.changes'] = {
                        descriptor: changes
                    };
                }
                // This does not seem to be needed, but keep ABAP backend also includes fl changes in the manifest requests
                const manifestPath = `/sap/bc/ui5_ui5/ui5/${baseAppDirectory}/manifest.json`;
                mergedManifestCache.set(manifestPath, manifest);
                mapping[variant.reference] ??= new Set();
                mapping[variant.reference].add(variant.id);

                res.json({
                    [variant.id]: {
                        name: variant.reference,
                        manifest,
                        asyncHints: {
                            libs: [
                                {
                                    name: 'sap.ui.core'
                                },
                                {
                                    name: 'sap.m'
                                },
                                {
                                    name: 'sap.suite.ui.generic.template'
                                },
                                {
                                    name: 'sap.uxap',
                                    lazy: true
                                },
                                {
                                    name: 'sap.ui.table',
                                    lazy: true
                                },
                                {
                                    name: 'sap.ui.commons',
                                    lazy: true
                                },
                                {
                                    name: 'sap.ui.comp'
                                },
                                {
                                    name: 'sap.ui.rta'
                                },
                                {
                                    name: 'sap.ui.generic.app'
                                }
                            ]
                        },
                        url: `/sap/bc/ui5_ui5/ui5/${baseAppDirectory}/webapp`,
                        components: [
                            {
                                name: variant.id,
                                url: {
                                    url: '/',
                                    final: true
                                },
                                lazy: true
                            }
                        ],
                        minUi5Versions: ['1.71.0'],
                        requests: [
                            {
                                name: 'sap.ui.fl.changes',
                                reference: variant.id,
                                preview: {
                                    maxLayer: 'PARTNER',
                                    reference: variant.reference
                                }
                            }
                        ]
                    }
                });
            } catch (err) {
                console.error('Error processing zip buffer:', err);
                res.status(500).send('Error processing zip buffer');
            }
        });
    });

    app.get('/sap/bc/ui2/app_index/ui5_app_info_json', (req, res) => {
        const baseAppDirectory = `${req.query.id}`;
        const variants = mapping[req.query.id];
        if (!variants) {
            res.status(404).send('No variants found');
            return;
        }
        res.json(
            [...variants.values()].reduce((acc, key) => {
                acc[key] = {
                    name: req.query.id,
                    manifest: `/sap/bc/ui5_ui5/ui5/${baseAppDirectory}/webapp/manifest.json`,
                    url: `/sap/bc/ui5_ui5/ui5/${baseAppDirectory}/webapp`,
                    components: [
                        {
                            name: key,
                            url: {
                                url: '/',
                                final: true
                            },
                            lazy: true
                        }
                    ],
                    minUi5Versions: ['1.71.0'],
                    requests: [
                        {
                            name: 'sap.ui.fl.changes',
                            reference: key,
                            preview: {
                                maxLayer: 'PARTNER',
                                reference: req.query.id
                            }
                        }
                    ]
                };
                return acc;
            }, {} as Record<string, any>)
        );
    });

    // Start the server
    app.listen(port, () => {
        console.log(`Mock ABAP backend is running on http://localhost:${port}`);
    });

    // await use(`http://localhost:${port}`);

    // server.close(() => {
    //     console.log(`Mock ABAP backend server closed: http://localhost:${port}`);
    // });
}

export default globalSetup;
