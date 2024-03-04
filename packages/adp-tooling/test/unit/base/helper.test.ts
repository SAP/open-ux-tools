import { isNotEmptyString, isValidSapClient } from '../../../src/base/helper';

describe('helper', () => {
    test('isNotEmptyString', () => {
        expect(isNotEmptyString(undefined)).toBe(false);
        expect(isNotEmptyString('')).toBe(false);
        expect(isNotEmptyString(' ')).toBe(false);
        expect(isNotEmptyString('a')).toBe(true);
    });

    test('isValidSapClient', () => {
        expect(isValidSapClient(undefined)).toBe(true);
        expect(isValidSapClient('')).toBe(true);
        expect(isValidSapClient('1')).toBe(true);
        expect(isValidSapClient('123')).toBe(true);
        expect(isValidSapClient('1234')).toBe(false);
        expect(isValidSapClient('a')).toBe(false);
    });
});
