import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { join } from 'path';
import { generateCustomHeaderSection } from '../../src/section';
import { RequestGroupId, type CustomHeaderSection, DesignTime } from '../../src/section/types';
import type { Manifest } from '../../src/common/types';
import { Placement } from '../../src/common/types';
import * as manifestSections from './sample/section/webapp/manifest.json';

const testDir = join(__dirname, 'sample/headersection');

describe('CustomHeaderSection generateCustomHeaderSection', () => {
    let fs: Editor;
    const testVersions = ['1.85', '1.86', '1.98'];

    beforeEach(() => {
        const manifest = JSON.parse(JSON.stringify(manifestSections));
        manifest['sap.ui5'].routing.targets.sample.options.settings.content.body.sections = {};
        fs = create(createStorage());
        fs.delete(testDir);
        fs.write(join(testDir, 'webapp/manifest.json'), JSON.stringify(manifest));
    });

    describe('template and templateEdit fragments in same folder', () => {
        const customHeaderSection: CustomHeaderSection = {
            target: 'sample',
            name: 'NewCustomHeaderSection',
            folder: 'extensions/custom',
            title: 'New Custom Header Section',
            subTitle: 'Custom Header section subtitle',
            edit: {
                name: 'NewCustomHeaderSectionEdit',
                folder: 'extensions/custom',
                eventHandler: true
            },
            requestGroupId: RequestGroupId.Decoration,
            flexSettings: {
                designtime: DesignTime.Default
            }
        };
        let expectedEditFragmentPath: string;
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
        test.each(testVersions)('Versions %s', (minUI5Version) => {
            const testCustomHeaderSection: CustomHeaderSection = {
                ...customHeaderSection,
                eventHandler: true,
                minUI5Version
            };

            generateCustomHeaderSection(testDir, { ...testCustomHeaderSection }, fs);

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

    describe('template and templateEdit fragments in different folders', () => {
        // folder in edit property differs
        const customHeaderSection: CustomHeaderSection = {
            target: 'sample',
            name: 'NewCustomHeaderSection',
            folder: 'extensions/custom',
            title: 'New Custom Header Section',
            subTitle: 'Custom Header section subtitle',
            edit: {
                name: 'NewCustomHeaderSectionEdit',
                folder: 'extensions/custom/different',
                eventHandler: true
            },
            requestGroupId: RequestGroupId.Decoration,
            flexSettings: {
                designtime: DesignTime.Default
            }
        };
        let expectedEditFragmentPath: string;
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
        test.each(testVersions)('Versions %s', (minUI5Version) => {
            const testCustomHeaderSection: CustomHeaderSection = {
                ...customHeaderSection,
                eventHandler: true,
                minUI5Version
            };

            generateCustomHeaderSection(testDir, { ...testCustomHeaderSection }, fs);

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

    describe('positions', () => {
        // position tests
        const customHeaderSection: CustomHeaderSection = {
            target: 'sample',
            name: 'NewCustomHeaderSection',
            folder: 'extensions/custom',
            title: 'New Custom Header Section',
            subTitle: 'Custom Header section subtitle',
            edit: {
                name: 'NewCustomHeaderSectionEdit',
                folder: 'extensions/custom'
            },
            requestGroupId: RequestGroupId.Decoration,
            flexSettings: {
                designtime: DesignTime.Default
            }
        };
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
            test(`Test 'position' property. ${testCase.name}`, () => {
                generateCustomHeaderSection(
                    testDir,
                    {
                        ...customHeaderSection,
                        position: testCase.position,
                        minUI5Version: testCase.minUI5Version
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
