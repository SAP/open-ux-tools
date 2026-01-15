import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import type { FoundFioriArtifacts, Manifest } from '@sap-ux/project-access';
import { findFioriArtifacts, normalizePath } from '@sap-ux/project-access';
import type { FeV4ListReport, FeV4ObjectPage, LinkedFeV4App } from '../../../src/project-context/linker/fe-v4';
import { runFeV4Linker } from '../../../src/project-context/linker/fe-v4';
import type { LinkerContext } from '../../../src/project-context/linker/types';
import { ApplicationParser } from '../../../src/project-context/parser';
import type { ManifestChange } from '../../test-helper';
import { applyManifestChange, applyXmlAnnotationsChange } from '../../test-helper';

const parser = new ApplicationParser();

interface TestOptions {
    manifestChanges?: ManifestChange[];
    annotationsChange?: string;
}

describe('FE V4 Linker', () => {
    let artifacts: FoundFioriArtifacts;
    const fileCache = new Map<string, string>();
    const root = join(__dirname, '..', '..', 'data', 'v4-xml-start');
    const tableFacetAnnotation = `<Annotations Target="IncidentService.Incidents">
                <Annotation Term="UI.Facets">
                    <Collection>
                        <Record Type="UI.ReferenceFacet">
                            <PropertyValue Property="ID" String="TableSection" />
                            <PropertyValue Property="Label" String="Table Section" />
                            <PropertyValue Property="Target" AnnotationPath="@UI.LineItem" />
                        </Record>
                    </Collection>
                </Annotation>
            </Annotations>`;
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
        if (options?.annotationsChange) {
            const absolutePath = normalizePath(join(root, 'webapp', 'annotations', 'annotation.xml'));
            const uri = pathToFileURL(absolutePath).toString();
            const annotations = fileCache.get(uri)!;
            const modifiedAnnotations = applyXmlAnnotationsChange(annotations, options?.annotationsChange);
            testCache.set(uri, modifiedAnnotations);
        }
        const model = parser.parse('EDMXBackend', artifacts, testCache);

        const app = model.index.apps[Object.keys(model.index.apps)[0]];
        return {
            app,
            diagnostics: []
        };
    }

    function findListReportPage(app: LinkedFeV4App, index = 0): FeV4ListReport {
        let i = 0;
        for (const page of app.pages) {
            if (page.componentName === 'sap.fe.templates.ListReport') {
                if (i === index) {
                    return page;
                }
                i++;
            }
        }
        throw new Error('ListReport page not found');
    }

    function findObjectPage(app: LinkedFeV4App, index = 0): FeV4ObjectPage {
        let i = 0;
        for (const page of app.pages) {
            if (page.componentName === 'sap.fe.templates.ObjectPage') {
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
                            path: ['sap.fe', 'app', 'macros', 'table', 'defaultCreationMode'],
                            value: 'InlineCreationRows'
                        }
                    ]
                });

                const result = runFeV4Linker(context);
                expect(result.configuration.createMode).toMatchSnapshot();
            });
        });

        describe('page level - listReport page', () => {
            test('creationMode', async () => {
                const context = await setup({
                    manifestChanges: [
                        {
                            path: [
                                'sap.ui5',
                                'routing',
                                'targets',
                                'IncidentsList',
                                'options',
                                'settings',
                                'controlConfiguration',
                                '@com.sap.vocabularies.UI.v1.LineItem',
                                'tableSettings',
                                'creationMode',
                                'name'
                            ],
                            value: 'InlineCreationRows'
                        }
                    ]
                });
                const result = runFeV4Linker(context);
                const page = findListReportPage(result);
                expect(page.lookup['table']?.[0].configuration.creationMode).toMatchSnapshot();
            });
        });

        describe('section level - object page', () => {
            test('creationMode', async () => {
                const context = await setup({
                    manifestChanges: [
                        {
                            path: [
                                'sap.ui5',
                                'routing',
                                'targets',
                                'IncidentsObjectPage',
                                'options',
                                'settings',
                                'controlConfiguration',
                                '@com.sap.vocabularies.UI.v1.LineItem',
                                'tableSettings',
                                'creationMode',
                                'name'
                            ],
                            value: 'InlineCreationRows'
                        }
                    ],
                    annotationsChange: tableFacetAnnotation
                });
                const result = runFeV4Linker(context);
                const page = findObjectPage(result);
                const table = page.lookup['table'];
                expect(table).toHaveLength(1);
                expect(table![0].configuration.creationMode).toMatchSnapshot();
            });

            test('creationMode with contextPath', async () => {
                const context = await setup({
                    manifestChanges: [
                        {
                            path: [
                                'sap.ui5',
                                'routing',
                                'targets',
                                'Incidents_incidentFlowObjectPage',
                                'options',
                                'settings',
                                'contextPath'
                            ],
                            value: '/Incidents/incidentFlow'
                        },
                        {
                            path: [
                                'sap.ui5',
                                'routing',
                                'targets',
                                'Incidents_incidentFlowObjectPage',
                                'options',
                                'settings',
                                'controlConfiguration',
                                '@com.sap.vocabularies.UI.v1.LineItem',
                                'tableSettings',
                                'creationMode',
                                'name'
                            ],
                            value: 'InlineCreationRows'
                        }
                    ],
                    annotationsChange: tableFacetAnnotation
                });
                const result = runFeV4Linker(context);
                const page = findObjectPage(result);
                const table = page.lookup['table'];
                expect(table).toHaveLength(1);
                expect(table![0].configuration.creationMode).toMatchSnapshot();
            });

            test('creationMode - wrong value', async () => {
                const context = await setup({
                    manifestChanges: [
                        {
                            path: [
                                'sap.ui5',
                                'routing',
                                'targets',
                                'IncidentsObjectPage',
                                'options',
                                'settings',
                                'controlConfiguration',
                                '@com.sap.vocabularies.UI.v1.LineItem',
                                'tableSettings',
                                'creationMode',
                                'name'
                            ],
                            value: 'abc'
                        }
                    ],
                    annotationsChange: tableFacetAnnotation
                });
                const result = runFeV4Linker(context);
                const page = findObjectPage(result);
                const table = page.lookup['table'];
                expect(table).toHaveLength(1);
                expect(table![0].configuration.creationMode).toMatchSnapshot();
            });

            test('orphan-node', async () => {
                const context = await setup({
                    manifestChanges: [
                        {
                            path: [
                                'sap.ui5',
                                'routing',
                                'targets',
                                'IncidentsObjectPage',
                                'options',
                                'settings',
                                'controlConfiguration',
                                '@com.sap.vocabularies.UI.v1.LineItem#test',
                                'tableSettings',
                                'creationMode',
                                'name'
                            ],
                            value: 'InlineCreationRows'
                        }
                    ]
                });
                const result = runFeV4Linker(context);
                const page = findObjectPage(result);
                const orphanSections = page.lookup['orphan-section'];
                expect(orphanSections).toHaveLength(1);
                expect(orphanSections![0].configuration).toMatchSnapshot();
            });

            test('orphan-table', async () => {
                const context = await setup({
                    manifestChanges: [
                        {
                            path: [
                                'sap.ui5',
                                'routing',
                                'targets',
                                'IncidentsList',
                                'options',
                                'settings',
                                'controlConfiguration'
                            ],
                            value: '{}'
                        }
                    ]
                });
                const result = runFeV4Linker(context);
                const page = findListReportPage(result);
                const table = page.lookup['table'];
                expect(table).toHaveLength(1);
                expect(table![0].configuration).toMatchSnapshot();
            });

            test('tableType', async () => {
                const context = await setup({
                    manifestChanges: [
                        {
                            path: [
                                'sap.ui5',
                                'routing',
                                'targets',
                                'IncidentsObjectPage',
                                'options',
                                'settings',
                                'controlConfiguration',
                                '@com.sap.vocabularies.UI.v1.LineItem',
                                'tableSettings',
                                'type'
                            ],
                            value: 'ResponsiveTable'
                        }
                    ],
                    annotationsChange: tableFacetAnnotation
                });
                const result = runFeV4Linker(context);
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
                    ],
                    annotationsChange: tableFacetAnnotation
                });
                const result = runFeV4Linker(context);
                const page = findObjectPage(result);
                const table = page.lookup['table'];
                expect(table).toHaveLength(1);
                expect(table![0].configuration.tableType).toMatchSnapshot();
            });
        });
    });
});
