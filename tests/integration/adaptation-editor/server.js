'use strict';
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { 'default': mod };
    };
Object.defineProperty(exports, '__esModule', { value: true });
const promises_1 = require('fs/promises');
const path_1 = require('path');
const path_2 = __importDefault(require('path'));
const fs_1 = __importDefault(require('fs'));
const express_1 = __importDefault(require('express'));
const adm_zip_1 = __importDefault(require('adm-zip'));
const playwright_1 = require('@sap-ux-private/playwright');
/**
 * Global setup.
 *
 * It fetches maintained UI5 versions and add them to `process.env` variable.
 */
async function globalSetup() {
    // await (0, playwright_1.install)((0, path_1.join)(__dirname, 'test', 'fixtures', 'mock'));
    const app = (0, express_1.default)();
    const port = 3050;
    const mapping = {};
    // Define the path to the static content
    const staticPath = path_2.default.join(__dirname, 'fixtures-copy');
    app.use((req, res, next) => {
        console.log('Request URL:', req.url);
        next();
    });

    app.get('/status', (req, res) => {
        res.sendStatus(200);
    });
    // Serve static files
    app.use('/sap/bc/ui5_ui5/ui5/', express_1.default.static(staticPath));
    app.get('/sap/bc/lrep/actions/getcsrftoken', (req, res) => {
        res.sendStatus(200);
    });
    app.get('/sap/bc/adt/discovery', (req, res) => {
        const filePath = path_2.default.join(__dirname, 'src', 'responses', 'discovery.xml');
        const readStream = fs_1.default.createReadStream(filePath);
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
        const bufferChunks = [];
        req.on('data', (chunk) => {
            bufferChunks.push(chunk);
        });
        req.on('end', async () => {
            var _a;
            var _b;
            const buffer = Buffer.concat(bufferChunks);
            try {
                const directory = new adm_zip_1.default(buffer);
                const variant = JSON.parse(directory.readFile('manifest.appdescr_variant').toString('utf-8'));
                const baseAppDirectory = `${variant.reference}`;
                const manifestText = await (0, promises_1.readFile)(
                    (0, path_1.join)(
                        __dirname,

                        'fixtures-copy',
                        `${variant.reference}`,
                        'webapp',
                        'manifest.json'
                    ),
                    'utf-8'
                );
                const manifest = JSON.parse(manifestText);
                manifest['sap.app'].id = variant.id;
                (_a = mapping[(_b = variant.reference)]) !== null && _a !== void 0 ? _a : (mapping[_b] = new Set());
                mapping[variant.reference].add(variant.id);
                res.json({
                    [variant.id]: {
                        name: variant.reference,
                        manifest,
                        asyncHints: {
                            libs: [
                                // {
                                //     name: 'sap.ui.core'
                                // },
                                // {
                                //     name: 'sap.m'
                                // },
                                // {
                                //     name: 'sap.suite.ui.generic.template'
                                // },
                                // {
                                //     name: 'sap.uxap',
                                //     lazy: true
                                // },
                                // {
                                //     name: 'sap.ui.table',
                                //     lazy: true
                                // },
                                // {
                                //     name: 'sap.ui.commons',
                                //     lazy: true
                                // },
                                // {
                                //     name: 'sap.ui.comp'
                                // },
                                // {
                                //     name: 'sap.ui.rta'
                                // },
                                // {
                                //     name: 'sap.ui.generic.app'
                                // }
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
            }, {})
        );
    });
    // Start the server
    const server = app.listen(port, () => {
        console.log(`Mock ABAP backend is running on http://localhost:${port}`);
    });
    // await use(`http://localhost:${port}`);
    // server.close(() => {
    //     console.log(`Mock ABAP backend server closed: http://localhost:${port}`);
    // });
}

globalSetup()
    .then(() => {
        console.log('Global setup completed successfully.');
    })
    .catch((error) => {
        console.error('Error during global setup:', error);
    });
