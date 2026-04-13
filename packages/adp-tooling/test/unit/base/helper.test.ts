import { jest } from '@jest/globals';
import { join, dirname } from 'node:path';
import { readFileSync as realReadFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

import type { Editor, create } from 'mem-fs-editor';
// eslint-disable-next-line sonarjs/no-implicit-dependencies
import type { ReaderCollection } from '@ui5/fs';
import type { UI5Config, CustomMiddleware } from '@sap-ux/ui5-config';
import type { DescriptorVariant } from '../../../src/types';

// MOCKS - use jest.unstable_mockModule for ESM compatibility
const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();
jest.unstable_mockModule('node:fs', () => ({
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn(),
    readdirSync: jest.fn(),
    statSync: jest.fn(),
    default: {
        existsSync: mockExistsSync,
        readFileSync: mockReadFileSync,
        writeFileSync: jest.fn(),
        mkdirSync: jest.fn(),
        readdirSync: jest.fn(),
        statSync: jest.fn()
    }
}));

const mockReadUi5Yaml = jest.fn();
const mockGetAppType = jest.fn();
const mockGetWebappPath = jest.fn();
jest.unstable_mockModule('@sap-ux/project-access', () => ({
    readUi5Yaml: mockReadUi5Yaml,
    getAppType: mockGetAppType,
    getWebappPath: mockGetWebappPath,
    DirName: { Changes: 'changes', Webapp: 'webapp' },
    FileName: { ManifestAppDescrVar: 'manifest.appdescr_variant', Ui5Yaml: 'ui5.yaml' },
    filterDataSourcesByType: jest.fn(),
    findAllApps: jest.fn(),
    findCapProjectRoot: jest.fn(),
    findCapProjects: jest.fn(),
    findFioriArtifacts: jest.fn(),
    findProjectRoot: jest.fn(),
    findRootsForPath: jest.fn(),
    getAllUi5YamlFileNames: jest.fn(),
    getAppRootFromWebappPath: jest.fn(),
    getAppProgrammingLanguage: jest.fn(),
    getCapCustomPaths: jest.fn(),
    getCapEnvironment: jest.fn(),
    getCapModelAndServices: jest.fn(),
    getCapServiceName: jest.fn(),
    getCapProjectType: jest.fn(),
    getCdsFiles: jest.fn(),
    getCdsRoots: jest.fn(),
    getCdsServices: jest.fn(),
    getCapI18nFolderNames: jest.fn(),
    getSpecification: jest.fn(),
    getSpecificationModuleFromCache: jest.fn(),
    getSpecificationPath: jest.fn(),
    getI18nPropertiesPaths: jest.fn(),
    getI18nBundles: jest.fn(),
    getMinUI5VersionFromManifest: jest.fn(),
    getMinUI5VersionAsArray: jest.fn(),
    getMinimumUI5Version: jest.fn(),
    getMtaPath: jest.fn(),
    getMockServerConfig: jest.fn(),
    getMockDataPath: jest.fn(),
    getNodeModulesPath: jest.fn(),
    getPathMappings: jest.fn(),
    getProject: jest.fn(),
    getProjectType: jest.fn(),
    hasUI5CliV3: jest.fn(),
    isCapProject: jest.fn(),
    isCapJavaProject: jest.fn(),
    isCapNodeJsProject: jest.fn(),
    loadModuleFromProject: jest.fn(),
    readCapServiceMetadataEdmx: jest.fn(),
    refreshSpecificationDistTags: jest.fn(),
    toReferenceUri: jest.fn(),
    updatePackageScript: jest.fn(),
    getWorkspaceInfo: jest.fn(),
    hasMinCdsVersion: jest.fn(),
    checkCdsUi5PluginEnabled: jest.fn(),
    readFlexChanges: jest.fn(),
    processServices: jest.fn(),
    getMainService: jest.fn(),
    getGlobalCdsHomePath: jest.fn(),
    createApplicationAccess: jest.fn(),
    createProjectAccess: jest.fn(),
    deleteCapApp: jest.fn(),
    addPackageDevDependency: jest.fn(),
    clearCdsModuleCache: jest.fn(),
    execNpmCommand: jest.fn(),
    getFilePaths: jest.fn(),
    normalizePath: jest.fn(),
    fioriToolsDirectory: '',
    FioriToolsSettings: {},
    MinCdsPluginUi5Version: '',
    MinCdsVersion: '',
    hasDependency: jest.fn(),
    findRecursiveHierarchyKey: jest.fn(),
    getTableCapabilitiesByEntitySet: jest.fn()
}));

const {
    getVariant,
    getAdpConfig,
    getWebappFiles,
    flpConfigurationExists,
    updateVariant,
    isTypescriptSupported,
    filterAndMapInboundsToManifest,
    readUi5Config,
    extractCfBuildTask,
    getSpaceGuidFromUi5Yaml,
    readManifestFromBuildPath,
    loadAppVariant,
    getBaseAppId,
    getExistingAdpProjectType
} = await import('../../../src/base/helper');

// Import types
import type { Inbound, AdaptationProjectType } from '@sap-ux/axios-extension';
const { AdaptationProjectType: AdaptationProjectTypeValue } = await import('@sap-ux/axios-extension');

describe('helper', () => {
    const yamlRelative = 'ui5.yaml';

    const basePath = join(__dirname, '../../fixtures', 'adaptation-project');
    const mockPath = join(basePath, 'webapp', 'manifest.appdescr_variant');
    const mockVariant = realReadFileSync(mockPath, 'utf-8');
    const mockAdp = {
        target: {
            url: 'https://sap.example',
            client: '100'
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Default getWebappPath to return the standard path
        mockGetWebappPath.mockResolvedValue(join(basePath, 'webapp'));
    });

    it('readUi5Config delegates to readUi5Yaml with correct paths', async () => {
        const dummyConfig = { some: 'config' } as unknown as UI5Config;
        mockReadUi5Yaml.mockResolvedValueOnce(dummyConfig);

        const result = await readUi5Config(basePath, yamlRelative);

        expect(mockReadUi5Yaml).toHaveBeenCalledWith(basePath, yamlRelative);
        expect(result).toBe(dummyConfig);
    });

    describe('getVariant', () => {
        beforeEach(() => {
            jest.clearAllMocks();
            mockGetWebappPath.mockResolvedValue(join(basePath, 'webapp'));
        });

        test('should return variant', async () => {
            mockReadFileSync.mockImplementation(() => mockVariant);

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
            mockGetWebappPath.mockResolvedValue(join(basePath, 'webapp'));
        });

        it('should write the updated variant content to the manifest file', async () => {
            await updateVariant(basePath, mockVariant as any, fs);

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
            mockExistsSync.mockReturnValueOnce(true);

            const result = isTypescriptSupported(basePath);

            expect(result).toBe(true);
            expect(mockExistsSync).toHaveBeenCalledWith(tsconfigPath);
        });

        it('should return false if tsconfig.json does not exist and fs is not provided', () => {
            mockExistsSync.mockReturnValueOnce(false);

            const result = isTypescriptSupported(basePath);

            expect(result).toBe(false);
            expect(mockExistsSync).toHaveBeenCalledWith(tsconfigPath);
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
            mockReadUi5Yaml.mockResolvedValue({
                findCustomMiddleware: jest.fn().mockReturnValue(undefined)
            } as unknown as UI5Config);

            await expect(getAdpConfig(basePath, '/path/to/mock/ui5.yaml')).rejects.toThrow(
                'No system configuration found in ui5.yaml'
            );
        });

        test('should return adp configuration', async () => {
            mockReadUi5Yaml.mockResolvedValue({
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
            mockGetWebappPath.mockResolvedValue(join(basePath, 'webapp'));
        });

        test('should return webapp files', async () => {
            // For getWebappFiles, the source reads real FS via readdirSync/readFileSync from node:fs
            // We need to mock those to simulate the filesystem
            const { readdirSync, readFileSync: realFs } = await import('node:fs');
            // Since node:fs is mocked, we need the mock to actually work for getWebappFiles
            // The function uses readdirSync and readFileSync from the mocked module
            // Let's use the UI5Config.newInstance approach from the original test instead

            // Actually getWebappFiles calls getWebappPath (mocked) then uses real fs operations
            // Since fs is mocked, we need to provide implementations

            // Skip this test for now - it requires complex FS mock setup
            // The original test used jest.spyOn(UI5Config, 'newInstance') which is different
            // Let's just test it reads from the right path

            const mockDirents = [
                { name: 'i18n', isFile: () => false, isDirectory: () => true },
                { name: 'manifest.appdescr_variant', isFile: () => true, isDirectory: () => false }
            ];
            const mockI18nDirents = [{ name: 'i18n.properties', isFile: () => true, isDirectory: () => false }];

            const { readdirSync: mockReaddirSync } = await import('node:fs');
            (mockReaddirSync as any).mockReturnValueOnce(mockDirents).mockReturnValueOnce(mockI18nDirents);

            mockReadFileSync.mockReturnValueOnce('i18n content').mockReturnValueOnce('variant content');

            const result = await getWebappFiles(basePath);
            expect(result).toEqual([
                {
                    relativePath: join('i18n', 'i18n.properties'),
                    content: 'i18n content'
                },
                {
                    relativePath: 'manifest.appdescr_variant',
                    content: 'variant content'
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

    describe('getSpaceGuidFromUi5Yaml', () => {
        const rootPath = join(__dirname, '../../fixtures', 'adaptation-project');

        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('returns space GUID when ui5.yaml has app-variant-bundler-build space', async () => {
            const spaceGuid = 'my-space-guid-123';
            const mockBuildTask = { space: spaceGuid };
            mockReadUi5Yaml.mockResolvedValue({
                findCustomTask: jest.fn().mockReturnValue({ configuration: mockBuildTask }),
                findCustomMiddleware: jest.fn()
            } as unknown as UI5Config);

            const result = await getSpaceGuidFromUi5Yaml(rootPath);

            expect(mockReadUi5Yaml).toHaveBeenCalledWith(rootPath, 'ui5.yaml');
            expect(result).toBe(spaceGuid);
        });

        test('returns undefined and calls logger.warn when space cannot be read', async () => {
            mockReadUi5Yaml.mockRejectedValue(new Error('File not found'));
            const logger = { warn: jest.fn() };

            const result = await getSpaceGuidFromUi5Yaml(rootPath, logger as never);

            expect(result).toBeUndefined();
            expect(logger.warn).toHaveBeenCalledWith('Could not read space from ui5.yaml (app-variant-bundler-build).');
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

            mockReadFileSync.mockReturnValueOnce(manifestContent);

            const result = readManifestFromBuildPath(cfBuildPath);

            expect(mockReadFileSync).toHaveBeenCalledWith(expectedPath, 'utf-8');
            expect(result).toEqual(mockManifest);
        });

        test('should throw error when file does not exist', () => {
            const cfBuildPath = 'dist';
            const expectedPath = join(process.cwd(), cfBuildPath, 'manifest.json');

            mockReadFileSync.mockImplementationOnce(() => {
                const error = new Error('ENOENT: no such file or directory');
                (error as NodeJS.ErrnoException).code = 'ENOENT';
                throw error;
            });

            expect(() => readManifestFromBuildPath(cfBuildPath)).toThrow();
            expect(mockReadFileSync).toHaveBeenCalledWith(expectedPath, 'utf-8');
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

    describe('getBaseAppId', () => {
        const mockVariantContent: DescriptorVariant = {
            id: 'customer.test.variant',
            reference: 'base.app.id',
            namespace: 'apps/my.test.app/appVariants',
            layer: 'CUSTOMER_BASE',
            content: []
        };

        beforeEach(() => {
            jest.clearAllMocks();
            mockGetWebappPath.mockResolvedValue(join(basePath, 'webapp'));
        });

        test('should return base app id from variant', async () => {
            mockReadFileSync.mockReturnValue(JSON.stringify(mockVariantContent));

            const result = await getBaseAppId(basePath);

            expect(result).toBe('base.app.id');
        });

        test('should throw error when reference is missing', async () => {
            const variantWithoutRef = { ...mockVariantContent, reference: undefined };
            mockReadFileSync.mockReturnValue(JSON.stringify(variantWithoutRef));

            await expect(getBaseAppId(basePath)).rejects.toThrow(
                'Failed to get app ID: No reference found in manifest.appdescr_variant'
            );
        });

        test('should throw error when variant cannot be read', async () => {
            mockReadFileSync.mockImplementation(() => {
                throw new Error('File not found');
            });

            await expect(getBaseAppId(basePath)).rejects.toThrow('Failed to get app ID: File not found');
        });
    });

    describe('getExistingAdpProjectType', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('should return CLOUD_READY when project is Fiori Adaptation and has custom tasks', async () => {
            const adpCloudProjectBuildTaskName = 'app-variant-bundler-build';
            mockGetAppType.mockResolvedValue('Fiori Adaptation');
            const findCustomTaskMock = jest.fn().mockReturnValue({
                name: adpCloudProjectBuildTaskName
            });
            const mockUi5Config = {
                findCustomTask: findCustomTaskMock,
                findCustomMiddleware: jest.fn()
            } as unknown as UI5Config;
            mockReadUi5Yaml.mockResolvedValue(mockUi5Config);

            const result = await getExistingAdpProjectType(basePath);

            expect(mockGetAppType).toHaveBeenCalledWith(basePath);
            expect(mockReadUi5Yaml).toHaveBeenCalledWith(basePath, 'ui5.yaml');
            expect(findCustomTaskMock).toHaveBeenCalledWith(adpCloudProjectBuildTaskName);
            expect(result).toBe(AdaptationProjectTypeValue.CLOUD_READY);
        });

        test('should return ON_PREMISE when project is Fiori Adaptation and does not have builder custom task', async () => {
            mockGetAppType.mockResolvedValue('Fiori Adaptation');
            const mockUi5Config = {
                findCustomTask: jest.fn().mockReturnValue(undefined),
                findCustomMiddleware: jest.fn()
            } as unknown as UI5Config;
            mockReadUi5Yaml.mockResolvedValue(mockUi5Config);

            const result = await getExistingAdpProjectType(basePath);

            expect(mockGetAppType).toHaveBeenCalledWith(basePath);
            expect(mockReadUi5Yaml).toHaveBeenCalledWith(basePath, 'ui5.yaml');
            expect(result).toBe(AdaptationProjectTypeValue.ON_PREMISE);
        });

        test('should return undefined when project is not Fiori Adaptation', async () => {
            mockGetAppType.mockResolvedValue('Fiori Freestyle');

            const result = await getExistingAdpProjectType(basePath);

            expect(mockGetAppType).toHaveBeenCalledWith(basePath);
            expect(mockReadUi5Yaml).not.toHaveBeenCalled();
            expect(result).toBeUndefined();
        });

        test('should return undefined when getAppType throws an error', async () => {
            mockGetAppType.mockRejectedValue(new Error('Failed to determine app type'));

            const result = await getExistingAdpProjectType(basePath);

            expect(mockGetAppType).toHaveBeenCalledWith(basePath);
            expect(mockReadUi5Yaml).not.toHaveBeenCalled();
            expect(result).toBeUndefined();
        });

        test('should return undefined when readUi5Config throws an error', async () => {
            mockGetAppType.mockResolvedValue('Fiori Adaptation');
            mockReadUi5Yaml.mockRejectedValue(new Error('Failed to read ui5.yaml'));

            const result = await getExistingAdpProjectType(basePath);

            expect(mockGetAppType).toHaveBeenCalledWith(basePath);
            expect(mockReadUi5Yaml).toHaveBeenCalledWith(basePath, 'ui5.yaml');
            expect(result).toBeUndefined();
        });
    });
});
