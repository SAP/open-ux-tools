import { join } from 'path';
import * as mockFs from 'fs';

import { isCustomerBase, getVariant } from '../../../src/base/helper';

jest.mock('fs');

describe('helper', () => {
    const basePath = join(__dirname, '../../fixtures', 'adaptation-project');

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('isCustomerBase', () => {
        test('should return the correct value depending on the ', () => {
            expect(isCustomerBase('CUSTOMER_BASE')).toBe(true);
            expect(isCustomerBase('VENDOR')).toBe(false);
        });
    });

    describe('getVariant', () => {
        test('should read and return the correct file', () => {
            const mockPath = join(basePath, 'webapp', 'manifest.appdescr_variant');
            const mockVariant = jest.requireActual('fs').readFileSync(mockPath, 'utf-8');

            jest.spyOn(mockFs, 'readFileSync').mockImplementation(() => mockVariant);

            expect(getVariant(basePath)).toStrictEqual(JSON.parse(mockVariant));
        });
    });
});
