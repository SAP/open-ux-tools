import { join } from 'path';
import { readFileSync } from 'fs';
import type { create, Editor } from 'mem-fs-editor';

import { UI5Config } from '@sap-ux/ui5-config';
import { FileName } from '@sap-ux/project-access';
import type { CustomMiddleware } from '@sap-ux/ui5-config';

import {
    getVariant,
    getAdpConfig,
    getWebappFiles,
    flpConfigurationExists,
    updateVariant
} from '../../../src/base/helper';

const readFileSyncMock = readFileSync as jest.Mock;

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

        test('should return variant', async () => {
            readFileSyncMock.mockImplementation(() => mockVariant);

            expect(await getVariant(basePath)).toStrictEqual(JSON.parse(mockVariant));
        });

        test('should return variant using fs editor', async () => {
            const fs = {
                readJSON: jest.fn().mockReturnValue(JSON.parse(mockVariant))
            } as unknown as Editor;

            const result = await getVariant(basePath, fs);

            expect(fs.readJSON).toHaveBeenCalledWith(join(basePath, 'webapp', 'manifest.appdescr_variant'));
            expect(result).toStrictEqual(JSON.parse(mockVariant));
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

        it('should write the updated variant content to the manifest file', async () => {
            await updateVariant(basePath, mockVariant, fs);

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

        it('should return true if valid FLP configuration exists', async () => {
            readFileSyncMock.mockReturnValue(
                JSON.stringify({
                    content: [
                        { changeType: 'appdescr_app_changeInbound' },
                        { changeType: 'appdescr_ui5_addNewModelEnhanceWith' }
                    ]
                })
            );

            const result = await flpConfigurationExists(basePath);

            expect(result).toBe(true);
            expect(readFileSyncMock).toHaveBeenCalledWith(appDescrPath, 'utf-8');
        });

        it('should return false if no valid FLP configuration exists', async () => {
            readFileSyncMock.mockReturnValue(
                JSON.stringify({
                    content: [
                        { changeType: 'appdescr_ui5_setMinUI5Version' },
                        { changeType: 'appdescr_ui5_addNewModelEnhanceWith' }
                    ]
                })
            );

            const result = await flpConfigurationExists(basePath);

            expect(result).toBe(false);
            expect(readFileSyncMock).toHaveBeenCalledWith(appDescrPath, 'utf-8');
        });

        it('should throw an error if getVariant fails', async () => {
            readFileSyncMock.mockImplementation(() => {
                throw new Error('Failed to retrieve variant');
            });

            await expect(flpConfigurationExists(basePath)).rejects.toThrow(
                'Failed to check if FLP configuration exists: Failed to retrieve variant'
            );
            expect(readFileSyncMock).toHaveBeenCalledWith(appDescrPath, 'utf-8');
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

        test('should return webapp files', async () => {
            jest.spyOn(UI5Config, 'newInstance').mockResolvedValue({
                findCustomMiddleware: jest.fn().mockReturnValue({
                    configuration: {
                        adp: mockAdp
                    }
                } as Partial<CustomMiddleware> as CustomMiddleware<object>),
                getConfiguration: jest.fn().mockReturnValue({
                    paths: {
                        webapp: 'webapp'
                    }
                })
            } as Partial<UI5Config> as UI5Config);
            expect(await getWebappFiles(basePath)).toEqual([
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
