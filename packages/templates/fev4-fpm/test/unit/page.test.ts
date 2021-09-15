import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';
import { join } from 'path';
import { generateCustomPage } from '../../src';

describe('CustomPage', () => {
    let fs: Editor;
    const testDir = 'virtual-temp';
    const testAppManifest = {
        "sap.app": {
            id: "my.test.App"
        },
        "sap.ui5": {
            routing: {
                routes: []
            },
            targets: {
                TestObjectPage: {

                }
            }
        }
    };
    beforeEach(() => {
        // generate required files
        fs = create(createStorage());
        fs.write(join(testDir, 'webapp', 'manifest.json'), JSON.stringify(testAppManifest));
    });

    test('Add a custom page with minimal input', async () => {
        generateCustomPage(testDir, {
            name: "CustomPage",
            entity: "RootEnity"
        }, fs);
        expect((fs as any).dump(testDir)).toMatchSnapshot();
    });

    test('Add a custom page with navigation to it', async () => {
        generateCustomPage(testDir, {
            name: "CustomPage",
            entity: "ChildEntity",
            navigation: {
                sourcePage: "TestObjectPage",
                sourceEntity: "RootEntity",
                navEntity: "navToChildEntity"
            }
        }, fs);
        expect((fs as any).dump(testDir)).toMatchSnapshot();
    });
});
