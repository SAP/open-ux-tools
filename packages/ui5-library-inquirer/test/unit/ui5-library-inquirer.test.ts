import type { UI5Version } from '@sap-ux/ui5-info';
import { type InquirerAdapter } from '@sap-ux/inquirer-common';
import { getPrompts, prompt, findNearestNpmVersion, promptWithVersionResolution } from '../../src/index';
import type { UI5LibraryAnswers } from '../../src/types';
import { initI18n } from '../../src/i18n';
import * as ui5LibInqApi from '../../src/index';
import * as ui5Info from '@sap-ux/ui5-info';
import * as prompting from '../../src/prompts/prompts';
import * as commands from '@sap-ux/ui5-info/dist/commands';
import inquirer, { createPromptModule, type Answers, type ListQuestion } from 'inquirer';

/**
 * Tests the exported ui5-library-inquirer APIs
 */
describe('API test', () => {
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

    beforeAll(async () => {
        // Wait for i18n to bootstrap
        await initI18n();
    });

    afterEach(() => {
        // Reset all spys (not mocks)
        // jest.restoreAllMocks() only works when the mock was created with jest.spyOn().
        jest.restoreAllMocks();
    });

    it('getPrompts, no prompt options', async () => {
        jest.spyOn(process, 'cwd').mockReturnValue('/mocked/cwd');
        const getUI5VersionsSpy = jest.spyOn(ui5Info, 'getUI5Versions').mockResolvedValue(ui5Vers);
        const getQuestionsSpy = jest.spyOn(prompting, 'getQuestions');
        const prompts = await getPrompts();
        expect(prompts).toMatchSnapshot();
        const ui5VersionPrompt = prompts.find(
            (prompt) => prompt.name === 'ui5Version'
        ) as ListQuestion<UI5LibraryAnswers>;
        expect((ui5VersionPrompt.choices as Function)()).toMatchInlineSnapshot(`
            [
              {
                "name": "1.118.0 - (Maintained version)",
                "value": "1.118.0",
              },
              {
                "name": "1.117.0 - (Maintained version)",
                "value": "1.117.0",
              },
              {
                "name": "1.116.0 - (Out of maintenance version)",
                "value": "1.116.0",
              },
            ]
        `);
        expect(getUI5VersionsSpy).toHaveBeenCalledWith({ useCache: true, includeMaintained: true });
        expect(getQuestionsSpy).toHaveBeenCalledWith(ui5Vers, {
            includeSeparators: undefined,
            targetFolder: undefined,
            useAutocomplete: undefined
        });
    });

    it('getPrompts, prompt options', async () => {
        const getUI5VersionsSpy = jest.spyOn(ui5Info, 'getUI5Versions').mockResolvedValue(ui5Vers);
        const getQuestionsSpy = jest.spyOn(prompting, 'getQuestions');

        const prompts = await getPrompts({
            includeSeparators: true,
            useAutocomplete: true,
            targetFolder: 'some/target/folder/'
        });
        expect(prompts).toMatchSnapshot();
        expect(getUI5VersionsSpy).toHaveBeenCalledWith({ useCache: true, includeMaintained: true });
        expect(getQuestionsSpy).toHaveBeenCalledWith(ui5Vers, {
            includeSeparators: true,
            targetFolder: 'some/target/folder/',
            useAutocomplete: true
        });
    });

    it('prompt, no options', async () => {
        const questions = [
            {
                name: 'testPrompt',
                message: 'Test Prompt'
            }
        ];
        const answers: Answers = {
            enableTypescript: true,
            libraryName: 'testName',
            namespace: 'testNS',
            targetFolder: 'some/test/folder',
            ui5Version: '1.76.0'
        };

        // Mock the underlying functions that getPrompts uses instead of getPrompts itself
        const getUI5VersionsSpy = jest.spyOn(ui5Info, 'getUI5Versions').mockResolvedValue(ui5Vers);
        const getQuestionsSpy = jest.spyOn(prompting, 'getQuestions').mockReturnValue(questions);

        const registerPromptSpy = jest.spyOn(inquirer, 'registerPrompt').mockReturnValue();
        const inquirerPromptSpy = jest.spyOn(inquirer, 'prompt').mockResolvedValue(Object.assign({}, answers));
        // Mock npm command to return versions that include the expected version
        jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue(['1.76.0', '1.118.0']);

        const promptAnswers = await prompt();
        // No options provided
        expect(promptAnswers).toMatchInlineSnapshot(`
            {
              "enableTypescript": true,
              "libraryName": "testName",
              "namespace": "testNS",
              "targetFolder": "some/test/folder",
              "ui5Version": "1.76.0",
            }
        `);
        expect(getUI5VersionsSpy).toHaveBeenCalled();
        expect(getQuestionsSpy).toHaveBeenCalled();
        expect(registerPromptSpy).not.toHaveBeenCalled();
        expect(inquirerPromptSpy).toHaveBeenCalledWith(questions);
    });

    it('prompt, with options', async () => {
        const questions = [
            {
                name: 'testPrompt',
                message: 'Test Prompt'
            }
        ];
        const answers: Answers = {
            enableTypescript: true,
            libraryName: 'testName',
            namespace: 'testNS',
            targetFolder: 'some/test/folder',
            ui5Version: '1.76.0'
        };

        // Mock the underlying functions that getPrompts uses instead of getPrompts itself
        const getUI5VersionsSpy = jest.spyOn(ui5Info, 'getUI5Versions').mockResolvedValue(ui5Vers);
        const getQuestionsSpy = jest.spyOn(prompting, 'getQuestions').mockReturnValue(questions);

        const registerPromptSpy = jest.spyOn(inquirer, 'registerPrompt').mockReturnValue();
        const inquirerPromptSpy = jest.spyOn(inquirer, 'prompt').mockResolvedValue(Object.assign({}, answers));
        // Mock npm command to return versions that include the expected version
        jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue(['1.76.0', '1.118.0']);

        const promptOptions = {
            includeSeparators: true,
            targetFolder: '/some/target/folder2',
            useAutocomplete: true
        };
        const promptAnswers = await prompt(promptOptions);
        // No options provided
        expect(promptAnswers).toMatchInlineSnapshot(`
            {
              "enableTypescript": true,
              "libraryName": "testName",
              "namespace": "testNS",
              "targetFolder": "some/test/folder",
              "ui5Version": "1.76.0",
            }
        `);
        expect(getUI5VersionsSpy).toHaveBeenCalled();
        expect(getQuestionsSpy).toHaveBeenCalled();
        expect(registerPromptSpy).toHaveBeenCalledWith('autocomplete', expect.any(Function));
        expect(inquirerPromptSpy).toHaveBeenCalledWith(questions);
    });

    it('prompt, with adapter', async () => {
        const questions = [
            {
                name: 'testPrompt',
                message: 'Test Prompt'
            }
        ];
        const answers: Answers = {
            enableTypescript: true,
            libraryName: 'testName',
            namespace: 'testNS',
            targetFolder: 'some/test/folder',
            ui5Version: '1.76.0'
        };

        // Mock the underlying functions that getPrompts uses instead of getPrompts itself
        const getUI5VersionsSpy = jest.spyOn(ui5Info, 'getUI5Versions').mockResolvedValue(ui5Vers);
        const getQuestionsSpy = jest.spyOn(prompting, 'getQuestions').mockReturnValue(questions);

        const inquirerRegisterPromptSpy = jest.spyOn(inquirer, 'registerPrompt').mockReturnValue();
        const inquirerPromptSpy = jest.spyOn(inquirer, 'prompt');
        const mockPromptsModule = createPromptModule();
        const adapterRegisterPromptSpy = jest.spyOn(mockPromptsModule, 'registerPrompt');
        const mockAdapter: InquirerAdapter = {
            prompt: jest.fn().mockResolvedValue(Object.assign({}, answers)),
            promptModule: mockPromptsModule
        };
        // Mock npm command to return versions that include the expected version
        jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue(['1.76.0', '1.118.0']);

        const promptOptions = {
            includeSeparators: true,
            targetFolder: '/some/target/folder2',
            useAutocomplete: true
        };
        const promptAnswers = await prompt(promptOptions, mockAdapter);
        // No options provided
        expect(promptAnswers).toMatchInlineSnapshot(`
            {
              "enableTypescript": true,
              "libraryName": "testName",
              "namespace": "testNS",
              "targetFolder": "some/test/folder",
              "ui5Version": "1.76.0",
            }
        `);
        expect(getUI5VersionsSpy).toHaveBeenCalled();
        expect(getQuestionsSpy).toHaveBeenCalled();
        expect(inquirerRegisterPromptSpy).not.toHaveBeenCalledWith();
        expect(inquirerPromptSpy).not.toHaveBeenCalledWith();
        expect(mockAdapter.prompt).toHaveBeenCalledWith([{ 'message': 'Test Prompt', 'name': 'testPrompt' }]);
        expect(adapterRegisterPromptSpy).toHaveBeenCalledWith('autocomplete', expect.any(Function));
    });
});

