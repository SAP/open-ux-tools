import { isValidSapClient, isNotEmptyString } from '../../../src/base/validators';

describe('validators', () => {
    describe('isNotEmptyString', () => {
        test('should return correct value based on input', () => {
            expect(isNotEmptyString(undefined)).toBe(false);
            expect(isNotEmptyString('')).toBe(false);
            expect(isNotEmptyString(' ')).toBe(false);
            expect(isNotEmptyString('a')).toBe(true);
        });
    });

    describe('isValidSapClient', () => {
        test('should return correct value based on input', () => {
            expect(isValidSapClient(undefined)).toBe(true);
            expect(isValidSapClient('')).toBe(true);
            expect(isValidSapClient('1')).toBe(true);
            expect(isValidSapClient('123')).toBe(true);
            expect(isValidSapClient('1234')).toBe(false);
            expect(isValidSapClient('a')).toBe(false);
        });
    });
});
