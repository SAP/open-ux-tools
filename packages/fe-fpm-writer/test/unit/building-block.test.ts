import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';
import { join } from 'path';
import type { BuildingBlockConfig, Chart, Field, FilterBar, Table } from '../../src';
import { BuildingBlockType, generateBuildingBlock, getSerializedFileContent } from '../../src';
import * as testManifestContent from './sample/building-block/webapp/manifest.json';
import { promises as fsPromises } from 'fs';
import { clearTestOutput, writeFilesForDebugging } from '../common';

describe('Building Blocks', () => {
    let fs: Editor;
    let testAppPath: string;
    let testXmlViewContent: string;
    const manifestFilePath = 'webapp/manifest.json';
    const xmlViewFilePath = 'webapp/ext/main/Main.view.xml';
    const testOutputRoot = join(__dirname, '../test-output/unit/building-block');

    beforeAll(() => {
        clearTestOutput(testOutputRoot);
    });

    beforeEach(async () => {
        jest.requireActual('mem-fs-editor');
        fs = create(createStorage());
        testAppPath = join(testOutputRoot, `${Date.now()}`);
        fs.delete(testAppPath);
        if (!testXmlViewContent) {
            testXmlViewContent = (
                await fsPromises.readFile(
                    join('test/unit/sample/building-block/webapp/ext/main/Main.view.xml'),
                    'utf-8'
                )
            ).toLocaleString();
        }
    });

    test('validate base and view paths', async () => {
        const basePath = join(testAppPath, 'validate-paths');
        fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));

        // Test generator with an invalid base path
        expect(() =>
            generateBuildingBlock<FilterBar>(
                'invalidBasePath',
                {
                    viewOrFragmentPath: 'testViewPath',
                    aggregationPath: 'testAggregation',
                    buildingBlockData: {
                        id: 'testFilterBar',
                        buildingBlockType: BuildingBlockType.FilterBar
                    }
                },
                fs
            )
        ).toThrowError(/Invalid project folder/);

        // Test generator with an invalid view path
        fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
        expect(() =>
            generateBuildingBlock<FilterBar>(
                basePath,
                {
                    viewOrFragmentPath: 'invalidXmlViewFilePath',
                    aggregationPath: 'testAggregation',
                    buildingBlockData: {
                        id: 'testFilterBar',
                        buildingBlockType: BuildingBlockType.FilterBar
                    }
                },
                fs
            )
        ).toThrowError(/Invalid view path/);
    });

    test('validate sap.fe.templates manifest dependency', async () => {
        const basePath = join(testAppPath, 'validate-manifest-dep');
        fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));

        // Test generator without sap.fe.templates as dependency in manifest.json
        fs.write(join(basePath, manifestFilePath), JSON.stringify({ ...testManifestContent, 'sap.ui5': {} }));
        expect(() =>
            generateBuildingBlock<FilterBar>(
                basePath,
                {
                    viewOrFragmentPath: 'testViewPath',
                    aggregationPath: 'testAggregation',
                    buildingBlockData: {
                        id: 'testFilterBar',
                        buildingBlockType: BuildingBlockType.FilterBar
                    }
                },
                fs
            )
        ).toThrowError(/Fiori elements FPM requires the SAP FE libraries/);
    });

    test('validate aggregation path', async () => {
        const basePath = join(testAppPath, 'validate-aggregation-path');
        const aggregationPath = `/InvalidView/InvalidPage`;
        fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
        fs.write(join(basePath, xmlViewFilePath), testXmlViewContent);

        // Test generator with an invalid aggregation path
        fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
        expect(() =>
            generateBuildingBlock<FilterBar>(
                basePath,
                {
                    viewOrFragmentPath: xmlViewFilePath,
                    aggregationPath: aggregationPath,
                    buildingBlockData: {
                        id: 'testFilterBar',
                        buildingBlockType: BuildingBlockType.FilterBar
                    }
                },
                fs
            )
        ).toThrowError(/Aggregation control not found/);
    });

    test('validate xml view file', async () => {
        const basePath = join(testAppPath, 'validate-aggregation-path');
        fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));

        // Test generator with a xml file that doesn't exist
        expect(() =>
            generateBuildingBlock<FilterBar>(
                basePath,
                {
                    viewOrFragmentPath: 'invalidXmlViewFilePath',
                    aggregationPath: 'testAggregationPath',
                    buildingBlockData: {
                        id: 'testFilterBar',
                        buildingBlockType: BuildingBlockType.FilterBar
                    }
                },
                fs
            )
        ).toThrowError(/Invalid view path/);
    });

    test('validate xml view content', async () => {
        const basePath = join(testAppPath, 'validate-aggregation-path');
        const invalidXmlViewContent = (
            await fsPromises.readFile(
                join('test/unit/sample/building-block/webapp-with-invalid-xml-view/ext/main/Main.view.xml'),
                'utf-8'
            )
        ).toLocaleString();
        const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']`;
        fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
        fs.write(join(basePath, xmlViewFilePath), invalidXmlViewContent);

        // Test generator with invalid xml file contents
        expect(() =>
            generateBuildingBlock<FilterBar>(
                basePath,
                {
                    viewOrFragmentPath: xmlViewFilePath,
                    aggregationPath: aggregationPath,
                    buildingBlockData: {
                        id: 'testFilterBar',
                        buildingBlockType: BuildingBlockType.FilterBar
                    }
                },
                fs
            )
        ).toThrowError(/Unable to parse xml view file/);
    });

    test('fails to read view content', async () => {
        const basePath = join(testAppPath, 'validate-aggregation-path');
        // Test code snippet with unexisting xml file
        expect(() =>
            getSerializedFileContent<FilterBar>(basePath, {
                viewOrFragmentPath: 'invalidXmlViewFilePath',
                aggregationPath: 'testAggregationPath',
                buildingBlockData: {
                    id: 'testFilterBar',
                    buildingBlockType: BuildingBlockType.FilterBar
                }
            })
        ).toThrowError(/Unable to read xml view file/);
    });

    const testInput = [
        {
            name: 'Empty config',
            config: {} as BuildingBlockConfig<FilterBar>
        },
        {
            name: 'Unknown buildingBlockType',
            config: { buildingBlockData: {} } as BuildingBlockConfig<FilterBar>
        }
    ];
    test.each(testInput)('Unsuficient data for snippet. $name', async ({ config }) => {
        const basePath = join(testAppPath, 'test');
        // Test code snippet with unexisting xml file
        const codeSnippet = getSerializedFileContent<FilterBar>(basePath, config);
        expect(codeSnippet).toEqual({});
    });

    test('generate building block, no fs', async () => {
        const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']`;
        const basePath = join(__dirname, 'sample/building-block/webapp-prompts');
        const testFS = generateBuildingBlock<FilterBar>(basePath, {
            viewOrFragmentPath: xmlViewFilePath,
            aggregationPath: aggregationPath,
            buildingBlockData: {
                id: 'testFilterBar',
                buildingBlockType: BuildingBlockType.FilterBar
            }
        });
        expect(testFS.read(join(basePath, xmlViewFilePath))).toMatchSnapshot();
    });

    describe('Generate with just ID and xml view without macros namespace', () => {
        const testInput = [
            {
                buildingBlockData: {
                    id: 'testFilterBar',
                    buildingBlockType: BuildingBlockType.FilterBar
                } as FilterBar
            },
            {
                buildingBlockData: {
                    id: 'testChart',
                    buildingBlockType: BuildingBlockType.Chart
                } as Chart
            },
            {
                buildingBlockData: {
                    id: 'testField',
                    buildingBlockType: BuildingBlockType.Field
                } as Field
            },
            {
                buildingBlockData: {
                    id: 'testTable',
                    buildingBlockType: BuildingBlockType.Table
                } as Table
            }
        ];

        test.each(testInput)('generate $buildingBlockData.buildingBlockType building block', async (testData) => {
            const basePath = join(
                testAppPath,
                `generate-${testData.buildingBlockData.buildingBlockType}-with-id-no-macros-ns`
            );
            const xmlViewContentWithoutMacrosNs = (
                await fsPromises.readFile(
                    join('test/unit/sample/building-block/webapp-without-macros-ns-xml-view/ext/main/Main.view.xml'),
                    'utf-8'
                )
            ).toLocaleString();
            const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']`;
            fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
            fs.write(join(basePath, xmlViewFilePath), xmlViewContentWithoutMacrosNs);

            // Test generator with valid manifest.json, view.xml files and build block data with just id
            generateBuildingBlock(
                basePath,
                {
                    viewOrFragmentPath: xmlViewFilePath,
                    aggregationPath,
                    buildingBlockData: testData.buildingBlockData
                },
                fs
            );
            expect(fs.dump(testAppPath)).toMatchSnapshot(
                `generate-${testData.buildingBlockData.buildingBlockType}-with-id-no-macros-ns`
            );
            await writeFilesForDebugging(fs);
        });
    });

    describe('Generate with just ID', () => {
        const testInput = [
            {
                buildingBlockData: {
                    id: 'testFilterBar',
                    buildingBlockType: BuildingBlockType.FilterBar
                } as FilterBar
            },
            {
                buildingBlockData: {
                    id: 'testChart',
                    buildingBlockType: BuildingBlockType.Chart
                } as Chart
            },
            {
                buildingBlockData: {
                    id: 'testField',
                    buildingBlockType: BuildingBlockType.Field
                } as Field
            },
            {
                buildingBlockData: {
                    id: 'testTable',
                    buildingBlockType: BuildingBlockType.Table
                } as Field
            }
        ];

        test.each(testInput)('generate $buildingBlockData.buildingBlockType building block', async (testData) => {
            const basePath = join(testAppPath, `generate-${testData.buildingBlockData.buildingBlockType}-with-id`);
            const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']`;
            fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
            fs.write(join(basePath, xmlViewFilePath), testXmlViewContent);

            // Test generator with valid manifest.json, view.xml files and build block data with just id
            generateBuildingBlock(
                basePath,
                {
                    viewOrFragmentPath: xmlViewFilePath,
                    aggregationPath,
                    buildingBlockData: testData.buildingBlockData
                },
                fs
            );
            expect(fs.dump(testAppPath)).toMatchSnapshot(
                `generate-${testData.buildingBlockData.buildingBlockType}-with-id`
            );
            await writeFilesForDebugging(fs);
        });
    });

    describe('Generate with optional parameters', () => {
        const testInput = [
            {
                buildingBlockData: {
                    id: 'testFilterBar',
                    buildingBlockType: BuildingBlockType.FilterBar,
                    contextPath: 'testContextPath',
                    metaPath: 'testMetaPath',
                    filterChanged: 'testOnFilterChanged',
                    search: 'testOnSearch'
                } as FilterBar
            },
            {
                buildingBlockData: {
                    id: 'testChart',
                    buildingBlockType: BuildingBlockType.Chart,
                    contextPath: 'testContextPath',
                    metaPath: 'testMetaPath',
                    filterBar: 'testFilterBar',
                    personalization: 'testPersonalization',
                    selectionMode: 'MULTIPLE',
                    selectionChange: 'testOnSelectionChange'
                } as Chart
            },
            {
                buildingBlockData: {
                    id: 'testField',
                    buildingBlockType: BuildingBlockType.Field,
                    contextPath: 'testContextPath',
                    metaPath: 'testMetaPath',
                    formatOptions: JSON.stringify({ displayMode: 'Value' }).replace(/\"/g, `'`),
                    readOnly: true,
                    semanticObject: 'testSemanticObject'
                } as Field
            },
            {
                buildingBlockData: {
                    id: 'testTable',
                    buildingBlockType: BuildingBlockType.Table,
                    contextPath: 'testContextPath',
                    metaPath: 'testMetaPath',
                    busy: true,
                    enableAutoColumnWidth: true,
                    enableExport: true,
                    enableFullScreen: true,
                    enablePaste: true,
                    filterBar: 'testFilterBar',
                    header: 'Test Header',
                    headerVisible: true,
                    isSearchable: true,
                    personalization: 'Column',
                    readOnly: true,
                    type: 'ResponsiveTable',
                    variantManagement: 'None'
                } as Table
            }
        ];

        test.each(testInput)('generate $buildingBlockData.buildingBlockType building block', async (testData) => {
            const basePath = join(
                testAppPath,
                `generate-${testData.buildingBlockData.buildingBlockType}-with-optional-params`
            );
            const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']`;
            fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
            fs.write(join(basePath, xmlViewFilePath), testXmlViewContent);

            // Test generator with valid manifest.json, view.xml files and building block data with optional parameters
            generateBuildingBlock(
                basePath,
                {
                    viewOrFragmentPath: xmlViewFilePath,
                    aggregationPath,
                    buildingBlockData: testData.buildingBlockData
                },
                fs
            );
            expect(fs.dump(testAppPath)).toMatchSnapshot(
                `generate-${testData.buildingBlockData.buildingBlockType}-with-optional-params`
            );
            await writeFilesForDebugging(fs);
        });

        test.each(testInput)(
            'generate $buildingBlockData.buildingBlockType building block with metaPath as object',
            async (testData) => {
                const basePath = join(
                    testAppPath,
                    `generate-${testData.buildingBlockData.buildingBlockType}-with-optional-params`
                );
                const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']`;
                fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
                fs.write(join(basePath, xmlViewFilePath), testXmlViewContent);

                generateBuildingBlock(
                    basePath,
                    {
                        viewOrFragmentPath: xmlViewFilePath,
                        aggregationPath,
                        buildingBlockData: {
                            ...testData.buildingBlockData,
                            metaPath: {
                                entitySet: 'testEntitySet',
                                qualifier: 'testQualifier',
                                bindingContextType: 'relative'
                            }
                        }
                    },
                    fs
                );
                expect(fs.dump(testAppPath)).toMatchSnapshot(
                    `generate-${testData.buildingBlockData.buildingBlockType}-with-optional-params`
                );
                await writeFilesForDebugging(fs);
            }
        );

        test.each(testInput)(
            'getSerializedFileContent for $buildingBlockData.buildingBlockType building block',
            async (testData) => {
                const basePath = join(
                    testAppPath,
                    `generate-${testData.buildingBlockData.buildingBlockType}-with-optional-params`
                );
                const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']`;
                fs.write(join(basePath, xmlViewFilePath), testXmlViewContent);

                const codeSnippet = getSerializedFileContent(
                    basePath,
                    {
                        viewOrFragmentPath: xmlViewFilePath,
                        aggregationPath,
                        buildingBlockData: testData.buildingBlockData
                    },
                    fs
                );

                expect(codeSnippet.viewOrFragmentPath.content).toMatchSnapshot();
                expect(codeSnippet.viewOrFragmentPath.filePathProps?.fileName).toBe('Main.view.xml');
            }
        );

        test.each(testInput)(
            'getSerializedFileContent for $buildingBlockData.buildingBlockType building block',
            async (testData) => {
                const basePath = join(
                    testAppPath,
                    `generate-${testData.buildingBlockData.buildingBlockType}-with-optional-params`
                );
                const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']`;
                fs.write(join(basePath, xmlViewFilePath), testXmlViewContent);

                const codeSnippet = getSerializedFileContent(
                    basePath,
                    {
                        viewOrFragmentPath: '',
                        aggregationPath,
                        buildingBlockData: {
                            buildingBlockType: testData.buildingBlockData.buildingBlockType,
                            id: testData.buildingBlockData.id
                        }
                    },
                    fs
                );

                expect(codeSnippet.viewOrFragmentPath.content).toMatchSnapshot();
                expect(codeSnippet.viewOrFragmentPath.filePathProps?.fileName).toBeUndefined();
            }
        );
    });
});
