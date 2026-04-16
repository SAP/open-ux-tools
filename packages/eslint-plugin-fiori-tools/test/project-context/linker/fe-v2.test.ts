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
import { applyManifestChange, applyXmlAnnotationsChange } from '../../test-helper';
import { getParsedServiceByName } from '../../../src/project-context/utils';
import { collectSections } from '../../../src/project-context/linker/annotations';

const parser = new ApplicationParser();

interface TestOptions {
    manifestChanges?: ManifestChange[];
    annotationsChange?: string;
}

const XML_FACET_NO_ID = `<Annotations Target="TECHED_ALP_SOA_SRV.SEPMRA_C_ALP_CurrencyVHType">
                <Annotation Term="UI.Facets" >
                <Collection>
                        <Record Type="UI.ReferenceFacet">
                            <PropertyValue Property="Label" String="Products"/>
                            <PropertyValue Property="Target" AnnotationPath="@UI.LineItem"/>
                        </Record>
                    </Collection>
                </Annotation>
            </Annotations`;

const XML_FACET_NO_ANNOTATION = `<Annotations Target="TECHED_ALP_SOA_SRV.SEPMRA_C_ALP_SupplierVHType">
                <Annotation Term="UI.Facets" >
                <Collection>
                        <Record Type="UI.ReferenceFacet">
                            <PropertyValue Property="ID" String="Products"/>
                            <PropertyValue Property="Label" String="Products"/>
                        </Record>
                    </Collection>
                </Annotation>
            </Annotations`;

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
        if (options?.annotationsChange) {
            const absolutePath = normalizePath(join(root, 'webapp', 'annotations', 'annotation.xml'));
            const uri = pathToFileURL(absolutePath).toString();
            const currentAnnotations = fileCache.get(uri)!;
            const newAnnotations = applyXmlAnnotationsChange(currentAnnotations, options.annotationsChange);
            testCache.set(uri, newAnnotations);
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

    test('collectSections', async () => {
        const context = await setup({});
        const mainService = getParsedServiceByName(context.app);
        if (!mainService) {
            fail('Service not found');
        }
        const entity = mainService.index.entitySets['Z_SEPMRA_SO_SALESORDERANALYSIS'];
        if (!entity?.structuredType) {
            fail('Entity not found');
        }
        const sections = collectSections('v2', entity.structuredType, mainService);
        expect(sections).toHaveLength(1);
        expect(sections[0].type).toBe('table-section');
        expect(sections[0].annotationPath).toBe('@com.sap.vocabularies.UI.v1.Facets/0');
        expect(sections[0].children[0].annotationPath).toBe('to_Product/@com.sap.vocabularies.UI.v1.LineItem');
    });

    test('collectSections - no ID', async () => {
        const context = await setup({ annotationsChange: XML_FACET_NO_ID });
        const mainService = getParsedServiceByName(context.app);
        if (!mainService) {
            fail('Service not found');
        }
        const entity = mainService.index.entitySets['SEPMRA_C_ALP_CurrencyVH'];
        if (!entity?.structuredType) {
            fail('Entity not found');
        }
        const sections = collectSections('v2', entity.structuredType, mainService);
        expect(sections).toHaveLength(0);
    });

    test('collectSections - no annotation path', async () => {
        const context = await setup({ annotationsChange: XML_FACET_NO_ANNOTATION });
        const mainService = getParsedServiceByName(context.app);
        if (!mainService) {
            fail('Service not found');
        }
        const entity = mainService.index.entitySets['SEPMRA_C_ALP_SupplierVH'];
        if (!entity?.structuredType) {
            fail('Entity not found');
        }
        const sections = collectSections('v2', entity.structuredType, mainService);
        expect(sections).toHaveLength(0);
    });
});
// Todo => table type on list report
