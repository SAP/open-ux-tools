import { create as createStorage } from 'mem-fs';
import { dirname } from 'path';
import { create, Editor } from 'mem-fs-editor';
import { join } from 'path';
import { generateCustomPage, validateBasePath, CustomPage } from '../../src';
import { Ui5Route } from '../../src/types';

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
                    routes: [] as Ui5Route[]
                },
                targets: {
                    TestObjectPage: {}
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

    test('generateCustomPage: with minimal input', () => {
        const target = join(testDir, 'minimal-input');
        fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
        generateCustomPage(
            target,
            {
                name: 'CustomPage',
                entity: 'RootEnity'
            },
            fs
        );

        expect(fs.readJSON(join(target, 'webapp/manifest.json'))).toMatchSnapshot();
        expect(fs.read(join(target, 'webapp/ext/customPage/CustomPage.view.xml'))).toMatchSnapshot();
        expect(fs.read(join(target, 'webapp/ext/customPage/CustomPage.controller.js'))).toMatchSnapshot();
    });

    const inputWithNavigation = {
        name: 'CustomPage',
        entity: 'ChildEntity',
        navigation: {
            sourcePage: 'TestObjectPage',
            sourceEntity: 'RootEntity',
            navEntity: 'navToChildEntity'
        }
    };

    test('generateCustomPage: with navigation to it', () => {
        const target = join(testDir, 'with-nav');
        fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
        generateCustomPage(target, inputWithNavigation, fs);
        expect(fs.readJSON(join(target, 'webapp/manifest.json'))).toMatchSnapshot();
    });

    test('generateCustomPage: to app with target as array', () => {
        const testManifestWithArray = JSON.parse(testAppManifest);
        testManifestWithArray['sap.ui5'].routing.routes.push({
            pattern: 'object/{key}',
            name: 'TestObjectPage',
            target: ['TestObjectPage']
        });
        const target = join(testDir, 'target-as-array');
        fs.writeJSON(join(target, 'webapp/manifest.json'), testManifestWithArray);
        generateCustomPage(target, inputWithNavigation, fs);
        expect(fs.readJSON(join(target, 'webapp/manifest.json'))).toMatchSnapshot();
    });

    test('generateCustomPage: with existing controller/view', () => {
        const inputWithView = {
            name: 'CustomPage',
            entity: 'ChildEntity',
            view: {
                path: join(testDir, 'existing/ExistingPage.view.xml')
            }
        };
        const viewXml = '<mvc:View controllerName="ExistingPage" />';
        const controllerCode = 'new Controller();';
        fs.write(inputWithView.view.path, viewXml);
        fs.write(inputWithView.view.path.replace('view.xml', 'controller.js'), controllerCode);
        const target = join(testDir, 'with-existing-view');
        fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
        generateCustomPage(target, inputWithView, fs);

        expect(fs.readJSON(join(target, 'webapp/manifest.json'))).toMatchSnapshot();
        expect(fs.read(join(target, 'webapp/ext/customPage/CustomPage.view.xml'))).toBe(viewXml);
        expect(fs.read(join(target, 'webapp/ext/customPage/CustomPage.controller.js'))).toBe(controllerCode);
    });
});
