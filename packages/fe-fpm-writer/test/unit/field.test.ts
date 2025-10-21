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
    });
});
