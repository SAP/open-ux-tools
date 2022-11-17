import os from 'os';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { join } from 'path';
import { generateCustomColumn } from '../../src';
import { getManifestRoot } from '../../src/column';
import type { CustomTableColumn } from '../../src/column/types';
import { Availability, HorizontalAlign } from '../../src/column/types';
import * as manifest from './sample/column/webapp/manifest.json';
import type { EventHandlerConfiguration, FileContentPosition, Manifest } from '../../src/common/types';
import { Placement } from '../../src/common/types';

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

        test.each(testVersions)('only mandatory properties', (minUI5Version) => {
            //sut
            generateCustomColumn(testDir, { ...customColumn, minUI5Version }, fs);
            const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const settings = (
                updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
            )['settings'];
            expect(settings).toBeDefined();
            expect(settings.controlConfiguration).toMatchSnapshot();

            expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
        });

        test('version 1.86, with new handler, all properties', () => {
            const testCustomColumn: CustomTableColumn = {
                ...customColumn,
                eventHandler: true,
                availability: Availability.Adaptation,
                horizontalAlign: HorizontalAlign.Center,
                width: '150px',
                properties: ['ID', 'TotalNetAmount', '_CustomerPaymentTerms/CustomerPaymentTerms']
            };
            generateCustomColumn(testDir, { ...testCustomColumn, minUI5Version: '1.86' }, fs);
            const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const settings = (
                updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
            )['settings'];
            expect(settings.controlConfiguration).toMatchSnapshot();

            expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
            expect(fs.read(expectedFragmentPath.replace('.fragment.xml', '.js'))).toMatchSnapshot();
        });
        test('version 1.86, with existing handler', () => {
            const controllerPath = 'my.test.App.ext.ExistingHandler.onCustomAction';
            fs.write(controllerPath, 'dummyContent');
            const testCustomColumn: CustomTableColumn = {
                ...customColumn,
                eventHandler: controllerPath
            };
            generateCustomColumn(testDir, { ...testCustomColumn, minUI5Version: '1.86' }, fs);
            const updatedManifest: any = fs.readJSON(join(testDir, 'webapp/manifest.json'));

            const settings = updatedManifest['sap.ui5']['routing']['targets']['sample']['options']['settings'];
            expect(settings.controlConfiguration).toMatchSnapshot();

            expect(fs.exists(controllerPath)).toBe(true);
            expect(fs.read(controllerPath)).toEqual('dummyContent');
        });
        test('version 1.85, no handler, all properties', () => {
            const testCustomColumn: CustomTableColumn = {
                ...customColumn,
                availability: Availability.Adaptation,
                horizontalAlign: HorizontalAlign.Center,
                width: '150px'
            };

            generateCustomColumn(testDir, { ...testCustomColumn, minUI5Version: '1.85' }, fs);

            const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const settings = (
                updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
            )['settings'];
            expect(settings.controlConfiguration).toMatchSnapshot();

            expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
        });
        test('with custom control passed in interface', () => {
            const testCustomColumn: CustomTableColumn = {
                ...customColumn,
                control: '<CustomXML text="" />'
            };

            generateCustomColumn(testDir, testCustomColumn, fs);

            const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const settings = (
                updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
            )['settings'];
            expect(settings.controlConfiguration).toMatchSnapshot();

            expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
        });
        test('version 1.85, no handler, no fs, all properties', () => {
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

            const testFS = generateCustomColumn(testDir, { ...testCustomColumn, minUI5Version: '1.85' });

            const updatedManifest = testFS.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const settings = (
                updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
            )['settings'];
            expect(settings.controlConfiguration).toMatchSnapshot();
            expect(testFS.read(expectedFragmentPath)).toMatchSnapshot();
        });

        test('version 1.102, no handler, filename lowercase', () => {
            const testCustomColumn: CustomTableColumn = {
                ...customColumn,
                name: 'newCustomColumn',
                folder: 'extensions/custom'
            };

            const testFS = generateCustomColumn(testDir, { ...testCustomColumn, minUI5Version: '1.102' });
            const fragmentPath = join(
                testDir,
                `webapp`,
                `${customColumn.folder}`,
                `${testCustomColumn.name}.fragment.xml`
            );
            expect(testFS.exists(fragmentPath)).toBeTruthy();
        });

        test('version 1.102, no handler, filename lowercase, no folder passed', () => {
            const testCustomColumn: CustomTableColumn = {
                ...customColumn,
                name: 'newCustomColumn',
                folder: undefined
            };

            const testFS = generateCustomColumn(testDir, { ...testCustomColumn, minUI5Version: '1.102' });
            const fragmentPath = join(
                testDir,
                `webapp`,
                `ext`,
                `newCustomColumn`,
                `${testCustomColumn.name}.fragment.xml`
            );
            expect(testFS.exists(fragmentPath)).toBeTruthy();
        });

        test('version 1.102, no handler, filename lowercase, folder uppercase', () => {
            const testCustomColumn: CustomTableColumn = {
                ...customColumn,
                name: 'newCustomColumn',
                folder: 'extensions/Custom'
            };

            const testFS = generateCustomColumn(testDir, { ...testCustomColumn, minUI5Version: '1.102' });
            const fragmentPath = join(
                testDir,
                `webapp`,
                `${testCustomColumn.folder}`,
                `${testCustomColumn.name}.fragment.xml`
            );
            expect(testFS.exists(fragmentPath)).toBeTruthy();
        });

        describe('Test property "eventHandler"', () => {
            const generateCustomColumnWithEventHandler = (
                columnId: string,
                eventHandler: string | EventHandlerConfiguration,
                folder?: string
            ) => {
                generateCustomColumn(testDir, { ...customColumn, name: columnId, folder, eventHandler }, fs);
            };

            test('"eventHandler" is empty "object" - create new file with default function name', () => {
                const id = customColumn.name;
                generateCustomColumnWithEventHandler(id, {}, customColumn.folder);
                const xmlPath = join(testDir, `webapp/${customColumn.folder}/${id}.fragment.xml`);
                expect(fs.read(xmlPath)).toMatchSnapshot();
                expect(fs.read(xmlPath.replace('.fragment.xml', '.js'))).toMatchSnapshot();
            });

            test('"eventHandler" is "object" - create new file with custom file and function names', () => {
                const extension = {
                    fnName: 'DummyOnAction',
                    fileName: 'dummyAction'
                };
                const id = customColumn.name;
                generateCustomColumnWithEventHandler(id, extension, customColumn.folder);
                const fragmentName = `${id}.fragment.xml`;
                const xmlPath = join(testDir, `webapp/${customColumn.folder}/${fragmentName}`);
                expect(fs.read(xmlPath)).toMatchSnapshot();
                expect(fs.read(xmlPath.replace(fragmentName, `${extension.fileName}.js`))).toMatchSnapshot();
            });

            test('"eventHandler" is "object" - create new file with custom function name', () => {
                const extension = {
                    fnName: 'DummyOnAction'
                };
                const id = customColumn.name;
                generateCustomColumnWithEventHandler(id, extension, customColumn.folder);
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
                    }
                ],
                ['absolute position', 196 + 8 * os.EOL.length]
            ])(
                '"eventHandler" is object. Append new function to existing js file with %s',
                (_desc: string, position: number | FileContentPosition) => {
                    const fileName = 'MyExistingAction';
                    // Create existing file with existing actions
                    const folder = join('extensions', 'custom');
                    const existingPath = join(testDir, 'webapp', folder, `${fileName}.js`);
                    // Generate handler with single method - content should be updated during generating of custom column
                    fs.copyTpl(join(__dirname, '../../templates', 'common/EventHandler.js'), existingPath);
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
                    generateCustomColumnWithEventHandler(id, extension, folder);
                    const xmlPath = join(testDir, 'webapp', folder, `${id}.fragment.xml`);
                    expect(fs.read(xmlPath)).toMatchSnapshot();
                    // Check update js file content
                    expect(fs.read(existingPath)).toMatchSnapshot();
                }
            );
        });
    });
});
