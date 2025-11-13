import { readFile } from 'fs/promises';
import { join } from 'node:path';
import path from 'node:path';
import fs from 'node:fs';

import express from 'express';
import ZipFile from 'adm-zip';
import type { ManifestNamespace } from '@sap-ux/project-access';

interface Change {
    changeType: string;
    content: unknown;
    layer: string;
}

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
        return undefined;
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
                        const change = JSON.parse(directory.readAsText(entry)) as unknown as Change;
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

                const manifest: Record<string, any> = JSON.parse(
                    manifestText
                ) as ManifestNamespace.SAPJSONSchemaForWebApplicationManifestFile & {
                    '$sap.ui.fl.changes'?: {
                        descriptor: Change[];
                    };
                };
                manifest['sap.app'].id = variant.id;
                manifest['sap.ui5']!.appVariantId = variant.id; // component name in version 1.84 and 1.96
                if (changes.length > 0) {
                    manifest['$sap.ui.fl.changes'] = {
                        descriptor: changes
                    };
                    const newAnnotationFileChange = changes.find(
                        (change) => change.changeType === 'appdescr_app_addAnnotationsToOData'
                    ) as Record<string, any>;
                    const dataSourceId = newAnnotationFileChange?.content?.['dataSourceId'];
                    if (newAnnotationFileChange) {
                        const annoDataSource = newAnnotationFileChange?.content?.dataSource;

                        // Update the URI format in annoDataSource
                        const updatedAnnoDataSource = { ...annoDataSource };
                        Object.keys(updatedAnnoDataSource).forEach((key) => {
                            if (
                                updatedAnnoDataSource[key]?.type === 'ODataAnnotation' &&
                                updatedAnnoDataSource[key]?.uri
                            ) {
                                // Replace the URI format: annotations/annotation.xml -> ui5://adp/fiori/elements/v2/annotations/annotation.xml
                                const originalUri = updatedAnnoDataSource[key].uri;
                                updatedAnnoDataSource[key] = {
                                    ...updatedAnnoDataSource[key],
                                    uri: `ui5://${variant.id.replace(/\./g, '/')}/changes/${originalUri}`
                                };
                            }
                        });

                        manifest['sap.app'].dataSources[dataSourceId].settings?.annotations?.push(
                            ...newAnnotationFileChange?.content?.['annotations']
                        );
                        manifest['sap.app'].dataSources = {
                            ...manifest['sap.app'].dataSources,
                            ...updatedAnnoDataSource
                        };
                    }
                }
                // This does not seem to be needed, but keep ABAP backend also includes fl changes in the manifest requests
                const manifestPath = `/sap/bc/ui5_ui5/ui5/${baseAppDirectory}/manifest.json`;
                mergedManifestCache.set(manifestPath, manifest);
                mapping[variant.reference] ??= new Set();
                mapping[variant.reference].add(variant.id);
                const v4Libs = getV4Libs(manifest);
                res.json({
                    [variant.id]: {
                        name: variant.reference,
                        manifest,
                        asyncHints: {
                            libs: v4Libs.length
                                ? v4Libs
                                : [
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
        const baseAppDirectory = req.query.id as string;
        if (req.query.id === undefined || typeof req.query.id !== 'string') {
            res.status(400).send('Invalid request: id query parameter is required');
            return;
        }
        const variants = mapping[req.query.id];
        if (!variants) {
            res.status(404).send('No variants found');
            return;
        }
        res.json(
            [...Object.keys(mapping), ...variants.values()].reduce((acc, key) => {
                acc[key] = {
                    name: baseAppDirectory,
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
                                reference: baseAppDirectory
                            }
                        }
                    ]
                };
                return acc;
            }, {} as Record<string, any>)
        );
    });

    // Generic OData metadata endpoint
    app.get('/sap/opu/odata/sap/:service/\\$metadata', (req, res) => {
        const serviceName = req.params.service;
        const xmlData = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="1.0" xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx">
    <edmx:DataServices m:DataServiceVersion="2.0" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata">
        <Schema Namespace="${serviceName}" xmlns="http://schemas.microsoft.com/ado/2008/09/edm">
            <EntityType Name="SampleEntity">
                <Property Name="ID" Type="Edm.String" Nullable="false"/>
                <Property Name="Name" Type="Edm.String"/>
            </EntityType>
            <EntityContainer Name="${serviceName}_Entities" m:IsDefaultEntityContainer="true">
                <EntitySet Name="SampleEntitySet" EntityType="${serviceName}.SampleEntity"/>
            </EntityContainer>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

        res.setHeader('Content-Type', 'application/xml');
        res.send(xmlData);
    });

    // Start the server
    app.listen(port, () => {
        console.log(`Mock ABAP backend is running on http://localhost:${port}`);
    });
}

/**
 * Get required V4 libs from manifest routing targets.
 *
 * @param manifest - The manifest object.
 * @returns An array of library objects with name and optional lazy loading flag.
 */
function getV4Libs(manifest: Record<string, any>): Array<{ name: string; lazy?: boolean }> {
    const appTargets = manifest['sap.ui5']?.routing?.targets;
    let libs: { name: string; lazy?: boolean }[] = [];
    for (const targetKey in appTargets) {
        const target = appTargets[targetKey] as unknown as { type: string; name: string };
        if (
            target.type === 'Component' &&
            target.name &&
            target.name in
                {
                    'sap.fe.templates.ListReport': 'ListReport',
                    'sap.fe.templates.ObjectPage': 'ObjectPage',
                    'sap.fe.core.fpm': 'FPM'
                }
        ) {
            libs = [
                {
                    name: 'sap.ui.core'
                },
                {
                    name: 'sap.fe.core'
                },
                {
                    name: 'sap.uxap',
                    lazy: true
                },
                {
                    name: 'sap.ui.mdc'
                },
                {
                    name: 'sap.fe.macros'
                },
                {
                    name: 'sap.ui.rta'
                },
                {
                    name: 'sap.fe.templates'
                }
            ];
            break;
        }
    }
    return libs;
}

export default globalSetup;
