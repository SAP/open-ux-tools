import { join } from 'path';
import * as mockFs from 'fs';
import { UI5Config } from '@sap-ux/ui5-config';
import type { CustomMiddleware } from '@sap-ux/ui5-config';
import { getVariant, getAdpConfig, getWebappFiles } from '../../../src/base/helper';

jest.mock('fs', () => {
    return {
        ...jest.requireActual('fs'),
        readFileSync: jest.fn()
    };
});

describe('helper', () => {
    const basePath = join(__dirname, '../../fixtures', 'adaptation-project');
    const mockAdp = {
        target: {
            url: 'https://sap.example',
            client: '100'
        }
    };

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

    describe('getAdpConfig', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('should throw error when no system configuration found', async () => {
            jest.spyOn(mockFs, 'readFileSync').mockReturnValue('');
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

    describe('getWebappFiles', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('should return webapp files', () => {
            expect(getWebappFiles(basePath)).toEqual([
                {
                    relativePath: join('i18n', 'i18n.properties'),
                    content: expect.any(String)
                },
                {
                    relativePath: 'manifest.appdescr_variant',
                    content: expect.any(String)
                }
            ]);
        });
    });
});
