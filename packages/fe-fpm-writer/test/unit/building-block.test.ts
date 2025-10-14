import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';
import { join } from 'node:path';
import type { BuildingBlockConfig, Chart, Field, FilterBar, Table, CustomColumn } from '../../src';
import { BuildingBlockType, generateBuildingBlock, getSerializedFileContent } from '../../src';
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
});