/**
 * Tests for version resolution functionality
 */
describe('Version Resolution Tests', () => {
    const mockNpmVersions = ['1.116.0', '1.117.0', '1.118.0', '1.119.0', '1.120.0'];
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

    beforeAll(async () => {
        await initI18n();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('findNearestNpmVersion', () => {
        it('should return exact match when version exists in npm', async () => {
            jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue(mockNpmVersions);

            const result = await findNearestNpmVersion('1.118.0');
            expect(result).toBe('1.118.0');
        });

        it('should return nearest lower version when exact match not found', async () => {
            jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue(mockNpmVersions);

            const result = await findNearestNpmVersion('1.118.5');
            expect(result).toBe('1.118.0');
        });

        it('should return lowest version when selected version is lower than all available', async () => {
            jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue(mockNpmVersions);

            const result = await findNearestNpmVersion('1.115.0');
            expect(result).toBe('1.116.0');
        });

        it('should return nearest lower version when selected version is higher than all available', async () => {
            jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue(mockNpmVersions);

            const result = await findNearestNpmVersion('1.125.0');
            expect(result).toBe('1.120.0');
        });

        it('should filter out invalid version strings', async () => {
            const mixedVersions = ['1.116.0', 'latest', '1.118.0', 'snapshot', '1.120.0'];
            jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue(mixedVersions);

            const result = await findNearestNpmVersion('1.119.0');
            expect(result).toBe('1.118.0');
        });

        it('should return selected version when npm command fails', async () => {
            jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockRejectedValue(new Error('npm command failed'));

            const result = await findNearestNpmVersion('1.118.0');
            expect(result).toBe('1.118.0');
        });

        it('should return selected version when no valid npm versions found', async () => {
            jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue(['latest', 'snapshot']);

            const result = await findNearestNpmVersion('1.118.0');
            expect(result).toBe('1.118.0');
        });

        it('should handle complex version comparisons correctly', async () => {
            const complexVersions = ['1.116.5', '1.117.2', '1.118.0', '1.118.1', '1.119.0'];
            jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue(complexVersions);

            const result = await findNearestNpmVersion('1.118.3');
            expect(result).toBe('1.118.1');
        });
    });

    describe('getPrompts with resolved version', () => {
        it('should pass resolved version to getQuestions when resolvedUi5Version is provided', async () => {
            jest.spyOn(ui5Info, 'getUI5Versions').mockResolvedValue(ui5Vers);
            jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue(mockNpmVersions);
            const getQuestionsSpy = jest.spyOn(prompting, 'getQuestions').mockReturnValue([]);

            await getPrompts({ resolvedUi5Version: '1.118.5' });

            expect(getQuestionsSpy).toHaveBeenCalledWith(
                ui5Vers,
                expect.objectContaining({
                    resolvedUi5Version: '1.118.0' // Should be resolved to nearest npm version
                })
            );
        });

        it('should not call findNearestNpmVersion when no resolvedUi5Version is provided', async () => {
            jest.spyOn(ui5Info, 'getUI5Versions').mockResolvedValue(ui5Vers);
            const executeNpmSpy = jest.spyOn(commands, 'executeNpmUI5VersionsCmd');
            const getQuestionsSpy = jest.spyOn(prompting, 'getQuestions').mockReturnValue([]);

            await getPrompts({});

            expect(executeNpmSpy).not.toHaveBeenCalled();
            expect(getQuestionsSpy).toHaveBeenCalledWith(
                ui5Vers,
                expect.objectContaining({
                    resolvedUi5Version: undefined
                })
            );
        });
    });

    describe('prompt with version resolution', () => {
        const mockPrompts = [{ name: 'ui5Version', type: 'list' }];
        const mockAnswers: UI5LibraryAnswers = {
            libraryName: 'testLib',
            namespace: 'test.ns',
            targetFolder: '/test/folder',
            ui5Version: '1.118.5',
            enableTypescript: true
        };

        it('should resolve UI5 version after user selection', async () => {
            jest.spyOn(ui5Info, 'getUI5Versions').mockResolvedValue(ui5Vers);
            jest.spyOn(prompting, 'getQuestions').mockReturnValue(mockPrompts);
            jest.spyOn(inquirer, 'prompt').mockResolvedValue(mockAnswers);
            jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue(mockNpmVersions);

            const result = await prompt();

            expect(result.ui5Version).toBe('1.118.0'); // Should be resolved to nearest npm version
        });

        it('should keep original version if it matches npm version exactly', async () => {
            const exactMatchAnswers = { ...mockAnswers, ui5Version: '1.118.0' };
            jest.spyOn(ui5Info, 'getUI5Versions').mockResolvedValue(ui5Vers);
            jest.spyOn(prompting, 'getQuestions').mockReturnValue(mockPrompts);
            jest.spyOn(inquirer, 'prompt').mockResolvedValue(exactMatchAnswers);
            jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue(mockNpmVersions);

            const result = await prompt();

            expect(result.ui5Version).toBe('1.118.0'); // Should remain unchanged
        });

        it('should not modify answers when no ui5Version is selected', async () => {
            const noVersionAnswers = { ...mockAnswers, ui5Version: undefined };
            jest.spyOn(ui5Info, 'getUI5Versions').mockResolvedValue(ui5Vers);
            jest.spyOn(prompting, 'getQuestions').mockReturnValue(mockPrompts);
            jest.spyOn(inquirer, 'prompt').mockResolvedValue(noVersionAnswers);
            const executeNpmSpy = jest.spyOn(commands, 'executeNpmUI5VersionsCmd');

            const result = await prompt();

            expect(result.ui5Version).toBeUndefined();
            expect(executeNpmSpy).not.toHaveBeenCalled();
        });
    });

    describe('promptWithVersionResolution', () => {
        const mockAnswers: UI5LibraryAnswers = {
            libraryName: 'testLib',
            namespace: 'test.ns',
            targetFolder: '/test/folder',
            ui5Version: '1.118.5',
            enableTypescript: true
        };

        it('should perform version resolution', async () => {
            jest.spyOn(ui5Info, 'getUI5Versions').mockResolvedValue(ui5Vers);
            jest.spyOn(prompting, 'getQuestions').mockReturnValue([]);
            jest.spyOn(inquirer, 'prompt').mockResolvedValue(mockAnswers);
            jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue(mockNpmVersions);

            const result = await promptWithVersionResolution();

            expect(result.ui5Version).toBe('1.118.0'); // Should be resolved
        });

        it('should work with adapter', async () => {
            const mockAdapter: InquirerAdapter = {
                prompt: jest.fn().mockResolvedValue(mockAnswers),
                promptModule: createPromptModule()
            };
            jest.spyOn(ui5Info, 'getUI5Versions').mockResolvedValue(ui5Vers);
            jest.spyOn(prompting, 'getQuestions').mockReturnValue([]);
            jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue(mockNpmVersions);

            const result = await promptWithVersionResolution({}, mockAdapter);

            expect(mockAdapter.prompt).toHaveBeenCalled();
            expect(result.ui5Version).toBe('1.118.0');
        });

        it('should handle case when no ui5Version is provided', async () => {
            const noVersionAnswers = { ...mockAnswers, ui5Version: undefined };
            jest.spyOn(ui5Info, 'getUI5Versions').mockResolvedValue(ui5Vers);
            jest.spyOn(prompting, 'getQuestions').mockReturnValue([]);
            jest.spyOn(inquirer, 'prompt').mockResolvedValue(noVersionAnswers);
            const executeNpmSpy = jest.spyOn(commands, 'executeNpmUI5VersionsCmd');

            const result = await promptWithVersionResolution();

            expect(executeNpmSpy).not.toHaveBeenCalled();
            expect(result.ui5Version).toBeUndefined();
        });
    });
});
