import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import type { ManifestNamespace } from '@sap-ux/project-access';
import type { ObjectPage } from '../../../src/page';
import { generate } from '../../../src/page/object';
import { detectTabSpacing } from '../../../src/common/file';
import { tabSizingTestCases } from '../../common';
import { FCL_ROUTER } from '../../../src/common/defaults';

describe('ObjectPage', () => {
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
                    routes: [
                        {
                            pattern: ':?query:',
                            name: 'RootEntityListReport',
                            target: 'TestListReport'
                        },
                        {
                            pattern: 'RootEntity({RootEntityKey}):?query:',
                            name: 'RootEntityObjectPage',
                            target: 'RootEntityObjectPage'
                        }
                    ] as ManifestNamespace.Route[],
                    targets: {
                        RootEntityListReport: {},
                        RootEntityObjectPage: {}
                    }
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
        const minimalInput: ObjectPage = {
            entity: 'OtherEntity'
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

        test('all optional settings', async () => {
            const target = join(testDir, 'all-settings');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            await generate(
                target,
                {
                    ...minimalInput,
                    settings: {
                        enhanceI18n: true,
                        variantManagement: 'Page'
                    }
                },
                fs
            );

            expect(fs.readJSON(join(target, 'webapp/manifest.json'))).toMatchSnapshot();
        });

        test('simple inbound navigation', async () => {
            const target = join(testDir, 'with-nav');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            await generate(
                target,
                {
                    ...minimalInput,
                    navigation: {
                        sourcePage: 'RootEntityListReport',
                        navEntity: minimalInput.entity,
                        navKey: true
                    }
                },
                fs
            );
            expect((fs.readJSON(join(target, 'webapp/manifest.json')) as any)?.['sap.ui5'].routing).toMatchSnapshot();
        });

        test('simple inbound navigation, plus optional page id', async () => {
            const target = join(testDir, 'with-nav');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            const minInput = {
                ...minimalInput,
                id: 'DummyPage',
                navigation: {
                    sourcePage: 'RootEntityListReport',
                    navEntity: minimalInput.entity,
                    navKey: true
                }
            };
            await generate(target, minInput, fs);
            expect((fs.readJSON(join(target, 'webapp/manifest.json')) as any)?.['sap.ui5'].routing).toMatchSnapshot();
        });

        test('simple nested navigation', async () => {
            const target = join(testDir, 'with-nested-nav');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            await generate(
                target,
                {
                    ...minimalInput,
                    navigation: {
                        sourcePage: 'RootEntityObjectPage',
                        navEntity: `to_${minimalInput.entity}`,
                        navKey: true
                    }
                },
                fs
            );
            expect((fs.readJSON(join(target, 'webapp/manifest.json')) as any)?.['sap.ui5'].routing).toMatchSnapshot();
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

        test('Add when "sap.fe.ariba" dependency is listed', async () => {
            const testManifest = JSON.parse(testAppManifest);
            testManifest['sap.ui5'].dependencies.libs['sap.fe.ariba'] = {};
            const target = join(testDir, 'ariba');
            fs.write(join(target, 'webapp/manifest.json'), JSON.stringify(testManifest));
            //act
            await generate(target, minimalInput, fs);
            //check
            expect(fs.readJSON(join(target, 'webapp/manifest.json'))).toMatchSnapshot();
        });
    });

    describe('FCL is enabled', () => {
        const inputWithNavigation: ObjectPage = {
            entity: 'ChildEntity',
            navigation: {
                sourcePage: 'RootEntityObjectPage',
                navEntity: 'navToChildEntity',
                navKey: true
            }
        };
        test('Create 2nd level page', async () => {
            const testManifestWithArray = JSON.parse(testAppManifest);
            testManifestWithArray['sap.ui5'].routing.config = {
                routerClass: FCL_ROUTER
            };
            testManifestWithArray['sap.ui5'].routing.routes = [
                {
                    pattern: 'RootEntity({key}):?query:',
                    name: 'RootEntityObjectPage',
                    target: ['RootEntityObjectPage']
                }
            ];
            const target = join(testDir, 'target-as-array');
            fs.writeJSON(join(target, 'webapp/manifest.json'), testManifestWithArray);
            await generate(target, inputWithNavigation, fs);
            expect((fs.readJSON(join(target, 'webapp/manifest.json')) as any)?.['sap.ui5'].routing).toMatchSnapshot();
        });

        test('Create 3rd level page', async () => {
            const testManifestWithArray = JSON.parse(testAppManifest);
            testManifestWithArray['sap.ui5'].routing.config = {
                routerClass: FCL_ROUTER
            };
            testManifestWithArray['sap.ui5'].routing.routes = [
                {
                    pattern: ':?query:',
                    name: 'RootEntityListReport',
                    target: ['TestListReport']
                },
                {
                    pattern: 'RootEntity({RootEntityKey}):?query:',
                    name: 'RootEntityObjectPage',
                    target: ['TestListReport', 'RootEntityObjectPage']
                }
            ];
            const target = join(testDir, 'target-as-array');
            fs.writeJSON(join(target, 'webapp/manifest.json'), testManifestWithArray);
            await generate(target, inputWithNavigation, fs);
            expect((fs.readJSON(join(target, 'webapp/manifest.json')) as any)?.['sap.ui5'].routing).toMatchSnapshot();
        });
    });
});
