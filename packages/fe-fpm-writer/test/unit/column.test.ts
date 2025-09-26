import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { join } from 'path';
import { generateCustomColumn } from '../../src';
import { getManifestRoot, extractBuildingBlockViewPath } from '../../src/column';
import type { CustomTableColumn } from '../../src/column/types';
import { Availability, HorizontalAlign } from '../../src/column/types';
import * as manifest from './sample/column/webapp/manifest.json';
import type { EventHandlerConfiguration, FileContentPosition, Manifest } from '../../src/common/types';
import { Placement } from '../../src/common/types';
import { detectTabSpacing } from '../../src/common/file';
import { getEndOfLinesLength, tabSizingTestCases } from '../common';

const testDir = join(__dirname, 'sample/column');

describe('CustomAction', () => {
    describe('getTemplateRoot', () => {
        const testInput = [
            { version: '1.100', expected: join(__dirname, '../../templates/column/1.86') },
            { version: '1.96', expected: join(__dirname, '../../templates/column/1.86') },
            { version: '1.84', expected: join(__dirname, '../../templates/column/1.84') },
            { version: undefined, expected: join(__dirname, '../../templates/column/1.86') },
            { version: '1.85', expected: join(__dirname, '../../templates/column/1.85') },
            { version: '1.86', expected: join(__dirname, '../../templates/column/1.86') }
        ];
        test.each(testInput)('get root path of template', ({ version, expected }) => {
            expect(getManifestRoot(version)).toEqual(expected);
        });
        test('invalid version', () => {
            try {
                getManifestRoot('1.8');
                expect(true).toBeFalsy();
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
    });
    describe('generateCustomColumn', () => {
        let fs: Editor;
        const customColumn: CustomTableColumn = {
            target: 'sample',
            targetEntity: '@com.sap.vocabularies.UI.v1.LineItem',
            name: 'NewCustomColumn',
            header: 'col header',
            folder: 'extensions/custom',
            position: {
                placement: Placement.After
            }
        };
        const expectedFragmentPath = join(testDir, `webapp/${customColumn.folder}/${customColumn.name}.fragment.xml`);
        const testVersions = ['1.86', '1.85', '1.84'];
        beforeEach(() => {
            fs = create(createStorage());
            fs.delete(testDir);
            fs.write(join(testDir, 'webapp/manifest.json'), JSON.stringify(manifest));
        });

        test.each(testVersions)('only mandatory properties', async (minUI5Version) => {
            //sut
            await generateCustomColumn(testDir, { ...customColumn, minUI5Version }, fs);
            const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const settings = (
                updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
            )['settings'];
            expect(settings).toBeDefined();
            expect(settings.controlConfiguration).toMatchSnapshot();

            expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
        });
        test('version 1.86, with fragmentFile', async () => {
            const testCustomColumn: CustomTableColumn = {
                ...customColumn,
                fragmentFile: 'NewCustomColumnFragment'
            };
            const expectedSectionFragmentPath = join(
                testDir,
                `webapp/${customColumn.folder}/${testCustomColumn.fragmentFile}.fragment.xml`
            );
            await generateCustomColumn(testDir, { ...testCustomColumn, minUI5Version: '1.86' }, fs);
            const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const settings = (
                updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
            )['settings'];
            expect(settings.controlConfiguration).toMatchSnapshot();

            expect(fs.read(expectedSectionFragmentPath)).toMatchSnapshot();
        });
        test('version 1.86, with new handler, all properties', async () => {
            const testCustomColumn: CustomTableColumn = {
                ...customColumn,
                eventHandler: true,
                availability: Availability.Adaptation,
                horizontalAlign: HorizontalAlign.Center,
                width: '150px',
                properties: ['ID', 'TotalNetAmount', '_CustomerPaymentTerms/CustomerPaymentTerms']
            };
            await generateCustomColumn(testDir, { ...testCustomColumn, minUI5Version: '1.86' }, fs);
            const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const settings = (
                updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
            )['settings'];
            expect(settings.controlConfiguration).toMatchSnapshot();

            expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
            expect(fs.read(expectedFragmentPath.replace('.fragment.xml', '.js'))).toMatchSnapshot();
        });
        test('version 1.86, with existing handler', async () => {
            const controllerPath = 'my.test.App.ext.ExistingHandler.onCustomAction';
            fs.write(controllerPath, 'dummyContent');
            const testCustomColumn: CustomTableColumn = {
                ...customColumn,
                eventHandler: controllerPath
            };
            await generateCustomColumn(testDir, { ...testCustomColumn, minUI5Version: '1.86' }, fs);
            const updatedManifest: any = fs.readJSON(join(testDir, 'webapp/manifest.json'));

            const settings = updatedManifest['sap.ui5']['routing']['targets']['sample']['options']['settings'];
            expect(settings.controlConfiguration).toMatchSnapshot();

            expect(fs.exists(controllerPath)).toBe(true);
            expect(fs.read(controllerPath)).toEqual('dummyContent');
        });
        test('version 1.85, no handler, all properties', async () => {
            const testCustomColumn: CustomTableColumn = {
                ...customColumn,
                availability: Availability.Adaptation,
                horizontalAlign: HorizontalAlign.Center,
                width: '150px'
            };

            await generateCustomColumn(testDir, { ...testCustomColumn, minUI5Version: '1.85' }, fs);

            const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const settings = (
                updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
            )['settings'];
            expect(settings.controlConfiguration).toMatchSnapshot();

            expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
        });
        test('with custom control passed in interface', async () => {
            const testCustomColumn: CustomTableColumn = {
                ...customColumn,
                control: '<CustomXML text="" />'
            };

            await generateCustomColumn(testDir, testCustomColumn, fs);

            const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const settings = (
                updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
            )['settings'];
            expect(settings.controlConfiguration).toMatchSnapshot();

            expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
        });
        test('version 1.85, no handler, no fs, all properties', async () => {
            const testCustomColumn: CustomTableColumn = {
                ...customColumn,
                availability: Availability.Adaptation,
                horizontalAlign: HorizontalAlign.Center,
                width: '150px',
                position: {
                    placement: Placement.After,
                    anchor: 'DataField::BooleanProperty'
                }
            };

            const testFS = await generateCustomColumn(testDir, { ...testCustomColumn, minUI5Version: '1.85' });

            const updatedManifest = testFS.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const settings = (
                updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
            )['settings'];
            expect(settings.controlConfiguration).toMatchSnapshot();
            expect(testFS.read(expectedFragmentPath)).toMatchSnapshot();
        });

        test('version 1.102, no handler, filename lowercase', async () => {
            const testCustomColumn: CustomTableColumn = {
                ...customColumn,
                name: 'newCustomColumn',
                folder: 'extensions/custom'
            };

            const testFS = await generateCustomColumn(testDir, { ...testCustomColumn, minUI5Version: '1.102' });
            const fragmentPath = join(
                testDir,
                `webapp`,
                `${customColumn.folder}`,
                `${testCustomColumn.name}.fragment.xml`
            );
            expect(testFS.exists(fragmentPath)).toBeTruthy();
        });

        test('version 1.102, no handler, filename lowercase, no folder passed', async () => {
            const testCustomColumn: CustomTableColumn = {
                ...customColumn,
                name: 'newCustomColumn',
                folder: undefined
            };

            const testFS = await generateCustomColumn(testDir, { ...testCustomColumn, minUI5Version: '1.102' });
            const fragmentPath = join(
                testDir,
                `webapp`,
                `ext`,
                `newCustomColumn`,
                `${testCustomColumn.name}.fragment.xml`
            );
            expect(testFS.exists(fragmentPath)).toBeTruthy();
        });

        test('version 1.102, no handler, filename lowercase, folder uppercase', async () => {
            const testCustomColumn: CustomTableColumn = {
                ...customColumn,
                name: 'newCustomColumn',
                folder: 'extensions/Custom'
            };

            const testFS = await generateCustomColumn(testDir, { ...testCustomColumn, minUI5Version: '1.102' });
            const fragmentPath = join(
                testDir,
                `webapp`,
                `${testCustomColumn.folder}`,
                `${testCustomColumn.name}.fragment.xml`
            );
            expect(testFS.exists(fragmentPath)).toBeTruthy();
        });

        describe('Test property "eventHandler"', () => {
            const generateCustomColumnWithEventHandler = async (
                columnId: string,
                eventHandler: string | EventHandlerConfiguration,
                folder?: string
            ) => {
                await generateCustomColumn(testDir, { ...customColumn, name: columnId, folder, eventHandler }, fs);
            };

            test('"eventHandler" is empty "object" - create new file with default function name', async () => {
                const id = customColumn.name;
                await generateCustomColumnWithEventHandler(id, {}, customColumn.folder);
                const xmlPath = join(testDir, `webapp/${customColumn.folder}/${id}.fragment.xml`);
                expect(fs.read(xmlPath)).toMatchSnapshot();
                expect(fs.read(xmlPath.replace('.fragment.xml', '.js'))).toMatchSnapshot();
            });

            test('"eventHandler" is "object" - create new file with custom file and function names', async () => {
                const extension = {
                    fnName: 'DummyOnAction',
                    fileName: 'dummyAction'
                };
                const id = customColumn.name;
                await generateCustomColumnWithEventHandler(id, extension, customColumn.folder);
                const fragmentName = `${id}.fragment.xml`;
                const xmlPath = join(testDir, `webapp/${customColumn.folder}/${fragmentName}`);
                expect(fs.read(xmlPath)).toMatchSnapshot();
                expect(fs.read(xmlPath.replace(fragmentName, `${extension.fileName}.js`))).toMatchSnapshot();
            });

            test('"eventHandler" is "object" - create new file with custom function name', async () => {
                const extension = {
                    fnName: 'DummyOnAction'
                };
                const id = customColumn.name;
                await generateCustomColumnWithEventHandler(id, extension, customColumn.folder);
                const xmlPath = join(testDir, `webapp/${customColumn.folder}/${id}.fragment.xml`);
                expect(fs.read(xmlPath)).toMatchSnapshot();
                expect(fs.read(xmlPath.replace('.fragment.xml', '.js'))).toMatchSnapshot();
            });

            test.each([
                [
                    'position as object',
                    {
                        line: 8,
                        character: 9
                    },
                    undefined
                ],
                ['absolute position', 190, 8]
            ])(
                '"eventHandler" is object. Append new function to existing js file with %s',
                async (_desc: string, position: number | FileContentPosition, appendLines?: number) => {
                    const fileName = 'MyExistingAction';
                    // Create existing file with existing actions
                    const folder = join('extensions', 'custom');
                    const existingPath = join(testDir, 'webapp', folder, `${fileName}.js`);
                    // Generate handler with single method - content should be updated during generating of custom column
                    fs.copyTpl(join(__dirname, '../../templates', 'common/EventHandler.js'), existingPath, {
                        eventHandlerFnName: 'onPress'
                    });
                    if (typeof position === 'number' && appendLines !== undefined) {
                        const content = fs.read(existingPath);
                        position += getEndOfLinesLength(appendLines, content);
                    }
                    const fnName = 'onHandleSecondAction';

                    const extension = {
                        fnName,
                        fileName,
                        insertScript: {
                            fragment: `,\n        ${fnName}: function() {\n            MessageToast.show("Custom handler invoked.");\n        }`,
                            position
                        }
                    };

                    const id = customColumn.name;
                    await generateCustomColumnWithEventHandler(id, extension, folder);
                    const xmlPath = join(testDir, 'webapp', folder, `${id}.fragment.xml`);
                    expect(fs.read(xmlPath)).toMatchSnapshot();
                    // Check update js file content
                    expect(fs.read(existingPath)).toMatchSnapshot();
                }
            );
        });

        describe('Test property custom "tabSizing"', () => {
            test.each(tabSizingTestCases)('$name', async ({ tabInfo, expectedAfterSave }) => {
                await generateCustomColumn(
                    testDir,
                    {
                        ...customColumn,
                        tabInfo
                    },
                    fs
                );
                let updatedManifest = fs.read(join(testDir, 'webapp/manifest.json'));
                let result = detectTabSpacing(updatedManifest);
                expect(result).toEqual(expectedAfterSave);
                // Generate another columns and check if new tab sizing recalculated correctly without passing tab size info
                await generateCustomColumn(
                    testDir,
                    {
                        ...customColumn,
                        name: 'SecondCustom'
                    },
                    fs
                );
                updatedManifest = fs.read(join(testDir, 'webapp/manifest.json'));
                result = detectTabSpacing(updatedManifest);
                expect(result).toEqual(expectedAfterSave);
            });
        });

        describe('generateCustomColumn for building block', () => {
            beforeEach(() => {
                fs = create(createStorage());
                fs.delete(testDir);
                fs.write(join(testDir, 'webapp/manifest.json'), JSON.stringify(manifest));
            });

            test('generates custom column building block with correct paths and content', async () => {
                const testCustomColumn: CustomTableColumn = {
                    ...customColumn,
                    buildingBlockView: 'sapux.fe.fpm.writer.test.ext.view.CustomColumn',
                    minUI5Version: '1.86'
                };

                // Create the target view XML file that the building block will be added to
                const targetViewPath = join(testDir, 'webapp/ext/view/CustomColumn.view.xml');
                const initialViewContent = `<mvc:View xmlns:core="sap.ui.core" xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m"
    xmlns:html="http://www.w3.org/1999/xhtml" controllerName="com.test.myApp.ext.main.Main"
    xmlns:macros="sap.fe.macros">
    <macros:Page id="CustomColumnPage">
        <macros:Table id="CustomTable" metaPath="@sapux.fe.fpm.writer.test.Sample">
        </macros:Table>
    </macros:Page>
</mvc:View>`;
                fs.write(targetViewPath, initialViewContent);

                await generateCustomColumn(testDir, testCustomColumn, fs);

                // Verify fragment file was created
                const fragmentPath = join(testDir, `webapp/${customColumn.folder}/${customColumn.name}.fragment.xml`);
                expect(fs.exists(fragmentPath)).toBe(true);
                expect(fs.read(fragmentPath)).toMatchSnapshot();

                // Verify building block view was updated
                expect(fs.exists(targetViewPath)).toBe(true);
                const updatedViewContent = fs.read(targetViewPath);
                expect(updatedViewContent).toMatchSnapshot();

                // Building block flow should add sap.fe.macros dependency but not use manifest controlConfiguration
                const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
                expect(updatedManifest['sap.ui5']?.dependencies?.libs?.['sap.fe.macros']).toBeDefined();
            });

            test('generates building block with custom fragment name', async () => {
                const testCustomColumn: CustomTableColumn = {
                    ...customColumn,
                    buildingBlockView: 'sapux.fe.fpm.writer.test.ext.view.CustomColumn',
                    fragmentFile: 'CustomColumnFragment',
                    minUI5Version: '1.86'
                };

                const targetViewPath = join(testDir, 'webapp/ext/view/CustomColumn.view.xml');
                const initialViewContent = `<mvc:View xmlns:core="sap.ui.core" xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m"
    xmlns:html="http://www.w3.org/1999/xhtml" controllerName="com.test.myApp.ext.main.Main"
    xmlns:macros="sap.fe.macros">
    <macros:Page>
        <macros:Table metaPath="@sapux.fe.fpm.writer.test.Sample">
        </macros:Table>
    </macros:Page>
</mvc:View>`;
                fs.write(targetViewPath, initialViewContent);

                await generateCustomColumn(testDir, testCustomColumn, fs);

                // Verify custom fragment file was created
                const fragmentPath = join(
                    testDir,
                    `webapp/${customColumn.folder}/${testCustomColumn.fragmentFile}.fragment.xml`
                );
                expect(fs.exists(fragmentPath)).toBe(true);
                expect(fs.read(fragmentPath)).toMatchSnapshot();

                // Verify building block was added with correct fragment reference
                const updatedViewContent = fs.read(targetViewPath);
                expect(updatedViewContent).toMatchSnapshot();
            });

            test('generates building block with nested view path', async () => {
                const testCustomColumn: CustomTableColumn = {
                    ...customColumn,
                    buildingBlockView: 'sapux.fe.fpm.writer.test.ext.views.tables.CustomTableColumn',
                    minUI5Version: '1.86'
                };

                // Create nested directory structure
                const targetViewPath = join(testDir, 'webapp/ext/views/tables/CustomTableColumn.view.xml');
                const initialViewContent = `<mvc:View xmlns:core="sap.ui.core" xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m"
    xmlns:html="http://www.w3.org/1999/xhtml" controllerName="com.test.myApp.ext.main.Main"
    xmlns:macros="sap.fe.macros">
    <macros:Page>
        <macros:Table>
        </macros:Table>
    </macros:Page>
</mvc:View>`;
                fs.write(targetViewPath, initialViewContent);

                await generateCustomColumn(testDir, testCustomColumn, fs);

                // Verify fragment was created
                const fragmentPath = join(testDir, `webapp/${customColumn.folder}/${customColumn.name}.fragment.xml`);
                expect(fs.exists(fragmentPath)).toBe(true);

                // Verify view was updated
                expect(fs.exists(targetViewPath)).toBe(true);
                const updatedViewContent = fs.read(targetViewPath);
                expect(updatedViewContent).toMatchSnapshot();
            });

            test('generates building block with event handler', async () => {
                const testCustomColumn: CustomTableColumn = {
                    ...customColumn,
                    buildingBlockView: 'sapux.fe.fpm.writer.test.ext.view.CustomColumn',
                    eventHandler: true,
                    minUI5Version: '1.86'
                };

                const targetViewPath = join(testDir, 'webapp/ext/view/CustomColumn.view.xml');
                const initialViewContent = `<mvc:View xmlns:core="sap.ui.core" xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m"
    xmlns:html="http://www.w3.org/1999/xhtml" controllerName="com.test.myApp.ext.main.Main"
    xmlns:macros="sap.fe.macros">
    <macros:Page>
        <macros:Table>
        </macros:Table>
    </macros:Page>
</mvc:View>`;
                fs.write(targetViewPath, initialViewContent);

                await generateCustomColumn(testDir, testCustomColumn, fs);

                // Verify fragment with event handler was created
                const fragmentPath = join(testDir, `webapp/${customColumn.folder}/${customColumn.name}.fragment.xml`);
                expect(fs.exists(fragmentPath)).toBe(true);
                expect(fs.read(fragmentPath)).toMatchSnapshot();

                // Verify JavaScript event handler file was created
                const handlerPath = fragmentPath.replace('.fragment.xml', '.js');
                expect(fs.exists(handlerPath)).toBe(true);
                expect(fs.read(handlerPath)).toMatchSnapshot();

                // Verify building block was added
                const updatedViewContent = fs.read(targetViewPath);
                expect(updatedViewContent).toMatchSnapshot();
            });

            test('generates building block with all properties', async () => {
                const testCustomColumn: CustomTableColumn = {
                    ...customColumn,
                    buildingBlockView: 'sapux.fe.fpm.writer.test.ext.view.CustomColumn',
                    availability: Availability.Adaptation,
                    horizontalAlign: HorizontalAlign.Center,
                    width: '150px',
                    properties: ['ID', 'Name', 'Status'],
                    eventHandler: {
                        fnName: 'onCustomColumnPress',
                        fileName: 'CustomColumnHandler'
                    },
                    minUI5Version: '1.86'
                };

                const targetViewPath = join(testDir, 'webapp/ext/view/CustomColumn.view.xml');
                const initialViewContent = `<mvc:View xmlns:core="sap.ui.core" xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m"
    xmlns:html="http://www.w3.org/1999/xhtml" controllerName="com.test.myApp.ext.main.Main"
    xmlns:macros="sap.fe.macros">
    <macros:Page>
        <macros:Table>
        </macros:Table>
    </macros:Page>
</mvc:View>`;
                fs.write(targetViewPath, initialViewContent);

                await generateCustomColumn(testDir, testCustomColumn, fs);

                // Verify fragment with all properties was created
                const fragmentPath = join(testDir, `webapp/${customColumn.folder}/${customColumn.name}.fragment.xml`);
                expect(fs.exists(fragmentPath)).toBe(true);
                expect(fs.read(fragmentPath)).toMatchSnapshot();

                // Verify custom event handler file was created
                const handlerPath = join(testDir, `webapp/${customColumn.folder}/CustomColumnHandler.js`);
                expect(fs.exists(handlerPath)).toBe(true);
                expect(fs.read(handlerPath)).toMatchSnapshot();

                // Verify building block was added
                const updatedViewContent = fs.read(targetViewPath);
                expect(updatedViewContent).toMatchSnapshot();
            });

            test('throws error when buildingBlockView is invalid', async () => {
                const testCustomColumn: CustomTableColumn = {
                    ...customColumn,
                    buildingBlockView: 'invalid.namespace.view.Test',
                    minUI5Version: '1.86'
                };

                await expect(async () => {
                    await generateCustomColumn(testDir, testCustomColumn, fs);
                }).rejects.toThrow();
            });

            test('throws error when app ID is missing from manifest', async () => {
                const testCustomColumn: CustomTableColumn = {
                    ...customColumn,
                    buildingBlockView: 'sapux.fe.fpm.writer.test.ext.view.CustomColumn',
                    minUI5Version: '1.86'
                };

                // Create manifest without app ID
                const manifestWithoutAppId: any = { ...manifest };
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete manifestWithoutAppId['sap.app'];
                fs.write(join(testDir, 'webapp/manifest.json'), JSON.stringify(manifestWithoutAppId));

                await expect(async () => {
                    await generateCustomColumn(testDir, testCustomColumn, fs);
                }).rejects.toThrow();
            });

            test('handles existing fragment file in building block flow', async () => {
                const testCustomColumn: CustomTableColumn = {
                    ...customColumn,
                    buildingBlockView: 'sapux.fe.fpm.writer.test.ext.view.CustomColumn',
                    minUI5Version: '1.86'
                };

                const targetViewPath = join(testDir, 'webapp/ext/view/CustomColumn.view.xml');
                const initialViewContent = `<mvc:View xmlns:core="sap.ui.core" xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m"
    xmlns:html="http://www.w3.org/1999/xhtml" controllerName="com.test.myApp.ext.main.Main"
    xmlns:macros="sap.fe.macros">
    <macros:Page>
        <macros:Table>
        </macros:Table>
    </macros:Page>
</mvc:View>`;
                fs.write(targetViewPath, initialViewContent);

                // Pre-create fragment file
                const fragmentPath = join(testDir, `webapp/${customColumn.folder}/${customColumn.name}.fragment.xml`);
                const existingFragmentContent = `<core:Fragment xmlns:core="sap.ui.core">
    <Text text="Existing content" />
</core:Fragment>`;
                fs.write(fragmentPath, existingFragmentContent);

                await generateCustomColumn(testDir, testCustomColumn, fs);

                // Verify existing fragment was not overwritten
                expect(fs.read(fragmentPath)).toBe(existingFragmentContent);

                // Verify building block was still added
                const updatedViewContent = fs.read(targetViewPath);
                expect(updatedViewContent).toMatchSnapshot();
            });
        });
    });

    describe('extractBuildingBlockViewPath', () => {
        describe('successful path extraction', () => {
            test('extracts view path with standard webapp structure', () => {
                const columnPath = '/project/webapp/ext/fragment/custom.fragment.xml';
                const buildingBlockView = 'com.mycompany.myapp.view.CustomView';
                const appId = 'com.mycompany.myapp';

                const result = extractBuildingBlockViewPath(columnPath, buildingBlockView, appId);

                expect(result).toBe('webapp/view/CustomView.view.xml');
            });

            test('extracts view path with nested view structure', () => {
                const columnPath = '/project/webapp/ext/custom/column.fragment.xml';
                const buildingBlockView = 'com.sap.sample.view.custom.DetailView';
                const appId = 'com.sap.sample';

                const result = extractBuildingBlockViewPath(columnPath, buildingBlockView, appId);

                expect(result).toBe('webapp/view/custom/DetailView.view.xml');
            });

            test('extracts view path with deep folder structure', () => {
                const columnPath = '/very/deep/project/myapp/ext/components/custom.fragment.xml';
                const buildingBlockView = 'my.namespace.app.components.views.ListView';
                const appId = 'my.namespace.app';

                const result = extractBuildingBlockViewPath(columnPath, buildingBlockView, appId);

                expect(result).toBe('myapp/components/views/ListView.view.xml');
            });

            test('extracts view path when appId appears multiple times in buildingBlockView', () => {
                const columnPath = '/project/test/ext/custom.fragment.xml';
                const buildingBlockView = 'test.app.test.view.TestView';
                const appId = 'test.app';

                const result = extractBuildingBlockViewPath(columnPath, buildingBlockView, appId);

                expect(result).toBe('test/test/view/TestView.view.xml');
            });

            test('extracts view path with single character webapp folder', () => {
                const columnPath = '/project/a/ext/custom.fragment.xml';
                const buildingBlockView = 'com.app.view.Main';
                const appId = 'com.app';

                const result = extractBuildingBlockViewPath(columnPath, buildingBlockView, appId);

                expect(result).toBe('a/view/Main.view.xml');
            });
        });

        describe('error handling', () => {
            test('throws error when webapp folder cannot be extracted', () => {
                const columnPath = '/ext/custom.fragment.xml'; // No webapp path before /ext
                const buildingBlockView = 'com.app.view.Main';
                const appId = 'com.app';

                expect(() => {
                    extractBuildingBlockViewPath(columnPath, buildingBlockView, appId);
                }).toThrow('Invalid webapp folder extracted from path: /ext/custom.fragment.xml');
            });

            test('throws error when appId is empty', () => {
                const columnPath = '/project/webapp/ext/custom.fragment.xml';
                const buildingBlockView = 'com.app.view.Main';
                const appId = '';

                expect(() => {
                    extractBuildingBlockViewPath(columnPath, buildingBlockView, appId);
                }).toThrow('Application ID not found in manifest');
            });

            test('throws error when appId is not found in buildingBlockView', () => {
                const columnPath = '/project/webapp/ext/custom.fragment.xml';
                const buildingBlockView = 'com.different.app.view.Main';
                const appId = 'com.myapp';

                expect(() => {
                    extractBuildingBlockViewPath(columnPath, buildingBlockView, appId);
                }).toThrow('App ID "com.myapp" not found in buildingBlockView: com.different.app.view.Main');
            });

            test('throws error when buildingBlockView is empty', () => {
                const columnPath = '/project/webapp/ext/custom.fragment.xml';
                const buildingBlockView = '';
                const appId = 'com.app';

                expect(() => {
                    extractBuildingBlockViewPath(columnPath, buildingBlockView, appId);
                }).toThrow('App ID "com.app" not found in buildingBlockView: ');
            });

            test('throws error when path ends with /ext (no webapp folder)', () => {
                const columnPath = '/ext/custom.fragment.xml';
                const buildingBlockView = 'com.app.view.Main';
                const appId = 'com.app';

                expect(() => {
                    extractBuildingBlockViewPath(columnPath, buildingBlockView, appId);
                }).toThrow('Invalid webapp folder extracted from path: /ext/custom.fragment.xml');
            });
        });

        describe('edge cases', () => {
            test('handles path with multiple /ext/ occurrences', () => {
                const columnPath = '/project/webapp/ext/another/ext/custom.fragment.xml';
                const buildingBlockView = 'com.app.view.Main';
                const appId = 'com.app';

                const result = extractBuildingBlockViewPath(columnPath, buildingBlockView, appId);

                expect(result).toBe('webapp/view/Main.view.xml');
            });

            test('handles buildingBlockView with no namespace after appId', () => {
                const columnPath = '/project/webapp/ext/custom.fragment.xml';
                const buildingBlockView = 'com.app.Main';
                const appId = 'com.app';

                const result = extractBuildingBlockViewPath(columnPath, buildingBlockView, appId);

                expect(result).toBe('webapp/Main.view.xml');
            });

            test('handles buildingBlockView that ends exactly with appId', () => {
                const columnPath = '/project/webapp/ext/custom.fragment.xml';
                const buildingBlockView = 'com.app';
                const appId = 'com.app';

                const result = extractBuildingBlockViewPath(columnPath, buildingBlockView, appId);

                expect(result).toBe('webapp/.view.xml');
            });

            test('handles very long paths and namespaces', () => {
                const columnPath = '/very/long/project/path/with/multiple/levels/mywebapp/ext/custom.fragment.xml';
                const buildingBlockView = 'com.very.long.namespace.application.views.components.tables.CustomTableView';
                const appId = 'com.very.long.namespace.application';

                const result = extractBuildingBlockViewPath(columnPath, buildingBlockView, appId);

                expect(result).toBe('mywebapp/views/components/tables/CustomTableView.view.xml');
            });
        });
    });
});
