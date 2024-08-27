import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import type { ManifestNamespace } from '@sap-ux/project-access';
import type { CustomPage } from '../../../src';
import { generateCustomPage, validateBasePath } from '../../../src';
import { FCL_ROUTER } from '../../../src/common/defaults';
import { detectTabSpacing } from '../../../src/common/file';
import { tabSizingTestCases } from '../../common';
import { checkRequiredLibraries } from '../../../src/common/validate';

describe('CustomPage', () => {
    const testDir = '' + Date.now();
    let fs: Editor;

    const testAppManifest = JSON.stringify(
        {
            'sap.app': {
                id: 'my.test.App'
            },
            'sap.ui5': {
                dependencies: {
                    libs: {}
                },
                routing: {
                    routes: [
                        {
                            pattern: ':?query:',
                            name: 'TestObjectPage',
                            target: 'TestObjectPage'
                        }
                    ] as ManifestNamespace.Route[],
                    targets: {
                        TestObjectPage: {}
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

    test('validateBasePath - standard required lib `sap.fe.templates`', () => {
        const target = join(testDir, 'validateBasePathRequired');
        fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
        expect(() => validateBasePath(target, fs)).toThrowError('Dependency sap.fe.templates is missing');
    });

    test('validateBasePath', () => {
        const target = join(testDir, 'validateBasePath');
        fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
        expect(validateBasePath(target, fs, [])).toBeTruthy();

        expect(() => validateBasePath(join(testDir, '' + Date.now()), fs, [])).toThrowError();
        expect(() => generateCustomPage(join(testDir, '' + Date.now()), {} as CustomPage)).toThrowError();

        const invalidManifest = JSON.parse(testAppManifest);
        delete invalidManifest['sap.ui5'].dependencies?.libs['sap.fe.templates'];
        fs.writeJSON(join(target, 'webapp/manifest.json'), invalidManifest);
        expect(() => validateBasePath(target, fs, [])).not.toThrowError();
    });

    test('checkRequiredLibraries - required lib `sap.fe.templates` and `sap.fe.core` missing', () => {
        const target = join(testDir, 'validateBasePathRequired');
        fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
        expect(() => checkRequiredLibraries(target, fs)).toThrowError(
            'Both dependencies "sap.fe.core" and "sap.fe.templates" are missing in the manifest.json. Fiori elements FPM requires the SAP FE libraries.'
        );
    });

    test('checkRequiredLibraries - one library is present', () => {
        const target = join(testDir, 'checkRequiredLibraries');
        let manifestWithOneLib = {
            ...JSON.parse(testAppManifest),
            ['sap.ui5']: { dependencies: { libs: { ['sap.fe.templates']: {} } } }
        };

        fs.writeJSON(join(target, 'webapp/manifest.json'), manifestWithOneLib);
        expect(() => checkRequiredLibraries(target, fs)).not.toThrowError();

        delete manifestWithOneLib['sap.ui5'].dependencies?.libs['sap.fe.templates'];
        manifestWithOneLib = {
            ...JSON.parse(testAppManifest),
            ['sap.ui5']: { dependencies: { libs: { ['sap.fe.core']: {} } } }
        };
        fs.writeJSON(join(target, 'webapp/manifest.json'), manifestWithOneLib);
        expect(() => checkRequiredLibraries(target, fs)).not.toThrowError();
    });

    test('checkRequiredLibraries - both libraries are present', () => {
        const target = join(testDir, 'checkRequiredLibraries');
        let manifestWithOneLib = {
            ...JSON.parse(testAppManifest),
            ['sap.ui5']: { dependencies: { libs: { ['sap.fe.templates']: {}, ['sap.fe.core']: {} } } }
        };

        fs.writeJSON(join(target, 'webapp/manifest.json'), manifestWithOneLib);
        expect(() => checkRequiredLibraries(target, fs)).not.toThrowError();
    });

    describe('generateCustomPage: different versions or target folder', () => {
        const minimalInput: CustomPage = {
            name: 'CustomPage',
            entity: 'RootEntity'
        };

        test('latest version with minimal input', () => {
            const target = join(testDir, 'minimal-input');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            //act
            generateCustomPage(target, minimalInput, fs);
            //check
            expect(fs.readJSON(join(target, 'webapp/manifest.json'))).toMatchSnapshot();
            expect(fs.read(join(target, 'webapp/ext/customPage/CustomPage.view.xml'))).toMatchSnapshot();
            expect(fs.read(join(target, 'webapp/ext/customPage/CustomPage.controller.js'))).toMatchSnapshot();
        });

        test('latest version with minimal input, plus optional page id', () => {
            const target = join(testDir, 'minimal-input');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            const minInput = {
                ...minimalInput,
                id: 'DummyPage'
            };
            const testApiData = JSON.parse(JSON.stringify(minInput));
            //act
            generateCustomPage(target, testApiData, fs);
            //check
            expect(fs.readJSON(join(target, 'webapp/manifest.json'))).toMatchSnapshot();
        });

        test('latest version with entitySet and lower UI5 version', () => {
            const target = join(testDir, 'ui5_1_71');
            const localManifest = JSON.parse(testAppManifest);
            localManifest['sap.ui5'].dependencies.minUI5Version = '1.84.62';
            fs.write(join(target, 'webapp/manifest.json'), JSON.stringify(localManifest));
            const testInput = JSON.parse(JSON.stringify(minimalInput));
            testInput.minUI5Version = '1.84.62';
            //act
            generateCustomPage(target, testInput, fs);
            //check
            expect(fs.readJSON(join(target, 'webapp/manifest.json'))).toMatchSnapshot();
            expect(fs.read(join(target, 'webapp/ext/customPage/CustomPage.view.xml'))).toMatchSnapshot();
            expect(fs.read(join(target, 'webapp/ext/customPage/CustomPage.controller.js'))).toMatchSnapshot();
        });

        test('latest version with contextPath', () => {
            const localInput = JSON.parse(JSON.stringify(minimalInput));
            localInput.contextPath = 'my/path';
            localInput.minUI5Version = '1.102';
            const target = join(testDir, 'minimal-input');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            generateCustomPage(target, localInput, fs);

            expect(fs.readJSON(join(target, 'webapp/manifest.json'))).toMatchSnapshot();
            expect(fs.read(join(target, 'webapp/ext/customPage/CustomPage.view.xml'))).toMatchSnapshot();
            expect(fs.read(join(target, 'webapp/ext/customPage/CustomPage.controller.js'))).toMatchSnapshot();
        });

        test('with older but supported UI5 version', () => {
            const target = join(testDir, 'version-1.84');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            generateCustomPage(target, { ...minimalInput, minUI5Version: '1.84' }, fs);

            expect(fs.readJSON(join(target, 'webapp/manifest.json'))).toMatchSnapshot();
            expect(fs.read(join(target, 'webapp/ext/customPage/CustomPage.view.xml'))).toMatchSnapshot();
            expect(fs.read(join(target, 'webapp/ext/customPage/CustomPage.controller.js'))).toMatchSnapshot();
        });

        test('with older but supported UI5 version, plus optional page id', () => {
            const target = join(testDir, 'version-1.84');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            const minInput = {
                ...minimalInput,
                id: 'DummyPage',
                minUI5Version: '1.84'
            };
            const testApiData = JSON.parse(JSON.stringify(minInput));
            generateCustomPage(target, testApiData, fs);
            expect(fs.readJSON(join(target, 'webapp/manifest.json'))).toMatchSnapshot();
        });

        test('with not supported version', () => {
            const target = join(testDir, 'version-not-supported');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            expect(() => generateCustomPage(target, { ...minimalInput, minUI5Version: '1.83' }, fs)).toThrowError();
        });

        test('latest version with minimal input but different target folder', () => {
            const target = join(testDir, 'different-folder');
            const folder = 'ext/different';
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            generateCustomPage(target, { ...minimalInput, folder }, fs);

            expect(fs.readJSON(join(target, 'webapp/manifest.json'))).toMatchSnapshot();
            expect(fs.read(join(target, `webapp/${folder}/CustomPage.view.xml`))).toMatchSnapshot();
            expect(fs.read(join(target, `webapp/${folder}/CustomPage.controller.js`))).toMatchSnapshot();
        });
        test('with existing target files', () => {
            const target = join(testDir, 'different-folder');
            const folder = 'ext/different';
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            const viewPath = join(target, `webapp/${folder}/CustomPage.view.xml`);
            fs.write(viewPath, 'viewContent');
            const controllerPath = join(target, `webapp/${folder}/CustomPage.controller.js`);
            fs.write(controllerPath, 'controllerContent');
            const i18nPropertiesPath = join(target, 'webapp/i18n/i18n.properties');
            fs.write(i18nPropertiesPath, '');
            //sut
            generateCustomPage(target, { ...minimalInput, folder }, fs);
            expect(fs.readJSON(join(target, 'webapp/manifest.json'))).toMatchSnapshot();
            expect(fs.exists(controllerPath)).toBe(true);
            expect(fs.read(controllerPath)).toEqual('controllerContent');
            expect(fs.exists(viewPath)).toBe(true);
            expect(fs.read(viewPath)).toEqual('viewContent');
            expect(fs.read(i18nPropertiesPath)).toEqual('');
        });
    });

    describe('generateCustomPage: different navigations', () => {
        const inputWithNavigation: CustomPage = {
            name: 'CustomPage',
            entity: 'ChildEntity',
            navigation: {
                sourcePage: 'TestObjectPage',
                navEntity: 'navToChildEntity',
                navKey: true
            }
        };

        test('simple inbound navigation', () => {
            const target = join(testDir, 'with-nav');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            generateCustomPage(target, inputWithNavigation, fs);
            expect((fs.readJSON(join(target, 'webapp/manifest.json')) as any)?.['sap.ui5'].routing).toMatchSnapshot();
        });

        test('simple inbound navigation, plus optional page id', () => {
            const target = join(testDir, 'with-nav');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            const minInput = {
                ...inputWithNavigation,
                id: 'DummyPage'
            };
            generateCustomPage(target, minInput, fs);
            expect((fs.readJSON(join(target, 'webapp/manifest.json')) as any)?.['sap.ui5'].routing).toMatchSnapshot();
        });

        test('inbound navigation defined as array (for FCL)', () => {
            const testManifestWithArray = JSON.parse(testAppManifest);
            testManifestWithArray['sap.ui5'].routing.config = {
                routerClass: FCL_ROUTER
            };
            testManifestWithArray['sap.ui5'].routing.routes = [
                {
                    pattern: 'RootEntity({key}):?query:',
                    name: 'TestObjectPage',
                    target: ['TestObjectPage']
                }
            ];
            const target = join(testDir, 'target-as-array');
            fs.writeJSON(join(target, 'webapp/manifest.json'), testManifestWithArray);
            generateCustomPage(target, inputWithNavigation, fs);
            expect((fs.readJSON(join(target, 'webapp/manifest.json')) as any)?.['sap.ui5'].routing).toMatchSnapshot();
        });

        test('inbound navigation defined as array with max nesting for FCL', () => {
            const testManifestWithArray = JSON.parse(testAppManifest);
            testManifestWithArray['sap.ui5'].routing.config = {
                routerClass: FCL_ROUTER
            };
            testManifestWithArray['sap.ui5'].routing.routes = [
                {
                    pattern: 'RootEntity({key})/NestedEntiry({nestedKey}):?query:',
                    name: 'TestObjectPage',
                    target: ['TestList', 'TestNestedList', 'TestObjectPage']
                }
            ];
            const target = join(testDir, 'target-as-nested-array');
            fs.writeJSON(join(target, 'webapp/manifest.json'), testManifestWithArray);
            generateCustomPage(target, inputWithNavigation, fs);
            expect((fs.readJSON(join(target, 'webapp/manifest.json')) as any)?.['sap.ui5'].routing).toMatchSnapshot();
        });
    });

    describe('generateCustomPage: only page, no others', () => {
        const input: CustomPage = {
            name: 'CustomPage',
            entity: 'MainEntity'
        };
        const testManifestWithNoRouting = JSON.parse(testAppManifest);
        delete testManifestWithNoRouting['sap.ui5'].routing;

        test('FCL enabled single page app', () => {
            testManifestWithNoRouting['sap.ui5'].routing = {
                config: {
                    routerClass: 'sap.f.routing.Router'
                }
            };
            const target = join(testDir, 'single-page-fcl');
            fs.writeJSON(join(target, 'webapp/manifest.json'), testManifestWithNoRouting);
            generateCustomPage(target, { ...input }, fs);
            expect((fs.readJSON(join(target, 'webapp/manifest.json')) as any)?.['sap.ui5'].routing).toMatchSnapshot();
        });

        test('No FCL single page app', () => {
            delete testManifestWithNoRouting['sap.ui5'].routing;
            const target = join(testDir, 'single-page-no-fcl');
            fs.writeJSON(join(target, 'webapp/manifest.json'), testManifestWithNoRouting);
            generateCustomPage(target, input, fs);
            expect((fs.readJSON(join(target, 'webapp/manifest.json')) as any)?.['sap.ui5'].routing).toMatchSnapshot();
        });
    });

    describe('Test property custom "tabSizing"', () => {
        test.each(tabSizingTestCases)('$name', ({ tabInfo, expectedAfterSave }) => {
            const target = join(testDir, 'tab-sizing');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            generateCustomPage(
                target,
                {
                    name: 'CustomPage',
                    entity: 'RootEntity',
                    tabInfo
                },
                fs
            );

            let updatedManifest = fs.read(join(target, 'webapp/manifest.json'));
            let result = detectTabSpacing(updatedManifest);
            expect(result).toEqual(expectedAfterSave);

            const updatedI18nProperties = fs.read(join(target, 'webapp/i18n/i18n.properties'));
            expect(updatedI18nProperties).toMatchSnapshot();

            // Generate another page and check if new tab sizing recalculated correctly without passing tab size info
            generateCustomPage(
                target,
                {
                    name: 'Second',
                    entity: 'RootEntity'
                },
                fs
            );
            updatedManifest = fs.read(join(target, 'webapp/manifest.json'));
            result = detectTabSpacing(updatedManifest);
            expect(result).toEqual(expectedAfterSave);
        });
    });

    describe('Typescript controller', () => {
        const minimalInput: CustomPage = {
            name: 'CustomPage',
            entity: 'RootEntity',
            typescript: true
        };
        test('latest version with minimal input', () => {
            const target = join(testDir, 'minimal-input');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            //act
            generateCustomPage(target, minimalInput, fs);
            //check
            expect(fs.read(join(target, 'webapp/ext/customPage/CustomPage.controller.ts'))).toMatchSnapshot();
        });

        test('lower UI5 version(1.84)', () => {
            const target = join(testDir, 'minimal-input');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            const testInput = { ...minimalInput, minUI5Version: '1.84.62' };
            //act
            generateCustomPage(target, testInput, fs);
            //check
            expect(fs.read(join(target, 'webapp/ext/customPage/CustomPage.controller.ts'))).toMatchSnapshot();
        });
    });

    test('Add library dependency `sap.fe.core`', () => {
        const expandedManifest = JSON.parse(testAppManifest);
        expandedManifest['sap.ui5'].dependencies.libs = { 'existing.library': {} };

        const minimalInput: CustomPage = {
            name: 'CustomPage',
            entity: 'RootEntity'
        };
        const target = join(testDir, 'libraryDependency');
        fs.write(join(target, 'webapp/manifest.json'), JSON.stringify(expandedManifest));
        //act
        generateCustomPage(target, minimalInput, fs);
        //check
        expect((fs.readJSON(join(target, 'webapp/manifest.json')) as any)?.['sap.ui5'].dependencies).toMatchSnapshot();
    });
});
