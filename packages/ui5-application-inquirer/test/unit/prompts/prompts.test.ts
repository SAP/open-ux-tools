import { jest } from '@jest/globals';
import { join } from 'node:path';
import os from 'node:os';
import * as actualFs from 'node:fs';
import * as actualUi5Info from '@sap-ux/ui5-info';
import * as actualProjectAccess from '@sap-ux/project-access';
import * as actualProjectInputValidator from '@sap-ux/project-input-validator';
import * as actualPath from 'node:path';

import type { UI5ApplicationPromptOptions } from '../../../src/types.js';
import type { UI5Version } from '@sap-ux/ui5-info';
import type { ListQuestion } from '@sap-ux/inquirer-common';

// Mock node:fs to control existsSync (used by appPathExists)
const mockExistsSync = jest.fn<typeof actualFs.existsSync>();
jest.unstable_mockModule('node:fs', () => ({
    ...actualFs,
    existsSync: mockExistsSync
}));

// Mock project-access (only getMtaPath is used at runtime)
const mockGetMtaPath = jest.fn<any>();
jest.unstable_mockModule('@sap-ux/project-access', () => ({
    ...actualProjectAccess,
    getMtaPath: mockGetMtaPath
}));

// Mock project-input-validator with real implementations + spy-able overrides
const mockValidateModuleName = jest.fn(actualProjectInputValidator.validateModuleName);
const mockValidateNamespace = jest.fn(actualProjectInputValidator.validateNamespace);
const mockValidateFioriAppTargetFolder = jest.fn(actualProjectInputValidator.validateFioriAppTargetFolder);
const mockValidateFioriAppProjectFolder = jest.fn(actualProjectInputValidator.validateFioriAppProjectFolder);
jest.unstable_mockModule('@sap-ux/project-input-validator', () => ({
    ...actualProjectInputValidator,
    validateModuleName: mockValidateModuleName,
    validateNamespace: mockValidateNamespace,
    validateFioriAppTargetFolder: mockValidateFioriAppTargetFolder,
    validateFioriAppProjectFolder: mockValidateFioriAppProjectFolder
}));

// Mock ui5-info with real implementations + spy-able overrides
const mockGetDefaultUI5Theme = jest.fn(actualUi5Info.getDefaultUI5Theme);
const mockGetUi5Themes = jest.fn(actualUi5Info.getUi5Themes);
jest.unstable_mockModule('@sap-ux/ui5-info', () => ({
    ...actualUi5Info,
    getDefaultUI5Theme: mockGetDefaultUI5Theme,
    getUi5Themes: mockGetUi5Themes
}));

// Mock node:path so the targetFolder filter can be exercised against both posix and win32 path
// semantics regardless of the host OS. When `pathFlavor` is null the mock passes through to the
// real platform default; tests that need to exercise a specific flavor set it explicitly.
let pathFlavor: 'posix' | 'win32' | null = null;
jest.unstable_mockModule('node:path', () => ({
    ...actualPath,
    isAbsolute: (p: string) => (pathFlavor ? actualPath[pathFlavor].isAbsolute(p) : actualPath.isAbsolute(p)),
    resolve: (...args: string[]) => (pathFlavor ? actualPath[pathFlavor].resolve(...args) : actualPath.resolve(...args))
}));

const { getQuestions } = await import('../../../src/prompts/index.js');
const { initI18nUi5AppInquirer } = await import('../../../src/i18n.js');
const { promptNames } = await import('../../../src/types.js');
const { defaultVersion, ui5ThemeIds } = await import('@sap-ux/ui5-info');

