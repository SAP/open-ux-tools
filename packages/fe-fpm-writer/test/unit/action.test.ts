import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { join } from 'path';
import { generateCustomAction } from '../../src';
import { enhanceManifestAndGetActionsElementReference } from '../../src/action';
import { TargetControl } from '../../src/action/types';
import type { EventHandlerConfiguration, FileContentPosition, Manifest } from '../../src/common/types';
import { Placement } from '../../src/common/types';
import { detectTabSpacing } from '../../src/common/file';
import { getEndOfLinesLength, tabSizingTestCases } from '../common';

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

        test('minimal settings (no eventhandler)', async () => {
            await generateCustomAction(testDir, { name, target, settings }, fs);
            expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
            expect(fs.exists(join(testDir, 'webapp/ext/myCustomAction/MyCustomAction.js'))).toBeFalsy();
        });

        test('with new event handler as string', async () => {
            await generateCustomAction(
                testDir,
                {
                    name,
                    target,
                    eventHandler: 'my.test.App.ext.ExistingHandler.onCustomAction',
                    settings: {
                        ...settings
                    }
                },
                fs
            );
            expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
        });

        test('with existing event handler as string', async () => {
            const controllerPath = 'my.test.App.ext.ExistingHandler.onCustomAction';
            fs.write(controllerPath, 'dummyContent');
            await generateCustomAction(
                testDir,
                {
                    name,
                    target,
                    eventHandler: controllerPath,
                    settings: {
                        ...settings
                    }
                },
                fs
            );
            expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
            expect(fs.exists(controllerPath)).toBe(true);
            expect(fs.read(controllerPath)).toEqual('dummyContent');
        });

        test('specific target folder, event handler as boolean', async () => {
            await generateCustomAction(
                testDir,
                {
                    name,
                    folder: 'ext',
                    target,
                    eventHandler: true,
                    settings: {
                        ...settings
                    }
                },
                fs
            );
            expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
            expect(fs.read(join(testDir, 'webapp/ext/MyCustomAction.js'))).toMatchSnapshot();
        });

        test('specific control as target', async () => {
            await generateCustomAction(
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

        test('custom section as target', async () => {
            await generateCustomAction(
                testDir,
                {
                    name,
                    target: {
                        page: target.page,
                        control: TargetControl.body,
                        customSectionKey: 'CustomSectionOne'
                    },
                    settings
                },
                fs
            );
            expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
            expect(fs.exists(join(testDir, 'webapp/ext/myCustomAction/MyCustomAction.js'))).toBeFalsy();
        });

        const positionTests = [
            {
                name: 'Create with anchor',
                position: {
                    placement: Placement.Before,
                    anchor: 'Dummy'
                }
            },
            {
                name: 'Create without anchor',
                position: {
                    placement: Placement.Before
                }
            },
            {
                name: 'Create without position',
                position: undefined
            }
        ];
        positionTests.forEach((testCase) => {
            test(`Test 'position' property. ${testCase.name}`, async () => {
                await generateCustomAction(
                    testDir,
                    {
                        name,
                        target,
                        eventHandler: 'my.test.App.ext.ExistingHandler.onCustomAction',
                        settings: {
                            ...settings,
                            position: testCase.position
                        }
                    },
                    fs
                );
                expect(fs.readJSON(join(testDir, 'webapp/manifest.json'))).toMatchSnapshot();
            });
        });

        const requiresSelectionValues = [undefined, true, false];
        requiresSelectionValues.forEach((value?: boolean) => {
            test(`Test property "requiresSelection" with value "${value}"`, async () => {
                await generateCustomAction(
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
                const manifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
                const manifestSettings = (
                    manifest['sap.ui5']?.['routing']?.['targets']?.[target.page]?.['options'] as Record<string, any>
                )['settings'];
                const action = manifestSettings['content']['header']['actions'][name];
                // "requiresSelection" property should not be added if it is undefined
                expect('requiresSelection' in action).toEqual(value === undefined ? false : true);
                expect(action['requiresSelection']).toEqual(value);
            });
        });

        describe('Test property "eventHandler"', () => {
            const generateCustomActionWithEventHandler = async (
                actionId: string,
                eventHandler: string | EventHandlerConfiguration,
                folder?: string
            ) => {
                await generateCustomAction(
                    testDir,
                    {
                        name: actionId,
                        target,
                        folder,
                        eventHandler,
                        settings: {
                            ...settings
                        }
                    },
                    fs
                );
            };
            const getActionByName = (manifest: Manifest, actionId: string) => {
                const settings = (
                    manifest['sap.ui5']?.['routing']?.['targets']?.[target.page]?.['options'] as Record<string, any>
                )['settings'];

                return settings['content']['header']['actions'][actionId];
            };

            test('"eventHandler" is empty "object" - create new file with default function name', async () => {
                await generateCustomActionWithEventHandler(name, {});

                const manifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
                const action = getActionByName(manifest, name);
                expect(action['press']).toEqual('my.test.App.ext.myCustomAction.MyCustomAction.onPress');
                expect(
                    fs.read(join(testDir, 'webapp', 'ext', 'myCustomAction', 'MyCustomAction.js'))
                ).toMatchSnapshot();
            });

            test('"eventHandler" is "object" - create new file with custom file and function names', async () => {
                const extension = {
                    fnName: 'DummyOnAction',
                    fileName: 'dummyAction'
                };
                const folder = join('ext', 'custom');
                await generateCustomActionWithEventHandler(name, extension, folder);

                const manifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
                const action = getActionByName(manifest, name);
                expect(action['press']).toEqual('my.test.App.ext.custom.dummyAction.DummyOnAction');
                expect(fs.read(join(testDir, 'webapp', 'ext', 'custom', `${extension.fileName}.js`))).toMatchSnapshot();
            });

            test('"eventHandler" is "object" - create new file with custom function name', async () => {
                await generateCustomActionWithEventHandler(name, {
                    fnName: 'DummyOnAction'
                });

                const manifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
                const action = getActionByName(manifest, name);
                expect(action['press']).toEqual('my.test.App.ext.myCustomAction.MyCustomAction.DummyOnAction');
                expect(
                    fs.read(join(testDir, 'webapp', 'ext', 'myCustomAction', 'MyCustomAction.js'))
                ).toMatchSnapshot();
            });

            test('"eventHandler" is "object", action with lowercase first letter', async () => {
                await generateCustomActionWithEventHandler(name, {
                    fnName: 'dummyOnAction'
                });

                const manifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
                const action = getActionByName(manifest, name);
                expect(action['press']).toEqual('my.test.App.ext.myCustomAction.MyCustomAction.dummyOnAction');
                expect(fs.exists(join(testDir, 'webapp', 'ext', 'myCustomAction', 'MyCustomAction.js'))).toBeTruthy();
            });

            test(`"eventHandler" is String - no changes to handler file`, async () => {
                await generateCustomActionWithEventHandler(name, 'my.test.App.ext.ExistingHandler.onCustomAction');
                const manifest = fs.readJSON(join(testDir, 'webapp', 'manifest.json')) as Manifest;
                const action = getActionByName(manifest, name);
                expect(action['press']).toEqual('my.test.App.ext.ExistingHandler.onCustomAction');
                expect(fs.exists(join(testDir, 'webapp', 'ext', 'myCustomAction', 'MyCustomAction.js'))).toBeFalsy();
            });

            // Test with both position interfaces
            test.each([
                [
                    'position as object',
                    {
                        line: 8,
                        character: 9
                    },
                    undefined
                ],
                ['absolute position', 196, 8]
            ])(
                '"eventHandler" is object. Append new function to existing js file with %s',
                async (_desc: string, position: number | FileContentPosition, appendLines?: number) => {
                    const fileName = 'MyExistingAction';
                    // Create existing file with existing actions
                    const folder = join('ext', 'fragments');
                    const existingPath = join(testDir, 'webapp', folder, `${fileName}.js`);
                    // Generate handler with single method - content should be updated during generating of custom action
                    fs.copyTpl(join(__dirname, '../../templates', 'common/EventHandler.js'), existingPath, {
                        eventHandlerFnName: 'onPress'
                    });
                    if (typeof position === 'number' && appendLines !== undefined) {
                        const content = fs.read(existingPath);
                        position += getEndOfLinesLength(appendLines, content);
                    }
                    // Create third action - append existing js file
                    const actionName = 'CustomAction2';
                    const fnName = 'onHandleSecondAction';
                    await generateCustomActionWithEventHandler(
                        actionName,
                        {
                            fnName,
                            fileName,
                            insertScript: {
                                fragment:
                                    ',\n        onHandleSecondAction: function() {\n            MessageToast.show("Custom handler invoked.");\n        }',
                                position
                            }
                        },
                        folder
                    );

                    const manifest = fs.readJSON(join(testDir, 'webapp', 'manifest.json')) as Manifest;
                    const action = getActionByName(manifest, actionName);
                    expect(action['press']).toEqual(`my.test.App.ext.fragments.${fileName}.${fnName}`);
                    // Check update js file content
                    expect(fs.read(existingPath)).toMatchSnapshot();
                }
            );

            test('"eventHandler" is "object", append new function to controller extension', async () => {
                const expectedFileName = 'MyExistingAction';
                const fileName = `${expectedFileName}.controller`;
                // Create existing file with existing actions
                const folder = join('ext', 'fragments');
                const existingPath = join(testDir, 'webapp', folder, `${fileName}.js`);
                // Generate handler with single method - content should be updated during generating of custom action
                fs.copyTpl(join(__dirname, '../../templates', 'common/EventHandler.js'), existingPath, {
                    eventHandlerFnName: 'onPress'
                });
                // Create third action - append existing js file
                const actionName = 'CustomAction2';
                const fnName = 'onHandleSecondAction';
                const controllerPrefix = '.extension';
                // use controller prefix to make sure it is controller extension
                await generateCustomActionWithEventHandler(
                    actionName,
                    {
                        fnName,
                        fileName,
                        controllerPrefix,
                        insertScript: {
                            fragment:
                                ',\n        onHandleSecondAction: function() {\n            MessageToast.show("Custom handler invoked.");\n        }',
                            position: {
                                line: 8,
                                character: 9
                            }
                        }
                    },
                    folder
                );
                const manifest = fs.readJSON(join(testDir, 'webapp', 'manifest.json')) as Manifest;
                const action = getActionByName(manifest, actionName);
                // Check if action press has controller prefix added
                expect(action['press']).toEqual(
                    `${controllerPrefix}.my.test.App.ext.fragments.${expectedFileName}.${fnName}`
                );
                // Check update js file content
                expect(fs.read(existingPath)).toMatchSnapshot();
            });
        });

        describe('Test property custom "tabSizing"', () => {
            test.each(tabSizingTestCases)('$name', async ({ tabInfo, expectedAfterSave }) => {
                await generateCustomAction(testDir, { name, target, settings, tabInfo }, fs);
                let updatedManifest = fs.read(join(testDir, 'webapp/manifest.json'));
                let result = detectTabSpacing(updatedManifest);
                expect(result).toEqual(expectedAfterSave);
                // Generate another action and check if new tab sizing recalculated correctly without passing tab size info
                await generateCustomAction(testDir, { name: 'Second', target, settings }, fs);
                updatedManifest = fs.read(join(testDir, 'webapp/manifest.json'));
                result = detectTabSpacing(updatedManifest);
                expect(result).toEqual(expectedAfterSave);
            });
        });
    });
});
