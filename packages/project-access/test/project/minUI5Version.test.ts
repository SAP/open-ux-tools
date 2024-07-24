import { getMinUI5VersionAsArray, getMinUI5VersionFromManifest, getMinimumUI5Version, type Manifest } from '../../src';

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

    describe('getMinUI5VersionAsArray, with validation', () => {
        const testVersions: Array<TestCase> = [
            { minUI5Version: undefined, expectedResult: [] },
            { minUI5Version: 'a.b.c', expectedResult: [] },
            { minUI5Version: ['a.b.c'], expectedResult: [] },
            { minUI5Version: '1.76.32', expectedResult: ['1.76.32'] },
            { minUI5Version: '1.76', expectedResult: [] },
            { minUI5Version: '1.76-snapshot', expectedResult: [] },
            { minUI5Version: ['1.120.3'], expectedResult: ['1.120.3'] },
            { minUI5Version: ['1.125'], expectedResult: [] },
            { minUI5Version: ['1.120.13', 'a.b.c.'], expectedResult: ['1.120.13'] }
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

    describe('getMinUI5VersionAsArray, no validation', () => {
        const testVersions: Array<TestCase> = [
            { minUI5Version: undefined, expectedResult: [] },
            { minUI5Version: 'a.b.c', expectedResult: ['a.b.c'] },
            { minUI5Version: ['a.b.c'], expectedResult: ['a.b.c'] },
            { minUI5Version: '1.76.32', expectedResult: ['1.76.32'] },
            { minUI5Version: '1.76', expectedResult: ['1.76'] },
            { minUI5Version: '1.76-snapshot', expectedResult: ['1.76-snapshot'] },
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
                expect(getMinUI5VersionAsArray(manifest, true)).toEqual(testCase.expectedResult);
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
