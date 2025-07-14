import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import type { create, Editor } from 'mem-fs-editor';

import { UI5Config } from '@sap-ux/ui5-config';
import type { Inbound } from '@sap-ux/axios-extension';
import type { DescriptorVariant } from '../../../src/types';
import type { CustomMiddleware } from '@sap-ux/ui5-config';

import {
    getVariant,
    getAdpConfig,
    getWebappFiles,
    flpConfigurationExists,
    updateVariant,
    isTypescriptSupported,
    filterAndMapInboundsToManifest
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
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should return true if valid FLP configuration exists', async () => {
            const variantContent = {
                content: [
                    { changeType: 'appdescr_app_changeInbound' },
                    { changeType: 'appdescr_ui5_addNewModelEnhanceWith' }
                ]
            };

            const result = flpConfigurationExists(variantContent as unknown as DescriptorVariant);

            expect(result).toBe(true);
        });

        it('should return false if no valid FLP configuration exists', async () => {
            const variantContent = {
                content: []
            };

            const result = flpConfigurationExists(variantContent as unknown as DescriptorVariant);

            expect(result).toBe(false);
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

    describe('filterAndMapInboundsToManifest', () => {
        test('should map inbounds to manifest format', () => {
            const inbounds = [
                {
                    content: {
                        semanticObject: 'Test',
                        action: 'action1',
                        title: 'Test Action 1',
                        description: 'Description 1',
                        url: '/test/action1',
                        hideLauncher: false
                    }
                },
                {
                    content: {
                        semanticObject: 'Test',
                        action: 'action2',
                        title: 'Test Action 2',
                        description: 'Description 2',
                        url: '/test/action2',
                        hideLauncher: false
                    }
                }
            ] as unknown as Inbound[];

            const result = filterAndMapInboundsToManifest(inbounds);

            expect(result).toEqual({
                'Test-action1': {
                    semanticObject: 'Test',
                    action: 'action1',
                    title: 'Test Action 1',
                    description: 'Description 1',
                    url: '/test/action1',
                    hideLauncher: false
                },
                'Test-action2': {
                    semanticObject: 'Test',
                    action: 'action2',
                    title: 'Test Action 2',
                    description: 'Description 2',
                    url: '/test/action2',
                    hideLauncher: false
                }
            });
        });

        test('should filter out inbounds with hideLauncher equal to true', () => {
            const inbounds = [
                {
                    content: {
                        semanticObject: 'Test',
                        action: 'action1',
                        title: 'Test Action 1',
                        description: 'Description 1',
                        url: '/test/action1',
                        hideLauncher: true
                    }
                },
                {
                    content: {
                        semanticObject: 'Test',
                        action: 'action2',
                        title: 'Test Action 2',
                        description: 'Description 2',
                        url: '/test/action2'
                    }
                }
            ] as unknown as Inbound[];

            const result = filterAndMapInboundsToManifest(inbounds);

            expect(result).toEqual({
                'Test-action2': {
                    semanticObject: 'Test',
                    action: 'action2',
                    title: 'Test Action 2',
                    description: 'Description 2',
                    url: '/test/action2'
                }
            });
        });

        test('should return undefined if no inbounds are provided', () => {
            const result = filterAndMapInboundsToManifest([]);

            expect(result).toBeUndefined();
        });
    });
});
