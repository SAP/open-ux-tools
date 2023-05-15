import os from 'os';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { join } from 'path';
import { generateCustomSubSection, getManifestRoot } from '../../src/section';
import type { CustomSubSection } from '../../src/section/types';
import type { EventHandlerConfiguration, Manifest } from '../../src/common/types';
import { Placement } from '../../src/common/types';
import * as manifest from './sample/subsection/webapp/manifest.json';
import { detectTabSpacing } from '../../src/common/file';
import { tabSizingTestCases } from '../common';

const testDir = join(__dirname, 'sample/subsection');

describe('SubCustomSection', () => {
    describe('getTemplateRoot', () => {
        const root = join(__dirname, '../../templates');
        const testInput = [
            { version: '1.100', expected: join(root, 'subsection', '1.86') },
            { version: '1.96', expected: join(root, 'subsection', '1.86') },
            { version: '1.84', expected: join(root, 'subsection', '1.85') },
            { version: undefined, expected: join(root, 'subsection', '1.86') },
            { version: '1.85', expected: join(root, 'subsection', '1.85') },
            { version: '1.86', expected: join(root, 'subsection', '1.86') }
        ];
        test.each(testInput)('get root path of template', ({ version, expected }) => {
            expect(getManifestRoot(version, true)).toEqual(expected);
        });
        test('invalid version', () => {
            try {
                getManifestRoot('1.8', true);
                expect(true).toBeFalsy();
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
    });
    describe('generateCustomSubSection', () => {
        let fs: Editor;
        const customSubSection: CustomSubSection = {
            target: 'sample',
            name: 'NewCustomSubSection',
            folder: 'extensions/custom',
            title: 'New Custom Sub Section',
            position: {
                placement: Placement.After,
                anchor: 'DummyFacet'
            },
            parentSection: 'dummyParentFacet'
        };
        const expectedFragmentPath = join(
            testDir,
            `webapp/${customSubSection.folder}/${customSubSection.name}.fragment.xml`
        );
        beforeEach(() => {
            fs = create(createStorage());
            fs.delete(testDir);
            fs.write(join(testDir, 'webapp/manifest.json'), JSON.stringify(manifest));
        });

        test('with handler, all properties', () => {
            const testCustomSubSection: CustomSubSection = {
                ...customSubSection,
                eventHandler: true
            };
            generateCustomSubSection(testDir, { ...testCustomSubSection }, fs);
            const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const settings = (
                updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
            )['settings'];
            expect(settings.content).toMatchSnapshot();

            expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
            expect(fs.read(expectedFragmentPath.replace('.fragment.xml', '.js'))).toMatchSnapshot();
        });

        test('with existing handler, all properties', () => {
            const testCustomSubSection: CustomSubSection = {
                ...customSubSection,
                eventHandler: true
            };
            fs.write(expectedFragmentPath, 'dummyContent');

            generateCustomSubSection(testDir, { ...testCustomSubSection }, fs);

            const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const settings = (
                updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
            )['settings'];
            expect(settings.content).toMatchSnapshot();

            expect(fs.exists(expectedFragmentPath)).toBe(true);
            expect(fs.read(expectedFragmentPath)).toEqual('dummyContent');
        });

        test('no handler, all properties', () => {
            const testCustomSubSection: CustomSubSection = {
                ...customSubSection
            };
            generateCustomSubSection(testDir, { ...testCustomSubSection }, fs);

            const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const settings = (
                updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
            )['settings'];
            expect(settings.content).toMatchSnapshot();

            expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
        });

        test('custom control', () => {
            const testCustomSubSection: CustomSubSection = {
                ...customSubSection,
                control: '<CustomXML text="" />'
            };
            generateCustomSubSection(testDir, { ...testCustomSubSection }, fs);

            const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const settings = (
                updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
            )['settings'];
            expect(settings.content).toMatchSnapshot();

            expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
        });

        test('no handler, no fs, all properties', () => {
            const testCustomSubSection: CustomSubSection = {
                ...customSubSection
            };

            const testFS = generateCustomSubSection(testDir, { ...testCustomSubSection });
            const updatedManifest = testFS.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const settings = (
                updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
            )['settings'];
            expect(settings.content).toMatchSnapshot();

            expect(testFS.read(expectedFragmentPath)).toMatchSnapshot();
        });

        test('different data and not existing target', () => {
            const testCustomSubSection: CustomSubSection = {
                target: 'dummy',
                name: 'DummySubSection',
                folder: 'extensions/custom',
                title: 'Dummy Sub Section',
                position: {
                    placement: Placement.Before,
                    anchor: 'NewDummyFacet'
                },
                parentSection: 'dummyParentFacet'
            };
            const fragmentPath = join(
                testDir,
                `webapp/${testCustomSubSection.folder}/${testCustomSubSection.name}.fragment.xml`
            );
            generateCustomSubSection(testDir, { ...testCustomSubSection }, fs);

            const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const targets = updatedManifest['sap.ui5']?.['routing']?.['targets'];
            expect(targets).toMatchSnapshot();

            expect(fs.read(fragmentPath)).toMatchSnapshot();
        });

        test('Insert custom sub section into existing section without existing subsections', () => {
            const testCustomSubSection: CustomSubSection = {
                ...customSubSection,
                parentSection: 'ExistingFacet1'
            };
            generateCustomSubSection(testDir, { ...testCustomSubSection }, fs);
            const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const settings = (
                updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
            )['settings'];
            expect(settings.content).toMatchSnapshot();
        });

        test('Insert custom sub section into existing section with subsection', () => {
            const testCustomSubSection: CustomSubSection = {
                ...customSubSection,
                parentSection: 'ExistingFacet2'
            };
            generateCustomSubSection(testDir, { ...testCustomSubSection }, fs);
            const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const settings = (
                updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
            )['settings'];
            expect(settings.content).toMatchSnapshot();
        });

        const testVersions = ['1.85', '1.84', '1.86', '1.89', '1.90', '1.98'];
        test.each(testVersions)('Versions %s, with handler, all properties', (minUI5Version) => {
            const testCustomSubSection: CustomSubSection = {
                ...customSubSection,
                eventHandler: true,
                minUI5Version
            };

            generateCustomSubSection(testDir, { ...testCustomSubSection }, fs);

            const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const settings = (
                updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
            )['settings'];
            expect(settings.content).toMatchSnapshot();

            expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
            expect(fs.read(expectedFragmentPath.replace('.fragment.xml', '.js'))).toMatchSnapshot();
        });

        const folderVariants = ['extensions/custom', 'extensions\\custom'];
        test.each(folderVariants)('Existing folder variations - %s', (folderVariant) => {
            const testCustomSubSection = JSON.parse(JSON.stringify(customSubSection));
            testCustomSubSection.folder = folderVariant;

            generateCustomSubSection(testDir, { ...testCustomSubSection }, fs);

            const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const settings = (
                updatedManifest['sap.ui5']?.['routing']?.['targets']?.[testCustomSubSection.target]?.[
                    'options'
                ] as Record<string, any>
            )['settings'];
            const section =
                settings['content']['body']['sections'][testCustomSubSection.parentSection]['subSections'][
                    testCustomSubSection.name
                ];
            expect(section.template).toEqual(`sapux.fe.fpm.writer.test.extensions.custom.${testCustomSubSection.name}`);
        });

        describe('Test property "eventHandler"', () => {
            const generateCustomSubSectionWithEventHandler = (
                sectionId: string,
                eventHandler: string | EventHandlerConfiguration,
                folder?: string
            ) => {
                generateCustomSubSection(testDir, { ...customSubSection, name: sectionId, folder, eventHandler }, fs);
            };

            test('"eventHandler" is empty "object" - create new file with default function name', () => {
                const id = customSubSection.name;
                generateCustomSubSectionWithEventHandler(id, {}, customSubSection.folder);
                const xmlPath = join(testDir, `webapp/${customSubSection.folder}/${id}.fragment.xml`);
                expect(fs.read(xmlPath)).toMatchSnapshot();
                expect(fs.read(xmlPath.replace('.fragment.xml', '.js'))).toMatchSnapshot();
            });

            test('"eventHandler" is "object" - create new file with custom file and function names', () => {
                const extension = {
                    fnName: 'DummyOnAction',
                    fileName: 'dummyAction'
                };
                const id = customSubSection.name;
                generateCustomSubSectionWithEventHandler(id, extension, customSubSection.folder);
                const fragmentName = `${id}.fragment.xml`;
                const xmlPath = join(testDir, `webapp/${customSubSection.folder}/${fragmentName}`);
                expect(fs.read(xmlPath)).toMatchSnapshot();
                expect(fs.read(xmlPath.replace(fragmentName, `${extension.fileName}.js`))).toMatchSnapshot();
            });

            test('"eventHandler" is "object" - create new file with custom function name', () => {
                const extension = {
                    fnName: 'DummyOnAction'
                };
                const id = customSubSection.name;
                generateCustomSubSectionWithEventHandler(id, extension, customSubSection.folder);
                const xmlPath = join(testDir, `webapp/${customSubSection.folder}/${id}.fragment.xml`);
                expect(fs.read(xmlPath)).toMatchSnapshot();
                expect(fs.read(xmlPath.replace('.fragment.xml', '.js'))).toMatchSnapshot();
            });

            const folder = join('extensions', 'custom');
            const fileName = 'MyExistingAction';
            const existingPath = join(testDir, 'webapp', folder, `${fileName}.js`);

            const fnName = 'onHandleSecondAction';
            const id = customSubSection.name;
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
                    position: 196 + 8 * os.EOL.length
                }
            ];
            test.each(positions)(
                '"eventHandler" is object. Append new function to existing js file with $name',
                ({ position }) => {
                    const extension = {
                        fnName,
                        fileName,
                        insertScript: {
                            fragment: `,\n        ${fnName}: function() {\n            MessageToast.show("Custom handler invoked.");\n        }`,
                            position
                        }
                    };
                    // Generate handler with single method - content should be updated during generating of custom section
                    fs.copyTpl(join(__dirname, '../../templates', 'common/EventHandler.js'), existingPath);

                    generateCustomSubSectionWithEventHandler(id, extension, folder);
                    const xmlPath = join(testDir, 'webapp', folder, `${id}.fragment.xml`);
                    expect(fs.read(xmlPath)).toMatchSnapshot();
                    // Check update js file content
                    expect(fs.read(existingPath)).toMatchSnapshot();
                }
            );
        });

        describe('Test property custom "tabSizing"', () => {
            test.each(tabSizingTestCases)('$name', ({ tabInfo, expectedAfterSave }) => {
                generateCustomSubSection(
                    testDir,
                    {
                        ...customSubSection,
                        tabInfo
                    },
                    fs
                );
                let updatedManifest = fs.read(join(testDir, 'webapp/manifest.json'));
                let result = detectTabSpacing(updatedManifest);
                expect(result).toEqual(expectedAfterSave);
                // Generate another section and check if new tab sizing recalculated correctly without passing tab size info
                generateCustomSubSection(
                    testDir,
                    {
                        ...customSubSection,
                        name: 'second'
                    },
                    fs
                );
                updatedManifest = fs.read(join(testDir, 'webapp/manifest.json'));
                result = detectTabSpacing(updatedManifest);
                expect(result).toEqual(expectedAfterSave);
            });
        });
    });
});
