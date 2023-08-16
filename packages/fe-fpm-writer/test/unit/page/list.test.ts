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

        test('minimal input', () => {
            const target = join(testDir, 'minimal-input');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            generate(target, minimalInput, fs);

            expect(fs.readJSON(join(target, 'webapp/manifest.json'))).toMatchSnapshot();
        });

        test('minimal input, plus minUi5Version and contextPath', () => {
            const target = join(testDir, 'minimal-input');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            const testApiData = JSON.parse(JSON.stringify(minimalInput));
            testApiData.minUI5Version = '1.110';
            testApiData.contextPath = '/my/navigation';
            //act
            generate(target, testApiData, fs);
            //check
            expect(fs.readJSON(join(target, 'webapp/manifest.json'))).toMatchSnapshot();
        });

        test('all optional settings used', () => {
            const target = join(testDir, 'all-settings');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            generate(
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
            test.each(tabSizingTestCases)('$name', ({ tabInfo, expectedAfterSave }) => {
                const target = join(testDir, 'tab-sizing');
                fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
                generate(target, { ...minimalInput, tabInfo }, fs);

                let updatedManifest = fs.read(join(target, 'webapp/manifest.json'));
                let result = detectTabSpacing(updatedManifest);
                expect(result).toEqual(expectedAfterSave);
                // Generate another page and check if new tab sizing recalculated correctly without passing tab size info
                generate(target, { entity: 'Second' }, fs);
                updatedManifest = fs.read(join(target, 'webapp/manifest.json'));
                result = detectTabSpacing(updatedManifest);
                expect(result).toEqual(expectedAfterSave);
            });
        });
    });
});
