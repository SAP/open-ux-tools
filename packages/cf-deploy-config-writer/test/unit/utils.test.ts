import { validateVersion, toMtaModuleName } from '../../src/utils';
import { MTAVersion } from '../../src/constants';

describe('CF utils', () => {
    beforeAll(async () => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        jest.resetAllMocks();
    });

    describe('Utils methods', () => {
        test('Validate - validateVersion', async () => {
            expect(() => validateVersion('0.0.0')).toThrowError();
            expect(() => validateVersion('~Version')).toThrow();
            expect(() => validateVersion()).not.toThrowError();
            expect(validateVersion(MTAVersion)).toBeTruthy();
            expect(validateVersion('1')).toBeTruthy();
        });

        test('Validate - toMtaModuleName', () => {
            expect(toMtaModuleName('0.0.0')).toEqual('000');
            expect(toMtaModuleName('cf_mta_id')).toEqual('cf_mta_id');
            expect(toMtaModuleName('cf.mta.00')).toEqual('cfmta00');
            expect(toMtaModuleName('cf_mta.!£$%^&*,()')).toEqual('cf_mta');
            expect(toMtaModuleName('c'.repeat(130))).toEqual('c'.repeat(128));
        });
    });
});
