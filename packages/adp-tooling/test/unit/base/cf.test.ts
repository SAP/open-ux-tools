import { isCFEnvironment } from '../../../src/base/cf';
import * as mockFs from 'node:fs';
import { join } from 'node:path';

jest.mock('fs');

describe('isCFEnvironment', () => {
    const basePath = join(__dirname, '../../fixtures', 'adaptation-project');

    test('should return false when config.json does not exist', () => {
        jest.spyOn(mockFs, 'existsSync').mockImplementation(() => false);

        expect(isCFEnvironment(basePath)).toBe(false);
    });

    test('should return false when environment is not CF', () => {
        jest.spyOn(mockFs, 'existsSync').mockImplementation(() => true);
        jest.spyOn(mockFs, 'readFileSync').mockImplementation(() => '{ "environment": "TST" }');

        expect(isCFEnvironment(basePath)).toBe(false);
    });

    test('should return true when config.json exists and environment is CF', () => {
        jest.spyOn(mockFs, 'existsSync').mockImplementation(() => true);
        jest.spyOn(mockFs, 'readFileSync').mockImplementation(() => '{ "environment": "CF" }');

        expect(isCFEnvironment(basePath)).toBe(true);
    });
});
