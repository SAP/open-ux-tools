import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { join } from 'node:path';
import type { ManifestNamespace } from '@sap-ux/project-access';
import type { ObjectPage } from '../../../src/page/index.js';
import { generate } from '../../../src/page/object.js';
import { detectTabSpacing } from '../../../src/common/file.js';
import { tabSizingTestCases } from '../../common/index.js';
import { FCL_ROUTER } from '../../../src/common/defaults.js';

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

        test('removes existing detail.outbound for navEntity when adding inbound navigation', async () => {
            const manifestWithOutbound = JSON.parse(testAppManifest);
            manifestWithOutbound['sap.ui5'].routing.targets.RootEntityListReport = {
                options: {
                    settings: {
                        navigation: {
                            [minimalInput.entity]: { detail: { outbound: 'ExistingOutboundKey' } },
                            UnrelatedEntity: { detail: { outbound: 'UnrelatedOutboundKey' } }
                        }
                    }
                }
            };
            const target = join(testDir, 'replace-outbound-with-route');
            fs.write(join(target, 'webapp/manifest.json'), JSON.stringify(manifestWithOutbound, null, 2));

            await generate(
                target,
                {
                    ...minimalInput,
                    navigation: { sourcePage: 'RootEntityListReport', navEntity: minimalInput.entity, navKey: true }
                },
                fs
            );

            const manifest = fs.readJSON(join(target, 'webapp/manifest.json')) as any;
            const entityNav = manifest['sap.ui5'].routing.targets.RootEntityListReport.options.settings.navigation;
            // outbound for the target navEntity must be gone, replaced by route
            expect(entityNav[minimalInput.entity].detail.outbound).toBeUndefined();
            expect(entityNav[minimalInput.entity].detail.route).toBeDefined();
            // unrelated entity's outbound must be preserved
            expect(entityNav.UnrelatedEntity.detail.outbound).toBe('UnrelatedOutboundKey');
        });

        test('does not write manifest for outbound removal when no existing detail.outbound for navEntity', async () => {
            const target = join(testDir, 'no-outbound-to-remove');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);

            const writeJSONSpy = jest.spyOn(fs, 'writeJSON');

            await generate(
                target,
                {
                    ...minimalInput,
                    navigation: { sourcePage: 'RootEntityListReport', navEntity: minimalInput.entity, navKey: true }
                },
                fs
            );

            // No extra writeJSON calls before extendJSON adds routing - only the extendJSON write happens
            const preExtendWrites = writeJSONSpy.mock.calls.filter(
                ([, content]) => !(content as any)?.['sap.ui5']?.routing?.routes?.length
            );
            expect(preExtendWrites).toHaveLength(0);
            writeJSONSpy.mockRestore();
        });

        test('does not touch manifest when navigation is not provided', async () => {
            const target = join(testDir, 'no-nav');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);

            const writeJSONSpy = jest.spyOn(fs, 'writeJSON');

            await generate(target, minimalInput, fs);

            // Without navigation, no extra write call for outbound removal
            expect(writeJSONSpy).toHaveBeenCalledTimes(1); // only extendJSON's write
            writeJSONSpy.mockRestore();
        });

        describe('navigation with defaultSection', () => {
            test.each([
                { type: 'FacetSection', id: 'GeneralInformation' },
                { type: 'FacetSubSection', id: 'TechnicalData' },
                { type: 'CustomSection', id: 'MyCustomSection' },
                { type: 'CustomSubSection', id: 'MyCustomSubSection' }
            ] as const)('$type type', async ({ type, id }) => {
                const target = join(testDir, `with-default-section-${type}`);
                fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
                await generate(
                    target,
                    {
                        ...minimalInput,
                        navigation: {
                            sourcePage: 'RootEntityListReport',
                            navEntity: minimalInput.entity,
                            navKey: true,
                            defaultSection: { type, id }
                        }
                    },
                    fs
                );
                expect(
                    (fs.readJSON(join(target, 'webapp/manifest.json')) as any)?.['sap.ui5'].routing
                ).toMatchSnapshot();
            });

            test('FacetSection type, plus optional page id', async () => {
                const target = join(testDir, 'with-default-section-page-id');
                fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
                await generate(
                    target,
                    {
                        ...minimalInput,
                        id: 'DummyPage',
                        navigation: {
                            sourcePage: 'RootEntityListReport',
                            navEntity: minimalInput.entity,
                            navKey: true,
                            defaultSection: {
                                type: 'FacetSection',
                                id: 'GeneralInformation'
                            }
                        }
                    },
                    fs
                );
                expect(
                    (fs.readJSON(join(target, 'webapp/manifest.json')) as any)?.['sap.ui5'].routing
                ).toMatchSnapshot();
            });

            test('defaultSection ID with special characters is escaped correctly', async () => {
                const specialId = 'My"Section\\With\\Backslash';
                const target = join(testDir, 'with-default-section-special-id');
                fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
                await generate(
                    target,
                    {
                        ...minimalInput,
                        navigation: {
                            sourcePage: 'RootEntityListReport',
                            navEntity: minimalInput.entity,
                            navKey: true,
                            defaultSection: { type: 'FacetSection', id: specialId }
                        }
                    },
                    fs
                );
                expect(
                    (fs.readJSON(join(target, 'webapp/manifest.json')) as any)?.['sap.ui5'].routing.targets
                        .RootEntityListReport.options.settings.navigation[minimalInput.entity].detail.targetControlId
                ).toBe(`fe::FacetSection::${specialId}`);
            });

            test('FacetSection type, nested navigation from object page', async () => {
                const target = join(testDir, 'with-default-section-nested');
                fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
                await generate(
                    target,
                    {
                        ...minimalInput,
                        navigation: {
                            sourcePage: 'RootEntityObjectPage',
                            navEntity: `to_${minimalInput.entity}`,
                            navKey: true,
                            defaultSection: {
                                type: 'FacetSection',
                                id: 'GeneralInformation'
                            }
                        }
                    },
                    fs
                );
                expect(
                    (fs.readJSON(join(target, 'webapp/manifest.json')) as any)?.['sap.ui5'].routing
                ).toMatchSnapshot();
            });
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

        describe('reuseExisting', () => {
            const reuseNav = {
                sourcePage: 'RootEntityListReport',
                navEntity: minimalInput.entity,
                navKey: true as const
            };

            test('throws when id is not provided', async () => {
                const target = join(testDir, 'reuse-no-id');
                fs.write(join(target, 'webapp/manifest.json'), testAppManifest);

                await expect(
                    generate(target, { entity: minimalInput.entity, reuseExisting: true }, fs)
                ).rejects.toThrow('Invalid data. Navigation target page name is missing!');
            });

            test('throws when id is not found in manifest targets', async () => {
                const target = join(testDir, 'reuse-missing-page');
                fs.write(join(target, 'webapp/manifest.json'), testAppManifest);

                await expect(
                    generate(target, { entity: minimalInput.entity, id: 'NonExistentPage', reuseExisting: true }, fs)
                ).rejects.toThrow('Could not find existing target page NonExistentPage!');
            });

            test('throws when sourcePage is not found in manifest targets', async () => {
                const manifestWithOrphan = JSON.parse(testAppManifest);
                delete manifestWithOrphan['sap.ui5'].routing.targets.RootEntityListReport;
                const target = join(testDir, 'reuse-missing-source');
                fs.write(join(target, 'webapp/manifest.json'), JSON.stringify(manifestWithOrphan, null, 2));

                await expect(
                    generate(
                        target,
                        {
                            entity: minimalInput.entity,
                            id: 'RootEntityObjectPage',
                            navigation: { sourcePage: 'RootEntityListReport' },
                            reuseExisting: true
                        },
                        fs
                    )
                ).rejects.toThrow('Could not find navigation source RootEntityListReport!');
            });

            test('removes existing navigation entry for the entity and proceeds', async () => {
                const manifestWithNav = JSON.parse(testAppManifest);
                manifestWithNav['sap.ui5'].routing.targets.RootEntityListReport = {
                    options: {
                        settings: {
                            navigation: {
                                [minimalInput.entity]: { detail: { route: 'OldRoute' } }
                            }
                        }
                    }
                };
                const target = join(testDir, 'reuse-removes-nav');
                fs.write(join(target, 'webapp/manifest.json'), JSON.stringify(manifestWithNav, null, 2));

                await generate(
                    target,
                    { ...minimalInput, id: 'RootEntityObjectPage', navigation: reuseNav, reuseExisting: true },
                    fs
                );

                const manifest = fs.readJSON(join(target, 'webapp/manifest.json')) as any;
                const navigation = manifest['sap.ui5'].routing.targets.RootEntityListReport.options.settings.navigation;
                // old route entry removed; extendPageJSON re-adds via template with the new route (named after data.id)
                expect(navigation[minimalInput.entity].detail.route).toBe('RootEntityObjectPage');
            });

            test('proceeds without extra write when no navigation entry exists for the entity', async () => {
                const target = join(testDir, 'reuse-no-nav-entry');
                fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
                const writeJSONSpy = jest.spyOn(fs, 'writeJSON');

                await generate(
                    target,
                    { ...minimalInput, id: 'RootEntityObjectPage', navigation: reuseNav, reuseExisting: true },
                    fs
                );

                // Only the extendJSON write, no extra write from the reuseExisting deletion guard
                const reuseGuardWrites = writeJSONSpy.mock.calls.filter(
                    ([, content]) => !(content as any)?.['sap.ui5']?.routing?.routes?.length
                );
                expect(reuseGuardWrites).toHaveLength(0);
                writeJSONSpy.mockRestore();
            });

            test('returns the mem-fs editor instance', async () => {
                const target = join(testDir, 'reuse-return');
                fs.write(join(target, 'webapp/manifest.json'), testAppManifest);

                const result = await generate(
                    target,
                    { ...minimalInput, id: 'RootEntityObjectPage', navigation: reuseNav, reuseExisting: true },
                    fs
                );

                expect(result).toBe(fs);
            });
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
