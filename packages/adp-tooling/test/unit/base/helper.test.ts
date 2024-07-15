import { join } from 'path';
import { getVariant, isNotEmptyString, isValidSapClient } from '../../../src/base/helper';
import * as mockFs from 'fs';

jest.mock('fs');

describe('helper', () => {
    const basePath = join(__dirname, '../../fixtures', 'adaptation-project');
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

        describe('getVariant', () => {
            beforeEach(() => {
                jest.clearAllMocks();
            });

            test('should return variant', () => {
                const mockPath = join(basePath, 'webapp', 'manifest.appdescr_variant');
                const mockVariant = jest.requireActual('fs').readFileSync(mockPath, 'utf-8');
                jest.spyOn(mockFs, 'readFileSync').mockImplementation(() => mockVariant);

                expect(getVariant(basePath)).toStrictEqual(JSON.parse(mockVariant));
            });
        });
    });
});
