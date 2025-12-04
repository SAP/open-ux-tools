import { join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import type { create, Editor } from 'mem-fs-editor';
import type { ReaderCollection } from '@ui5/fs';

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
    filterAndMapInboundsToManifest,
    readUi5Config,
    extractCfBuildTask,
    readManifestFromBuildPath,
    loadAppVariant
} from '../../../src/base/helper';
import { readUi5Yaml } from '@sap-ux/project-access';

jest.mock('fs', () => {
    return {
        ...jest.requireActual('fs'),
        existsSync: jest.fn(),
        readFileSync: jest.fn()
    };
});

jest.mock('@sap-ux/project-access', () => ({
    ...jest.requireActual('@sap-ux/project-access'),
    readUi5Yaml: jest.fn()
}));

const existsSyncMock = existsSync as jest.Mock;
const readFileSyncMock = readFileSync as jest.Mock;
const readUi5YamlMock = readUi5Yaml as jest.MockedFunction<typeof readUi5Yaml>;

describe('helper', () => {
    const yamlRelative = 'ui5.yaml';

    const basePath = join(__dirname, '../../fixtures', 'adaptation-project');
    const mockPath = join(basePath, 'webapp', 'manifest.appdescr_variant');
    const mockVariant = jest.requireActual('fs').readFileSync(mockPath, 'utf-8');
    const mockAdp = {
        target: {
            url: 'https://sap.example',
            client: '100'
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('readUi5Config delegates to readUi5Yaml with correct paths', async () => {
        const dummyConfig = { some: 'config' } as unknown as UI5Config;
        readUi5YamlMock.mockResolvedValueOnce(dummyConfig);

        const result = await readUi5Config(basePath, yamlRelative);

        expect(readUi5YamlMock).toHaveBeenCalledWith(basePath, yamlRelative);
        expect(result).toBe(dummyConfig);
    });

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
            readUi5YamlMock.mockResolvedValue({
                findCustomMiddleware: jest.fn().mockReturnValue(undefined)
            } as unknown as UI5Config);

            await expect(getAdpConfig(basePath, '/path/to/mock/ui5.yaml')).rejects.toThrow(
                'No system configuration found in ui5.yaml'
            );
        });

        test('should return adp configuration', async () => {
            readUi5YamlMock.mockResolvedValue({
                findCustomMiddleware: jest.fn().mockReturnValue({
                    configuration: { adp: mockAdp }
                } as Partial<CustomMiddleware> as CustomMiddleware<object>)
            } as unknown as UI5Config);

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

    describe('extractCfBuildTask', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('should return CF build task configuration when found', () => {
            const mockBuildTask = {
                target: {
                    url: '/cf.example',
                    client: '100'
                },
                serviceInstance: 'test-service-instance'
            };

            const mockUi5Config = {
                findCustomTask: jest.fn().mockReturnValue({
                    configuration: mockBuildTask
                })
            } as unknown as UI5Config;

            const result = extractCfBuildTask(mockUi5Config);

            expect(mockUi5Config.findCustomTask).toHaveBeenCalledWith('app-variant-bundler-build');
            expect(result).toEqual(mockBuildTask);
        });

        test('should throw error when build task configuration is undefined', () => {
            const mockUi5Config = {
                findCustomTask: jest.fn().mockReturnValue({
                    configuration: undefined
                })
            } as unknown as UI5Config;

            expect(() => extractCfBuildTask(mockUi5Config)).toThrow('No CF ADP project found');
            expect(mockUi5Config.findCustomTask).toHaveBeenCalledWith('app-variant-bundler-build');
        });
    });

    describe('readManifestFromBuildPath', () => {
        const mockManifest = {
            'sap.app': {
                id: 'test.app',
                title: 'Test App'
            }
        };

        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('should read manifest from build output folder', () => {
            const cfBuildPath = 'dist';
            const expectedPath = join(process.cwd(), cfBuildPath, 'manifest.json');
            const manifestContent = JSON.stringify(mockManifest);

            readFileSyncMock.mockReturnValueOnce(manifestContent);

            const result = readManifestFromBuildPath(cfBuildPath);

            expect(readFileSyncMock).toHaveBeenCalledWith(expectedPath, 'utf-8');
            expect(result).toEqual(mockManifest);
        });

        test('should throw error when file does not exist', () => {
            const cfBuildPath = 'dist';
            const expectedPath = join(process.cwd(), cfBuildPath, 'manifest.json');

            readFileSyncMock.mockImplementationOnce(() => {
                const error = new Error('ENOENT: no such file or directory');
                (error as NodeJS.ErrnoException).code = 'ENOENT';
                throw error;
            });

            expect(() => readManifestFromBuildPath(cfBuildPath)).toThrow();
            expect(readFileSyncMock).toHaveBeenCalledWith(expectedPath, 'utf-8');
        });
    });

    describe('loadAppVariant', () => {
        const mockVariantContent = {
            layer: 'VENDOR',
            reference: 'base.app',
            id: 'my.adaptation',
            namespace: 'apps/base.app/appVariants/my.adaptation/',
            content: []
        };

        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('should load and parse app variant descriptor successfully', async () => {
            const mockResource = {
                getString: jest.fn().mockResolvedValue(JSON.stringify(mockVariantContent))
            };

            const mockRootProject = {
                byPath: jest.fn().mockResolvedValue(mockResource)
            } as unknown as ReaderCollection;

            const result = await loadAppVariant(mockRootProject);

            expect(mockRootProject.byPath).toHaveBeenCalledWith('/manifest.appdescr_variant');
            expect(mockResource.getString).toHaveBeenCalled();
            expect(result).toEqual(mockVariantContent);
        });

        test('should throw error when manifest.appdescr_variant is not found', async () => {
            const mockRootProject = {
                byPath: jest.fn().mockResolvedValue(null)
            } as unknown as ReaderCollection;

            await expect(loadAppVariant(mockRootProject)).rejects.toThrow(
                'ADP configured but no manifest.appdescr_variant found.'
            );
            expect(mockRootProject.byPath).toHaveBeenCalledWith('/manifest.appdescr_variant');
        });

        test('should throw error when manifest.appdescr_variant is empty', async () => {
            const mockResource = {
                getString: jest.fn().mockResolvedValue('')
            };

            const mockRootProject = {
                byPath: jest.fn().mockResolvedValue(mockResource)
            } as unknown as ReaderCollection;

            await expect(loadAppVariant(mockRootProject)).rejects.toThrow(
                'ADP configured but manifest.appdescr_variant file is empty.'
            );
            expect(mockRootProject.byPath).toHaveBeenCalledWith('/manifest.appdescr_variant');
            expect(mockResource.getString).toHaveBeenCalled();
        });

        test('should throw error when getString throws an error', async () => {
            const mockError = new Error('File read error');
            const mockResource = {
                getString: jest.fn().mockRejectedValue(mockError)
            };

            const mockRootProject = {
                byPath: jest.fn().mockResolvedValue(mockResource)
            } as unknown as ReaderCollection;

            await expect(loadAppVariant(mockRootProject)).rejects.toThrow(
                'Failed to parse manifest.appdescr_variant: File read error'
            );
            expect(mockRootProject.byPath).toHaveBeenCalledWith('/manifest.appdescr_variant');
            expect(mockResource.getString).toHaveBeenCalled();
        });
    });
});
