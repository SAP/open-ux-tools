import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';
import { join } from 'path';
import { generateCustomPage, validateBasePath, CustomPage } from '../../src';
import { Ui5Route } from '../../src/page/types';

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
                    libs: {
                        'sap.fe.templates': {}
                    }
                },
                routing: {
                    routes: [] as Ui5Route[],
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

    test('validateBasePath', () => {
        const target = join(testDir, 'validateBasePath');
        fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
        expect(validateBasePath(target, fs)).toBeTruthy();

        expect(() => validateBasePath(join(testDir, '' + Date.now()))).toThrowError();
        expect(() => generateCustomPage(join(testDir, '' + Date.now()), {} as CustomPage)).toThrowError();

        const invalidManifest = JSON.parse(testAppManifest);
        delete invalidManifest['sap.ui5'].dependencies?.libs['sap.fe.templates'];
        fs.writeJSON(join(target, 'webapp/manifest.json'), invalidManifest);
        expect(() => validateBasePath(target, fs)).toThrowError();
    });

    describe('generateCustomPage: different versions', () => {
        const minimalInput = {
            name: 'CustomPage',
            entity: 'RootEnity'
        };
        test('latest version with minimal input', () => {
            const target = join(testDir, 'minimal-input');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            generateCustomPage(target, minimalInput, undefined, fs);

            expect(fs.readJSON(join(target, 'webapp/manifest.json'))).toMatchSnapshot();
            expect(fs.read(join(target, 'webapp/ext/customPage/CustomPage.view.xml'))).toMatchSnapshot();
            expect(fs.read(join(target, 'webapp/ext/customPage/CustomPage.controller.js'))).toMatchSnapshot();
        });

        test('with older but supported UI5 version', () => {
            const target = join(testDir, 'version-1.84');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            generateCustomPage(target, minimalInput, 1.84, fs);

            expect(fs.readJSON(join(target, 'webapp/manifest.json'))).toMatchSnapshot();
            expect(fs.read(join(target, 'webapp/ext/customPage/CustomPage.view.xml'))).toMatchSnapshot();
            expect(fs.read(join(target, 'webapp/ext/customPage/CustomPage.controller.js'))).toMatchSnapshot();
        });

        test('with not supported version', () => {
            const target = join(testDir, 'version-not-supported');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            expect(() => generateCustomPage(target, minimalInput, 1.83, fs)).toThrowError();
        });
    });

    describe('generateCustomPage: different navigations', () => {
        const inputWithNavigation = {
            name: 'CustomPage',
            entity: 'ChildEntity',
            navigation: {
                sourcePage: 'TestObjectPage',
                sourceEntity: 'RootEntity',
                navEntity: 'navToChildEntity'
            }
        };

        test('simple inbound navigation', () => {
            const target = join(testDir, 'with-nav');
            fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
            generateCustomPage(target, inputWithNavigation, undefined, fs);
            expect((fs.readJSON(join(target, 'webapp/manifest.json')) as any)!['sap.ui5'].routing).toMatchSnapshot();
        });

        test('inbound navigation defined as array (for FCL)', () => {
            const testManifestWithArray = JSON.parse(testAppManifest);
            testManifestWithArray['sap.ui5'].routing.routes.push({
                pattern: 'object/{key}',
                name: 'TestObjectPage',
                target: ['TestObjectPage']
            });
            const target = join(testDir, 'target-as-array');
            fs.writeJSON(join(target, 'webapp/manifest.json'), testManifestWithArray);
            generateCustomPage(target, inputWithNavigation, undefined, fs);
            expect((fs.readJSON(join(target, 'webapp/manifest.json')) as any)!['sap.ui5'].routing).toMatchSnapshot();
        });

        test('inbound navigation defined as array with max nesting for FCL', () => {
            const testManifestWithArray = JSON.parse(testAppManifest);
            testManifestWithArray['sap.ui5'].routing.routes.push({
                pattern: 'object/{key}',
                name: 'TestObjectPage',
                target: ['TestList', 'TestNestedList', 'TestObjectPage']
            });
            const target = join(testDir, 'target-as-nested-array');
            fs.writeJSON(join(target, 'webapp/manifest.json'), testManifestWithArray);
            generateCustomPage(target, inputWithNavigation, undefined, fs);
            expect((fs.readJSON(join(target, 'webapp/manifest.json')) as any)!['sap.ui5'].routing).toMatchSnapshot();
        });
    });
});
