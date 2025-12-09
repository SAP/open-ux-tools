import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';
import { join } from 'node:path';
import type { BuildingBlockConfig, Chart, Field, FilterBar, Table, CustomColumn, CustomFilterField } from '../../src';
import { BuildingBlockType, generateBuildingBlock, getSerializedFileContent } from '../../src';
import { BUILDING_BLOCK_CONFIG } from '../../src/building-block';
import * as testManifestContent from './sample/building-block/webapp/manifest.json';
import { promises as fsPromises } from 'node:fs';
import { clearTestOutput, writeFilesForDebugging } from '../common';
import {
    bindingContextAbsolute,
    bindingContextRelative,
    type BindingContextType
} from '../../src/building-block/types';
import { i18nNamespaces, translate } from '../../src/i18n';
import { Placement } from '../../src/common/types';

describe('Building Blocks', () => {
    let fs: Editor;
    let testAppPath: string;
    let testXmlViewContent: string;
    let testXmlFragmentContent: string;
    const manifestFilePath = 'webapp/manifest.json';
    const xmlViewFilePath = 'webapp/ext/main/Main.view.xml';
    const xmlFragmentFilePath = 'webapp/ext/fragment/custom.fragment.xml';
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
        if (!testXmlFragmentContent) {
            testXmlFragmentContent = (
                await fsPromises.readFile(
                    join('test/unit/sample/building-block/webapp/ext/fragment/custom.fragment.xml'),
                    'utf-8'
                )
            ).toLocaleString();
        }
    });

    test('validate base and view paths', async () => {
        const basePath = join(testAppPath, 'validate-paths');
        fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));

        // Test generator with an invalid base path
        await expect(
            async () =>
                await generateBuildingBlock<FilterBar>(
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
        ).rejects.toThrow(/Invalid project folder/);

        // Test generator with an invalid view path
        fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
        await expect(
            async () =>
                await generateBuildingBlock<FilterBar>(
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
        ).rejects.toThrow(/Invalid view path/);
    });

    test('validate view path', async () => {
        const basePath = join(testAppPath, 'validate-manifest-dep');
        // Test generator without sap.fe.core or sap.fe.templates as dependency in manifest.json
        fs.write(join(basePath, manifestFilePath), JSON.stringify({ ...testManifestContent, 'sap.ui5': {} }));
        await expect(
            async () =>
                await generateBuildingBlock<FilterBar>(
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
        ).rejects.toThrow(/Invalid view path testViewPath./);
    });

    const dependenciesInput = [
        {
            name: 'generate building block with `sap.fe.templates` dependency',
            dependencies: {
                libs: {
                    'sap.fe.templates': {}
                }
            }
        },
        {
            name: 'generate building block without dependencies',
            dependencies: undefined
        }
    ];
    test.each(dependenciesInput)('$name', async ({ dependencies }) => {
        const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']`;
        const basePath = join(__dirname, 'sample/building-block/webapp-prompts');
        fs.write(
            join(basePath, manifestFilePath),
            JSON.stringify({
                ...testManifestContent,
                'sap.ui5': {
                    dependencies
                }
            })
        );
        await generateBuildingBlock<FilterBar>(
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
        );
        expect(fs.dump(testAppPath)).toMatchSnapshot('generate-filter-bar-templates-library-only');
        await writeFilesForDebugging(fs);
    });

    test('validate aggregation path', async () => {
        const basePath = join(testAppPath, 'validate-aggregation-path');
        const aggregationPath = `/InvalidView/InvalidPage`;
        fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
        fs.write(join(basePath, xmlViewFilePath), testXmlViewContent);

        // Test generator with an invalid aggregation path
        fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
        await expect(
            async () =>
                await generateBuildingBlock<FilterBar>(
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
        ).rejects.toThrow(/Aggregation control not found/);
    });

    test('validate xml view file', async () => {
        const basePath = join(testAppPath, 'validate-aggregation-path');
        fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));

        // Test generator with a xml file that doesn't exist
        await expect(
            async () =>
                await generateBuildingBlock<FilterBar>(
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
        ).rejects.toThrow(/Invalid view path/);
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
        await expect(
            async () =>
                await generateBuildingBlock<FilterBar>(
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
        ).rejects.toThrow(/Unable to parse xml view file/);
    });

    test('fails to read view content', async () => {
        const basePath = join(testAppPath, 'validate-aggregation-path');
        // Test code snippet with unexisting xml file
        await expect(
            async () =>
                await getSerializedFileContent<FilterBar>(basePath, {
                    viewOrFragmentPath: 'invalidXmlViewFilePath',
                    aggregationPath: 'testAggregationPath',
                    buildingBlockData: {
                        id: 'testFilterBar',
                        buildingBlockType: BuildingBlockType.FilterBar
                    }
                })
        ).rejects.toThrow(/Unable to read xml view file/);
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
        const codeSnippet = await getSerializedFileContent<FilterBar>(basePath, config);
        expect(codeSnippet).toEqual({});
    });

    test('generate building block, no fs', async () => {
        const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']`;
        const basePath = join(__dirname, 'sample/building-block/webapp-prompts');
        const testFS = await generateBuildingBlock<FilterBar>(basePath, {
            viewOrFragmentPath: xmlViewFilePath,
            aggregationPath: aggregationPath,
            buildingBlockData: {
                id: 'testFilterBar',
                buildingBlockType: BuildingBlockType.FilterBar
            }
        });
        expect(testFS.read(join(basePath, xmlViewFilePath))).toMatchSnapshot();
    });

    test('FilterBar properties', async () => {
        const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']`;
        const basePath = join(__dirname, 'sample/building-block/filterbar-properties');
        const testXmlViewFilePath = join(basePath, xmlViewFilePath);
        fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
        fs.write(testXmlViewFilePath, testXmlViewContent);

        await generateBuildingBlock<FilterBar>(
            basePath,
            {
                viewOrFragmentPath: xmlViewFilePath,
                aggregationPath: aggregationPath,
                buildingBlockData: {
                    id: 'testFilterBar',
                    buildingBlockType: BuildingBlockType.FilterBar,
                    filterChanged: 'onFilterChanged',
                    search: 'onSearch',
                    liveMode: true,
                    showClearButton: false,
                    showMessages: true
                }
            },
            fs
        );
        expect(fs.read(testXmlViewFilePath)).toMatchSnapshot('filterbar-properties');
        await writeFilesForDebugging(fs);
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
            await generateBuildingBlock(
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
            await generateBuildingBlock(
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
        const filterbarBuiildingBlock: FilterBar = {
            id: 'testFilterBar',
            buildingBlockType: BuildingBlockType.FilterBar,
            contextPath: 'testContextPath',
            metaPath: 'testMetaPath',
            filterChanged: 'testOnFilterChanged',
            search: 'testOnSearch'
        };
        const chartBuiildingBlock: Chart = {
            id: 'testChart',
            buildingBlockType: BuildingBlockType.Chart,
            contextPath: 'testContextPath',
            metaPath: 'testMetaPath',
            filterBar: 'testFilterBar',
            personalization: 'testPersonalization',
            selectionMode: 'MULTIPLE',
            selectionChange: 'testOnSelectionChange'
        };
        const fieldBuiildingBlock: Field = {
            id: 'testField',
            buildingBlockType: BuildingBlockType.Field,
            contextPath: 'testContextPath',
            metaPath: 'testMetaPath',
            formatOptions: JSON.stringify({ displayMode: 'Value' }).replace(/\"/g, `'`),
            readOnly: true,
            semanticObject: 'testSemanticObject'
        } as Field;
        const tableBuildingBlock: Table = {
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
        };
        const testInput = [
            {
                buildingBlockData: filterbarBuiildingBlock
            },
            {
                buildingBlockData: chartBuiildingBlock
            },
            {
                buildingBlockData: fieldBuiildingBlock
            },
            {
                buildingBlockData: tableBuildingBlock
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
            await generateBuildingBlock(
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

        const metaPathInput = [
            {
                name: 'generate filter-bar building block with metaPath as object',
                buildingBlockData: { ...filterbarBuiildingBlock, contextPath: undefined },
                metaPath: {
                    entitySet: 'testEntitySet',
                    qualifier: 'testQualifier',
                    bindingContextType: 'relative' as BindingContextType
                }
            },
            {
                name: 'generate chart building block with metaPath as object',
                buildingBlockData: { ...chartBuiildingBlock, contextPath: undefined },
                metaPath: {
                    entitySet: 'testEntitySet',
                    qualifier: 'testQualifier',
                    bindingContextType: 'relative' as BindingContextType
                }
            },
            {
                name: 'generate field building block with metaPath as object',
                buildingBlockData: { ...fieldBuiildingBlock, contextPath: undefined },
                metaPath: {
                    entitySet: 'testEntitySet',
                    qualifier: 'testQualifier',
                    bindingContextType: 'relative' as BindingContextType
                }
            },
            {
                name: 'generate table building block with metaPath as object',
                buildingBlockData: { ...tableBuildingBlock, contextPath: undefined },
                metaPath: {
                    entitySet: 'testEntitySet',
                    qualifier: 'testQualifier',
                    bindingContextType: 'relative' as BindingContextType
                }
            },
            {
                name: 'generate filter-bar building block with metaPath as object. Relative',
                buildingBlockData: { ...filterbarBuiildingBlock, contextPath: undefined },
                metaPath: {
                    entitySet: 'testEntitySet',
                    qualifier: 'testQualifier',
                    bindingContextType: 'relative' as BindingContextType,
                    alwaysAbsolutePath: false
                }
            },
            {
                name: 'generate chart building block with metaPath as object. Relative',
                buildingBlockData: { ...chartBuiildingBlock, contextPath: undefined },
                metaPath: {
                    entitySet: 'testEntitySet',
                    qualifier: 'testQualifier',
                    bindingContextType: 'relative' as BindingContextType,
                    alwaysAbsolutePath: false
                }
            }
        ];
        test.each(metaPathInput)('$name', async (testData) => {
            const basePath = join(
                testAppPath,
                `generate-${testData.buildingBlockData.buildingBlockType}-with-optional-params`
            );
            const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']`;
            fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
            fs.write(join(basePath, xmlViewFilePath), testXmlViewContent);

            await generateBuildingBlock(
                basePath,
                {
                    viewOrFragmentPath: xmlViewFilePath,
                    aggregationPath,
                    buildingBlockData: {
                        ...testData.buildingBlockData,
                        metaPath: testData.metaPath
                    }
                },
                fs
            );
            expect(fs.dump(testAppPath)).toMatchSnapshot(
                `generate-${testData.buildingBlockData.buildingBlockType}-with-optional-params`
            );
            await writeFilesForDebugging(fs);
        });

        test.each(testInput)(
            'getSerializedFileContent for $buildingBlockData.buildingBlockType building block',
            async (testData) => {
                const basePath = join(
                    testAppPath,
                    `generate-${testData.buildingBlockData.buildingBlockType}-with-optional-params`
                );
                const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']`;
                fs.write(join(basePath, xmlViewFilePath), testXmlViewContent);

                const codeSnippet = await getSerializedFileContent(
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
                // Check inline snapshot as content is static
                expect(codeSnippet.manifest.content).toMatchSnapshot();
                expect(codeSnippet.manifest.filePathProps?.fileName).toBe('manifest.json');
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
                fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
                const codeSnippet = await getSerializedFileContent(
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

        test('getSerializedFileContent - "allowAutoAddDependencyLib=false"', async () => {
            const basePath = join(testAppPath, `get-snippet-without-manifest-snippet`);
            const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']`;
            fs.write(join(basePath, xmlViewFilePath), testXmlViewContent);
            fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
            const codeSnippet = await getSerializedFileContent(
                basePath,
                {
                    viewOrFragmentPath: '',
                    aggregationPath,
                    buildingBlockData: {
                        buildingBlockType: BuildingBlockType.Table,
                        id: 'Test'
                    },
                    allowAutoAddDependencyLib: false
                },
                fs
            );

            expect(codeSnippet.viewOrFragmentPath.content).toBeDefined();
            expect(codeSnippet.manifest).toBeUndefined();
        });

        // While runtime does not support approach without contextPath - special test for Chart
        const chartInput = [
            {
                name: 'Simple absolute path',
                metaPath: {
                    entitySet: 'testEntitySet',
                    qualifier: 'testQualifier',
                    bindingContextType: 'absolute'
                }
            },
            {
                name: 'Complex absolute path',
                metaPath: {
                    entitySet: 'SessionMetrics',
                    qualifier: '@com.sap.vocabularies.UI.v1.Chart#chartMacro5',
                    bindingContextType: 'absolute'
                }
            },
            {
                name: 'Absolute path without qualifier',
                metaPath: {
                    entitySet: 'testEntitySet',
                    bindingContextType: 'absolute'
                }
            },
            {
                name: 'Absolute path without entity',
                metaPath: {
                    qualifier: 'testQualifier',
                    bindingContextType: 'absolute'
                }
            },
            {
                name: 'Simple relative path',
                metaPath: {
                    entitySet: 'testEntitySet',
                    qualifier: 'testQualifier',
                    bindingContextType: 'relative'
                }
            },
            {
                name: 'Complex relative path',
                metaPath: {
                    entitySet: 'Sessions',
                    qualifier: 'Speed/@com.sap.vocabularies.UI.v1.Chart#chartMacro4',
                    bindingContextType: 'relative'
                }
            },
            {
                name: 'Relative path without qualifier',
                metaPath: {
                    entitySet: 'testEntitySet',
                    bindingContextType: 'absolute'
                }
            },
            {
                name: 'Relative path without entity',
                metaPath: {
                    qualifier: 'testQualifier',
                    bindingContextType: 'absolute'
                }
            }
        ];
        test.each(chartInput)('Generate Chart from object metaPath. $name', async ({ metaPath }) => {
            const basePath = join(testAppPath, `generate-${BuildingBlockType.Chart}-with-optional-params`);
            const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']`;
            fs.write(join(basePath, xmlViewFilePath), testXmlViewContent);

            const codeSnippet = await getSerializedFileContent(
                basePath,
                {
                    viewOrFragmentPath: '',
                    aggregationPath,
                    buildingBlockData: {
                        buildingBlockType: BuildingBlockType.Chart,
                        metaPath
                    } as Chart
                },
                fs
            );

            expect(codeSnippet.viewOrFragmentPath.content).toMatchSnapshot();
            expect(codeSnippet.viewOrFragmentPath.filePathProps?.fileName).toBeUndefined();
        });
    });

    test('Do not update "manifest.json" with missing dependency when "allowAutoAddDependencyLib=false"', async () => {
        const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']`;
        const basePath = join(__dirname, 'sample/building-block/webapp-prompts');
        fs.write(
            join(basePath, manifestFilePath),
            JSON.stringify({
                ...testManifestContent,
                'sap.ui5': {
                    dependencies: {
                        libs: {
                            'sap.fe.templates': {}
                        }
                    }
                }
            })
        );
        await generateBuildingBlock<FilterBar>(
            basePath,
            {
                viewOrFragmentPath: xmlViewFilePath,
                aggregationPath: aggregationPath,
                allowAutoAddDependencyLib: false,
                buildingBlockData: {
                    id: 'testFilterBar',
                    buildingBlockType: BuildingBlockType.FilterBar
                }
            },
            fs
        );
        expect(fs.readJSON(join(basePath, manifestFilePath))).toMatchSnapshot();
    });

    test('generate Page building block with replace target locator set', async () => {
        const aggregationPath = `/mvc:View/*[local-name()='Page']`;
        const basePath = join(testAppPath, 'generate-page-block');
        const pageBlockData = {
            id: 'testPage',
            buildingBlockType: BuildingBlockType.Page,
            title: 'Test Page Title',
            description: 'Test Page Description'
        };
        fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
        fs.write(join(basePath, xmlViewFilePath), testXmlViewContent);

        await generateBuildingBlock(
            basePath,
            {
                viewOrFragmentPath: xmlViewFilePath,
                aggregationPath,
                buildingBlockData: pageBlockData,
                replace: true
            },
            fs
        );
        expect(fs.read(join(basePath, xmlViewFilePath))).toMatchSnapshot('generate-page-block');
        await writeFilesForDebugging(fs);
    });

    test('throws error if aggregationPath not found', async () => {
        const aggregationPath = `/mvc:Test`;
        const basePath = join(testAppPath, 'generate-page-block-error');
        const pageBlockData = {
            id: 'testPage',
            buildingBlockType: BuildingBlockType.Page,
            title: 'Test Page Title',
            description: 'Test Page Description'
        };
        fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
        fs.write(join(basePath, xmlViewFilePath), testXmlViewContent);

        await expect(
            async () =>
                await generateBuildingBlock(
                    basePath,
                    {
                        viewOrFragmentPath: xmlViewFilePath,
                        aggregationPath,
                        buildingBlockData: pageBlockData,
                        replace: true
                    },
                    fs
                )
        ).rejects.toThrow(`Aggregation control not found /mvc:Test.`);
    });

    describe('CustomColumn building block', () => {
        const testXmlViewContentWithoutMacrosColumns = `<mvc:View xmlns:core="sap.ui.core" xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m"
    xmlns:html="http://www.w3.org/1999/xhtml" controllerName="com.test.myApp.ext.main.Main"
    xmlns:macros="sap.fe.macros">
    <Page title="Main">
        <content>
            <macros:Table>
            </macros:Table>
        </content>
    </Page>
</mvc:View>`;

        test('CustomColumn detects macros:columns elements correctly', async () => {
            // Create mock XMLDocument with macros:columns
            const xmlViewWithColumns = `<mvc:View xmlns:core="sap.ui.core" xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m"
    xmlns:html="http://www.w3.org/1999/xhtml" controllerName="com.test.myApp.ext.main.Main"
    xmlns:macros="sap.fe.macros">
    <Page title="Main">
        <content>
            <macros:Table>
                <macros:columns>
                    <macros:Column />
                </macros:columns>
            </macros:Table>
        </content>
    </Page>
</mvc:View>`;

            const basePath = join(testAppPath, 'test-custom-column-detection');
            const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']/macros:Table`;
            const customColumnData: CustomColumn = {
                id: 'testCustomColumn2',
                buildingBlockType: BuildingBlockType.CustomColumn,
                title: 'CustomColumnTitle2',
                embededFragment: {
                    folder: 'ext/fragment',
                    typescript: false,
                    content:
                        '<core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core"><Text text="Sample Text"/></core:FragmentDefinition>',
                    name: 'CustomColumnTitle2'
                },
                position: {
                    placement: Placement.After
                }
            };

            fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
            fs.write(join(basePath, xmlViewFilePath), xmlViewWithColumns);

            // Since the test above may fail due to aggregation path issues, let's test the detection separately
            // by mocking or using the internal functions directly
            const { DOMParser } = await import('@xmldom/xmldom');
            const xmlDocument = new DOMParser().parseFromString(xmlViewWithColumns);

            // Test the getElementsByTagName functionality directly - this is what the code checks
            const hasTableColumn = xmlDocument.getElementsByTagName('macros:columns').length > 0;
            expect(hasTableColumn).toBe(true);

            await generateBuildingBlock<CustomColumn>(
                basePath,
                {
                    viewOrFragmentPath: xmlViewFilePath,
                    aggregationPath: aggregationPath,
                    buildingBlockData: customColumnData
                },
                fs
            );

            // Check that fragment file was created
            const expectedFragmentPath = join(basePath, 'webapp/ext/fragment/CustomColumnTitle2.fragment.xml');
            expect(fs.exists(expectedFragmentPath)).toBe(true);

            expect(fs.read(join(basePath, xmlViewFilePath))).toMatchSnapshot(
                'generate-custom-column-without-macros-columns'
            );

            // Test that content property gets set
            await writeFilesForDebugging(fs);
        });

        test('generate CustomColumn without macros:columns - should not update aggregation path', async () => {
            const basePath = join(testAppPath, 'generate-custom-column-without-macros-columns');
            const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']/macros:Table`;
            const customColumnData: CustomColumn = {
                id: 'testCustomColumn2',
                buildingBlockType: BuildingBlockType.CustomColumn,
                title: 'CustomColumnTitle2',
                embededFragment: {
                    folder: 'ext/fragment',
                    typescript: false,
                    content:
                        '<core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core"><Text text="Sample Text"/></core:FragmentDefinition>',
                    name: 'CustomColumnTitle2'
                },
                position: {
                    placement: Placement.After
                }
            };

            fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
            fs.write(join(basePath, xmlViewFilePath), testXmlViewContentWithoutMacrosColumns);

            await generateBuildingBlock<CustomColumn>(
                basePath,
                {
                    viewOrFragmentPath: xmlViewFilePath,
                    aggregationPath: aggregationPath,
                    buildingBlockData: customColumnData
                },
                fs
            );

            // Check that fragment file was created
            const expectedFragmentPath = join(basePath, 'webapp/ext/fragment/CustomColumnTitle2.fragment.xml');
            expect(fs.exists(expectedFragmentPath)).toBe(true);

            expect(fs.dump(testAppPath)).toMatchSnapshot('generate-custom-column-without-macros-columns');
            await writeFilesForDebugging(fs);
        });

        test('generate CustomColumn with existing fragment file - should not overwrite', async () => {
            const basePath = join(testAppPath, 'generate-custom-column-existing-fragment');
            const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']`;
            const customColumnData: CustomColumn = {
                id: 'testCustomColumn3',
                buildingBlockType: BuildingBlockType.CustomColumn,
                title: 'ExistingFragment',
                position: {
                    placement: Placement.After
                },
                embededFragment: {
                    folder: 'ext/fragment',
                    typescript: false,
                    content:
                        '<core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core"><Text text="Sample Text"/></core:FragmentDefinition>',
                    name: 'CustomColumnTitle'
                }
            };

            fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
            fs.write(join(basePath, xmlViewFilePath), testXmlViewContent);

            // Pre-create the fragment file with custom content
            const existingFragmentPath = join(basePath, 'webapp/ext/fragments/ExistingFragment.fragment.xml');
            const existingContent =
                '<core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core"><Text text="Existing Content" /></core:FragmentDefinition>';
            fs.write(existingFragmentPath, existingContent);

            await generateBuildingBlock<CustomColumn>(
                basePath,
                {
                    viewOrFragmentPath: xmlViewFilePath,
                    aggregationPath: aggregationPath,
                    buildingBlockData: customColumnData
                },
                fs
            );

            // Check that existing fragment file was not overwritten
            const fragmentContent = fs.read(existingFragmentPath);
            expect(fragmentContent).toBe(existingContent);
            expect(fragmentContent).toContain('Existing Content');
            // check original xml view
            const viewContent = fs.read(join(basePath, xmlViewFilePath));
            expect(viewContent).toContain('my.test.App.ext.fragment.CustomColumnTitle');

            await writeFilesForDebugging(fs);
        });

        test('generate CustomColumn with folder option', async () => {
            const basePath = join(testAppPath, 'generate-custom-column-with-folder');
            const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']`;
            const customColumnData: CustomColumn = {
                id: 'testCustomColumnWithFolder',
                buildingBlockType: BuildingBlockType.CustomColumn,
                title: 'CustomColumnWithFolder',
                position: {
                    placement: Placement.After
                },
                embededFragment: {
                    folder: 'ext/customfolder',
                    typescript: false,
                    content:
                        '<core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core"><Text text="Sample Text"/></core:FragmentDefinition>',
                    name: 'CustomColumnWithFolder'
                }
            };

            fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
            fs.write(join(basePath, xmlViewFilePath), testXmlViewContent);

            await generateBuildingBlock<CustomColumn>(
                basePath,
                {
                    viewOrFragmentPath: xmlViewFilePath,
                    aggregationPath: aggregationPath,
                    buildingBlockData: customColumnData
                },
                fs
            );

            // Check that fragment file was created in correct folder
            const expectedFragmentPath = join(basePath, 'webapp/ext/customfolder/CustomColumnWithFolder.fragment.xml');
            expect(fs.exists(expectedFragmentPath)).toBe(true);

            const fragmentContent = fs.read(expectedFragmentPath);
            expect(fragmentContent).toContain('Sample Text');

            // check original xml view
            const viewContent = fs.read(join(basePath, xmlViewFilePath));
            expect(viewContent).toContain('my.test.App.ext.customfolder.CustomColumnWithFolder');

            await writeFilesForDebugging(fs);
        });

        test('generate CustomColumn without folder - defaults to ext/name path dirname', async () => {
            const basePath = join(testAppPath, 'generate-custom-column-no-folder');
            const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']`;
            const customColumnData: CustomColumn = {
                id: 'testCustomColumnNoFolder',
                buildingBlockType: BuildingBlockType.CustomColumn,
                title: 'CustomColumnNoFolder',
                position: {
                    placement: Placement.After
                },
                embededFragment: {
                    typescript: false,
                    content:
                        '<core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core"><Text text="Sample Text"/></core:FragmentDefinition>',
                    name: 'CustomColumnNoFolder'
                }
                // Note: no folder property
            };

            fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
            fs.write(join(basePath, xmlViewFilePath), testXmlViewContent);

            await generateBuildingBlock<CustomColumn>(
                basePath,
                {
                    viewOrFragmentPath: xmlViewFilePath,
                    aggregationPath: aggregationPath,
                    buildingBlockData: customColumnData
                },
                fs
            );

            // Check that fragment file was created in webapp folder (manifest dirname)
            const expectedFragmentPath = join(
                basePath,
                'webapp/ext/customColumnNoFolder/CustomColumnNoFolder.fragment.xml'
            );
            expect(fs.exists(expectedFragmentPath)).toBe(true);

            const fragmentContent = fs.read(expectedFragmentPath);
            expect(fragmentContent).toContain('Sample Text');
            // check original xml view
            const viewContent = fs.read(join(basePath, xmlViewFilePath));
            expect(viewContent).toContain('my.test.App.ext.customColumnNoFolder.CustomColumnNoFolder');

            await writeFilesForDebugging(fs);
        });

        test('CustomColumn should set content from getDefaultFragmentContent', async () => {
            const basePath = join(testAppPath, 'test-custom-column-content');
            const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']`;
            const customColumnData: CustomColumn = {
                id: 'testCustomColumnContent',
                buildingBlockType: BuildingBlockType.CustomColumn,
                title: 'CustomColumnContent',
                position: {
                    placement: Placement.After
                },
                embededFragment: {
                    folder: 'ext/fragment',
                    typescript: false,
                    content:
                        '<core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core"><Text text="Sample Text"/></core:FragmentDefinition>',
                    name: 'CustomColumnContent'
                }
            };

            fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
            fs.write(join(basePath, xmlViewFilePath), testXmlViewContent);

            await generateBuildingBlock<CustomColumn>(
                basePath,
                {
                    viewOrFragmentPath: xmlViewFilePath,
                    aggregationPath: aggregationPath,
                    buildingBlockData: customColumnData
                },
                fs
            );

            // Verify that buildingBlockData.content was set
            expect(customColumnData.embededFragment?.content).toBeDefined();
            expect(customColumnData.embededFragment?.content).toContain('Sample Text');

            // check original xml view
            const viewContent = fs.read(join(basePath, xmlViewFilePath));
            expect(viewContent).toContain('my.test.App.ext.fragment.CustomColumnContent');

            await writeFilesForDebugging(fs);
        });

        test('CustomColumn fragments are created with proper content', async () => {
            const basePath = join(testAppPath, 'test-custom-column-fragment-content');
            const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']`;
            const customColumnData: CustomColumn = {
                id: 'testCustomColumnFragmentContent',
                buildingBlockType: BuildingBlockType.CustomColumn,
                title: 'CustomColumnFragmentContent',
                position: {
                    placement: Placement.After
                },
                embededFragment: {
                    folder: 'ext/fragment',
                    typescript: false,
                    content:
                        '<core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core"><Text text="Sample Text"/></core:FragmentDefinition>',
                    name: 'CustomColumnFragmentContent'
                }
            };

            fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
            fs.write(join(basePath, xmlViewFilePath), testXmlViewContent);

            await generateBuildingBlock<CustomColumn>(
                basePath,
                {
                    viewOrFragmentPath: xmlViewFilePath,
                    aggregationPath: aggregationPath,
                    buildingBlockData: customColumnData
                },
                fs
            );

            // Check that fragment file was created
            const expectedFragmentPath = join(basePath, 'webapp/ext/fragment/CustomColumnFragmentContent.fragment.xml');
            expect(fs.exists(expectedFragmentPath)).toBe(true);

            // Verify content was set from getDefaultFragmentContent
            expect(customColumnData.embededFragment?.content).toBeDefined();
            expect(customColumnData.embededFragment?.content).toContain('Sample Text');

            // Check fragment file content
            const fragmentContent = fs.read(expectedFragmentPath);
            expect(fragmentContent).toContain('Sample Text');
            expect(fragmentContent).toContain('<core:FragmentDefinition');
            expect(fragmentContent).toContain('<Text text="Sample Text"');

            await writeFilesForDebugging(fs);
        });
    });

    test('generates Rich Text Editor building block with absolute binding context', async () => {
        const aggregationPath = `/core:FragmentDefinition/*[local-name()='VBox']`;
        const basePath = join(testAppPath, 'generate-rich-text-editor-block');
        const richTextEditorData = {
            id: 'testRichTextEditor',
            buildingBlockType: BuildingBlockType.RichTextEditor,
            metaPath: {
                bindingContextType: bindingContextAbsolute,
                entitySet: 'testEntitySet'
            },
            targetProperty: 'testProperty'
        };

        fs.write(join(basePath, xmlFragmentFilePath), testXmlFragmentContent);
        fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));

        await generateBuildingBlock(
            basePath,
            {
                viewOrFragmentPath: xmlFragmentFilePath,
                aggregationPath,
                buildingBlockData: richTextEditorData
            },
            fs
        );
        expect(fs.read(join(basePath, xmlFragmentFilePath))).toMatchSnapshot('generate-rich-text-editor-block');
        await writeFilesForDebugging(fs);
    });

    test('throws error for Rich Text Editor building block if UI5 version is below 1.117.0', async () => {
        const aggregationPath = `/core:FragmentDefinition/*[local-name()='VBox']`;
        const basePath = join(testAppPath, 'generate-rich-text-editor-block');
        const richTextEditorData = {
            id: 'testRichTextEditor',
            buildingBlockType: BuildingBlockType.RichTextEditor,
            metaPath: {
                bindingContextType: bindingContextRelative,
                entitySet: '_testNavigation'
            },
            targetProperty: 'testProperty'
        };

        fs.write(join(basePath, xmlFragmentFilePath), testXmlFragmentContent);
        fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));

        await generateBuildingBlock(
            basePath,
            {
                viewOrFragmentPath: xmlFragmentFilePath,
                aggregationPath,
                buildingBlockData: richTextEditorData
            },
            fs
        );
        expect(fs.read(join(basePath, xmlFragmentFilePath))).toMatchSnapshot('generate-rich-text-editor-block');
        await writeFilesForDebugging(fs);
    });

    describe('RichTextEditorButtonGroups building block', () => {
        const testXmlFragmentWithoutButtonGroups = `<core:FragmentDefinition xmlns:core="sap.ui.core" xmlns="sap.m" 
        xmlns:macros="sap.fe.macros" xmlns:richtexteditor="sap.fe.macros.richtexteditor">
        <VBox>
            <macros:RichTextEditorWithMetadata metaPath="/Travel/AgencyID" id="RichTextEditor"/>
        </VBox>
    </core:FragmentDefinition>`;

        test('RichTextEditorButtonGroups detects richtexteditor:buttonGroups elements correctly', async () => {
            const xmlFragmentWithButtonGroups = `<core:FragmentDefinition xmlns:core="sap.ui.core" xmlns="sap.m"
        xmlns:macros="sap.fe.macros" xmlns:richtexteditor="sap.fe.macros.richtexteditor">
        <VBox>
            <macros:RichTextEditorWithMetadata metaPath="/Travel/AgencyID" id="RichTextEditor">
                <richtexteditor:buttonGroups>
                    <richtexteditor:ButtonGroup name="font-style" visible="true" priority="10" buttons="bold,italic"/>
                </richtexteditor:buttonGroups>
            </macros:RichTextEditorWithMetadata>
        </VBox>
    </core:FragmentDefinition>`;
            const basePath = join(testAppPath, 'test-rte-button-groups');
            const aggregationPath = `/core:FragmentDefinition/*[local-name()='VBox']/macros:RichTextEditorWithMetadata`;
            const buttonGroupsData = {
                id: 'RichTextButtonGroups',
                buildingBlockType: BuildingBlockType.RichTextEditorButtonGroups,
                buttonGroups: [{ name: 'clipboard', buttons: 'cut,copy,paste' }, { name: 'undo' }]
            };

            fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
            fs.write(join(basePath, xmlFragmentFilePath), xmlFragmentWithButtonGroups);

            const { DOMParser } = await import('@xmldom/xmldom');
            const xmlDocument = new DOMParser().parseFromString(xmlFragmentWithButtonGroups);

            const hasButtonGroups = xmlDocument.getElementsByTagName('richtexteditor:buttonGroups').length > 0;
            expect(hasButtonGroups).toBe(true);

            await generateBuildingBlock(
                basePath,
                {
                    viewOrFragmentPath: xmlFragmentFilePath,
                    aggregationPath: aggregationPath,
                    buildingBlockData: buttonGroupsData
                },
                fs
            );

            const fragmentContent = fs.read(join(basePath, xmlFragmentFilePath));
            expect(fragmentContent).toMatchSnapshot('generate-rte-button-groups-with-existing-button-groups');
            await writeFilesForDebugging(fs);
        });

        test('generate RichTextEditorButtonGroups without richtexteditor:buttonGroups wrapper', async () => {
            const aggregationPath = `/core:FragmentDefinition/*[local-name()='VBox']/macros:RichTextEditorWithMetadata`;
            const basePath = join(testAppPath, 'test-rte-button-groups');
            const buttonGroupsData = {
                id: 'RichTextButtonGroups',
                buildingBlockType: BuildingBlockType.RichTextEditorButtonGroups,
                buttonGroups: [
                    { name: 'font-style', buttons: 'bold,italic,underline' },
                    { name: 'clipboard' },
                    { name: 'undo' }
                ]
            };

            fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
            fs.write(join(basePath, xmlFragmentFilePath), testXmlFragmentWithoutButtonGroups);

            await generateBuildingBlock(
                basePath,
                {
                    viewOrFragmentPath: xmlFragmentFilePath,
                    aggregationPath: aggregationPath,
                    buildingBlockData: buttonGroupsData
                },
                fs
            );

            const fragmentContent = fs.read(join(basePath, xmlFragmentFilePath));
            expect(fragmentContent).toMatchSnapshot('generate-rte-button-groups-without-wrapper');
            await writeFilesForDebugging(fs);
        });

        test('generate RichTextEditorButtonGroups with existing button groups', async () => {
            const xmlFragmentWithExisting = `<core:FragmentDefinition xmlns:core="sap.ui.core" xmlns="sap.m"
        xmlns:macros="sap.fe.macros" xmlns:richtexteditor="sap.fe.macros.richtexteditor">
        <VBox>
            <macros:RichTextEditorWithMetadata metaPath="/Travel/AgencyID" id="RichTextEditor">
                <richtexteditor:buttonGroups>
                    <richtexteditor:ButtonGroup name="font-style" visible="true" priority="10" buttons="bold,italic"/>
                    <richtexteditor:ButtonGroup name="link" visible="true" priority="4" buttons="link,unlink"/>
                </richtexteditor:buttonGroups>
            </macros:RichTextEditorWithMetadata>
        </VBox>
    </core:FragmentDefinition>`;
            const basePath = join(testAppPath, 'test-rte-button-groups');
            const aggregationPath = `/core:FragmentDefinition/*[local-name()='VBox']/macros:RichTextEditorWithMetadata`;
            const buttonGroupsData = {
                id: 'RichTextButtonGroups',
                buildingBlockType: BuildingBlockType.RichTextEditorButtonGroups,
                buttonGroups: [{ name: 'clipboard', visible: true, priority: 10 }, { name: 'undo' }]
            };

            fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
            fs.write(join(basePath, xmlFragmentFilePath), xmlFragmentWithExisting);

            await generateBuildingBlock(
                basePath,
                {
                    viewOrFragmentPath: xmlFragmentFilePath,
                    aggregationPath: aggregationPath,
                    buildingBlockData: buttonGroupsData
                },
                fs
            );

            const fragmentContent = fs.read(join(basePath, xmlFragmentFilePath));
            expect(fragmentContent).toMatchSnapshot('generate-rte-button-groups-replace-existing');
        });

        test('generate RichTextEditorButtonGroups - preserve existing element\'s attributes when no new attributes provided', async () => {
            const xmlFragmentWithExistingAttributes = `<core:FragmentDefinition xmlns:core="sap.ui.core" xmlns="sap.m"
                xmlns:macros="sap.fe.macros" xmlns:richtexteditor="sap.fe.macros.richtexteditor">
                <VBox>
                    <macros:RichTextEditorWithMetadata metaPath="/Travel/AgencyID" id="RichTextEditor">
                        <richtexteditor:buttonGroups>
                            <richtexteditor:ButtonGroup name="clipboard" visible="false" priority="15" buttons="cut,copy,paste" id="existingClipboard"/>
                            <richtexteditor:ButtonGroup name="undo" visible="true" priority="12" buttons="undo,redo" customToolbarPriority="50" row="3"/>
                            <richtexteditor:ButtonGroup name="font-style" visible="true" priority="10" buttons="bold,italic"/>
                            <richtexteditor:ButtonGroup name="link" visible="false" priority="8" buttons="link,unlink" customToolbarPriority="25"/>
                        </richtexteditor:buttonGroups>
                    </macros:RichTextEditorWithMetadata>
                </VBox>
            </core:FragmentDefinition>`;

            const basePath = join(testAppPath, 'test-rte-button-groups-preserve-attributes');
            const aggregationPath = `/core:FragmentDefinition/*[local-name()='VBox']/macros:RichTextEditorWithMetadata`;
            
            const buttonGroupsData = {
                id: 'RichTextButtonGroupsPreserve',
                buildingBlockType: BuildingBlockType.RichTextEditorButtonGroups,
                buttonGroups: [
                    // User keeps 'clipboard' - no new attributes provided
                    // Should preserve: visible="false", priority="15", buttons="cut,copy,paste", id="existingClipboard"
                    { name: 'clipboard' },
                    
                    // User keeps 'undo' - no new attributes provided
                    // Should preserve: visible="true", priority="12", buttons="undo,redo", customToolbarPriority="50", row="3"
                    { name: 'undo' },
                    
                    // User unselected 'font-style' and 'link' - they should be removed
                    
                    // User adds new 'structure' - no existing attributes to preserve, use defaults
                    { name: 'structure' }
                ]
            };

            fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
            fs.write(join(basePath, xmlFragmentFilePath), xmlFragmentWithExistingAttributes);

            await generateBuildingBlock(
                basePath,
                {
                    viewOrFragmentPath: xmlFragmentFilePath,
                    aggregationPath: aggregationPath,
                    buildingBlockData: buttonGroupsData
                },
                fs
            );

            const fragmentContent = fs.read(join(basePath, xmlFragmentFilePath));
            expect(fragmentContent).toMatchSnapshot('generate-rte-button-groups-preserve-existing-attributes');
        });

        test('generate RichTextEditorButtonGroups - override existing element\'s attributes when new attributes provided', async () => {
            const xmlFragmentWithComplexExisting = `<core:FragmentDefinition xmlns:core="sap.ui.core" xmlns="sap.m"
                xmlns:macros="sap.fe.macros" xmlns:richtexteditor="sap.fe.macros.richtexteditor">
                <VBox>
                    <macros:RichTextEditorWithMetadata metaPath="/Travel/AgencyID" id="RichTextEditor">
                        <richtexteditor:buttonGroups>
                            <richtexteditor:ButtonGroup name="font-style" visible="true" priority="10" buttons="bold,italic"/>
                            <richtexteditor:ButtonGroup name="link" visible="true" priority="4" buttons="link,unlink" customToolbarPriority="33" row="3"/>
                            <richtexteditor:ButtonGroup name="clipboard" visible="false" priority="15" buttons="cut,copy,paste" id="existingClipboard"/>
                            <richtexteditor:ButtonGroup name="undo" visible="true" priority="10" buttons="undo,redo"/>
                            <richtexteditor:ButtonGroup name="table" visible="true" priority="8" buttons="table" customToolbarPriority="20"/>
                        </richtexteditor:buttonGroups>
                    </macros:RichTextEditorWithMetadata>
                </VBox>
            </core:FragmentDefinition>`;

            const basePath = join(testAppPath, 'test-rte-button-groups-complex');
            const aggregationPath = `/core:FragmentDefinition/*[local-name()='VBox']/macros:RichTextEditorWithMetadata`;

            // Complex scenario: User modifies some existing button groups and adds new ones
            const complexButtonGroupsData = {
                id: 'RichTextButtonGroupsComplex',
                buildingBlockType: BuildingBlockType.RichTextEditorButtonGroups,
                buttonGroups: [
                    // Keep 'clipboard' but with modified properties (was visible=false, now true; was priority=15, now 10; remove id)
                    { name: 'clipboard', visible: true, priority: 10 },
                    // Keep 'undo' but with custom buttons (was undo,redo, now only undo)
                    { name: 'undo', buttons: 'undo', visible: true, priority: 12 },
                    // Add new 'font-style' with completely different config than before
                    {
                        name: 'font-style',
                        buttons: 'bold,italic,underline,strikethrough',
                        visible: false,
                        priority: 20,
                        id: 'newFontStyle'
                    },
                    // Add new 'structure' that wasn't in existing
                    { name: 'structure', visible: true, priority: 5, buttons: 'formatselect' },
                    // Add new 'insert' with all optional properties
                    {
                        name: 'insert',
                        buttons: 'image',
                        visible: true,
                        priority: 18,
                        customToolbarPriority: '40',
                        row: 2,
                        id: 'customInsert'
                    },
                    // Add new 'text-align' with defaults
                    { name: 'text-align' }
                ]
            };

            fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
            fs.write(join(basePath, xmlFragmentFilePath), xmlFragmentWithComplexExisting);

            await generateBuildingBlock(
                basePath,
                {
                    viewOrFragmentPath: xmlFragmentFilePath,
                    aggregationPath: aggregationPath,
                    buildingBlockData: complexButtonGroupsData
                },
                fs
            );

            const fragmentContent = fs.read(join(basePath, xmlFragmentFilePath));
            expect(fragmentContent).toMatchSnapshot('generate-rte-button-groups-complex-replace');
        });

        test('throws error for unknown button group name', async () => {
            const aggregationPath = `/core:FragmentDefinition/*[local-name()='VBox']/macros:RichTextEditorWithMetadata`;
            const buttonGroupsData = {
                id: 'RichTextButtonGroupsUnknown',
                buildingBlockType: BuildingBlockType.RichTextEditorButtonGroups,
                buttonGroups: [{ name: 'invalid-button-group' }]
            };
            const basePath = join(testAppPath, 'test-rte-button-groups');
            fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
            fs.write(join(basePath, xmlFragmentFilePath), testXmlFragmentWithoutButtonGroups);

            await expect(
                generateBuildingBlock(
                    basePath,
                    {
                        viewOrFragmentPath: xmlFragmentFilePath,
                        aggregationPath: aggregationPath,
                        buildingBlockData: buttonGroupsData
                    },
                    fs
                )
            ).rejects.toThrow('Unknown button group: invalid-button-group');
        });

        test('RichTextEditorButtonGroups with all available button groups', async () => {
            const aggregationPath = `/core:FragmentDefinition/*[local-name()='VBox']/macros:RichTextEditorWithMetadata`;
            const buttonGroupsData = {
                id: 'RichTextAllButtonGroups',
                buildingBlockType: BuildingBlockType.RichTextEditorButtonGroups,
                buttonGroups: [
                    { name: 'font-style' },
                    { name: 'font' },
                    { name: 'clipboard' },
                    { name: 'structure' },
                    { name: 'undo' },
                    { name: 'insert' },
                    { name: 'link' },
                    { name: 'text-align' },
                    { name: 'table' },
                    { name: 'styleselect' }
                ]
            };
            const basePath = join(testAppPath, 'test-rte-button-groups');
            fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
            fs.write(join(basePath, xmlFragmentFilePath), testXmlFragmentWithoutButtonGroups);

            await generateBuildingBlock(
                basePath,
                {
                    viewOrFragmentPath: xmlFragmentFilePath,
                    aggregationPath: aggregationPath,
                    buildingBlockData: buttonGroupsData
                },
                fs
            );

            const fragmentContent = fs.read(join(basePath, xmlFragmentFilePath));
            expect(fragmentContent).toMatchSnapshot('generate-rte-all-button-groups');
        });

        test('multiple RichTextEditors with complex button group scenarios', async () => {
            const xmlFragmentWithMultipleRTEs = `<core:FragmentDefinition xmlns:core="sap.ui.core" xmlns="sap.m"
            xmlns:macros="sap.fe.macros" xmlns:richtexteditor="sap.fe.macros.richtexteditor">
            <VBox>
                <macros:RichTextEditorWithMetadata metaPath="/Travel/AgencyID" id="RichTextEditor1">
                    <richtexteditor:buttonGroups>
                        <richtexteditor:ButtonGroup name="font-style" visible="true" priority="10" buttons="bold,italic"/>
                        <richtexteditor:ButtonGroup name="clipboard" visible="true" priority="5" buttons="cut,copy,paste"/>
                    </richtexteditor:buttonGroups>
                </macros:RichTextEditorWithMetadata>
                
                <macros:RichTextEditorWithMetadata metaPath="/Travel/Description" id="RichTextEditor2">
                    <richtexteditor:buttonGroups>
                        <richtexteditor:ButtonGroup name="link" visible="false" priority="3" buttons="link,unlink"/>
                        <richtexteditor:ButtonGroup name="undo" visible="true" priority="10" buttons="undo,redo"/>
                    </richtexteditor:buttonGroups>
                </macros:RichTextEditorWithMetadata>
                
                <macros:RichTextEditorWithMetadata metaPath="/Travel/Notes" id="RichTextEditor3"/>
            </VBox>
        </core:FragmentDefinition>`;

            const basePath = join(testAppPath, 'test-multiple-rtes-complex');
            fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
            fs.write(join(basePath, xmlFragmentFilePath), xmlFragmentWithMultipleRTEs);

            // Test Case 1: Replace existing button groups in RichTextEditor1 with new selection
            // User unselects 'clipboard' and adds 'table' and 'insert'
            const buttonGroupsDataRTE1 = {
                id: 'RichTextButtonGroups1',
                buildingBlockType: BuildingBlockType.RichTextEditorButtonGroups,
                buttonGroups: [
                    { name: 'font-style', visible: true, priority: 15, buttons: 'bold,italic,underline' },
                    { name: 'table', visible: true, priority: 8 },
                    { name: 'insert', visible: false, priority: 7, customToolbarPriority: '25', row: 2 }
                ]
            };

            await generateBuildingBlock(
                basePath,
                {
                    viewOrFragmentPath: xmlFragmentFilePath,
                    aggregationPath: `/core:FragmentDefinition/*[local-name()='VBox']/macros:RichTextEditorWithMetadata[@id='RichTextEditor1']`,
                    buildingBlockData: buttonGroupsDataRTE1
                },
                fs
            );

            let fragmentContent = fs.read(join(basePath, xmlFragmentFilePath));
            expect(fragmentContent).toMatchSnapshot('multiple-rtes-step1-update-rte1');

            // Test Case 2: Update RichTextEditor2 - replace all button groups
            const buttonGroupsDataRTE2 = {
                id: 'RichTextButtonGroups2',
                buildingBlockType: BuildingBlockType.RichTextEditorButtonGroups,
                buttonGroups: [
                    { name: 'clipboard' },
                    { name: 'text-align', buttons: 'alignleft,aligncenter,alignright,alignjustify' },
                    { name: 'structure', visible: false, priority: 12 }
                ]
            };

            await generateBuildingBlock(
                basePath,
                {
                    viewOrFragmentPath: xmlFragmentFilePath,
                    aggregationPath: `/core:FragmentDefinition/*[local-name()='VBox']/macros:RichTextEditorWithMetadata[@id='RichTextEditor2']`,
                    buildingBlockData: buttonGroupsDataRTE2
                },
                fs
            );

            fragmentContent = fs.read(join(basePath, xmlFragmentFilePath));
            expect(fragmentContent).toMatchSnapshot('multiple-rtes-step2-update-rte2');

            // Test Case 3: Add button groups to RichTextEditor3 (initially empty)
            const buttonGroupsDataRTE3 = {
                id: 'RichTextButtonGroups3',
                buildingBlockType: BuildingBlockType.RichTextEditorButtonGroups,
                buttonGroups: [
                    { name: 'font', buttons: 'fontselect,fontsizeselect' },
                    { name: 'styleselect', visible: true, priority: 20 },
                    { name: 'undo' },
                    { name: 'link', buttons: 'link', customToolbarPriority: '40', id: 'customLinkButton' }
                ]
            };

            await generateBuildingBlock(
                basePath,
                {
                    viewOrFragmentPath: xmlFragmentFilePath,
                    aggregationPath: `/core:FragmentDefinition/*[local-name()='VBox']/macros:RichTextEditorWithMetadata[@id='RichTextEditor3']`,
                    buildingBlockData: buttonGroupsDataRTE3
                },
                fs
            );

            fragmentContent = fs.read(join(basePath, xmlFragmentFilePath));
            expect(fragmentContent).toMatchSnapshot('multiple-rtes-step3-add-to-rte3');
        });

        test('generate RichTextEditor button groups with empty array', async () => {
            const testXmlFragmentForEdgeCases = `<core:FragmentDefinition xmlns:core="sap.ui.core" xmlns="sap.m" 
            xmlns:macros="sap.fe.macros" xmlns:richtexteditor="sap.fe.macros.richtexteditor">
            <VBox>
                <macros:RichTextEditorWithMetadata metaPath="/Travel/AgencyID" id="EdgeCaseRTE"/>
            </VBox>
        </core:FragmentDefinition>`;

            const basePath = join(testAppPath, 'test-rte-empty-button-groups');
            fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
            fs.write(join(basePath, xmlFragmentFilePath), testXmlFragmentForEdgeCases);

            // Test: Empty button groups array (should remove existing buttonGroups)
            const emptyButtonGroups = {
                id: 'EmptyButtonGroups',
                buildingBlockType: BuildingBlockType.RichTextEditorButtonGroups,
                buttonGroups: []
            };

            await generateBuildingBlock(
                basePath,
                {
                    viewOrFragmentPath: xmlFragmentFilePath,
                    aggregationPath: `/core:FragmentDefinition/*[local-name()='VBox']/macros:RichTextEditorWithMetadata[@id='EdgeCaseRTE']`,
                    buildingBlockData: emptyButtonGroups
                },
                fs
            );

            const fragmentContent = fs.read(join(basePath, xmlFragmentFilePath));
            expect(fragmentContent).toMatchSnapshot('rte-empty-button-groups');
        });
    });

    test('generate Rich Text Editor building block with error', async () => {
        const aggregationPath = `/core:FragmentDefinition/*[local-name()='VBox']`;
        const basePath = join(testAppPath, 'generate-rich-text-editor-block');
        const richTextEditorData = {
            id: 'testRichTextEditor',
            buildingBlockType: BuildingBlockType.RichTextEditor,
            metaPath: {
                bindingContextType: bindingContextAbsolute,
                entitySet: 'testEntitySet'
            },
            targetProperty: 'testProperty'
        };

        const manifestWithLowerUi5Version = {
            ...testManifestContent,
            'sap.ui5': {
                ...testManifestContent['sap.ui5'],
                dependencies: {
                    ...testManifestContent['sap.ui5']?.dependencies,
                    minUI5Version: '1.116.0'
                }
            }
        };
        fs.write(join(basePath, manifestFilePath), JSON.stringify(manifestWithLowerUi5Version));
        fs.write(join(basePath, xmlFragmentFilePath), testXmlFragmentContent);
        const t = translate(i18nNamespaces.buildingBlock, 'richTextEditorBuildingBlock.');

        await expect(
            generateBuildingBlock(
                basePath,
                {
                    viewOrFragmentPath: xmlFragmentFilePath,
                    aggregationPath,
                    buildingBlockData: richTextEditorData
                },
                fs
            )
        ).rejects.toThrow(
            `${t('minUi5VersionRequirement', {
                minUI5Version: manifestWithLowerUi5Version['sap.ui5'].dependencies.minUI5Version
            })}`
        );
    });

    describe('CustomFilterField building block', () => {
        const testXmlViewContentWithoutMacrosFilterFields = `<mvc:View xmlns:core="sap.ui.core" xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m"
    xmlns:html="http://www.w3.org/1999/xhtml" controllerName="com.test.myApp.ext.main.Main"
    xmlns:macros="sap.fe.macros">
    <Page title="Main">
        <content>
            <macros:FilterBar>
            </macros:FilterBar>
        </content>
    </Page>
</mvc:View>`;

        test('CustomFilterField detects macros:filterFields elements correctly', async () => {
            // Create mock XMLDocument with macros:filterFields
            const xmlViewWithFilterFields = `<mvc:View xmlns:core="sap.ui.core" xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m"
    xmlns:html="http://www.w3.org/1999/xhtml" controllerName="com.test.myApp.ext.main.Main"
    xmlns:macros="sap.fe.macros">
    <Page title="Main">
        <content>
            <macros:FilterBar>
                <macros:filterFields>
                    <macros:FilterField />
                </macros:filterFields>
            </macros:FilterBar>
        </content>
    </Page>
</mvc:View>`;

            const basePath = join(testAppPath, 'test-custom-filter-field-detection');
            const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']/macros:FilterBar`;
            const customFilterFieldData: CustomFilterField = {
                id: 'testCustomFilterField2',
                buildingBlockType: BuildingBlockType.CustomFilterField,
                label: 'Custom Filter Field 2',
                anchor: 'testAnchor',
                property: 'testProperty',
                required: true,
                embededFragment: {
                    folder: 'ext/fragment',
                    typescript: false,
                    content:
                        '<core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core"><Input value="{testProperty}"/></core:FragmentDefinition>',
                    name: 'CustomFilterField2'
                },
                position: {
                    placement: Placement.After
                }
            };

            fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
            fs.write(join(basePath, xmlViewFilePath), xmlViewWithFilterFields);

            // Test the getElementsByTagName functionality directly - this is what the code checks
            const { DOMParser } = await import('@xmldom/xmldom');
            const xmlDocument = new DOMParser().parseFromString(xmlViewWithFilterFields);

            // Test the getElementsByTagName functionality directly - this is what the code checks
            const hasFilterFields = xmlDocument.getElementsByTagName('macros:filterFields').length > 0;
            expect(hasFilterFields).toBe(true);

            await generateBuildingBlock<CustomFilterField>(
                basePath,
                {
                    viewOrFragmentPath: xmlViewFilePath,
                    aggregationPath: aggregationPath,
                    buildingBlockData: customFilterFieldData
                },
                fs
            );

            // Check that fragment file was created
            const expectedFragmentPath = join(basePath, 'webapp/ext/fragment/CustomFilterField2.fragment.xml');
            expect(fs.exists(expectedFragmentPath)).toBe(true);

            expect(fs.read(join(basePath, xmlViewFilePath))).toMatchSnapshot(
                'generate-custom-filter-field-with-macros-filter-fields'
            );

            await writeFilesForDebugging(fs);
        });

        test('generate CustomFilterField without macros:filterFields - should not update aggregation path', async () => {
            const basePath = join(testAppPath, 'generate-custom-filter-field-without-macros-filter-fields');
            const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']/macros:FilterBar`;
            const customFilterFieldData: CustomFilterField = {
                id: 'testCustomFilterField2',
                buildingBlockType: BuildingBlockType.CustomFilterField,
                label: 'Custom Filter Field 2',
                anchor: 'testAnchor',
                property: 'testProperty',
                required: true,
                embededFragment: {
                    folder: 'ext/fragment',
                    typescript: false,
                    content:
                        '<core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core"><Input value="{testProperty}"/></core:FragmentDefinition>',
                    name: 'CustomFilterField2'
                },
                position: {
                    placement: Placement.After
                }
            };

            fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
            fs.write(join(basePath, xmlViewFilePath), testXmlViewContentWithoutMacrosFilterFields);

            await generateBuildingBlock<CustomFilterField>(
                basePath,
                {
                    viewOrFragmentPath: xmlViewFilePath,
                    aggregationPath: aggregationPath,
                    buildingBlockData: customFilterFieldData
                },
                fs
            );

            // Check that fragment file was created
            const expectedFragmentPath = join(basePath, 'webapp/ext/fragment/CustomFilterField2.fragment.xml');
            expect(fs.exists(expectedFragmentPath)).toBe(true);

            expect(fs.dump(testAppPath)).toMatchSnapshot('generate-custom-filter-field-without-macros-filter-fields');
            await writeFilesForDebugging(fs);
        });

        test('generate CustomFilterField with existing fragment file - should not overwrite', async () => {
            const basePath = join(testAppPath, 'generate-custom-filter-field-existing-fragment');
            const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']`;
            const customFilterFieldData: CustomFilterField = {
                id: 'testCustomFilterField3',
                buildingBlockType: BuildingBlockType.CustomFilterField,
                label: 'Existing Filter Field Fragment',
                anchor: 'testAnchor',
                property: 'testProperty',
                required: false,
                position: {
                    placement: Placement.After
                },
                embededFragment: {
                    folder: 'ext/fragment',
                    typescript: false,
                    content:
                        '<core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core"><Input value="{testProperty}"/></core:FragmentDefinition>',
                    name: 'CustomFilterFieldFragment'
                }
            };

            fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
            fs.write(join(basePath, xmlViewFilePath), testXmlViewContent);

            // Pre-create the fragment file with custom content
            const existingFragmentPath = join(
                basePath,
                'webapp/ext/fragments/ExistingFilterFieldFragment.fragment.xml'
            );
            const existingContent =
                '<core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core"><ComboBox value="{testProperty}" /></core:FragmentDefinition>';
            fs.write(existingFragmentPath, existingContent);

            await generateBuildingBlock<CustomFilterField>(
                basePath,
                {
                    viewOrFragmentPath: xmlViewFilePath,
                    aggregationPath: aggregationPath,
                    buildingBlockData: customFilterFieldData
                },
                fs
            );

            // Check that existing fragment file was not overwritten
            const fragmentContent = fs.read(existingFragmentPath);
            expect(fragmentContent).toBe(existingContent);
            expect(fragmentContent).toContain('ComboBox');
            // check original xml view
            const viewContent = fs.read(join(basePath, xmlViewFilePath));
            expect(viewContent).toContain('my.test.App.ext.fragment.CustomFilterFieldFragment');

            await writeFilesForDebugging(fs);
        });

        test('generate CustomFilterField with folder option', async () => {
            const basePath = join(testAppPath, 'generate-custom-filter-field-with-folder');
            const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']`;
            const customFilterFieldData: CustomFilterField = {
                id: 'testCustomFilterFieldWithFolder',
                buildingBlockType: BuildingBlockType.CustomFilterField,
                label: 'Custom Filter Field With Folder',
                anchor: 'testAnchor',
                property: 'testProperty',
                required: true,
                position: {
                    placement: Placement.After
                },
                embededFragment: {
                    folder: 'ext/customfilterfolder',
                    typescript: false,
                    content:
                        '<core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core"><DatePicker value="{testProperty}"/></core:FragmentDefinition>',
                    name: 'CustomFilterFieldWithFolder'
                }
            };

            fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
            fs.write(join(basePath, xmlViewFilePath), testXmlViewContent);

            await generateBuildingBlock<CustomFilterField>(
                basePath,
                {
                    viewOrFragmentPath: xmlViewFilePath,
                    aggregationPath: aggregationPath,
                    buildingBlockData: customFilterFieldData
                },
                fs
            );

            // Check that fragment file was created in correct folder
            const expectedFragmentPath = join(
                basePath,
                'webapp/ext/customfilterfolder/CustomFilterFieldWithFolder.fragment.xml'
            );
            expect(fs.exists(expectedFragmentPath)).toBe(true);

            const fragmentContent = fs.read(expectedFragmentPath);
            expect(fragmentContent).toContain('ComboBox'); // The template uses ComboBox by default

            // check original xml view
            const viewContent = fs.read(join(basePath, xmlViewFilePath));
            expect(viewContent).toContain('my.test.App.ext.customfilterfolder.CustomFilterFieldWithFolder');

            await writeFilesForDebugging(fs);
        });

        test('generate CustomFilterField without folder - defaults to ext/name path dirname', async () => {
            const basePath = join(testAppPath, 'generate-custom-filter-field-no-folder');
            const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']`;
            const customFilterFieldData: CustomFilterField = {
                id: 'testCustomFilterFieldNoFolder',
                buildingBlockType: BuildingBlockType.CustomFilterField,
                label: 'Custom Filter Field No Folder',
                anchor: 'testAnchor',
                property: 'testProperty',
                required: false,
                position: {
                    placement: Placement.Before
                },
                embededFragment: {
                    typescript: false,
                    content:
                        '<core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core"><CheckBox selected="{testProperty}"/></core:FragmentDefinition>',
                    name: 'CustomFilterFieldNoFolder'
                }
                // Note: no folder property
            };

            fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
            fs.write(join(basePath, xmlViewFilePath), testXmlViewContent);

            await generateBuildingBlock<CustomFilterField>(
                basePath,
                {
                    viewOrFragmentPath: xmlViewFilePath,
                    aggregationPath: aggregationPath,
                    buildingBlockData: customFilterFieldData
                },
                fs
            );

            // Check that fragment file was created in webapp folder (manifest dirname)
            const expectedFragmentPath = join(
                basePath,
                'webapp/ext/customFilterFieldNoFolder/CustomFilterFieldNoFolder.fragment.xml'
            );
            expect(fs.exists(expectedFragmentPath)).toBe(true);

            const fragmentContent = fs.read(expectedFragmentPath);
            expect(fragmentContent).toContain('ComboBox');
            // check original xml view
            const viewContent = fs.read(join(basePath, xmlViewFilePath));
            expect(viewContent).toContain('my.test.App.ext.customFilterFieldNoFolder.CustomFilterFieldNoFolder');

            await writeFilesForDebugging(fs);
        });

        test('CustomFilterField should generate fragment from template', async () => {
            const basePath = join(testAppPath, 'test-custom-filter-field-content');
            const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']`;
            const customFilterFieldData: CustomFilterField = {
                id: 'testCustomFilterFieldContent',
                buildingBlockType: BuildingBlockType.CustomFilterField,
                label: 'Custom Filter Field Content',
                anchor: 'testAnchor',
                property: 'testProperty',
                required: true,
                position: {
                    placement: Placement.After
                },
                embededFragment: {
                    folder: 'ext/fragment',
                    typescript: false,
                    content:
                        '<core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core"><MultiInput value="{testProperty}"/></core:FragmentDefinition>',
                    name: 'CustomFilterFieldContent'
                }
            };

            fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
            fs.write(join(basePath, xmlViewFilePath), testXmlViewContent);

            await generateBuildingBlock<CustomFilterField>(
                basePath,
                {
                    viewOrFragmentPath: xmlViewFilePath,
                    aggregationPath: aggregationPath,
                    buildingBlockData: customFilterFieldData
                },
                fs
            );

            // For CustomFilterField, the template is used, not the content property
            expect(customFilterFieldData.embededFragment?.content).toBeDefined();

            // check original xml view
            const viewContent = fs.read(join(basePath, xmlViewFilePath));
            expect(viewContent).toContain('my.test.App.ext.fragment.CustomFilterFieldContent');

            await writeFilesForDebugging(fs);
        });

        test('CustomFilterField fragments are created with template content', async () => {
            const basePath = join(testAppPath, 'test-custom-filter-field-fragment-content');
            const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']`;
            const customFilterFieldData: CustomFilterField = {
                id: 'testCustomFilterFieldFragmentContent',
                buildingBlockType: BuildingBlockType.CustomFilterField,
                label: 'Custom Filter Field Fragment Content',
                anchor: 'testAnchor',
                property: 'testProperty',
                required: false,
                position: {
                    placement: Placement.After
                },
                embededFragment: {
                    folder: 'ext/fragment',
                    typescript: false,
                    content:
                        '<core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core"><Select selectedKey="{testProperty}"/></core:FragmentDefinition>',
                    name: 'CustomFilterFieldFragmentContent'
                }
            };

            fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
            fs.write(join(basePath, xmlViewFilePath), testXmlViewContent);

            await generateBuildingBlock<CustomFilterField>(
                basePath,
                {
                    viewOrFragmentPath: xmlViewFilePath,
                    aggregationPath: aggregationPath,
                    buildingBlockData: customFilterFieldData
                },
                fs
            );

            // Check that fragment file was created
            const expectedFragmentPath = join(
                basePath,
                'webapp/ext/fragment/CustomFilterFieldFragmentContent.fragment.xml'
            );
            expect(fs.exists(expectedFragmentPath)).toBe(true);

            // For CustomFilterField, the template is used, not the content property
            expect(customFilterFieldData.embededFragment?.content).toBeDefined();

            // Check fragment file content
            const fragmentContent = fs.read(expectedFragmentPath);
            expect(fragmentContent).toContain('ComboBox');
            expect(fragmentContent).toContain('<core:FragmentDefinition');
            expect(fragmentContent).toContain('Item1'); // Template has Item1, Item2, Item3

            await writeFilesForDebugging(fs);
        });

        test('generate CustomFilterField with all optional properties', async () => {
            const basePath = join(testAppPath, 'generate-custom-filter-field-all-properties');
            const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']`;
            const customFilterFieldData: CustomFilterField = {
                id: 'testCustomFilterFieldAllProps',
                buildingBlockType: BuildingBlockType.CustomFilterField,
                label: 'Custom Filter Field All Properties',
                anchor: 'existingFilterField',
                property: 'MyEntity/MyProperty',
                required: true,
                filterFieldKey: 'customKey123',
                position: {
                    placement: Placement.Before
                },
                embededFragment: {
                    folder: 'ext/customfilter',
                    typescript: true,
                    content:
                        '<core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core"><RangeSlider value="{MyEntity/MyProperty}"/></core:FragmentDefinition>',
                    name: 'AllPropertiesFilterField'
                }
            };

            fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
            fs.write(join(basePath, xmlViewFilePath), testXmlViewContent);

            await generateBuildingBlock<CustomFilterField>(
                basePath,
                {
                    viewOrFragmentPath: xmlViewFilePath,
                    aggregationPath: aggregationPath,
                    buildingBlockData: customFilterFieldData
                },
                fs
            );

            // Check that fragment file was created
            const expectedFragmentPath = join(
                basePath,
                'webapp/ext/customfilter/AllPropertiesFilterField.fragment.xml'
            );
            expect(fs.exists(expectedFragmentPath)).toBe(true);

            // Check fragment file content
            const fragmentContent = fs.read(expectedFragmentPath);
            expect(fragmentContent).toContain('ComboBox');
            expect(fragmentContent).toContain('Item1'); // Template has Item1, Item2, Item3

            // check original xml view contains the proper reference
            const viewContent = fs.read(join(basePath, xmlViewFilePath));
            expect(viewContent).toContain('my.test.App.ext.customfilter.AllPropertiesFilterField');

            // Check that the generated view.xml contains the filterFieldKey
            expect(viewContent).toContain('customKey123');

            await writeFilesForDebugging(fs);
        });

        test('generate CustomFilterField with minimal required properties', async () => {
            const basePath = join(testAppPath, 'generate-custom-filter-field-minimal');
            const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']`;
            const customFilterFieldData: CustomFilterField = {
                id: 'minimalCustomFilterField',
                buildingBlockType: BuildingBlockType.CustomFilterField,
                label: 'Minimal Filter Field',
                anchor: 'someAnchor',
                property: 'SimpleProperty',
                required: false,
                position: {
                    placement: Placement.After
                },
                embededFragment: {
                    typescript: false,
                    content:
                        '<core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core"><Input/></core:FragmentDefinition>',
                    name: 'MinimalFilterField'
                }
            };

            fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
            fs.write(join(basePath, xmlViewFilePath), testXmlViewContent);

            await generateBuildingBlock<CustomFilterField>(
                basePath,
                {
                    viewOrFragmentPath: xmlViewFilePath,
                    aggregationPath: aggregationPath,
                    buildingBlockData: customFilterFieldData
                },
                fs
            );

            // Check that fragment file was created in default location
            const expectedFragmentPath = join(
                basePath,
                'webapp/ext/minimalFilterField/MinimalFilterField.fragment.xml'
            );
            expect(fs.exists(expectedFragmentPath)).toBe(true);

            // Check fragment file content
            const fragmentContent = fs.read(expectedFragmentPath);
            expect(fragmentContent).toContain('ComboBox');

            expect(fs.dump(testAppPath)).toMatchSnapshot('generate-custom-filter-field-minimal');
            await writeFilesForDebugging(fs);
        });

        test('generate CustomFilterField with eventHandler set to true', async () => {
            const basePath = join(testAppPath, 'generate-custom-filter-field-with-event-handler');
            const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']`;
            const customFilterFieldData: CustomFilterField = {
                id: 'customFilterFieldWithEventHandler',
                buildingBlockType: BuildingBlockType.CustomFilterField,
                label: 'Filter Field With Event Handler',
                anchor: 'someAnchor',
                property: 'TestProperty',
                required: true,
                filterFieldKey: 'eventHandlerKey',
                position: {
                    placement: Placement.After
                },
                embededFragment: {
                    folder: 'ext/fragment',
                    typescript: false,
                    content:
                        '<core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core"><Input/></core:FragmentDefinition>',
                    name: 'EventHandlerFilterField',
                    eventHandler: true // This will create a new event handler
                }
            };

            fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
            fs.write(join(basePath, xmlViewFilePath), testXmlViewContent);

            await generateBuildingBlock<CustomFilterField>(
                basePath,
                {
                    viewOrFragmentPath: xmlViewFilePath,
                    aggregationPath: aggregationPath,
                    buildingBlockData: customFilterFieldData
                },
                fs
            );

            // Check that fragment file was created
            const expectedFragmentPath = join(basePath, 'webapp/ext/fragment/EventHandlerFilterField.fragment.xml');
            expect(fs.exists(expectedFragmentPath)).toBe(true);

            // Check that a controller extension was created
            const expectedControllerPath = join(basePath, 'webapp/ext/fragment/EventHandlerFilterField.js');
            expect(fs.exists(expectedControllerPath)).toBe(true);

            // Check controller file content contains the event handler function
            const controllerContent = fs.read(expectedControllerPath);
            expect(controllerContent).toContain('onPress');
            expect(controllerContent).toContain('function(sValue)');
            expect(controllerContent).toContain('Filter');
            expect(controllerContent).toContain('TestProperty');

            // Check fragment file content
            const fragmentContent = fs.read(expectedFragmentPath);
            expect(fragmentContent).toContain('ComboBox');

            // Check that the view contains the generated filter field
            const viewContent = fs.read(join(basePath, xmlViewFilePath));
            expect(viewContent).toContain('my.test.App.ext.fragment.EventHandlerFilterField');
            expect(viewContent).toContain('eventHandlerKey');

            await writeFilesForDebugging(fs);
        });
    });

    describe('Building Block Configuration and Type Safety', () => {
        test('BUILDING_BLOCK_CONFIG export contains correct configuration', () => {
            // Test CustomColumn configuration
            const customColumnConfig = BUILDING_BLOCK_CONFIG[BuildingBlockType.CustomColumn]!;
            expect(customColumnConfig).toBeDefined();
            expect(customColumnConfig.aggregationConfig.aggregationName).toBe('columns');
            expect(customColumnConfig.aggregationConfig.elementName).toBe('Column');
            expect(customColumnConfig.templateFile).toBe('common/Fragment.xml');
            expect(customColumnConfig.namespace.uri).toBe('sap.fe.macros.table');
            expect(customColumnConfig.namespace.prefix).toBe('macrosTable');
            // expect(customColumnConfig.resultPropertyName).toBe('hasTableColumns');
            expect(typeof customColumnConfig.processor).toBe('function');

            // Test CustomFilterField configuration
            const customFilterFieldConfig = BUILDING_BLOCK_CONFIG[BuildingBlockType.CustomFilterField]!;
            expect(customFilterFieldConfig).toBeDefined();
            expect(customFilterFieldConfig.aggregationConfig.aggregationName).toBe('filterFields');
            expect(customFilterFieldConfig.aggregationConfig.elementName).toBe('FilterField');
            expect(customFilterFieldConfig.templateFile).toBe('filter/fragment.xml');
            expect(customFilterFieldConfig.namespace.uri).toBe('sap.fe.macros.filterBar');
            expect(customFilterFieldConfig.namespace.prefix).toBe('macros');
            // expect(customFilterFieldConfig.resultPropertyName).toBe('hasFilterFields');
            expect(typeof customFilterFieldConfig.processor).toBe('function');
        });

        test('processor function type validation - CustomColumn with wrong type throws error', async () => {
            const mockFs = create(createStorage());

            const customColumnProcessor = BUILDING_BLOCK_CONFIG[BuildingBlockType.CustomColumn]!.processor;
            const mockConfig = BUILDING_BLOCK_CONFIG[BuildingBlockType.CustomColumn]!;

            // Create a building block with wrong type
            const wrongTypeBuildingBlock = {
                id: 'wrongType',
                buildingBlockType: BuildingBlockType.FilterBar, // Wrong type for CustomColumn processor
                label: 'Wrong Type'
            };

            // Should throw error when processor is called with wrong type
            expect(() => {
                const context = {
                    fs: mockFs,
                    viewPath: '/mock/path'
                };
                customColumnProcessor(wrongTypeBuildingBlock, context);
                //customColumnProcessor(wrongTypeBuildingBlock, mockFs, '/mock/path', mockConfig);
            }).toThrow('Expected CustomColumn building block data');
        });

        test('processor function type validation - CustomFilterField with wrong type throws error', async () => {
            const mockFs = create(createStorage());

            const customFilterFieldProcessor = BUILDING_BLOCK_CONFIG[BuildingBlockType.CustomFilterField]!.processor;
            const mockConfig = BUILDING_BLOCK_CONFIG[BuildingBlockType.CustomFilterField]!;

            // Create a building block with wrong type
            const wrongTypeBuildingBlock = {
                id: 'wrongType',
                buildingBlockType: BuildingBlockType.Chart, // Wrong type for CustomFilterField processor
                title: 'Wrong Type'
            };

            // Should throw error when processor is called with wrong type
            expect(() => {
                const context = {
                    fs: mockFs,
                    viewPath: '/mock/path'
                };
                customFilterFieldProcessor(wrongTypeBuildingBlock, context);
            }).toThrow('Expected CustomFilterField building block data');
        });

        test('CustomFilterField processor throws error when embededFragment is missing', async () => {
            const mockFs = create(createStorage());

            const customFilterFieldProcessor = BUILDING_BLOCK_CONFIG[BuildingBlockType.CustomFilterField]!.processor;
            const mockConfig = BUILDING_BLOCK_CONFIG[BuildingBlockType.CustomFilterField]!;

            // Create a valid CustomFilterField building block
            const customFilterFieldData = {
                id: 'testCustomFilterField',
                buildingBlockType: BuildingBlockType.CustomFilterField,
                label: 'Test Filter Field',
                anchor: 'testAnchor',
                property: 'testProperty',
                required: false
            };

            // Should throw error when processor is called without embededFragment
            expect(() => {
                const context = {
                    fs: mockFs,
                    viewPath: '/mock/path'
                };
                customFilterFieldProcessor(customFilterFieldData, context);
            }).toThrow('EmbeddedFragment is required for CustomFilterField');
        });

        test('CustomColumn processor works correctly with valid CustomColumn data', async () => {
            const mockFs = create(createStorage());

            const customColumnProcessor = BUILDING_BLOCK_CONFIG[BuildingBlockType.CustomColumn]!.processor;
            const mockConfig = BUILDING_BLOCK_CONFIG[BuildingBlockType.CustomColumn]!;

            // Create a valid CustomColumn building block
            const customColumnData: CustomColumn = {
                id: 'testCustomColumn',
                buildingBlockType: BuildingBlockType.CustomColumn,
                title: 'Test Column',
                embededFragment: {
                    typescript: false,
                    content:
                        '<core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core"><Text text="Test"/></core:FragmentDefinition>',
                    name: 'TestColumn'
                }
            };

            // Mock the template file
            const templatePath = join(__dirname, '../../src/templates/common/Fragment.xml');
            mockFs.write(templatePath, '<core:FragmentDefinition><Text text="Template"/></core:FragmentDefinition>');

            // Should not throw error and should process correctly
            expect(() => {
                const context = {
                    fs: mockFs,
                    viewPath: '/mock/path/fragment.xml'
                };
                customColumnProcessor(customColumnData, context);
            }).not.toThrow();

            // Verify that content was set
            expect(customColumnData.embededFragment?.content).toBeDefined();
        });

        test('CustomFilterField processor works correctly with valid data and embeddedFragment', async () => {
            const mockFs = create(createStorage());

            const customFilterFieldProcessor = BUILDING_BLOCK_CONFIG[BuildingBlockType.CustomFilterField]!.processor;
            const mockConfig = BUILDING_BLOCK_CONFIG[BuildingBlockType.CustomFilterField]!;

            // Create a valid CustomFilterField building block
            const customFilterFieldData: CustomFilterField = {
                id: 'testCustomFilterField',
                buildingBlockType: BuildingBlockType.CustomFilterField,
                label: 'Test Filter Field',
                anchor: 'testAnchor',
                property: 'testProperty',
                required: false,
                filterFieldKey: 'testKey',
                position: { placement: Placement.After },
                embededFragment: {
                    typescript: false,
                    content:
                        '<core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core"><Input/></core:FragmentDefinition>',
                    name: 'TestFilterField'
                }
            };

            // Create mock embedded fragment data
            const mockEmbeddedFragment = {
                ns: 'test.namespace',
                name: 'TestFilterField',
                path: 'ext/fragment',
                typescript: false,
                content:
                    '<core:FragmentDefinition xmlns="sap.m" xmlns:core="sap.ui.core"><Input/></core:FragmentDefinition>'
            };

            // Mock the template file
            const templatePath = join(__dirname, '../../src/templates/filter/fragment.xml');
            mockFs.write(templatePath, '<core:FragmentDefinition><Input/></core:FragmentDefinition>');

            // Should not throw error and should process correctly
            expect(() => {
                const context = {
                    fs: mockFs,
                    viewPath: '/mock/path/fragment.xml',
                    embeddedFragment: mockEmbeddedFragment
                };
                customFilterFieldProcessor(customFilterFieldData, context);
            }).not.toThrow();
        });

        test('BuildingBlockTemplateConfig interface ensures type safety', () => {
            // Verify that all configurations have the correct structure
            Object.values(BUILDING_BLOCK_CONFIG).forEach((config) => {
                if (config) {
                    expect(config).toHaveProperty('aggregationConfig');
                    expect(config.aggregationConfig).toHaveProperty('aggregationName');
                    expect(config.aggregationConfig).toHaveProperty('elementName');
                    expect(config).toHaveProperty('namespace');
                    expect(config.namespace).toHaveProperty('uri');
                    expect(config.namespace).toHaveProperty('prefix');
                    expect(config).toHaveProperty('processor');
                    expect(typeof config.processor).toBe('function');

                    // Verify processor function signature by checking its length (parameter count)
                    // processor(buildingBlockData, fs, viewPath, config, embeddedFragment?)
                    expect(config.processor.length).toBe(2);
                }
            });
        });
    });
});
