import type { CustomMiddleware } from '@sap-ux/ui5-config';
import * as mockFs from 'fs';
import { isCustomerBase, getVariant, checkFileExists, getAdpConfig } from '../../../src/base/helper';
import { join } from 'path';
import { UI5Config } from '@sap-ux/ui5-config';

jest.mock('fs');

describe('helper', () => {
    const basePath = join(__dirname, '../../fixtures', 'adaptation-project');
    const mockAdp = {
        target: {
            url: 'https://sap.example',
            client: '100'
        }
    };

    describe('isCustomerBase', () => {
        test('should return correct value based on input', () => {
            expect(isCustomerBase('CUSTOMER_BASE')).toBe(true);
            expect(isCustomerBase('VENDOR')).toBe(false);
        });
    });

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

    describe('checkFileExists', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('should return false when file does not exist', () => {
            jest.spyOn(mockFs, 'existsSync').mockImplementation(() => false);

            expect(checkFileExists(basePath)).toBe(false);
        });

        test('should return true when file exists', () => {
            jest.spyOn(mockFs, 'existsSync').mockImplementation(() => true);

            expect(checkFileExists(basePath)).toBe(true);
        });
    });

    describe('getAdpConfig', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('should throw error when no system configuration found', async () => {
            jest.spyOn(UI5Config, 'newInstance').mockResolvedValue({
                findCustomMiddleware: jest.fn().mockReturnValue(undefined)
            } as Partial<UI5Config> as UI5Config);

            await expect(getAdpConfig(basePath, '/path/to/mock/ui5.yaml')).rejects.toThrow(
                'No system configuration found in ui5.yaml'
            );
        });

        test('should return adp configuration', async () => {
            jest.spyOn(UI5Config, 'newInstance').mockResolvedValue({
                findCustomMiddleware: jest.fn().mockReturnValue({
                    configuration: {
                        adp: mockAdp
                    }
                } as Partial<CustomMiddleware> as CustomMiddleware<object>)
            } as Partial<UI5Config> as UI5Config);

            expect(await getAdpConfig(basePath, 'ui5.yaml')).toStrictEqual(mockAdp);
        });
    });
});
