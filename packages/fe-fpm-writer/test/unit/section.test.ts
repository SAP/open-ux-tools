import os from 'os';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { join } from 'path';
import { generateCustomSection, getManifestRoot } from '../../src/section';
import type { CustomSection } from '../../src/section/types';
import type { EventHandlerConfiguration, Manifest } from '../../src/common/types';
import { Placement } from '../../src/common/types';
import * as manifest from './sample/section/webapp/manifest.json';

const testDir = join(__dirname, 'sample/section');

describe('CustomSection', () => {
    describe('getTemplateRoot', () => {
        const root = join(__dirname, '../../templates');
        const testInput = [
            { version: '1.100', expected: join(root, 'section', '1.86') },
            { version: '1.96', expected: join(root, 'section', '1.86') },
            { version: '1.84', expected: join(root, 'section', '1.85') },
            { version: undefined, expected: join(root, 'section', '1.86') },
            { version: '1.85', expected: join(root, 'section', '1.85') },
            { version: '1.86', expected: join(root, 'section', '1.86') }
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
    describe('generateCustomSection', () => {
        let fs: Editor;
        const customSection: CustomSection = {
            target: 'sample',
            name: 'NewCustomSection',
            folder: 'extensions/custom',
            title: 'New Custom Section',
            position: {
                placement: Placement.After,
                anchor: 'DummyFacet'
            }
        };
        const expectedFragmentPath = join(testDir, `webapp/${customSection.folder}/${customSection.name}.fragment.xml`);
        beforeEach(() => {
            fs = create(createStorage());
            fs.delete(testDir);
            fs.write(join(testDir, 'webapp/manifest.json'), JSON.stringify(manifest));
        });
        test('with handler, all properties', () => {
            const testCustomSection: CustomSection = {
                ...customSection,
                eventHandler: true
            };
            generateCustomSection(testDir, { ...testCustomSection }, fs);
            const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const settings = (
                updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
            )['settings'];
            expect(settings.content).toMatchSnapshot();

            expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
            expect(fs.read(expectedFragmentPath.replace('.fragment.xml', '.js'))).toMatchSnapshot();
        });
        test('with existing handler, all properties', () => {
            const testCustomSection: CustomSection = {
                ...customSection,
                eventHandler: true
            };
            fs.write(expectedFragmentPath, 'dummyContent');

            generateCustomSection(testDir, { ...testCustomSection }, fs);

            const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const settings = (
                updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
            )['settings'];
            expect(settings.content).toMatchSnapshot();

            expect(fs.exists(expectedFragmentPath)).toBe(true);
            expect(fs.read(expectedFragmentPath)).toEqual('dummyContent');
        });

        test('no handler, all properties', () => {
            const testCustomSection: CustomSection = {
                ...customSection
            };
            generateCustomSection(testDir, { ...testCustomSection }, fs);

            const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const settings = (
                updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
            )['settings'];
            expect(settings.content).toMatchSnapshot();

            expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
        });

        test('custom control', () => {
            const testCustomSection: CustomSection = {
                ...customSection,
                control: '<CustomXML text="" />'
            };
            generateCustomSection(testDir, { ...testCustomSection }, fs);

            const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const settings = (
                updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
            )['settings'];
            expect(settings.content).toMatchSnapshot();

            expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
        });

        test('no handler, no fs, all properties', () => {
            const testCustomSection: CustomSection = {
                ...customSection
            };

            const testFS = generateCustomSection(testDir, { ...testCustomSection });
            const updatedManifest = testFS.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const settings = (
                updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
            )['settings'];
            expect(settings.content).toMatchSnapshot();

            expect(testFS.read(expectedFragmentPath)).toMatchSnapshot();
        });

        test('no handler, no fs, no folder, section name uppercase', () => {
            const testCustomSection: CustomSection = {
                ...customSection,
                folder: undefined
            };

            const testFS = generateCustomSection(testDir, { ...testCustomSection });
            const fragmentPath = join(
                testDir,
                `webapp`,
                `ext`,
                `newCustomSection`,
                `${testCustomSection.name}.fragment.xml`
            );
            expect(testFS.exists(fragmentPath)).toBeTruthy();
        });

        test('no handler, no fs, no folder, section name lowercase', () => {
            const testCustomSection: CustomSection = {
                ...customSection,
                folder: undefined,
                name: 'newCustomSection'
            };

            const testFS = generateCustomSection(testDir, { ...testCustomSection });
            const fragmentPath = join(
                testDir,
                `webapp`,
                `ext`,
                `${testCustomSection.name}`,
                `${testCustomSection.name}.fragment.xml`
            );
            expect(testFS.exists(fragmentPath)).toBeTruthy();
        });

        test('no handler, no fs, no folder, section name uppercase', () => {
            const testCustomSection: CustomSection = {
                ...customSection,
                folder: undefined,
                name: 'NewCustomSection'
            };

            const testFS = generateCustomSection(testDir, { ...testCustomSection });

            const fragmentPath = join(
                testDir,
                `webapp`,
                `ext`,
                'newCustomSection',
                `${testCustomSection.name}.fragment.xml`
            );
            expect(testFS.exists(fragmentPath)).toBeTruthy();
        });

        test('no handler, no fs, folder upper case, section name lowercase', () => {
            const testCustomSection: CustomSection = {
                ...customSection,
                folder: 'Any',
                name: 'newCustomSection'
            };

            const testFS = generateCustomSection(testDir, { ...testCustomSection });
            const fragmentPath = join(
                testDir,
                `webapp`,
                `${testCustomSection.folder}`,
                `${testCustomSection.name}.fragment.xml`
            );
            expect(testFS.exists(fragmentPath)).toBeTruthy();
        });

        test('different data and not existing target', () => {
            const testCustomSection: CustomSection = {
                target: 'dummy',
                name: 'DummySection',
                folder: 'extensions/custom',
                title: 'Dummy Section',
                position: {
                    placement: Placement.Before,
                    anchor: 'NewDummyFacet'
                }
            };
            const fragmentPath = join(
                testDir,
                `webapp/${testCustomSection.folder}/${testCustomSection.name}.fragment.xml`
            );
            generateCustomSection(testDir, { ...testCustomSection }, fs);

            const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const targets = updatedManifest['sap.ui5']?.['routing']?.['targets'];
            expect(targets).toMatchSnapshot();

            expect(fs.read(fragmentPath)).toMatchSnapshot();
        });

        const testVersions = ['1.85', '1.84', '1.86', '1.89', '1.90', '1.98'];
        test.each(testVersions)('Versions %s, with handler, all properties', (minUI5Version) => {
            const testCustomSection: CustomSection = {
                ...customSection,
                eventHandler: true,
                minUI5Version
            };

            generateCustomSection(testDir, { ...testCustomSection }, fs);

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
            const testCustomSection = JSON.parse(JSON.stringify(customSection));
            testCustomSection.folder = folderVariant;

            generateCustomSection(testDir, { ...testCustomSection }, fs);

            const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const settings = (
                updatedManifest['sap.ui5']?.['routing']?.['targets']?.[testCustomSection.target]?.['options'] as Record<
                    string,
                    any
                >
            )['settings'];
            const section = settings['content']['body']['sections'][testCustomSection.name];
            expect(section.template).toEqual(`sapux.fe.fpm.writer.test.extensions.custom.${testCustomSection.name}`);
        });

        describe('Test property "eventHandler"', () => {
            const generateCustomSectionWithEventHandler = (
                sectionId: string,
                eventHandler: string | EventHandlerConfiguration,
                folder?: string
            ) => {
                generateCustomSection(testDir, { ...customSection, name: sectionId, folder, eventHandler }, fs);
            };

            test('"eventHandler" is empty "object" - create new file with default function name', () => {
                const id = customSection.name;
                generateCustomSectionWithEventHandler(id, {}, customSection.folder);
                const xmlPath = join(testDir, `webapp/${customSection.folder}/${id}.fragment.xml`);
                expect(fs.read(xmlPath)).toMatchSnapshot();
                expect(fs.read(xmlPath.replace('.fragment.xml', '.js'))).toMatchSnapshot();
            });

            test('"eventHandler" is "object" - create new file with custom file and function names', () => {
                const extension = {
                    fnName: 'DummyOnAction',
                    fileName: 'dummyAction'
                };
                const id = customSection.name;
                generateCustomSectionWithEventHandler(id, extension, customSection.folder);
                const fragmentName = `${id}.fragment.xml`;
                const xmlPath = join(testDir, `webapp/${customSection.folder}/${fragmentName}`);
                expect(fs.read(xmlPath)).toMatchSnapshot();
                expect(fs.read(xmlPath.replace(fragmentName, `${extension.fileName}.js`))).toMatchSnapshot();
            });

            test('"eventHandler" is "object" - create new file with custom function name', () => {
                const extension = {
                    fnName: 'DummyOnAction'
                };
                const id = customSection.name;
                generateCustomSectionWithEventHandler(id, extension, customSection.folder);
                const xmlPath = join(testDir, `webapp/${customSection.folder}/${id}.fragment.xml`);
                expect(fs.read(xmlPath)).toMatchSnapshot();
                expect(fs.read(xmlPath.replace('.fragment.xml', '.js'))).toMatchSnapshot();
            });

            const folder = join('extensions', 'custom');
            const fileName = 'MyExistingAction';
            const existingPath = join(testDir, 'webapp', folder, `${fileName}.js`);

            const fnName = 'onHandleSecondAction';
            const id = customSection.name;
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

                    generateCustomSectionWithEventHandler(id, extension, folder);
                    const xmlPath = join(testDir, 'webapp', folder, `${id}.fragment.xml`);
                    expect(fs.read(xmlPath)).toMatchSnapshot();
                    // Check update js file content
                    expect(fs.read(existingPath)).toMatchSnapshot();
                }
            );
        });
    });
});
