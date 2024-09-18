import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { join } from 'path';
import { generateCustomHeaderSection } from '../../src/section';
import type { HeaderSectionEditProperty } from '../../src/section/types';
import { RequestGroupId, type CustomHeaderSection, DesignTime } from '../../src/section/types';
import type { Manifest } from '../../src/common/types';
import { Placement } from '../../src/common/types';
import * as manifestSections from './sample/section/webapp/manifest.json';

const testDir = join(__dirname, 'sample/headers-ection');

describe('CustomHeaderSection generateCustomHeaderSection', () => {
    let fs: Editor;
    const testVersions = ['1.86', '1.98'];

    const createCustomHeaderSectionWithEditFragment = (
        minUI5Version?: string,
        edit?: HeaderSectionEditProperty
    ): CustomHeaderSection => {
        return {
            target: 'sample',
            name: 'NewCustomHeaderSection',
            folder: 'extensions/custom',
            title: 'New Custom Header Section',
            subTitle: 'Custom Header section subtitle',
            stashed: false,
            edit,
            requestGroupId: RequestGroupId.Decoration,
            flexSettings: {
                designtime: DesignTime.Default
            },
            minUI5Version,
            eventHandler: true
        };
    };

    /*  for custom header sections 2 fragment definitions are supported:
        1. template - standard fragment
        2. templateEdit - fragment in edit mode (from version 1.86)
        we test 2 scenarios (fragments in same folder and differents folders) for 3 different versions - 1.85, 1.86 and 1.98
    */

    describe('View mode and edit mode fragments in same extension folder', () => {
        let expectedEditFragmentPath: string;

        beforeEach(() => {
            const manifest = JSON.parse(JSON.stringify(manifestSections));
            manifest['sap.ui5'].routing.targets.sample.options.settings.content.body.sections = {};
            fs = create(createStorage());
            fs.delete(testDir);
            fs.write(join(testDir, 'webapp/manifest.json'), JSON.stringify(manifest));
        });

        test(`for version 1.85 (edit mode not supported)`, async () => {
            const customHeaderSection = createCustomHeaderSectionWithEditFragment('1.85.0', {
                name: 'NewCustomHeaderSectionEdit',
                folder: 'extensions/custom',
                eventHandler: true
            });
            const expectedFragmentPath = join(
                testDir,
                `webapp/${customHeaderSection.folder}/${customHeaderSection.name}.fragment.xml`
            );
            if (customHeaderSection.edit?.folder) {
                expectedEditFragmentPath = join(
                    testDir,
                    `webapp/${customHeaderSection.edit.folder}/${customHeaderSection.edit.name}.fragment.xml`
                );
            }
            await generateCustomHeaderSection(testDir, { ...customHeaderSection }, fs);

            const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const settings = (
                updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
            )['settings'];
            expect(settings.content).toMatchSnapshot();
            expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
            expect(fs.read(expectedFragmentPath.replace('.fragment.xml', '.js'))).toMatchSnapshot();
            expect(expectedEditFragmentPath).toBeDefined();
            // fragment is not generated, file does not exist
            try {
                fs.read(expectedEditFragmentPath);
            } catch (error) {
                expect(error).toBeDefined();
            }
        });

        test(`for version 1.86 (edit mode disabled)`, async () => {
            const customHeaderSection = createCustomHeaderSectionWithEditFragment('1.86.0', undefined);
            const expectedFragmentPath = join(
                testDir,
                `webapp/${customHeaderSection.folder}/${customHeaderSection.name}.fragment.xml`
            );
            await generateCustomHeaderSection(testDir, { ...customHeaderSection }, fs);

            const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const settings = (
                updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
            )['settings'];
            expect(settings.content).toMatchSnapshot();
            expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
            expect(fs.read(expectedFragmentPath.replace('.fragment.xml', '.js'))).toMatchSnapshot();
            expect(expectedEditFragmentPath).toBeDefined();
            // edit fragment is not generated, file does not exist
            try {
                fs.read(expectedEditFragmentPath);
            } catch (error) {
                expect(error).toBeDefined();
            }
        });

        test(`for version 1.86 (eventHandler should not generate)`, async () => {
            const customHeaderSection = createCustomHeaderSectionWithEditFragment('1.86.0', {
                name: 'NewCustomHeaderSectionEdit',
                folder: 'extensions/custom'
            });
            const expectedFragmentPath = join(
                testDir,
                `webapp/${customHeaderSection.folder}/${customHeaderSection.name}.fragment.xml`
            );
            if (customHeaderSection.edit?.folder) {
                expectedEditFragmentPath = join(
                    testDir,
                    `webapp/${customHeaderSection.edit.folder}/${customHeaderSection.edit.name}.fragment.xml`
                );
            }
            await generateCustomHeaderSection(testDir, { ...customHeaderSection }, fs);

            const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const settings = (
                updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
            )['settings'];
            expect(settings.content).toMatchSnapshot();
            expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
            expect(fs.read(expectedFragmentPath.replace('.fragment.xml', '.js'))).toMatchSnapshot();
            expect(expectedEditFragmentPath).toBeDefined();
            // event handler is not generated, file does not exist
            try {
                fs.read(expectedEditFragmentPath).replace('.fragment.xml', '.js');
            } catch (error) {
                expect(error).toBeDefined();
            }
        });

        testVersions.forEach((minUI5Version: string) => {
            test(`for version ${minUI5Version}`, async () => {
                const customHeaderSection = createCustomHeaderSectionWithEditFragment(minUI5Version, {
                    name: 'NewCustomHeaderSectionEdit',
                    folder: 'extensions/custom',
                    eventHandler: true
                });
                const expectedFragmentPath = join(
                    testDir,
                    `webapp/${customHeaderSection.folder}/${customHeaderSection.name}.fragment.xml`
                );
                if (customHeaderSection.edit?.folder) {
                    expectedEditFragmentPath = join(
                        testDir,
                        `webapp/${customHeaderSection.edit.folder}/${customHeaderSection.edit.name}.fragment.xml`
                    );
                }
                await generateCustomHeaderSection(testDir, { ...customHeaderSection }, fs);

                const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
                const settings = (
                    updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
                )['settings'];
                expect(settings.content).toMatchSnapshot();
                expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
                expect(fs.read(expectedFragmentPath.replace('.fragment.xml', '.js'))).toMatchSnapshot();
                expect(expectedEditFragmentPath).toBeDefined();
                expect(fs.read(expectedEditFragmentPath)).toMatchSnapshot();
                expect(fs.read(expectedEditFragmentPath.replace('.fragment.xml', '.js'))).toMatchSnapshot();
            });
        });

        test('custom control for edit mode', async () => {
            const customHeaderSection = createCustomHeaderSectionWithEditFragment('1.98', {
                name: 'NewCustomHeaderSectionEdit',
                folder: 'extensions/custom',
                control: '<CustomXML text="" />'
            } as HeaderSectionEditProperty);
            const expectedFragmentPath = join(
                testDir,
                `webapp/${customHeaderSection.edit?.folder}/${customHeaderSection.edit?.name}.fragment.xml`
            );
            await generateCustomHeaderSection(testDir, customHeaderSection, fs);

            expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
        });
    });

    describe('View mode and edit mode fragments in different extension folders', () => {
        let expectedEditFragmentPath: string;

        beforeEach(() => {
            const manifest = JSON.parse(JSON.stringify(manifestSections));
            manifest['sap.ui5'].routing.targets.sample.options.settings.content.body.sections = {};
            fs = create(createStorage());
            fs.delete(testDir);
            fs.write(join(testDir, 'webapp/manifest.json'), JSON.stringify(manifest));
        });

        // folder in edit property differs
        test(`for version 1.86`, async () => {
            const customHeaderSection = createCustomHeaderSectionWithEditFragment('1.86.0', {
                name: 'NewCustomHeaderSectionEdit',
                folder: 'extensions/custom/different',
                eventHandler: true
            });
            const expectedFragmentPath = join(
                testDir,
                `webapp/${customHeaderSection.folder}/${customHeaderSection.name}.fragment.xml`
            );
            if (customHeaderSection.edit?.folder) {
                expectedEditFragmentPath = join(
                    testDir,
                    `webapp/${customHeaderSection.edit.folder}/${customHeaderSection.edit.name}.fragment.xml`
                );
            }
            await generateCustomHeaderSection(testDir, { ...customHeaderSection }, fs);

            const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const settings = (
                updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
            )['settings'];
            expect(settings.content).toMatchSnapshot();
            expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
            expect(fs.read(expectedFragmentPath.replace('.fragment.xml', '.js'))).toMatchSnapshot();
            expect(expectedEditFragmentPath).toBeDefined();
            expect(fs.read(expectedEditFragmentPath)).toMatchSnapshot();
            expect(fs.read(expectedEditFragmentPath.replace('.fragment.xml', '.js'))).toMatchSnapshot();
        });
    });

    describe('Positions', () => {
        // position tests
        const positionTests = [
            {
                name: 'Create with anchor - latest ui5',
                position: {
                    placement: Placement.Before,
                    anchor: 'Dummy'
                }
            },
            {
                name: 'Create without anchor - latest ui5',
                position: {
                    placement: Placement.Before
                }
            },
            {
                name: 'Create without position - latest ui5',
                position: undefined
            },
            {
                name: 'Create with anchor - 1.85 ui5',
                position: {
                    placement: Placement.Before,
                    anchor: 'Dummy'
                },
                minUI5Version: '1.85.1'
            },
            {
                name: 'Create without anchor - 1.85 ui5',
                position: {
                    placement: Placement.Before
                },
                minUI5Version: '1.85.1'
            },
            {
                name: 'Create without position - 1.85 ui5',
                position: undefined,
                minUI5Version: '1.85.1'
            }
        ];
        positionTests.forEach((testCase) => {
            test(`Test 'position' property. ${testCase.name}`, async () => {
                const customHeaderSection = createCustomHeaderSectionWithEditFragment(testCase.minUI5Version, {
                    name: 'NewCustomHeaderSectionEdit',
                    folder: 'extensions/custom'
                });
                await generateCustomHeaderSection(
                    testDir,
                    {
                        ...customHeaderSection,
                        position: testCase.position
                    },
                    fs
                );
                const manifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
                const headerSection = (
                    manifest?.['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
                )?.['settings']?.['content']?.['header']?.['facets']?.['NewCustomHeaderSection'];
                expect(headerSection).toMatchSnapshot();
            });
        });
    });
});
