import { jest } from '@jest/globals';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UI5LibraryReferencePromptOptions } from '../../src';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock functions
const mockFindFioriArtifacts = jest.fn();
const mockGetQuestions = jest.fn();

// Mock ../../src/prompts so getQuestions is spyable
jest.unstable_mockModule('../../src/prompts', () => ({
    getQuestions: mockGetQuestions
}));

// Mock @sap-ux/project-access - list all exports to satisfy ESM linker (avoid importing actual - causes OOM)
jest.unstable_mockModule('@sap-ux/project-access', () => ({
    findFioriArtifacts: mockFindFioriArtifacts,
    getReuseLibs: jest.fn().mockResolvedValue([]),
    checkDependencies: jest.fn(),
    FileName: {},
    DirName: {},
    FioriToolsSettings: {},
    MinCdsPluginUi5Version: {},
    MinCdsVersion: {},
    fioriToolsDirectory: {},
    getFilePaths: jest.fn(),
    normalizePath: jest.fn(),
    addPackageDevDependency: jest.fn(),
    clearCdsModuleCache: jest.fn(),
    createApplicationAccess: jest.fn(),
    createProjectAccess: jest.fn(),
    deleteCapApp: jest.fn(),
    filterDataSourcesByType: jest.fn(),
    findAllApps: jest.fn(),
    findCapProjectRoot: jest.fn(),
    findCapProjects: jest.fn(),
    findProjectRoot: jest.fn(),
    findRootsForPath: jest.fn(),
    getAllUi5YamlFileNames: jest.fn(),
    getAppRootFromWebappPath: jest.fn(),
    getAppProgrammingLanguage: jest.fn(),
    getAppType: jest.fn(),
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
    getWebappPath: jest.fn(),
    hasUI5CliV3: jest.fn(),
    isCapProject: jest.fn(),
    isCapJavaProject: jest.fn(),
    isCapNodeJsProject: jest.fn(),
    loadModuleFromProject: jest.fn(),
    readCapServiceMetadataEdmx: jest.fn(),
    readUi5Yaml: jest.fn(),
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
    execNpmCommand: jest.fn(),
    findRecursiveHierarchyKey: jest.fn(),
    getTableCapabilitiesByEntitySet: jest.fn(),
    hasDependency: jest.fn()
}));

// Dynamic imports after mocking
const { prompt, getPrompts } = await import('../../src');
const { promptNames } = await import('../../src/types');
const { initI18n } = await import('../../src/i18n');
// Load the real getQuestions implementation for mockGetQuestions to delegate to
const actualPrompts = await import('../../src/prompts/prompts');
mockGetQuestions.mockImplementation(actualPrompts.getQuestions);

describe('ui5-library-reference-inquirer API', () => {
    beforeAll(async () => {
        await initI18n();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('getPrompts, no options', async () => {
        // All prompts, no options
        const prompts = await getPrompts([join(__dirname, '/samples')]);
        expect(prompts).toMatchSnapshot();
        expect(mockGetQuestions).toHaveBeenCalled();
    });

    test('prompt, prompt module registers plugin', async () => {
        mockFindFioriArtifacts.mockResolvedValue([] as any);
        const mockInquirerAdapter = {
            prompt: jest.fn().mockResolvedValue({ aPrompt: 'a prompt answer' }),
            promptModule: jest.fn()
        };
        const promptOpts: UI5LibraryReferencePromptOptions = {
            [promptNames.source]: {
                hide: true
            }
        };

        expect(await prompt([join(__dirname, '/samples'), 'test'], mockInquirerAdapter, promptOpts))
            .toMatchInlineSnapshot(`
            Object {
              "aPrompt": "a prompt answer",
            }
        `);
    });
});
