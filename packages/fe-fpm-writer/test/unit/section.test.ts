import { create, Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { join } from 'path';
import { generateCustomSection, getManifestRoot } from '../../src/section';
import { CustomSection } from '../../src/section/types';
import { Placement } from '../../src/common/types';
import * as manifest from './sample/section/webapp/manifest.json';

const testDir = join(__dirname, 'sample/section');

describe('CustomSection', () => {
    describe('getTemplateRoot', () => {
        const root = join(__dirname, '../../templates');
        const testInput = [
            { version: 1.9, expected: join(root, 'section', '1.86') },
            { version: 1.96, expected: join(root, 'section', '1.86') },
            { version: 1.84, expected: join(root, 'section', '1.85') },
            { version: undefined, expected: join(root, 'section', '1.86') },
            { version: 1.85, expected: join(root, 'section', '1.85') },
            { version: 1.86, expected: join(root, 'section', '1.86') }
        ];
        test.each(testInput)('get root path of template', ({ version, expected }) => {
            expect(getManifestRoot(root, version)).toEqual(expected);
        });
        test('invalid version', () => {
            try {
                getManifestRoot(root, 1.8);
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
        const expectedFragmentPath = join(
            testDir,
            'webapp',
            customSection.folder!,
            `${customSection.name}.fragment.xml`
        );
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
            const updatedManifest: any = fs.readJSON(join(testDir, 'webapp/manifest.json'));

            const settings = updatedManifest['sap.ui5']['routing']['targets']['sample']['options']['settings'];
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
            const updatedManifest: any = fs.readJSON(join(testDir, 'webapp/manifest.json'));

            const settings = updatedManifest['sap.ui5']['routing']['targets']['sample']['options']['settings'];
            expect(settings.content).toMatchSnapshot();

            expect(fs.exists(expectedFragmentPath)).toBe(true);
            expect(fs.read(expectedFragmentPath)).toEqual('dummyContent');
        });

        test('no handler, all properties', () => {
            const testCustomSection: CustomSection = {
                ...customSection
            };
            generateCustomSection(testDir, { ...testCustomSection }, fs);
            const updatedManifest: any = fs.readJSON(join(testDir, 'webapp/manifest.json'));

            const settings = updatedManifest['sap.ui5']['routing']['targets']['sample']['options']['settings'];
            expect(settings.content).toMatchSnapshot();

            expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
        });

        test('custom control', () => {
            const testCustomSection: CustomSection = {
                ...customSection,
                control: '<CustomXML text="" />'
            };
            generateCustomSection(testDir, { ...testCustomSection }, fs);
            const updatedManifest: any = fs.readJSON(join(testDir, 'webapp/manifest.json'));

            const settings = updatedManifest['sap.ui5']['routing']['targets']['sample']['options']['settings'];
            expect(settings.content).toMatchSnapshot();

            expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
        });

        test('no handler, no fs, all properties', () => {
            const testCustomSection: CustomSection = {
                ...customSection
            };

            const testFS = generateCustomSection(testDir, { ...testCustomSection });
            const updatedManifest: any = testFS.readJSON(join(testDir, 'webapp/manifest.json'));

            const settings = updatedManifest['sap.ui5']['routing']['targets']['sample']['options']['settings'];
            expect(settings.content).toMatchSnapshot();

            expect(testFS.read(expectedFragmentPath)).toMatchSnapshot();
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
                'webapp',
                testCustomSection.folder!,
                `${testCustomSection.name}.fragment.xml`
            );
            generateCustomSection(testDir, { ...testCustomSection }, fs);
            const updatedManifest: any = fs.readJSON(join(testDir, 'webapp/manifest.json'));

            const settings = updatedManifest['sap.ui5']['routing']['targets'];
            expect(settings).toMatchSnapshot();

            expect(fs.read(fragmentPath)).toMatchSnapshot();
        });

        const testVersions = [1.9, 1.85, 1.84, 1.86, 1.98];
        for (const ui5Version of testVersions) {
            test(`Versions ${ui5Version}, with handler, all properties`, () => {
                const testCustomSection: CustomSection = {
                    ...customSection,
                    eventHandler: true,
                    ui5Version
                };
                generateCustomSection(testDir, { ...testCustomSection }, fs);
                const updatedManifest: any = fs.readJSON(join(testDir, 'webapp/manifest.json'));

                const settings = updatedManifest['sap.ui5']['routing']['targets']['sample']['options']['settings'];
                expect(settings.content).toMatchSnapshot();

                expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
                expect(fs.read(expectedFragmentPath.replace('.fragment.xml', '.js'))).toMatchSnapshot();
            });
        }

        const folderVariants = ['extensions/custom', 'extensions\\custom'];
        for (const folderVariant of folderVariants) {
            test(`Existing folder variations - ${folderVariant}`, () => {
                const testCustomSection: CustomSection = {
                    target: 'dummy',
                    name: 'DummySection',
                    folder: folderVariant,
                    title: 'Dummy Section',
                    position: {
                        placement: Placement.Before,
                        anchor: 'NewDummyFacet'
                    }
                };
                generateCustomSection(testDir, { ...testCustomSection }, fs);
                const updatedManifest: any = fs.readJSON(join(testDir, 'webapp/manifest.json'));

                const section =
                    updatedManifest['sap.ui5']['routing']['targets'][testCustomSection.target]['options']['settings'][
                        'content'
                    ]['body']['sections'][testCustomSection.name];
                expect(section.template).toEqual('sapux.fe.fpm.writer.test.extensions.custom.DummySection');
            });
        }
    });
});
