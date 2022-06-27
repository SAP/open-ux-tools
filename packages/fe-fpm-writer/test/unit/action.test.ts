import { create, Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { join } from 'path';
import { generateCustomAction, CustomAction } from '../../src';
import { enhanceManifestAndGetActionsElementReference } from '../../src/action';
import { TargetControl } from '../../src/action/types';

describe('CustomAction', () => {
    describe('getTargetElementReference', () => {
        const testInput = [
            { control: TargetControl.header },
            { control: TargetControl.footer },
            { control: TargetControl.section },
            { control: TargetControl.section, qualifier: 'FacetCustomAction' },
            { control: TargetControl.table },
            { control: TargetControl.table, navProperty: 'items' }
        ];
        test.each(testInput)('get reference for different control types', (input) => {
            const manifest = { 'sap.ui5': { routing: { targets: { TestPage: {} } } } };
            enhanceManifestAndGetActionsElementReference(manifest, { page: 'TestPage', ...input });
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
                            TestObjectPage: { name: 'sap.fe.templates.ListReport' }
                        }
                    }
                }
            },
            null,
            2
        );

        // minimal config
        const name = 'MyCustomAction';
        const target = {
            page: 'TestObjectPage',
            control: TargetControl.header
        };
        const settings = {
            text: 'My custom action text'
        };

        beforeEach(() => {
            fs = create(createStorage());
            fs.delete(testDir);
            fs.write(join(testDir, 'webapp/manifest.json'), testAppManifest);
        });

        test('minimal settings (no eventhandler)', () => {
            generateCustomAction(testDir, { name, target, settings }, fs);
            expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
            expect(fs.exists(join(testDir, 'webapp/ext/myCustomAction/MyCustomAction.js'))).toBeFalsy();
        });

        test('with new event handler as string', () => {
            generateCustomAction(
                testDir,
                {
                    name,
                    target,
                    settings: {
                        ...settings,
                        eventHandler: 'my.test.App.ext.ExistingHandler.onCustomAction'
                    }
                },
                fs
            );
            expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
        });

        test('with existing event handler as string', () => {
            const controllerPath = 'my.test.App.ext.ExistingHandler.onCustomAction';
            fs.write(controllerPath, 'dummyContent');
            generateCustomAction(
                testDir,
                {
                    name,
                    target,
                    settings: {
                        ...settings,
                        eventHandler: controllerPath
                    }
                },
                fs
            );
            expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
            expect(fs.exists(controllerPath)).toBe(true);
            expect(fs.read(controllerPath)).toEqual('dummyContent');
        });

        test('specific target folder, event handler as boolean', () => {
            generateCustomAction(
                testDir,
                {
                    name,
                    folder: 'ext',
                    target,
                    settings: {
                        ...settings,
                        eventHandler: true
                    }
                },
                fs
            );
            expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
            expect(fs.read(join(testDir, 'webapp/ext/MyCustomAction.js'))).toMatchSnapshot();
        });

        test('specific control as target', () => {
            generateCustomAction(
                testDir,
                {
                    name,
                    target: {
                        page: target.page,
                        control: TargetControl.table,
                        qualifier: 'MyQualifier',
                        navProperty: 'TestItems'
                    },
                    settings
                },
                fs
            );
            expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
            expect(fs.exists(join(testDir, 'webapp/ext/myCustomAction/MyCustomAction.js'))).toBeFalsy();
        });

        const requiresSelectionValues = [undefined, true, false];
        requiresSelectionValues.forEach((value?: boolean) => {
            test(`Test property "requiresSelection" with value "${value}"`, () => {
                generateCustomAction(
                    testDir,
                    {
                        name,
                        target,
                        settings: {
                            ...settings,
                            requiresSelection: value
                        }
                    },
                    fs
                );
                const manifest: any = fs.readJSON(join(testDir, 'webapp/manifest.json'));
                const action =
                    manifest['sap.ui5']['routing']['targets'][target.page]['options']['settings']['content']['header'][
                        'actions'
                    ][name];
                // "requiresSelection" property should not be added if it is undefined
                expect('requiresSelection' in action).toEqual(value === undefined ? false : true);
                expect(action['requiresSelection']).toEqual(value);
            });
        });
    });
});
