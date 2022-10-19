import { getTypesVersion } from '../src/data/defaults';

describe('Defaults', () => {
    // Tests validation of versions against known versions https://www.npmjs.com/package/@sapui5/ts-types-esm
    test('Types version', () => {
        expect(getTypesVersion('1')).toEqual('~1.90.0');
        expect(getTypesVersion('1.90.0')).toEqual('~1.90.0');
        expect(getTypesVersion('1.90.1')).toEqual('~1.90.0');
        expect(getTypesVersion('1.91.0')).toEqual('~1.91.0');
        expect(getTypesVersion('metadata')).toEqual('~1.102.9');
        expect(getTypesVersion(undefined)).toEqual('~1.102.9');
        // Known version(s) that do not exist
        expect(getTypesVersion('1.78.11')).toEqual('~1.90.0');
        expect(getTypesVersion('1.103.1')).toEqual('~1.102.9');
        expect(getTypesVersion('1.102.9')).toEqual('~1.102.9');
        // Known UI5 versions
        expect(getTypesVersion('1.80-snapshot')).toEqual('~1.90.0');
        expect(getTypesVersion('1.102-snapshot')).toEqual('~1.102.0');
        expect(getTypesVersion('1.103-snapshot')).toEqual('~1.102.9');
    });
});