describe('getQuestions', () => {
    const mockCdsInfo = {
        isWorkspaceEnabled: false,
        hasMinCdsVersion: true,
        isCdsUi5PluginEnabled: false,
        hasCdsUi5Plugin: false
    };
    beforeAll(async () => {
        // Wait for i18n to bootstrap so we can test localised strings
        await initI18nUi5AppInquirer();
    });

    afterEach(() => {
        // Reset all spys (not mocks)
        // jest.restoreAllMocks() only works when the mock was created with jest.spyOn().
        jest.restoreAllMocks();
        mockExistsSync.mockReset();
        mockGetMtaPath.mockReset();
        mockValidateModuleName.mockReset().mockImplementation(actualProjectInputValidator.validateModuleName);
        mockValidateNamespace.mockReset().mockImplementation(actualProjectInputValidator.validateNamespace);
        mockValidateFioriAppTargetFolder
            .mockReset()
            .mockImplementation(actualProjectInputValidator.validateFioriAppTargetFolder);
        mockValidateFioriAppProjectFolder
            .mockReset()
            .mockImplementation(actualProjectInputValidator.validateFioriAppProjectFolder);
        mockGetDefaultUI5Theme.mockReset().mockImplementation(actualUi5Info.getDefaultUI5Theme);
        mockGetUi5Themes.mockReset().mockImplementation(actualUi5Info.getUi5Themes);
    });

    test('getQuestions, no options', async () => {
        // Tests all declaritive values
        expect(await getQuestions([])).toMatchSnapshot();
    });

    test('getQuestions, parameter `capCdsInfo` specified', async () => {
        // Prompt: `targetFolder` should not returned for CAP projects
        expect(await getQuestions([], undefined, mockCdsInfo)).not.toEqual(
            expect.arrayContaining([expect.objectContaining({ name: promptNames.targetFolder })])
        );

        // Prompt: `targetFolder` should only be returned for non-CAP projects
        expect(await getQuestions([])).toEqual(
            expect.arrayContaining([expect.objectContaining({ name: promptNames.targetFolder })])
        );
    });

    test('getQuestions, prompt: `name`, conditional validator', async () => {
        mockValidateModuleName.mockReturnValue(true);
        mockExistsSync.mockReturnValue(true);
        // Test default when `isCLi` === true
        let questions = await getQuestions([], {
            [promptNames.targetFolder]: {
                default: '/cap/specific/target/path'
            }
        });
        expect(
            (questions.find((question) => question.name === promptNames.name)?.validate as Function)('project1', {})
        ).toMatchInlineSnapshot(
            `"A module with this name already exists in the folder: /cap/specific/target/path. Choose a different module name."`
        );

        // Test default when CAP project info provided
        questions = await getQuestions(
            [],
            {
                [promptNames.targetFolder]: {
                    default: '/cap/specific/target/path1'
                }
            },
            mockCdsInfo,
            true
        );
        expect(
            (questions.find((question) => question.name === promptNames.name)?.validate as Function)('project1', {})
        ).toMatchInlineSnapshot(
            `"A module with this name already exists in the folder: /cap/specific/target/path1. Choose a different module name."`
        );

        // Non-Cli usage (YUI)
        questions = await getQuestions(
            [],
            {
                [promptNames.targetFolder]: {
                    default: '/cap/specific/target/path1'
                }
            },
            undefined,
            true
        );
        expect(
            (questions.find((question) => question.name === promptNames.name)?.validate as Function)('project1', {})
        ).toEqual(true);

        mockExistsSync.mockReturnValue(false);
        // Default generated name
        expect((questions.find((question) => question.name === promptNames.name)?.default as Function)({})).toEqual(
            'project1'
        );

        // Name answer
        expect(
            (questions.find((question) => question.name === promptNames.name)?.default as Function)({ name: 'abc123' })
        ).toEqual('abc123');

        // Default name provided
        const promptOpts: UI5ApplicationPromptOptions = {
            [promptNames.name]: {
                default: 'defaultAppName',
                defaultValue: 'shouldBeIgnoredAsDefaultIsProvided'
            }
        };
        questions = await getQuestions([], promptOpts);
        const namePrompt = questions.find((question) => question.name === promptNames.name);
        expect(namePrompt?.default).toEqual(promptOpts.name?.default);

        // Test `defaultValue` prompt option - should not replace existing default function
        const promptOptionsDefaultValue = {
            [promptNames.name]: {
                defaultValue: 'defaultAppNameDontReplace'
            }
        };

        questions = await getQuestions([], promptOptionsDefaultValue);
        const namePromptWithDefaultValue = questions.find((question) => question.name === promptNames.name);
        expect(namePromptWithDefaultValue?.default({})).toEqual(promptOptionsDefaultValue.name?.defaultValue);
        expect(namePromptWithDefaultValue?.default({ name: 'userInputName' })).toEqual('userInputName');
    });

    test('getQuestions, prompt: `title`, default', async () => {
        const questions = await getQuestions([]);
        // defaults
        expect(
            (questions.find((question) => question.name === promptNames.title)?.default as Function)({})
        ).toMatchInlineSnapshot(`"App Title"`);

        expect(
            (questions.find((question) => question.name === promptNames.title)?.default as Function)({
                title: 'alreadyAnsweredTitle'
            })
        ).toMatchInlineSnapshot(`"alreadyAnsweredTitle"`);
    });

    test('getQuestions, prompt: `namespace`', async () => {
        let questions = await getQuestions([]);
        // defaults
        let namespacePrompt = questions.find((question) => question.name === promptNames.namespace);
        expect((namespacePrompt?.default as Function)({})).toMatchInlineSnapshot(`""`);

        expect(
            (namespacePrompt?.default as Function)({
                namespace: 'abc'
            })
        ).toMatchInlineSnapshot(`"abc"`);

        // validators
        mockValidateNamespace.mockReturnValue(true);
        expect(namespacePrompt?.validate!(undefined, {})).toEqual(true);

        const args = ['abc', { name: 'project1' }] as const;
        expect(namespacePrompt?.validate!(...args)).toEqual(true);
        expect(mockValidateNamespace).toHaveBeenCalledWith(args[0], args[1].name);

        const promptOpts: UI5ApplicationPromptOptions = {
            [promptNames.name]: {
                default: 'defaultAppName'
            }
        };
        questions = await getQuestions([], promptOpts);
        namespacePrompt = questions.find((question) => question.name === promptNames.namespace);
        expect(namespacePrompt?.validate!('def', {})).toEqual(true);
        expect(mockValidateNamespace).toHaveBeenCalledWith('def', promptOpts.name?.default);
    });

    test('getQuestions, prompt: `description`, default', async () => {
        const questions = await getQuestions([]);
        // defaults
        const descPrompt = questions.find((question) => question.name === promptNames.description);
        expect((descPrompt?.default as Function)({})).toMatchInlineSnapshot(`"An SAP Fiori application."`);

        expect(
            (descPrompt?.default as Function)({
                description: 'abc 123'
            })
        ).toMatchInlineSnapshot(`"abc 123"`);
    });

    test('getQuestions, prompt: `targetFolder`', async () => {
        const mockCwd = '/any/current/working/directory';
        jest.spyOn(process, 'cwd').mockReturnValueOnce(mockCwd);
        let questions = await getQuestions([]);
        // defaults, cwd
        let targetFolderPrompt = questions.find((question) => question.name === promptNames.targetFolder);
        expect((targetFolderPrompt?.default as Function)({})).toEqual(mockCwd);
        // already answered
        const mockAnsTargetFolder = '/any/answered/target/folder';
        expect((targetFolderPrompt?.default as Function)({ targetFolder: mockAnsTargetFolder })).toEqual(
            mockAnsTargetFolder
        );

        // target folder provided with prompt options
        const promptOpts: UI5ApplicationPromptOptions = {
            [promptNames.targetFolder]: {
                default: '/any/passed/target/folder'
            }
        };
        questions = await getQuestions([], promptOpts);
        targetFolderPrompt = questions.find((question) => question.name === promptNames.targetFolder);
        expect(targetFolderPrompt?.default).toEqual(promptOpts.targetFolder?.default);

        // validators
        questions = await getQuestions([]);
        targetFolderPrompt = questions.find((question) => question.name === promptNames.targetFolder);

        await expect(targetFolderPrompt?.validate!(undefined, {})).resolves.toEqual(false);

        mockValidateFioriAppTargetFolder.mockResolvedValueOnce(true);
        const args = ['/some/target/path', { name: 'project1' }] as const;
        await expect(targetFolderPrompt?.validate!(...args)).resolves.toEqual(true);
        expect(mockValidateFioriAppTargetFolder).toHaveBeenCalledWith(...[args[0]], args[1].name, undefined);

        // Test `defaultValue` prompt option - should not replace existing default function
        const promptOptionsDefaultValue = {
            [promptNames.targetFolder]: {
                defaultValue: '/default/target/folder'
            }
        };

        questions = await getQuestions([], promptOptionsDefaultValue);
        const targetFolderPromptWithDefaultValue = questions.find(
            (question) => question.name === promptNames.targetFolder
        );
        expect(targetFolderPromptWithDefaultValue?.default({})).toEqual(
            promptOptionsDefaultValue.targetFolder?.defaultValue
        );
        expect(targetFolderPromptWithDefaultValue?.default({ targetFolder: 'user/input/target/folder' })).toEqual(
            'user/input/target/folder'
        );

        // test scenario where target folder is within an existing Fiori app
        mockValidateFioriAppProjectFolder.mockResolvedValueOnce(false);

        const promptOptsValidateFioriAppFolder: UI5ApplicationPromptOptions = {
            [promptNames.targetFolder]: {
                defaultValue: '/folder/containing/fiori/app',
                validateFioriAppFolder: true
            }
        };

        questions = await getQuestions([], promptOptsValidateFioriAppFolder);
        targetFolderPrompt = questions.find((question) => question.name === promptNames.targetFolder);
        expect(targetFolderPrompt?.default({})).toEqual(join(os.homedir(), 'projects'));
        expect(mockValidateFioriAppProjectFolder).toHaveBeenCalledWith('/folder/containing/fiori/app');

        // filter is exercised in a dedicated test below (`getQuestions, prompt: \`targetFolder\` - filter`)
    });

    test('getQuestions, prompt: `targetFolder` - filter', async () => {
        // Swap `node:path`'s `isAbsolute`/`resolve` for the posix or win32 flavor so we can
        // deterministically exercise the filter against both path styles, regardless of the OS
        // running the test. The top-level mock dispatches via the mutable `pathFlavor` variable;
        // changing it here re-routes subsequent isAbsolute/resolve calls without needing to
        // re-import the prompts module.
        const loadTargetFolderPrompt = async (
            pathImpl: typeof actualPath.win32 | typeof actualPath.posix,
            isYUI?: boolean
        ): Promise<any> => {
            pathFlavor = pathImpl === actualPath.win32 ? 'win32' : 'posix';
            const localQuestions = await getQuestions([], undefined, undefined, isYUI);
            return localQuestions.find((q: { name: string }) => q.name === promptNames.targetFolder);
        };

        // Sanity check: confirm the path mock is actually applied. `C:\abs` is absolute under
        // win32 (passes through) but relative under posix (gets resolved). Without an effective
        // mock, both calls would use the real platform `path` and one of these assertions would
        // fail rather than silently pass on a host OS that happens to match the flavor.
        const win32SanityPrompt = await loadTargetFolderPrompt(actualPath.win32);
        expect((win32SanityPrompt?.filter as Function)('C:\\abs')).toEqual('C:\\abs');
        const posixSanityPrompt = await loadTargetFolderPrompt(actualPath.posix);
        expect((posixSanityPrompt?.filter as Function)('C:\\abs')).toEqual(actualPath.posix.resolve('C:\\abs'));

        // win32 CLI: relative paths are resolved using win32 semantics, absolute paths pass through
        const win32Prompt = await loadTargetFolderPrompt(actualPath.win32);
        const win32Absolute = 'C:\\some\\absolute\\path';
        expect((win32Prompt?.filter as Function)('relative\\path')).toEqual(actualPath.win32.resolve('relative\\path'));
        expect((win32Prompt?.filter as Function)(win32Absolute)).toEqual(win32Absolute);
        expect((win32Prompt?.filter as Function)('')).toEqual('');
        expect((win32Prompt?.filter as Function)(undefined)).toEqual(undefined);

        // posix CLI: relative paths are resolved using posix semantics, absolute paths pass through
        const posixPrompt = await loadTargetFolderPrompt(actualPath.posix);
        const posixAbsolute = '/some/absolute/path';
        expect((posixPrompt?.filter as Function)('relative/path')).toEqual(actualPath.posix.resolve('relative/path'));
        expect((posixPrompt?.filter as Function)(posixAbsolute)).toEqual(posixAbsolute);
        expect((posixPrompt?.filter as Function)('')).toEqual('');
        expect((posixPrompt?.filter as Function)(undefined)).toEqual(undefined);

        // YUI: input is returned unchanged regardless of path style (folder browser provides absolute paths)
        const win32YuiPrompt = await loadTargetFolderPrompt(actualPath.win32, true);
        expect((win32YuiPrompt?.filter as Function)('relative\\path')).toEqual('relative\\path');
        expect((win32YuiPrompt?.filter as Function)(win32Absolute)).toEqual(win32Absolute);
        const posixYuiPrompt = await loadTargetFolderPrompt(actualPath.posix, true);
        expect((posixYuiPrompt?.filter as Function)('relative/path')).toEqual('relative/path');
        expect((posixYuiPrompt?.filter as Function)(posixAbsolute)).toEqual(posixAbsolute);
    });

    test('getQuestions, prompt: `ui5VersionChoice`', async () => {
        // No UI5 versions specified
        let questions = await getQuestions([]);
        let ui5VersionPrompt = questions.find((question) => question.name === promptNames.ui5Version);
        expect((ui5VersionPrompt?.when as Function)()).toEqual(true);
        expect(ui5VersionPrompt?.type).toEqual('list');
        expect(((ui5VersionPrompt as ListQuestion).choices as Function)()).toMatchInlineSnapshot(`[]`);

        const ui5Vers: UI5Version[] = [
            {
                version: '1.118.0',
                maintained: true,
                default: true
            },
            {
                version: '1.117.0',
                maintained: true
            },
            {
                version: '1.116.0',
                maintained: false
            }
        ];
        const expectedUI5VerChoices = [
            {
                'name': '1.118.0 - (Maintained version)',
                'value': '1.118.0'
            },
            {
                'name': '1.117.0 - (Maintained version)',
                'value': '1.117.0'
            },
            {
                'name': '1.116.0 - (Out of maintenance version)',
                'value': '1.116.0'
            }
        ];
        // UI5 versions specified
        questions = await getQuestions(ui5Vers);
        ui5VersionPrompt = questions.find((question) => question.name === promptNames.ui5Version);
        expect((ui5VersionPrompt?.when as Function)()).toEqual(true);
        expect(ui5VersionPrompt?.type).toEqual('list');
        expect(((ui5VersionPrompt as ListQuestion)?.choices as Function)()).toEqual(expectedUI5VerChoices);
        // No search input, all choices returned, source search is unit tested elsewhere
        expect((ui5VersionPrompt?.source as Function)()).toEqual(expectedUI5VerChoices);

        // Option `useAutocomplete` specified
        // UI5 versions specified
        questions = await getQuestions(ui5Vers, {
            ui5Version: {
                useAutocomplete: true
            }
        });
        ui5VersionPrompt = questions.find((question) => question.name === promptNames.ui5Version);
        expect((ui5VersionPrompt?.when as Function)()).toEqual(true);
        expect(ui5VersionPrompt?.type).toEqual('autocomplete');
        expect(((ui5VersionPrompt as ListQuestion)?.choices as Function)()).toEqual(expectedUI5VerChoices);
        expect((ui5VersionPrompt?.source as Function)()).toEqual(expectedUI5VerChoices);
        // Default version should be used
        expect((ui5VersionPrompt?.default as Function)()).toEqual(expectedUI5VerChoices[0].value);

        // This choice is not a maintained version and so the closest maintained version should be added
        const defaultChoice = {
            'name': '1.120.99 (Source system version)',
            'value': '1.120.99'
        };
        questions = await getQuestions(ui5Vers, {
            ui5Version: {
                defaultChoice
            }
        });

        ui5VersionPrompt = questions.find((question) => question.name === promptNames.ui5Version);
        expect(((ui5VersionPrompt as ListQuestion)?.choices as Function)()).toEqual([
            defaultChoice,
            ...expectedUI5VerChoices
        ]);
        expect((ui5VersionPrompt?.default as Function)()).toEqual('1.120.99');

        //'createPromptOptions - sap system UI5 version is set as default choice'
        expect(((ui5VersionPrompt as ListQuestion)?.choices as Function)()).toEqual([
            { 'name': '1.120.99 (Source system version)', 'value': '1.120.99' },
            { 'name': '1.118.0 - (Maintained version)', 'value': '1.118.0' },
            { 'name': '1.117.0 - (Maintained version)', 'value': '1.117.0' },
            { 'name': '1.116.0 - (Out of maintenance version)', 'value': '1.116.0' }
        ]);
    });

    test('getQuestions, prompt: `addDeployConfig` conditions and message based on mta.yaml discovery', async () => {
        mockGetMtaPath.mockResolvedValue(undefined);
        const mockCwd = '/any/current/working/directory';
        jest.spyOn(process, 'cwd').mockReturnValueOnce(mockCwd);

        // 'addDeployConfig' is always returned based on static inputs, it is the 'when' condition that determines its presence
        let questions = await getQuestions([], undefined, mockCdsInfo);
        let addDeployConfigQuestion = questions.find((question) => question.name === promptNames.addDeployConfig);
        expect(questions).toEqual(
            expect.arrayContaining([expect.objectContaining({ name: promptNames.addDeployConfig })])
        );
        // Mta path is calculated by the when condition which is executed before the message function
        expect(await (addDeployConfigQuestion?.when as Function)()).toEqual(false);
        expect((addDeployConfigQuestion?.message as Function)()).toMatchInlineSnapshot(
            `"Add Deployment Configuration"`
        );

        mockGetMtaPath.mockResolvedValue({ mtaPath: 'any/path', hasRoot: false });
        questions = await getQuestions([], undefined, mockCdsInfo);
        addDeployConfigQuestion = questions.find((question) => question.name === promptNames.addDeployConfig);
        expect(await (addDeployConfigQuestion?.when as Function)()).toEqual(true);
        expect(mockGetMtaPath).toHaveBeenCalledWith(mockCwd);

        const targetFolder = '/any/target/folder';
        expect(await (addDeployConfigQuestion?.when as Function)({ targetFolder })).toEqual(true);
        expect(mockGetMtaPath).toHaveBeenCalledWith(targetFolder);

        expect((addDeployConfigQuestion?.message as Function)()).toMatchInlineSnapshot(
            `"Add Deployment Configuration to the MTA Project: (any/path)."`
        );
        expect(await (addDeployConfigQuestion?.default as Function)()).toEqual(true);
    });

    test('getQuestions, prompt: `addDeployConfig` validator', async () => {
        // 'addDeployConfig' is always returned based on static inputs, it is the 'when' condition that determines its presence
        let questions = await getQuestions([]);
        let addDeployConfigQuestion = questions.find((question) => question.name === promptNames.addDeployConfig);
        expect(await (addDeployConfigQuestion?.validate as Function)()).toEqual(true);
        const validatorCbSpy = jest.fn();
        questions = await getQuestions([], {
            addDeployConfig: {
                validatorCallback: validatorCbSpy
            }
        });
        addDeployConfigQuestion = questions.find((question) => question.name === promptNames.addDeployConfig);
        expect((addDeployConfigQuestion?.validate as Function)(false)).toBe(true);
        expect(validatorCbSpy).toHaveBeenCalledWith(false, promptNames.addDeployConfig);
        expect((addDeployConfigQuestion?.validate as Function)(true)).toBe(true);
        expect(validatorCbSpy).toHaveBeenCalledWith(true, promptNames.addDeployConfig);
    });

    test('getQuestions, prompt: `addFlpConfig`', async () => {
        let questions = await getQuestions([]);
        let addFlpConfigQuestion = questions.find((question) => question.name === promptNames.addFlpConfig);

        expect(questions).toEqual(
            expect.arrayContaining([expect.objectContaining({ name: promptNames.addFlpConfig })])
        );
        expect((addFlpConfigQuestion?.message as Function)()).toMatchInlineSnapshot(
            `"Add SAP Fiori Launchpad Configuration"`
        );

        expect(await (addFlpConfigQuestion?.validate as Function)()).toEqual(true);
        const validatorCbSpy = jest.fn();
        questions = await getQuestions([], {
            addFlpConfig: {
                validatorCallback: validatorCbSpy
            }
        });
        addFlpConfigQuestion = questions.find((question) => question.name === promptNames.addFlpConfig);
        expect((addFlpConfigQuestion?.validate as Function)(false)).toBe(true);
        expect(validatorCbSpy).toHaveBeenCalledWith(false, promptNames.addFlpConfig);
        expect((addFlpConfigQuestion?.validate as Function)(true)).toBe(true);
        expect(validatorCbSpy).toHaveBeenCalledWith(true, promptNames.addFlpConfig);
    });

    test('getQuestions, prompt: `enableVirtualEndpoints`', async () => {
        // Edmx project
        let questions = await getQuestions([]);
        let enableVirtualEndpointsQuestion = questions.find(
            (question) => question.name === promptNames.enableVirtualEndpoints
        );

        expect(questions).toEqual(
            expect.arrayContaining([expect.objectContaining({ name: promptNames.enableVirtualEndpoints })])
        );
        expect((enableVirtualEndpointsQuestion?.message as Function)()).toMatchInlineSnapshot(
            `"Use Virtual Endpoints for Local Preview"`
        );

        // CAP project with cds version
        questions = await getQuestions([], {}, mockCdsInfo);
        enableVirtualEndpointsQuestion = questions.find(
            (question) => question.name === promptNames.enableVirtualEndpoints
        );
        expect(enableVirtualEndpointsQuestion).toBeDefined();

        // CAP project with cds-ui5 plugin disabled and hasMinCdsVersion is false
        questions = await getQuestions(
            [],
            {},
            { ...mockCdsInfo, isCdsUi5PluginEnabled: false, hasMinCdsVersion: false }
        );
        enableVirtualEndpointsQuestion = questions.find(
            (question) => question.name === promptNames.enableVirtualEndpoints
        );
        expect(enableVirtualEndpointsQuestion).toBe(undefined);
    });

    test('getQuestions, prompt: `ui5Theme`', async () => {
        const questions = await getQuestions([]);
        const ui5ThemeQuestion = questions.find((question) => question.name === promptNames.ui5Theme);

        expect(questions).toEqual(expect.arrayContaining([expect.objectContaining({ name: promptNames.ui5Theme })]));
        expect((ui5ThemeQuestion?.default as Function)({})).toEqual(ui5ThemeIds.SAP_HORIZON);
        expect(mockGetDefaultUI5Theme).toHaveBeenCalledWith(undefined);

        const ui5Theme = ui5ThemeIds.SAP_FIORI_3;
        mockGetDefaultUI5Theme.mockClear();
        expect((ui5ThemeQuestion?.default as Function)({ [promptNames.ui5Theme]: ui5Theme })).toEqual(
            ui5ThemeIds.SAP_FIORI_3
        );
        expect(mockGetDefaultUI5Theme).not.toHaveBeenCalledWith();

        const ui5Version = '9.999.999';
        mockGetDefaultUI5Theme.mockClear();
        expect((ui5ThemeQuestion?.default as Function)({ [promptNames.ui5Version]: ui5Version })).toEqual(
            ui5ThemeIds.SAP_HORIZON
        );
        expect(mockGetDefaultUI5Theme).toHaveBeenCalledWith(ui5Version);

        // choices
        // Mock themes
        const mockThemes = [
            { id: ui5ThemeIds.SAP_FIORI_3_DARK, label: 'Theme One' },
            { id: ui5ThemeIds.SAP_HORIZON_DARK, label: 'Theme Two' }
        ];
        mockGetUi5Themes.mockResolvedValue(mockThemes);
        expect(await ((ui5ThemeQuestion as ListQuestion)?.choices as Function)({})).toMatchInlineSnapshot(`
            [
              {
                "name": "Theme One",
                "value": "sap_fiori_3_dark",
              },
              {
                "name": "Theme Two",
                "value": "sap_horizon_dark",
              },
            ]
        `);
        expect(mockGetUi5Themes).toHaveBeenCalledWith(defaultVersion);
        mockGetUi5Themes.mockClear();
        ((ui5ThemeQuestion as ListQuestion)?.choices as Function)({ [promptNames.ui5Version]: ui5Version });
        expect(mockGetUi5Themes).toHaveBeenCalledWith(ui5Version);
    });

    test('getQuestions, prompt: `enableEslint` is always hidden', async () => {
        // enableEslint prompt is always hidden as it's enabled by default in the writer
        let questions = await getQuestions([]);
        let enableEslintQuestion = questions.find((question) => question.name === promptNames.enableEslint);
        expect(enableEslintQuestion).toBeDefined(); // Enabled by default but should still be hidden

        // Even when prompt options are provided, the prompt should still be hidden
        questions = await getQuestions([], {
            enableEslint: {
                default: true
            }
        });
        enableEslintQuestion = questions.find((question) => question.name === promptNames.enableEslint);
        expect(enableEslintQuestion).toBeDefined(); // Enabled by default but should still be hidden
    });

    test('getQuestions, prompt: `skipAnnotations`', async () => {
        let questions = await getQuestions([]);
        let skipAnnotationsQuestion = questions.find((question) => question.name === promptNames.skipAnnotations);
        // defaults
        expect(skipAnnotationsQuestion?.default).toEqual(false);
        questions = await getQuestions([], {
            skipAnnotations: {
                default: true
            }
        });
        skipAnnotationsQuestion = questions.find((question) => question.name === promptNames.skipAnnotations);
        // defaults
        expect(skipAnnotationsQuestion?.default).toEqual(true);
    });

    test('getQuestions, prompt: `enableTypeScript`', async () => {
        const questions = await getQuestions([]);
        let enableTypeScriptQuestion = questions.find((question) => question.name === promptNames.enableTypeScript);
        // default
        expect(enableTypeScriptQuestion?.default).toEqual(false);
        const mockCdsInfoFalse = {
            hasCdsUi5Plugin: false,
            isCdsUi5PluginEnabled: false,
            isWorkspaceEnabled: false,
            hasMinCdsVersion: false
        };
        enableTypeScriptQuestion = (await getQuestions([], undefined, mockCdsInfoFalse)).find(
            (question) => question.name === promptNames.enableTypeScript
        );
        expect(enableTypeScriptQuestion).toBe(undefined);
    });

    test('getQuestions, advanced prompt grouping', async () => {
        const advancedOptions = {
            [promptNames.ui5Theme]: {
                advancedOption: true
            },
            [promptNames.skipAnnotations]: {
                advancedOption: true
            }
        };
        const questions = await getQuestions([], advancedOptions, mockCdsInfo);

        Object.keys(advancedOptions).forEach((questionName) => {
            const question = questions.find(({ name }) => name === questionName);
            expect((question?.when as Function)({ [promptNames.showAdvanced]: false })).toEqual(false);
            expect((question?.when as Function)({ [promptNames.showAdvanced]: true })).toEqual(true);
        });
    });
});
