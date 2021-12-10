import { create, Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { join } from 'path';
import { generateCustomAction, CustomAction } from '../../src';
import { generateCustomSection } from '../../src/section';
import { CustomSection, CustomSectionType } from '../../src/section/types';
import { Placement } from '../../src/common/types';
import * as manifest from './sample/section/webapp/manifest.json';

const testDir = join(__dirname, 'sample/section');

describe('CustomSection', () => {
    describe('generateCustomSection', () => {
        let fs: Editor;
        const customSection: CustomSection = {
            target: 'sample',
            name: 'NewCustomSection',
            folder: 'extensions/custom',
            title: 'New Custom Section',
            type: CustomSectionType.XMLFragment,
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
        test('generateCustomSection, with handler, all properties', () => {
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

        test('generateCustomSection, no handler, all properties', () => {
            const testCustomSection: CustomSection = {
                ...customSection
            };
            generateCustomSection(testDir, { ...testCustomSection }, fs);
            const updatedManifest: any = fs.readJSON(join(testDir, 'webapp/manifest.json'));

            const settings = updatedManifest['sap.ui5']['routing']['targets']['sample']['options']['settings'];
            expect(settings.content).toMatchSnapshot();

            expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
        });

        test('generateCustomSection, custom control', () => {
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

        test('generateCustomSection, no handler, no fs, all properties', () => {
            const testCustomSection: CustomSection = {
                ...customSection
            };

            const testFS = generateCustomSection(testDir, { ...testCustomSection });
            const updatedManifest: any = testFS.readJSON(join(testDir, 'webapp/manifest.json'));

            const settings = updatedManifest['sap.ui5']['routing']['targets']['sample']['options']['settings'];
            expect(settings.content).toMatchSnapshot();

            expect(testFS.read(expectedFragmentPath)).toMatchSnapshot();
        });

        test('generateCustomSection - different data and unexisting target', () => {
            const testCustomSection: CustomSection = {
                target: 'dummy',
                name: 'DummySection',
                folder: 'extensions/custom',
                title: 'Dummy Section',
                type: CustomSectionType.XMLFragment,
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
    });
});
