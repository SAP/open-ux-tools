import { getEsmTypesVersion, getTypesVersion, UI5_DEFAULT } from '../src/data/defaults';

describe('Defaults', () => {
    const esmTypesVersionSince = `~${UI5_DEFAULT.ESM_TYPES_VERSION_SINCE}`;
    const typesVersionBest = `~${UI5_DEFAULT.TYPES_VERSION_BEST}`;
    const minU5Version = UI5_DEFAULT.TYPES_VERSION_PREVIOUS;
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
        ['1.109.1', typesVersionBest],
        [UI5_DEFAULT.TYPES_VERSION_BEST, typesVersionBest],
        ['1.109-snapshot', typesVersionBest],
        ['1.80-snapshot', esmTypesVersionSince],
        ['1.102-snapshot', '~1.102.0'],
        ['1.91.0', '~1.91.0']
    ];
    const tesTSTypesData: [any, string][] = [
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
        ['1.109.1', typesVersionBest],
        ['1.80-snapshot', '~1.80.0'],
        ['1.102-snapshot', '~1.102.0'],
        ['1.109-snapshot', typesVersionBest]
    ];
    // Tests validation of versions against known versions https://www.npmjs.com/package/@sapui5/ts-types-esm
    test.each(tesTSTypesEsmData)('Types version for @sapui5/ts-types-esm: (%p, %p)', (input, expected) => {
        expect(getEsmTypesVersion(input)).toEqual(expected);
    });

    // Tests validation of versions against known versions https://www.npmjs.com/package/@sapui5/ts-types
    test.each(tesTSTypesData)('Types version for @sapui5/ts-types: (%p, %p)', (input, expected) => {
        expect(getTypesVersion(input)).toEqual(expected);
    });
});
