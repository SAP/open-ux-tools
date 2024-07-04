import { join } from 'path';
import * as mockFs from 'fs';

import { isCustomerBase, getVariant, isCFEnvironment } from '../../../src/base/helper';

jest.mock('fs');

describe('helper', () => {
    const basePath = join(__dirname, '../../fixtures', 'adaptation-project');
    const mockAdp = {
        target: {
            url: 'https://sap.example',
            client: '100'
        }
    };

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

    describe('isCFEnvironment', () => {
        test('should return false when there is no config.json file', () => {
            jest.spyOn(mockFs, 'existsSync').mockImplementation(() => false);

            expect(isCFEnvironment(basePath)).toBe(false);
        });

        test('should return false when the environment is not equal to CF', () => {
            jest.spyOn(mockFs, 'existsSync').mockImplementation(() => true);
            jest.spyOn(mockFs, 'readFileSync').mockImplementation(() => '{ "environment": "T" }');

            expect(isCFEnvironment(basePath)).toBe(false);
        });

        test('should return true when the environment equal to CF', () => {
            jest.spyOn(mockFs, 'existsSync').mockImplementation(() => true);
            jest.spyOn(mockFs, 'readFileSync').mockImplementation(() => '{ "environment": "CF" }');

            expect(isCFEnvironment(basePath)).toBe(true);
        });
    });
});
