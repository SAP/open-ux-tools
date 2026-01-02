import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import type { FoundFioriArtifacts, Manifest } from '@sap-ux/project-access';
import { findFioriArtifacts, normalizePath } from '@sap-ux/project-access';

import type { FeV2ListReport, FeV2ObjectPage, LinkedFeV2App } from '../../../src/project-context/linker/fe-v2';
import { runFeV2Linker } from '../../../src/project-context/linker/fe-v2';
import type { LinkerContext } from '../../../src/project-context/linker/types';
import { ApplicationParser } from '../../../src/project-context/parser';
import type { ManifestChange } from '../../test-helper';
import { applyManifestChange } from '../../test-helper';

const parser = new ApplicationParser();

interface TestOptions {
    manifestChanges?: ManifestChange[];
}

describe('FE V2 Linker', () => {
    let artifacts: FoundFioriArtifacts;
    const fileCache = new Map<string, string>();
    const root = join(__dirname, '..', '..', 'data', 'v2-xml-start');
    beforeAll(async () => {
        artifacts = await findFioriArtifacts({
            wsFolders: [root],
            artifacts: ['applications', 'adaptations']
        });
        const files = [join('annotations', 'annotation.xml'), join('localService', 'metadata.xml'), 'manifest.json'];
        for (const file of files) {
            const absolutePath = normalizePath(join(root, 'webapp', file));
            const content = await readFile(absolutePath, 'utf-8');
            const uri = pathToFileURL(absolutePath).toString();
            fileCache.set(uri, content);
        }
    });

    async function setup(options?: TestOptions): Promise<LinkerContext> {
        const testCache = new Map<string, string>(fileCache);
        if (options?.manifestChanges) {
            const absolutePath = normalizePath(join(root, 'webapp', 'manifest.json'));
            const uri = pathToFileURL(absolutePath).toString();
            const manifestText = fileCache.get(uri)!;
            const manifestObject = JSON.parse(manifestText) as Manifest;
            for (const change of options?.manifestChanges) {
                applyManifestChange(manifestObject, change);
            }
            testCache.set(uri, JSON.stringify(manifestObject, null, 4));
        }
        const model = parser.parse('EDMXBackend', artifacts, testCache);

        const app = model.index.apps[Object.keys(model.index.apps)[0]];
        return {
            app,
            diagnostics: []
        };
    }
    function findObjectPage(app: LinkedFeV2App, index = 0): FeV2ObjectPage {
        let i = 0;
        for (const page of app.pages) {
            if (page.componentName === 'sap.suite.ui.generic.template.ObjectPage') {
                if (i === index) {
                    return page;
                }
                i++;
            }
        }
        throw new Error('ObjectPage not found');
    }

    describe('linkTableSettings', () => {
        describe('application level', () => {
            test('createMode', async () => {
                const context = await setup({
                    manifestChanges: [
                        {
                            path: ['sap.ui.generic.app', 'settings', 'tableSettings', 'createMode'],
                            value: 'creationRows'
                        }
                    ]
                });

                const result = runFeV2Linker(context);
                expect(result.configuration.createMode).toMatchSnapshot();
            });
        });
        describe('page level - object page', () => {
            test('createMode', async () => {
                const context = await setup({
                    manifestChanges: [
                        {
                            path: [
                                'sap.ui.generic.app',
                                'pages',
                                'AnalyticalListPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
                                'pages',
                                'ObjectPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
                                'component',
                                'settings',
                                'createMode'
                            ],
                            value: 'creationRows'
                        }
                    ]
                });
                const result = runFeV2Linker(context);
                const page = findObjectPage(result);
                expect(page.configuration.createMode).toMatchSnapshot();
            });
        });
        describe('section level - object page', () => {
            test('createMode', async () => {
                const context = await setup({
                    manifestChanges: [
                        {
                            path: [
                                'sap.ui.generic.app',
                                'pages',
                                'AnalyticalListPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
                                'pages',
                                'ObjectPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
                                'component',
                                'settings',
                                'sections',
                                'to_Product::com.sap.vocabularies.UI.v1.LineItem',
                                'createMode'
                            ],
                            value: 'creationRows'
                        }
                    ]
                });
                const result = runFeV2Linker(context);
                const page = findObjectPage(result);
                const table = page.lookup['table'];
                expect(table).toHaveLength(1);
                expect(table![0].configuration.createMode).toMatchSnapshot();
            });
            test('createMode - wrong value', async () => {
                const context = await setup({
                    manifestChanges: [
                        {
                            path: [
                                'sap.ui.generic.app',
                                'pages',
                                'AnalyticalListPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
                                'pages',
                                'ObjectPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
                                'component',
                                'settings',
                                'sections',
                                'to_Product::com.sap.vocabularies.UI.v1.LineItem',
                                'createMode'
                            ],
                            value: 'abc'
                        }
                    ]
                });
                const result = runFeV2Linker(context);
                const page = findObjectPage(result);
                const table = page.lookup['table'];
                expect(table).toHaveLength(1);
                expect(table![0].configuration.createMode).toMatchSnapshot();
            });
            test('orphan-node', async () => {
                const context = await setup({
                    manifestChanges: [
                        {
                            path: [
                                'sap.ui.generic.app',
                                'pages',
                                'AnalyticalListPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
                                'pages',
                                'ObjectPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
                                'component',
                                'settings',
                                'sections',
                                'to_Product::com.sap.vocabularies.UI.v1.LineItem#NOT_EXIST',
                                'createMode'
                            ],
                            value: 'creationRows'
                        }
                    ]
                });
                const result = runFeV2Linker(context);
                const page = findObjectPage(result);
                const orphanSections = page.lookup['orphan-section'];
                expect(orphanSections).toHaveLength(1);
                expect(orphanSections![0].configuration.createMode).toMatchSnapshot();
            });

            test('tableType', async () => {
                const context = await setup({
                    manifestChanges: [
                        {
                            path: [
                                'sap.ui.generic.app',
                                'pages',
                                'AnalyticalListPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
                                'pages',
                                'ObjectPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
                                'component',
                                'settings',
                                'sections',
                                'to_Product::com.sap.vocabularies.UI.v1.LineItem',
                                'tableSettings',
                                'type'
                            ],
                            value: 'ResponsiveTable'
                        }
                    ]
                });
                const result = runFeV2Linker(context);
                const page = findObjectPage(result);
                const table = page.lookup['table'];
                expect(table).toHaveLength(1);
                expect(table![0].configuration.tableType).toMatchSnapshot();
            });
            test('tableType - wrong value', async () => {
                const context = await setup({
                    manifestChanges: [
                        {
                            path: [
                                'sap.ui.generic.app',
                                'pages',
                                'AnalyticalListPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
                                'pages',
                                'ObjectPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
                                'component',
                                'settings',
                                'sections',
                                'to_Product::com.sap.vocabularies.UI.v1.LineItem',
                                'tableSettings',
                                'type'
                            ],
                            value: 'wrong-value'
                        }
                    ]
                });
                const result = runFeV2Linker(context);
                const page = findObjectPage(result);
                const table = page.lookup['table'];
                expect(table).toHaveLength(1);
                expect(table![0].configuration.tableType).toMatchSnapshot();
            });
        });
    });
});
// Todo => table type on list report
