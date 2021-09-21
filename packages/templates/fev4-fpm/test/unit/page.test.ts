import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';
import { join } from 'path';
import { generateCustomPage } from '../../src';
import { Ui5Route } from '../../src/types';

describe('CustomPage', () => {
    let fs = create(createStorage());
    const testDir = 'virtual-temp';
    const testAppManifest = JSON.stringify({
        "sap.app": {
            id: "my.test.App"
        },
        "sap.ui5": {
            routing: {
                routes: [] as Ui5Route[]
            },
            targets: {
                TestObjectPage: {

                }
            }
        }
    }, null, 2);

    beforeAll(() => {
        fs.delete(testDir);
    });

    test('Add a custom page with minimal input', async () => {
        const target = join(testDir, '' + Date.now());
        fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
        generateCustomPage(target, {
            name: "CustomPage",
            entity: "RootEnity"
        }, fs);
        expect((fs as any).dump(target)).toMatchSnapshot();
    });

    const inputWithNavigation = {
        name: "CustomPage",
        entity: "ChildEntity",
        navigation: {
            sourcePage: "TestObjectPage",
            sourceEntity: "RootEntity",
            navEntity: "navToChildEntity"
        }
    };

    test('Add a custom page with navigation to it', async () => {
        const target = join(testDir, '' + Date.now());
        fs.write(join(target, 'webapp/manifest.json'), testAppManifest);
        generateCustomPage(target, inputWithNavigation, fs);
        expect(fs.readJSON(join(target, 'webapp/manifest.json'))).toMatchSnapshot(); 
    });

    test('Add a custom page to app with target as array', async () => {
        const testManifestWithArray = JSON.parse(testAppManifest);
        testManifestWithArray['sap.ui5'].routing.routes.push({
            pattern: "object/{key}",
            name: "TestObjectPage",
            target: [
                "TestObjectPage"
            ]
        });
        const target = join(testDir, '' + Date.now());
        fs.writeJSON(join(target, 'webapp/manifest.json'), testManifestWithArray);
        generateCustomPage(target, inputWithNavigation, fs);
        expect(fs.readJSON(join(target, 'webapp/manifest.json'))).toMatchSnapshot(); 
    });
});
