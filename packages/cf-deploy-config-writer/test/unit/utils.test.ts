import { validateVersion } from '../../src/utils';
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
    });
});
