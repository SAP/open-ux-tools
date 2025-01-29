import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import type { create, Editor } from 'mem-fs-editor';

import { UI5Config } from '@sap-ux/ui5-config';
import { FileName } from '@sap-ux/project-access';
import type { CustomMiddleware } from '@sap-ux/ui5-config';

import {
    getVariant,
    getAdpConfig,
    getWebappFiles,
    flpConfigurationExists,
    updateVariant,
    isTypescriptSupported
} from '../../../src/base/helper';

const readFileSyncMock = readFileSync as jest.Mock;
const existsSyncMock = existsSync as jest.Mock;

jest.mock('fs', () => {
    return {
        ...jest.requireActual('fs'),
        existsSync: jest.fn(),
        readFileSync: jest.fn()
    };
});

describe('helper', () => {
    const basePath = join(__dirname, '../../fixtures', 'adaptation-project');
    const mockPath = join(basePath, 'webapp', 'manifest.appdescr_variant');
    const mockVariant = jest.requireActual('fs').readFileSync(mockPath, 'utf-8');
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
            readFileSyncMock.mockImplementation(() => mockVariant);

            expect(getVariant(basePath)).toStrictEqual(JSON.parse(mockVariant));
        });
    });

    describe('updateVariant', () => {
        let fs: ReturnType<typeof create>;

        beforeEach(() => {
            fs = {
                writeJSON: jest.fn()
            } as unknown as Editor;
            jest.clearAllMocks();
        });

        it('should write the updated variant content to the manifest file', () => {
            updateVariant(basePath, mockVariant, fs);

            expect(fs.writeJSON).toHaveBeenCalledWith(
                join(basePath, 'webapp', 'manifest.appdescr_variant'),
                mockVariant
            );
        });
    });

    describe('flpConfigurationExists', () => {
        const appDescrPath = join(basePath, 'webapp', FileName.ManifestAppDescrVar);

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should return true if valid FLP configuration exists', () => {
            readFileSyncMock.mockReturnValue(
                JSON.stringify({
                    content: [
                        { changeType: 'appdescr_app_changeInbound' },
                        { changeType: 'appdescr_ui5_addNewModelEnhanceWith' }
                    ]
                })
            );

            const result = flpConfigurationExists(basePath);

            expect(result).toBe(true);
            expect(readFileSyncMock).toHaveBeenCalledWith(appDescrPath, 'utf-8');
        });

        it('should return false if no valid FLP configuration exists', () => {
            readFileSyncMock.mockReturnValue(
                JSON.stringify({
                    content: [
                        { changeType: 'appdescr_ui5_setMinUI5Version' },
                        { changeType: 'appdescr_ui5_addNewModelEnhanceWith' }
                    ]
                })
            );

            const result = flpConfigurationExists(basePath);

            expect(result).toBe(false);
            expect(readFileSyncMock).toHaveBeenCalledWith(appDescrPath, 'utf-8');
        });

        it('should throw an error if getVariant fails', () => {
            readFileSyncMock.mockImplementation(() => {
                throw new Error('Failed to retrieve variant');
            });

            expect(() => flpConfigurationExists(basePath)).toThrow(
                'Failed to check if FLP configuration exists: Failed to retrieve variant'
            );
            expect(readFileSyncMock).toHaveBeenCalledWith(appDescrPath, 'utf-8');
        });
    });

    describe('isTypescriptSupported', () => {
        const basePath = '/mock/project/path';
        const tsconfigPath = join(basePath, 'tsconfig.json');

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should return true if tsconfig.json exists and fs is not provided', () => {
            existsSyncMock.mockReturnValueOnce(true);

            const result = isTypescriptSupported(basePath);

            expect(result).toBe(true);
            expect(existsSyncMock).toHaveBeenCalledWith(tsconfigPath);
        });

        it('should return false if tsconfig.json does not exist and fs is not provided', () => {
            existsSyncMock.mockReturnValueOnce(false);

            const result = isTypescriptSupported(basePath);

            expect(result).toBe(false);
            expect(existsSyncMock).toHaveBeenCalledWith(tsconfigPath);
        });

        it('should return true if tsconfig.json exists and fs is provided', () => {
            const mockEditor = {
                exists: jest.fn().mockReturnValueOnce(true)
            } as unknown as Editor;

            const result = isTypescriptSupported(basePath, mockEditor);

            expect(result).toBe(true);
            expect(mockEditor.exists).toHaveBeenCalledWith(tsconfigPath);
        });

        it('should return false if tsconfig.json does not exist and fs is provided', () => {
            const mockEditor = {
                exists: jest.fn().mockReturnValueOnce(false)
            } as unknown as Editor;

            const result = isTypescriptSupported(basePath, mockEditor);

            expect(result).toBe(false);
            expect(mockEditor.exists).toHaveBeenCalledWith(tsconfigPath);
        });
    });

    describe('getAdpConfig', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('should throw error when no system configuration found', async () => {
            readFileSyncMock.mockReturnValue('');
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
