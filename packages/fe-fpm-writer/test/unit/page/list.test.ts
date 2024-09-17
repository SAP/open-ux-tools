import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import type { ListReport } from '../../../src/page';
import { generate } from '../../../src/page/list';
import { detectTabSpacing } from '../../../src/common/file';
import { tabSizingTestCases } from '../../common';

describe('ListReport', () => {
    const testDir = '' + Date.now();
    let fs: Editor;

    const testAppManifest = JSON.stringify(
        {
            'sap.app': {
                id: 'my.test.App'
            },
            'sap.ui5': {
                dependencies: {
                    libs: {
                        'sap.fe.templates': {}
                    }
                },
                routing: {
                    routes: [],
                    targets: {}
                }
            }
        },
        null,
        2
    );

    beforeEach(() => {
        fs = create(createStorage());
        fs.delete(testDir);
    });

    describe('generate', () => {
        const minimalInput: ListReport = {
            entity: 'RootEntity'
        };

        test('minimal input', async () => {
            const target = join(testDir, 'minimal-input');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            await generate(target, minimalInput, fs);

            expect(fs.readJSON(join(target, 'webapp/manifest.json'))).toMatchSnapshot();
        });

        test('minimal input, plus minUi5Version and contextPath', async () => {
            const target = join(testDir, 'minimal-input');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            const testApiData = JSON.parse(JSON.stringify(minimalInput));
            testApiData.minUI5Version = '1.110';
            testApiData.contextPath = '/my/navigation';
            //act
            await generate(target, testApiData, fs);
            //check
            expect(fs.readJSON(join(target, 'webapp/manifest.json'))).toMatchSnapshot();
        });

        test('minimal input, plus optional page id', async () => {
            const target = join(testDir, 'minimal-input');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            const minInput = {
                ...minimalInput,
                id: 'DummyPage'
            };
            const testApiData = JSON.parse(JSON.stringify(minInput));
            //act
            await generate(target, testApiData, fs);
            //check
            expect(fs.readJSON(join(target, 'webapp/manifest.json'))).toMatchSnapshot();
        });

        test('all optional settings used', async () => {
            const target = join(testDir, 'all-settings');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            await generate(
                target,
                {
                    ...minimalInput,
                    settings: {
                        enhanceI18n: true,
                        tableSettings: {
                            condensedTableLayout: true,
                            selectionMode: 'None',
                            type: 'GridTable'
                        },
                        variantManagement: 'Page'
                    }
                },
                fs
            );

            expect(fs.readJSON(join(target, 'webapp/manifest.json'))).toMatchSnapshot();
        });

        describe('Test property custom "tabSizing"', () => {
            test.each(tabSizingTestCases)('$name', async ({ tabInfo, expectedAfterSave }) => {
                const target = join(testDir, 'tab-sizing');
                fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
                await generate(target, { ...minimalInput, tabInfo }, fs);

                let updatedManifest = fs.read(join(target, 'webapp/manifest.json'));
                let result = detectTabSpacing(updatedManifest);
                expect(result).toEqual(expectedAfterSave);
                // Generate another page and check if new tab sizing recalculated correctly without passing tab size info
                await generate(target, { entity: 'Second' }, fs);
                updatedManifest = fs.read(join(target, 'webapp/manifest.json'));
                result = detectTabSpacing(updatedManifest);
                expect(result).toEqual(expectedAfterSave);
            });
        });

        test('Add library dependency `sap.fe.templates` ', async () => {
            const testManifest = JSON.parse(testAppManifest);
            delete testManifest['sap.ui5'].dependencies;
            const target = join(testDir, 'libraryDependency');
            fs.write(join(target, 'webapp/manifest.json'), JSON.stringify(testManifest));
            //act
            await generate(target, minimalInput, fs);
            //check
            expect(
                (fs.readJSON(join(target, 'webapp/manifest.json')) as any)?.['sap.ui5'].dependencies
            ).toMatchSnapshot();
        });
    });
});
