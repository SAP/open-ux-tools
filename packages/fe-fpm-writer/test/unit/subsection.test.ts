import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { join } from 'path';
import { generateCustomSubSection } from '../../src/section';
import type { CustomSubSection } from '../../src/section/types';
import type { Manifest } from '../../src/common/types';
import { Placement } from '../../src/common/types';
import * as manifestSections from './sample/section/webapp/manifest.json';

const testDir = join(__dirname, 'sample/subsection');

describe('SubCustomSection generateCustomSubSection', () => {
    let fs: Editor;
    // Prepare manifest for sub sections scenario by reusing manifest from sections
    const manifest = JSON.parse(JSON.stringify(manifestSections));
    manifest['sap.ui5'].routing.targets.sample.options.settings.content.body.sections = {};
    // Basic custom sub section object
    const customSubSection: CustomSubSection = {
        target: 'sample',
        name: 'NewCustomSubSection',
        folder: 'extensions/custom',
        title: 'New Custom Sub Section',
        position: {
            placement: Placement.After,
            anchor: 'DummyFacet'
        },
        parentSection: 'DummyParentFacet'
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

    const testVersions = ['1.85', '1.86', '1.98'];
    test.each(testVersions)('Versions %s', async (minUI5Version) => {
        const testCustomSubSection: CustomSubSection = {
            ...customSubSection,
            eventHandler: true,
            minUI5Version
        };

        await generateCustomSubSection(testDir, { ...testCustomSubSection }, fs);

        const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
        const settings = (
            updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
        )['settings'];
        expect(settings.content).toMatchSnapshot();

        expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
        expect(fs.read(expectedFragmentPath.replace('.fragment.xml', '.js'))).toMatchSnapshot();
    });

    // Test inserting of custom sub sections into existing section defined in manifest.json
    const existingParentSectionTestCases = [
        {
            name: 'Insert custom sub section into existing section without existing subsections',
            parentSection: 'ExistingFacet1'
        },
        {
            name: 'Insert custom sub section into existing section with subsection',
            parentSection: 'ExistingFacet2'
        }
    ];
    test.each(existingParentSectionTestCases)('$name', async ({ parentSection }) => {
        // Prepare manifest by adding existing sections
        const manifestTemp = JSON.parse(JSON.stringify(manifest));
        manifestTemp['sap.ui5'].routing.targets.sample.options.settings.content.body.sections = {
            'ExistingFacet1': {
                'visible': true
            },
            'ExistingFacet2': {
                'visible': true,
                'subSections': {
                    'ExistingCustomSubSection': {
                        'template': 'sapux.fe.fpm.writer.test.extensions.custom.Custom1',
                        'position': {
                            'anchor': 'IncidentOverviewFacet',
                            'placement': 'Before'
                        },
                        'title': 'Custom Title'
                    }
                }
            }
        };
        fs.write(join(testDir, 'webapp/manifest.json'), JSON.stringify(manifestTemp));
        const testCustomSubSection: CustomSubSection = {
            ...customSubSection,
            parentSection
        };
        await generateCustomSubSection(testDir, { ...testCustomSubSection }, fs);
        const updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
        const settings = (
            updatedManifest['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
        )['settings'];
        expect(settings.content).toMatchSnapshot();
    });

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
            await generateCustomSubSection(
                testDir,
                {
                    ...customSubSection,
                    position: testCase.position,
                    minUI5Version: testCase.minUI5Version
                },
                fs
            );
            const manifest = fs.readJSON(join(testDir, 'webapp/manifest.json')) as Manifest;
            const section = (
                manifest?.['sap.ui5']?.['routing']?.['targets']?.['sample']?.['options'] as Record<string, any>
            )?.['settings']?.['content']?.['body']?.['sections']?.['DummyParentFacet']?.['subSections']?.[
                'NewCustomSubSection'
            ];
            expect(section).toMatchSnapshot();
        });
    });
});
