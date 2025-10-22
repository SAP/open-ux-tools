import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { join } from 'node:path';
import { generateCustomField } from '../../src/field';
import type { CustomField } from '../../src/field/types';
import type { EventHandlerConfiguration, Manifest } from '../../src/common/types';
import { Placement } from '../../src/common/types';
import * as manifest from './sample/field/webapp/manifest.json';
import { detectTabSpacing } from '../../src/common/file';
import { getEndOfLinesLength, tabSizingTestCases } from '../common';

const testDir = join(__dirname, 'sample/field');

describe('CustomField', () => {
    let fs: Editor;
    const customField: CustomField = {
        target: 'sample',
        targetEntity: '@com.sap.vocabularies.UI.v1.FieldGroup',
        name: 'NewCustomField',
        folder: 'extensions/custom',
        label: 'New Custom Field',
        position: {
            placement: Placement.After,
            anchor: 'DummyField'
        }
    };

    const expectedFragmentPath = join(testDir, `webapp/${customField.folder}/${customField.name}.fragment.xml`);
    beforeEach(() => {
        fs = create(createStorage());
        fs.delete(testDir);
        fs.write(join(testDir, 'webapp/manifest.json'), JSON.stringify(manifest));
    });

    test('no handler, all properties', async () => {
        await generateCustomField(testDir, { ...customField }, fs);

        const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
        const settings = (
            updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
        )['settings'];
        expect(settings.controlConfiguration).toMatchSnapshot();

        expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
    });

    test('no handler - default folder', async () => {
        const expectedFieldFragmentPath = join(testDir, `webapp/ext/newCustomField/NewCustomField.fragment.xml`);
        expect(fs.exists(expectedFieldFragmentPath)).toEqual(false);
        await generateCustomField(testDir, { ...customField, folder: undefined }, fs);

        const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
        const settings = (
            updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
        )['settings'];
        expect(settings.controlConfiguration).toMatchSnapshot();
        expect(fs.exists(expectedFieldFragmentPath)).toEqual(true);
    });

    test('with fragmentFile', async () => {
        const testCustomField: CustomField = {
            ...customField,
            fragmentFile: 'NewCustomFieldFragment'
        };
        const expectedFieldFragmentPath = join(
            testDir,
            `webapp/${testCustomField.folder}/${testCustomField.fragmentFile}.fragment.xml`
        );
        await generateCustomField(testDir, { ...testCustomField }, fs);
        const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
        const settings = (
            updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
        )['settings'];
        expect(settings.controlConfiguration).toMatchSnapshot();
        expect(fs.read(expectedFieldFragmentPath)).toMatchSnapshot();
        expect(fs.exists(expectedFragmentPath.replace('.fragment.xml', '.js'))).toEqual(false);
    });

    test('with handler, all properties', async () => {
        const testCustomField: CustomField = {
            ...customField,
            eventHandler: true
        };
        await generateCustomField(testDir, { ...testCustomField }, fs);
        const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
        const settings = (
            updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
        )['settings'];
        expect(settings.controlConfiguration).toMatchSnapshot();

        expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
        expect(fs.read(expectedFragmentPath.replace('.fragment.xml', '.js'))).toMatchSnapshot();
    });

    test('with existing fragment', async () => {
        const testCustomField: CustomField = {
            ...customField,
            eventHandler: true
        };
        fs.write(expectedFragmentPath, 'dummyContent');

        await generateCustomField(testDir, { ...testCustomField }, fs);

        const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
        const settings = (
            updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
        )['settings'];
        expect(settings.controlConfiguration).toMatchSnapshot();

        expect(fs.exists(expectedFragmentPath)).toBe(true);
        expect(fs.read(expectedFragmentPath)).toEqual('dummyContent');
    });

    test('custom control', async () => {
        const testCustomField: CustomField = {
            ...customField,
            control: '<CustomXML text="" />'
        };
        await generateCustomField(testDir, { ...testCustomField }, fs);

        const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
        const settings = (
            updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
        )['settings'];
        expect(settings.controlConfiguration).toMatchSnapshot();

        expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
    });

    test('no handler, no fs, all properties', async () => {
        const testCustomField: CustomField = {
            ...customField
        };

        const testFS = await generateCustomField(testDir, { ...testCustomField });
        const updatedManifest = testFS.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
        const settings = (
            updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
        )['settings'];
        expect(settings.controlConfiguration).toMatchSnapshot();
        expect(testFS.exists(expectedFragmentPath)).toEqual(true);
    });

    test('different data and not existing target', async () => {
        const testcustomField: CustomField = {
            target: 'dummy',
            targetEntity: 'dummy2',
            name: 'DummyField',
            folder: 'extensions/custom',
            label: 'Dummy Field',
            position: {
                placement: Placement.Before,
                anchor: 'NewDummyFacet'
            }
        };
        const fragmentPath = join(testDir, `webapp/${testcustomField.folder}/${testcustomField.name}.fragment.xml`);
        await generateCustomField(testDir, { ...testcustomField }, fs);

        const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
        const targets = updatedManifest['sap.ui5']?.['routing']?.['targets'];
        expect(targets).toMatchSnapshot();
        expect(fs.exists(fragmentPath)).toEqual(true);
    });

    describe('Test property "eventHandler"', () => {
        const generateCustomFieldWithEventHandler = async (
            fieldId: string,
            eventHandler: string | EventHandlerConfiguration,
            folder?: string
        ) => {
            await generateCustomField(testDir, { ...customField, name: fieldId, folder, eventHandler }, fs);
        };

        test('"eventHandler" is empty "object" - create new file with default function name', async () => {
            const id = customField.name;
            await generateCustomFieldWithEventHandler(id, {}, customField.folder);
            const xmlPath = join(testDir, `webapp/${customField.folder}/${id}.fragment.xml`);
            expect(fs.read(xmlPath)).toMatchSnapshot();
            expect(fs.read(xmlPath.replace('.fragment.xml', '.js'))).toMatchSnapshot();
        });

        test('"eventHandler" is "object" - create new file with custom file and function names', async () => {
            const extension = {
                fnName: 'DummyOnAction',
                fileName: 'dummyAction'
            };
            const id = customField.name;
            await generateCustomFieldWithEventHandler(id, extension, customField.folder);
            const fragmentName = `${id}.fragment.xml`;
            const xmlPath = join(testDir, `webapp/${customField.folder}/${fragmentName}`);
            expect(fs.read(xmlPath)).toMatchSnapshot();
            expect(fs.read(xmlPath.replace(fragmentName, `${extension.fileName}.js`))).toMatchSnapshot();
        });

        test('"eventHandler" is "object" - create new file with custom function name', async () => {
            const extension = {
                fnName: 'DummyOnAction'
            };
            const id = customField.name;
            await generateCustomFieldWithEventHandler(id, extension, customField.folder);
            const xmlPath = join(testDir, `webapp/${customField.folder}/${id}.fragment.xml`);
            expect(fs.read(xmlPath)).toMatchSnapshot();
            expect(fs.read(xmlPath.replace('.fragment.xml', '.js'))).toMatchSnapshot();
        });

        const folder = join('extensions', 'custom');
        const fileName = 'MyExistingAction';
        const existingPath = join(testDir, 'webapp', folder, `${fileName}.js`);

        const fnName = 'onHandleSecondAction';
        const id = customField.name;
        const positions = [
            {
                name: 'position as object',
                position: {
                    line: 8,
                    character: 9
                }
            },
            {
                name: 'absolute position',
                position: 190,
                endOfLines: 8
            }
        ];
        test.each(positions)(
            '"eventHandler" is object. Append new function to existing js file with $name',
            async ({ position, endOfLines }) => {
                // Generate handler with single method - content should be updated during generating of custom field
                fs.copyTpl(join(__dirname, '../../templates', 'common/EventHandler.js'), existingPath, {
                    eventHandlerFnName: 'onPress'
                });
                if (typeof position === 'number' && endOfLines !== undefined) {
                    const content = fs.read(existingPath);
                    position += getEndOfLinesLength(endOfLines, content);
                }
                const extension = {
                    fnName,
                    fileName,
                    insertScript: {
                        fragment: `,\n        ${fnName}: function() {\n            MessageToast.show("Custom handler invoked.");\n        }`,
                        position
                    }
                };

                await generateCustomFieldWithEventHandler(id, extension, folder);
                const xmlPath = join(testDir, 'webapp', folder, `${id}.fragment.xml`);
                expect(fs.read(xmlPath)).toMatchSnapshot();
                // Check update js file content
                expect(fs.read(existingPath)).toMatchSnapshot();
            }
        );
    });

    describe('Test property custom "tabSizing"', () => {
        test.each(tabSizingTestCases)('$name', async ({ tabInfo, expectedAfterSave }) => {
            await generateCustomField(
                testDir,
                {
                    ...customField,
                    tabInfo
                },
                fs
            );
            let updatedManifest = fs.read(join(testDir, 'webapp/manifest.json'));
            let result = detectTabSpacing(updatedManifest);
            expect(result).toEqual(expectedAfterSave);
            // Generate another field and check if new tab sizing recalculated correctly without passing tab size info
            await generateCustomField(
                testDir,
                {
                    ...customField,
                    name: 'second'
                },
                fs
            );
            updatedManifest = fs.read(join(testDir, 'webapp/manifest.json'));
            result = detectTabSpacing(updatedManifest);
            expect(result).toEqual(expectedAfterSave);
        });
    });

    test('Typescript - generate with handler, all properties', async () => {
        const testCustomField: CustomField = {
            ...customField,
            eventHandler: true,
            typescript: true
        };
        await generateCustomField(testDir, { ...testCustomField }, fs);
        const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
        const settings = (
            updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
        )['settings'];
        expect(settings.controlConfiguration).toMatchSnapshot();

        expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
        expect(fs.read(expectedFragmentPath.replace('.fragment.xml', '.ts'))).toMatchSnapshot();
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
            await generateCustomField(
                testDir,
                {
                    ...customField,
                    position: testCase.position
                },
                fs
            );
            const manifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const field = (
                manifest?.['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
            )?.['settings']?.['controlConfiguration']?.['@com.sap.vocabularies.UI.v1.FieldGroup']?.['fields']?.[
                'NewCustomField'
            ];
            expect(field).toMatchSnapshot();
        });
    });

    test('Unsupported version', async () => {
        await expect(generateCustomField(testDir, { ...customField, minUI5Version: '1.83.1' }, fs)).rejects.toThrow(
            'SAP Fiori elements for OData v4 is only supported starting with SAPUI5 1.84.'
        );
    });
});
