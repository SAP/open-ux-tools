import { UI5_DEFAULT } from '../src/defaults';
import { getEsmTypesVersion, getTypesPackage, getTypesVersion, mergeObjects, replaceEnvVariables } from '../src/utils';

describe('mergeObjects', () => {
    const base = {
        scripts: {
            first: 'first'
        },
        ui5: {
            dependencies: ['module-1']
        }
    };

    test('additional ui5 dependencies (array merge)', () => {
        const extension = {
            name: 'test',
            ui5: {
                dependencies: ['module-2']
            }
        };
        const merged = mergeObjects(base, extension);
        expect(merged.ui5?.dependencies).toStrictEqual(['module-1', 'module-2']);
    });

    test('duplicated ui5 dependencies (array merge)', () => {
        const extension = {
            name: 'test',
            ui5: {
                dependencies: ['module-1', 'module-2']
            }
        };
        const merged = mergeObjects(base, extension);
        expect(merged.ui5?.dependencies).toStrictEqual(['module-1', 'module-2']);
    });

    test('overwrite property', () => {
        const extension = {
            name: 'test',
            scripts: {
                first: 'second'
            }
        };
        const merged = mergeObjects(base, extension);
        expect(merged.scripts?.first).toBe(extension.scripts?.first);
    });
});
describe('getEsmTypesVersion, getTypesVersion, getTypesPackage', () => {
    const esmTypesVersionSince = `~${UI5_DEFAULT.ESM_TYPES_VERSION_SINCE}`;
    const typesVersionBest = `~${UI5_DEFAULT.TYPES_VERSION_BEST}`;
    const minU5Version = `~${UI5_DEFAULT.TYPES_VERSION_SINCE}`;
    const tesTSTypesEsmData: [any, string][] = [
        [UI5_DEFAULT.MIN_UI5_VERSION, esmTypesVersionSince],
        ['1', esmTypesVersionSince],
        ['1.78.11', esmTypesVersionSince],
        ['1.90.0', esmTypesVersionSince],
        ['1.90.1', esmTypesVersionSince],
        ['1.78.11', esmTypesVersionSince],
        ['1.90-snapshot', esmTypesVersionSince],
        ['1.80-snapshot', esmTypesVersionSince],
        ['metadata', typesVersionBest],
        [undefined, typesVersionBest],
        ['1.109.1', '~1.109.0'],
        [UI5_DEFAULT.TYPES_VERSION_BEST, typesVersionBest],
        ['1.109-snapshot', '~1.109.0'],
        ['1.80-snapshot', esmTypesVersionSince],
        ['1.102-snapshot', '~1.102.0'],
        ['1.91.0', '~1.94.0']
    ];
    const testSTypesData: [any, string][] = [
        [UI5_DEFAULT.MIN_UI5_VERSION, minU5Version],
        ['1', minU5Version],
        ['1.70.0', minU5Version],
        ['1.71.1', minU5Version],
        ['metadata', typesVersionBest],
        [undefined, typesVersionBest],
        // Following versions dont exist
        ['1.72.0', minU5Version],
        ['1.73.0', minU5Version],
        ['1.74.0', minU5Version],
        ['1.75.0', minU5Version],
        ['1.83.0', '~1.83.0'],
        [UI5_DEFAULT.TYPES_VERSION_BEST, typesVersionBest],
        ['1.109.1', '~1.109.0'],
        ['1.80-snapshot', '~1.80.0'],
        ['1.102-snapshot', '~1.102.0'],
        ['1.109-snapshot', '~1.109.0']
    ];
    const getTypesPackageTestData: [any, string][] = [
        [UI5_DEFAULT.MIN_UI5_VERSION, UI5_DEFAULT.TS_TYPES_ESM_PACKAGE_NAME],
        ['1', UI5_DEFAULT.TS_TYPES_ESM_PACKAGE_NAME],
        ['1.70.0', UI5_DEFAULT.TS_TYPES_ESM_PACKAGE_NAME],
        ['1.71.1', UI5_DEFAULT.TS_TYPES_ESM_PACKAGE_NAME],
        ['metadata', UI5_DEFAULT.TS_TYPES_ESM_PACKAGE_NAME],
        [undefined, UI5_DEFAULT.TS_TYPES_ESM_PACKAGE_NAME],
        // Following versions dont exist
        ['1.72.0', UI5_DEFAULT.TS_TYPES_ESM_PACKAGE_NAME],
        ['1.73.0', UI5_DEFAULT.TS_TYPES_ESM_PACKAGE_NAME],
        ['1.74.0', UI5_DEFAULT.TS_TYPES_ESM_PACKAGE_NAME],
        ['1.75.0', UI5_DEFAULT.TS_TYPES_ESM_PACKAGE_NAME],
        ['1.83.0', UI5_DEFAULT.TS_TYPES_ESM_PACKAGE_NAME],
        [UI5_DEFAULT.TYPES_VERSION_BEST, UI5_DEFAULT.TS_TYPES_ESM_PACKAGE_NAME],
        ['1.109.0', UI5_DEFAULT.TS_TYPES_ESM_PACKAGE_NAME],
        ['1.80-snapshot', UI5_DEFAULT.TS_TYPES_ESM_PACKAGE_NAME],
        ['1.102-snapshot', UI5_DEFAULT.TS_TYPES_ESM_PACKAGE_NAME],
        ['1.109-snapshot', UI5_DEFAULT.TS_TYPES_ESM_PACKAGE_NAME],
        // Following versions should use the new package
        ['1.113.0', UI5_DEFAULT.TYPES_PACKAGE_NAME],
        ['1.114.0', UI5_DEFAULT.TYPES_PACKAGE_NAME]
    ];

    // Tests validation of versions against known versions https://www.npmjs.com/package/@sapui5/ts-types-esm
    test.each(tesTSTypesEsmData)(
        'Types version for @sapui5/ts-types-esm and @sapui5/types: (%p, %p)',
        (input, expected) => {
            expect(getEsmTypesVersion(input)).toEqual(expected);
        }
    );

    // Tests validation of versions against known versions https://www.npmjs.com/package/@sapui5/ts-types
    test.each(testSTypesData)('Types version for @sapui5/ts-types: (%p, %p)', (input, expected) => {
        expect(getTypesVersion(input)).toEqual(expected);
    });

    // Tests validation of getting the correct types package name
    test.each(getTypesPackageTestData)('Types package: (%p, %p)', (input, expected) => {
        expect(getTypesPackage(input)).toEqual(expected);
    });
});
describe('replaceEnvVariables', () => {
    const envVal = '~testvalue';
    const envRef = 'env:TEST_VAR';

    process.env.TEST_VAR = envVal;
    test('top level', () => {
        const config = { hello: envRef };
        replaceEnvVariables(config);
        expect(config.hello).toBe(envVal);
    });
    test('in array', () => {
        const config = ['hello', envRef];
        replaceEnvVariables(config);
        expect(config[1]).toBe(envVal);
    });
    test('nested', () => {
        const config = { hello: { world: envRef }, world: envRef };
        replaceEnvVariables(config);
        expect(config.hello.world).toBe(envVal);
        expect(config.world).toBe(envVal);
    });
});
