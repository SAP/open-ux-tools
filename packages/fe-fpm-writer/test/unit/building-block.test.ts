import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';
import { join } from 'path';
import { BuildingBlockType, Chart, Field, FieldFormatOptions, FilterBar, generateBuildingBlock } from '../../src';
import * as testManifestContent from './sample/building-block/webapp/manifest.json';
import { promises as fsPromises } from 'fs';
import { promisify } from 'util';

describe('Building Blocks', () => {
    let fs: Editor;
    let testAppPath: string;
    let testXmlViewContent: string;
    const manifestFilePath = 'webapp/manifest.json';
    const xmlViewFilePath = 'webapp/ext/main/Main.view.xml';

    beforeEach(async () => {
        fs = create(createStorage());
        testAppPath = join('test/unit/test-output/building-block', `${Date.now()}`);
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

    async function writeFilesForDebugging(fs: Editor) {
        const debug = !!process.env['UX_DEBUG'];
        // Write the files to the `test-output` folder for debugging
        const fsCommit = promisify(fs.commit);
        await fsCommit.call(fs);
    }

    test('validate base and view paths', async () => {
        const basePath = join(testAppPath, 'validate-paths');
        fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));

        // Test generator with an invalid base path
        expect(() =>
            generateBuildingBlock<FilterBar>(
                'invalidBasePath',
                'testViewPath',
                'testAggregation',
                {
                    id: 'testFilterBar',
                    buildingBlockType: BuildingBlockType.FilterBar
                },
                fs
            )
        ).toThrowError(/Invalid project folder/);

        // Test generator with an invalid view path
        fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
        expect(() =>
            generateBuildingBlock<FilterBar>(
                basePath,
                'invalidXmlViewFilePath',
                'testAggregation',
                {
                    id: 'testFilterBar',
                    buildingBlockType: BuildingBlockType.FilterBar
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
                'testViewPath',
                'testAggregation',
                {
                    id: 'testFilterBar',
                    buildingBlockType: BuildingBlockType.FilterBar
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
                xmlViewFilePath,
                aggregationPath,
                {
                    id: 'testFilterBar',
                    buildingBlockType: BuildingBlockType.FilterBar
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
                'invalidXmlViewFilePath',
                'testAggregationPath',
                {
                    id: 'testFilterBar',
                    buildingBlockType: BuildingBlockType.FilterBar
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
                xmlViewFilePath,
                aggregationPath,
                {
                    id: 'testFilterBar',
                    buildingBlockType: BuildingBlockType.FilterBar
                },
                fs
            )
        ).toThrowError(/Unable to parse xml view file/);
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
            }
        ];

        test.each(testInput)('generate $buildingBlockData.buildingBlockType building block', async (testData) => {
            const basePath = join(testAppPath, `generate-${testData.buildingBlockData.buildingBlockType}-with-id`);
            const aggregationPath = `/mvc:View/*[local-name()='Page']/*[local-name()='content']`;
            fs.write(join(basePath, manifestFilePath), JSON.stringify(testManifestContent));
            fs.write(join(basePath, xmlViewFilePath), testXmlViewContent);

            // Test generator with valid manifest.json, view.xml files and build block data with just id
            fs = generateBuildingBlock(basePath, xmlViewFilePath, aggregationPath, testData.buildingBlockData, fs);
            expect((fs as any).dump(testAppPath)).toMatchSnapshot(
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
            fs = generateBuildingBlock(basePath, xmlViewFilePath, aggregationPath, testData.buildingBlockData, fs);
            expect((fs as any).dump(testAppPath)).toMatchSnapshot(
                `generate-${testData.buildingBlockData.buildingBlockType}-with-optional-params`
            );
            await writeFilesForDebugging(fs);
        });
    });
});
