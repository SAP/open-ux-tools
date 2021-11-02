import { create, Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { join } from 'path';
import { generateCustomAction } from '../../src';
import { getTargetElementReference } from '../../src/action';
import { ControlType } from '../../src/action/types';

describe('CustomAction', () => {
    describe('getTargetElementReference', () => {
        const testInput = [
            { control: ControlType.header },
            { control: ControlType.footer },
            { control: ControlType.facet },
            { control: ControlType.facet, qualifier: 'FacetCustomAction' },
            { control: ControlType.table },
            { control: ControlType.table, navProperty: 'items' }
        ];
        test.each(testInput)('get reference for different control types', (input) => {
            const manifest = { 'sap.ui5': { routing: { targets: { TestPage: {} } } } };
            getTargetElementReference(manifest, { page: 'TestPage', ...input });
            expect(manifest).toMatchSnapshot();
        });
    });

    describe('generateCustomAction', () => {
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
            fs.write(join(testDir, 'webapp/manifest.json'), testAppManifest);
        });

        test('generateCustomAction', () => {
            generateCustomAction(
                testDir,
                {
                    name: 'MyCustomAction',
                    folder: 'ext',
                    target: {
                        page: 'TestObjectPage',
                        control: ControlType.header
                    },
                    settings: {
                        text: 'My custom action text'
                    }
                },
                fs
            );

            expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
            expect(fs.read(join(testDir, 'webapp/ext/MyCustomAction.controller.js'))).toMatchSnapshot();
        });
    });
});
