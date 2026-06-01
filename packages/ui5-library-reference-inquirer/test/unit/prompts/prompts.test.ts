import { jest } from '@jest/globals';
import type { ListQuestion } from 'inquirer';
import type { CheckBoxQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
import { Severity } from '@sap-devx/yeoman-ui-types';
import type { ReuseLibType } from '@sap-ux/project-access';

// Mock function for checkDependencies
const mockCheckDependencies = jest.fn();

// Mock @sap-ux/project-access - list all exports to satisfy ESM linker (avoid importing actual - causes OOM)
jest.unstable_mockModule('@sap-ux/project-access', () => ({
    checkDependencies: mockCheckDependencies,
    findFioriArtifacts: jest.fn(),
    getReuseLibs: jest.fn(),
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
const { initI18n, t } = await import('../../../src/i18n');
const { getQuestions } = await import('../../../src/prompts/');
const { promptNames } = await import('../../../src/types');

// ReuseLibType is a const enum, inlined at compile time - use string values directly
const ReuseLibTypeLibrary: ReuseLibType = 'library' as ReuseLibType;

describe('getQuestions', () => {
    beforeAll(async () => {
        await initI18n();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('getQuestions, no project, libs or options', () => {
        const questions = getQuestions();
        const targetFolderPrompt = questions.find((question) => question.name === promptNames.targetProjectFolder);
        const referenceLibrariesPrompt = questions.find((question) => question.name === promptNames.referenceLibraries);

        expect(questions).toMatchSnapshot();
        expect((targetFolderPrompt as ListQuestion)?.choices).toBeUndefined();
        expect(((targetFolderPrompt as ListQuestion)?.default as Function)()).toBeUndefined();
        expect(((targetFolderPrompt as ListQuestion)?.validate as Function)()).toBe(t('error.noProjectsFound'));

        expect(((referenceLibrariesPrompt as CheckBoxQuestion)?.validate as Function)()).toBe(t('error.noLibsFound'));
    });

    test('getQuestions, with project & libs', () => {
        const projectChoices = [{ name: 'project1', value: 'project1' }];
        const reuseLibs = [
            {
                name: 'lib1',
                value: {
                    name: 'lib1',
                    path: 'path/to/lib1',
                    type: ReuseLibTypeLibrary,
                    uri: 'uri.for.lib1',
                    dependencies: ['dep1'],
                    libRoot: 'lib/root'
                }
            }
        ];

        const questions = getQuestions(projectChoices, reuseLibs);
        const targetFolderPrompt = questions.find((question) => question.name === promptNames.targetProjectFolder);
        const referenceLibrariesPrompt = questions.find((question) => question.name === promptNames.referenceLibraries);

        expect((targetFolderPrompt as ListQuestion)?.choices).toBe(projectChoices);
        expect(((targetFolderPrompt as ListQuestion)?.default as Function)()).toBe(0);
        expect(((targetFolderPrompt as ListQuestion)?.validate as Function)()).toBe(true);

        expect((referenceLibrariesPrompt as CheckBoxQuestion)?.choices).toBe(reuseLibs);
        expect(((referenceLibrariesPrompt as CheckBoxQuestion)?.validate as Function)()).toBe(true);
        expect(((referenceLibrariesPrompt as CheckBoxQuestion)?.validate as Function)([])).toBe(
            t('error.noLibSelected')
        );
        expect(((referenceLibrariesPrompt as CheckBoxQuestion)?.validate as Function)(reuseLibs)).toBe(true);

        expect(((referenceLibrariesPrompt as YUIQuestion)?.additionalMessages as Function)()).toBeUndefined();

        mockCheckDependencies.mockReturnValue('dep1');
        expect(((referenceLibrariesPrompt as CheckBoxQuestion)?.validate as Function)(reuseLibs)).toBe(true);
        expect(((referenceLibrariesPrompt as YUIQuestion)?.additionalMessages as Function)()).toStrictEqual({
            message: t('addtionalMsgs.missingDeps', { dependencies: 'dep1' }),
            severity: Severity.warning
        });
    });

    test('getQuestions, with project & libs and hide options', () => {
        const projectChoices = [{ name: 'project1', value: 'project1' }];
        const reuseLibs = [
            {
                name: 'lib1',
                value: {
                    name: 'lib1',
                    path: 'path/to/lib1',
                    type: ReuseLibTypeLibrary,
                    uri: 'uri.for.lib1',
                    dependencies: ['dep1'],
                    libRoot: 'lib/root'
                }
            }
        ];

        const promptOptions = {
            [promptNames.source]: {
                hide: true
            }
        };

        const questions = getQuestions(projectChoices, reuseLibs, promptOptions);

        expect(questions.find((question) => question.name === promptNames.source)).toBeUndefined();
    });
});
