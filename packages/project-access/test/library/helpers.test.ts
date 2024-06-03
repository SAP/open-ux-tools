import { join } from 'path';
import { checkDependencies, getReuseLibs, getLibraryDesc, getManifestDesc } from '../../src/library/helpers';
import * as manifestJson from '../test-data/libs/sap.reuse.ex.test.lib.attachmentservice/src/sap/reuse/ex/test/lib/attachmentservice/manifest.json';
import type { Manifest, ReuseLib } from '../../src';

describe('library utils', () => {
    test('should return library choices', async () => {
        const libChoices = await getReuseLibs([
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

        expect(libChoices[0].name).toBe('sap.reuse.ex.test.lib.attachmentservice');
        expect(libChoices[1].name).toBe('sap.reuse.ex.test.lib.attachmentservice.attachment');
        expect(libChoices[2].name).toBe('sap.reuse.ex.test.lib.attachmentservice.attachment.components.fscomponent');
        expect(libChoices[3].name).toBe('sap.reuse.ex.test.lib.attachmentservice.attachment.components.stcomponent');

        expect(libChoices[0].path).toBe(
            join(
                __dirname,
                '../test-data/libs/sap.reuse.ex.test.lib.attachmentservice/src/sap/reuse/ex/test/lib/attachmentservice'
            )
        );
        expect(libChoices[1].path).toBe(
            join(
                __dirname,
                '../test-data/libs/sap.reuse.ex.test.lib.attachmentservice/src/sap/reuse/ex/test/lib/attachmentservice/attachment'
            )
        );
        expect(libChoices[2].path).toBe(
            join(
                __dirname,
                '../test-data/libs/sap.reuse.ex.test.lib.attachmentservice/src/sap/reuse/ex/test/lib/attachmentservice/attachment/components/fscomponent'
            )
        );

        expect(libChoices[3].path).toBe(
            join(
                __dirname,
                '../test-data/libs/sap.reuse.ex.test.lib.attachmentservice/src/sap/reuse/ex/test/lib/attachmentservice/attachment/components/stcomponent'
            )
        );

        for (const lib of libChoices) {
            expect(lib.description).toBe('UI Library for Fiori Reuse Attachment Service');
        }
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
        const description = await getManifestDesc(manifest, 'mock/path');
        expect(description).toEqual('test description');
    });

    test('should return library description', async () => {
        const lib = {
            'library': {
                documentation: 'test description'
            }
        };
        const description = await getLibraryDesc(lib, 'mock/path');
        expect(description).toEqual('test description');
    });
});
