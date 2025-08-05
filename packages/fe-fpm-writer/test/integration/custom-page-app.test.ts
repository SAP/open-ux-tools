import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Chart, FilterBar, Table } from '../../src';
import { generateBuildingBlock, BuildingBlockType } from '../../src';
import { clearTestOutput, writeFilesForDebugging } from '../common';

describe('Test FPM features using a pre-generated Fiori Custom Page app', () => {
    const testInput = join(__dirname, '../test-input/integration/custom-page-app');
    const testOutput = join(__dirname, '../test-output/integration/custom-page-app');
    const fs = create(createStorage());

    beforeAll(() => {
        clearTestOutput(testOutput);
    });

    afterAll(() => {
        return writeFilesForDebugging(fs);
    });

    describe('generate building blocks', async () => {
        const basicConfig = {
            path: join(testOutput, 'js')
        };
        const tsConfig = {
            path: join(testOutput, 'ts')
        };
        const configs: { path: string }[] = [basicConfig, tsConfig];

        beforeAll(() => {
            fs.copy(join(testInput, 'js'), basicConfig.path, { globOptions: { dot: true } });
            fs.copy(join(testInput, 'ts'), tsConfig.path, { globOptions: { dot: true } });
        });

        test.each(configs)('generateBuildingBlock:FilterBar in custom page', async (config) => {
            await generateBuildingBlock<FilterBar>(
                config.path,
                {
                    viewOrFragmentPath: join('webapp/ext/main/Main.view.xml'),
                    aggregationPath: `/mvc:View/*[local-name()='Page']/*[local-name()='content']`,
                    buildingBlockData: {
                        id: 'testFilterBar',
                        buildingBlockType: BuildingBlockType.FilterBar,
                        metaPath: '@com.sap.vocabularies.UI.v1.SelectionFields'
                    }
                },
                fs
            );
        });

        test.each(configs)('generateBuildingBlock:Chart in custom page', async (config) => {
            await generateBuildingBlock<Chart>(
                config.path,
                {
                    viewOrFragmentPath: join('webapp/ext/main/Main.view.xml'),
                    aggregationPath: `/mvc:View/*[local-name()='Page']/*[local-name()='content']`,
                    buildingBlockData: {
                        id: 'testChart',
                        buildingBlockType: BuildingBlockType.Chart,
                        metaPath: '@com.sap.vocabularies.UI.v1.Chart#testChart',
                        filterBar: 'testFilterBar',
                        personalization: 'Type,Item,Sort',
                        selectionMode: 'Single'
                    }
                },
                fs
            );
        });

        test.each(configs)('generateBuildingBlock:Table in custom page', async (config) => {
            await generateBuildingBlock<Table>(
                config.path,
                {
                    viewOrFragmentPath: join('webapp/ext/main/Main.view.xml'),
                    aggregationPath: `/mvc:View/*[local-name()='Page']/*[local-name()='content']`,
                    buildingBlockData: {
                        id: 'testTable',
                        buildingBlockType: BuildingBlockType.Table,
                        metaPath: '@com.sap.vocabularies.UI.v1.LineItem',
                        busy: false,
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
                    }
                },
                fs
            );
        });

        afterAll(() => {
            expect(
                fs.dump(
                    testOutput,
                    '**/test-output/integration/custom-page-app/**/webapp/{manifest.json,Component.ts,ext/**/*}'
                )
            ).toMatchSnapshot();
        });
    });
});
