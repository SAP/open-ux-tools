import { join } from 'path';
import { checkDependencies, getLibraryChoices, getLibraryDesc, getManifestDesc } from '../../src/library/helpers';
import * as manifestJson from '../test-data/libs/sap.reuse.ex.test.lib.attachmentservice/src/sap/reuse/ex/test/lib/attachmentservice/manifest.json';
import type { Manifest, ReuseLib } from '../../src';

describe('library utils', () => {
    test('should return library choices', async () => {
        const libChoices = await getLibraryChoices([
            {
                projectRoot: join(__dirname, '../test-data/libs/sap.reuse.ex.test.lib.attachmentservice'),
                manifestPath: join(
                    __dirname,
                    '../test-data/libs/sap.reuse.ex.test.lib.attachmentservice/src/sap/se/mi/plm/lib/attachmentservice/manifest.json'
                ),
                manifest: manifestJson as Manifest,
                libraryPath: join(
                    __dirname,
                    '../test-data/libs/sap.reuse.ex.test.lib.attachmentservice/src/sap/se/mi/plm/lib/attachmentservice/.library'
                )
            }
        ]);

        expect(libChoices).toHaveLength(4);

        libChoices.sort((a, b) => a.name.localeCompare(b.name));

        expect(libChoices[0].name).toBe('sap.reuse.ex.test.lib.attachmentservice - library');
        expect(libChoices[1].name).toBe(
            'sap.reuse.ex.test.lib.attachmentservice.attachment - component - UI Library for Fiori Reuse Attachment Service'
        );
        expect(libChoices[2].name).toBe(
            'sap.reuse.ex.test.lib.attachmentservice.attachment.components.fscomponent - component - UI Library for Fiori Reuse Attachment Service'
        );
        expect(libChoices[3].name).toBe(
            'sap.reuse.ex.test.lib.attachmentservice.attachment.components.stcomponent - component - UI Library for Fiori Reuse Attachment Service'
        );
    });

    test('should return missing dependencies', async () => {
        const reuseLibAnswers = [
            {
                name: 'lib1',
                dependencies: ['dep1', 'dep2', 'dep3']
            }
        ] as ReuseLib[];
        const allReuseLibs = [
            {
                name: 'dep1'
            },
            {
                name: 'dep3'
            }
        ] as ReuseLib[];
        const missingDeps = checkDependencies(reuseLibAnswers, allReuseLibs);
        expect(missingDeps).toEqual('dep2');
    });

    test('should return manifest description', async () => {
        const manifest = {
            'sap.app': {
                description: 'test description'
            }
        } as Manifest;
        const description = getManifestDesc(manifest, 'mock/path');
        expect(description).toEqual('test description');
    });

    test('should return library description', async () => {
        const lib = {
            'library': {
                documentation: 'test description'
            }
        };
        const description = getLibraryDesc(lib, 'mock/path');
        expect(description).toEqual('test description');
    });
});
