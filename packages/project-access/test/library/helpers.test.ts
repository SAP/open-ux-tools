import { join } from 'path';
import {
    checkDependencies,
    getReuseLibs,
    getLibraryDesc,
    getManifestDesc,
    getMinUI5VersionFromManifest,
    getMinUI5VersionAsArray,
    getMinimumUI5Version
} from '../../src/library/helpers';
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

    describe('getters for minUI5Version', () => {
        interface TestCase {
            minUI5Version: string | string[] | undefined;
            expectedResult: string | string[] | undefined;
        }

        describe('getMinUI5VersionFromManifest', () => {
            const testVersions: Array<TestCase> = [
                { minUI5Version: undefined, expectedResult: undefined },
                { minUI5Version: 'a.b.c', expectedResult: 'a.b.c' },
                { minUI5Version: ['a.b.c'], expectedResult: ['a.b.c'] },
                { minUI5Version: '1.76.32', expectedResult: '1.76.32' },
                { minUI5Version: '1.76', expectedResult: '1.76' },
                { minUI5Version: ['1.120.3'], expectedResult: ['1.120.3'] },
                { minUI5Version: ['1.125'], expectedResult: ['1.125'] },
                { minUI5Version: ['1.120.13', 'a.b.c.'], expectedResult: ['1.120.13', 'a.b.c.'] }
            ];

            testVersions.forEach((testCase) => {
                test(`getMinUI5VersionFromManifest: minUI5Version = ${testCase.minUI5Version}`, () => {
                    const manifest = {
                        'sap.ui5': {
                            dependencies: {
                                minUI5Version: testCase.minUI5Version
                            }
                        }
                    } as Manifest;
                    expect(getMinUI5VersionFromManifest(manifest)).toEqual(testCase.expectedResult);
                });
            });
        });

        describe('getMinUI5VersionAsArray', () => {
            const testVersions: Array<TestCase> = [
                { minUI5Version: undefined, expectedResult: [] },
                { minUI5Version: 'a.b.c', expectedResult: ['a.b.c'] },
                { minUI5Version: ['a.b.c'], expectedResult: ['a.b.c'] },
                { minUI5Version: '1.76.32', expectedResult: ['1.76.32'] },
                { minUI5Version: '1.76', expectedResult: ['1.76'] },
                { minUI5Version: ['1.120.3'], expectedResult: ['1.120.3'] },
                { minUI5Version: ['1.125'], expectedResult: ['1.125'] },
                { minUI5Version: ['1.120.13', 'a.b.c.'], expectedResult: ['1.120.13', 'a.b.c.'] }
            ];

            testVersions.forEach((testCase) => {
                test(`getMinUI5VersionAsArray: minUI5Version = ${testCase.minUI5Version}`, () => {
                    const manifest = {
                        'sap.ui5': {
                            dependencies: {
                                minUI5Version: testCase.minUI5Version
                            }
                        }
                    } as Manifest;
                    expect(getMinUI5VersionAsArray(manifest)).toEqual(testCase.expectedResult);
                });
            });
        });

        describe('getMinimumUI5Version', () => {
            const testVersions: Array<TestCase> = [
                { minUI5Version: undefined, expectedResult: undefined },
                { minUI5Version: 'a.b.c', expectedResult: undefined },
                { minUI5Version: ['a.b.c'], expectedResult: undefined },
                { minUI5Version: '1.76.32', expectedResult: '1.76.32' },
                { minUI5Version: '1.76', expectedResult: undefined },
                { minUI5Version: ['1.120.3'], expectedResult: '1.120.3' },
                { minUI5Version: ['1.120.13', 'a.b.c.'], expectedResult: '1.120.13' },
                { minUI5Version: ['1.120.13', '2.0.21'], expectedResult: '1.120.13' },
                { minUI5Version: ['2.0.21', '1.120.13'], expectedResult: '1.120.13' }
            ];

            testVersions.forEach((testCase) => {
                test(`getMinimumUI5Version: minUI5Version = ${testCase.minUI5Version}`, () => {
                    const manifest = {
                        'sap.ui5': {
                            dependencies: {
                                minUI5Version: testCase.minUI5Version
                            }
                        }
                    } as Manifest;
                    expect(getMinimumUI5Version(manifest)).toEqual(testCase.expectedResult);
                });
            });
        });
    });
});
