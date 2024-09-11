import { latestVersionString } from '@sap-ux/ui5-info';
import { join } from 'path';
import { initI18nUi5AppInquirer } from '../../../src/i18n';
import * as promptHelpers from '../../../src/prompts/prompt-helpers';
import {
    appPathExists,
    defaultAppName,
    hidePrompts,
    isVersionIncluded,
    validateTargetFolder
} from '../../../src/prompts/prompt-helpers';
import type { UI5ApplicationAnswers, UI5ApplicationPromptOptions, UI5ApplicationQuestion } from '../../../src/types';
import { promptNames } from '../../../src/types';
import * as projectValidators from '@sap-ux/project-input-validator';
import * as validators from '../../../src/prompts/validators';

jest.mock('@sap-ux/project-input-validator', () => ({
    validateProjectFolder: jest.fn()
}));

describe('prompt-helpers', () => {
    const testTempDir = join(__dirname, './test-tmp');

    beforeAll(async () => {
        // Wait for i18n to bootstrap so we can test localised strings
        await initI18nUi5AppInquirer();
    });

    afterEach(() => {
        // Reset all spys (not mocks)
        // jest.restoreAllMocks() only works when the mock was created with jest.spyOn().
        jest.restoreAllMocks();
    });

    test('appPathExists', () => {
        const mockCwd = '/any/current/working/directory';
        let cwdSpy = jest.spyOn(process, 'cwd').mockReturnValueOnce(mockCwd);
        expect(appPathExists('prompts')).toEqual(false);
        expect(cwdSpy).toHaveBeenCalled();
        cwdSpy.mockClear();

        const parentPath = join(__dirname, '../');
        expect(appPathExists('prompts', parentPath)).toEqual(true);
        expect(cwdSpy).not.toHaveBeenCalled();
        cwdSpy.mockClear();

        cwdSpy = jest.spyOn(process, 'cwd').mockReturnValueOnce(parentPath);
        expect(appPathExists('prompts')).toEqual(true);
        expect(cwdSpy).toHaveBeenCalled();
    });

    test('defaultAppName', () => {
        jest.spyOn(promptHelpers, 'appPathExists').mockReturnValue(false);
        expect(defaultAppName(testTempDir)).toEqual('project1');
        jest.spyOn(promptHelpers, 'appPathExists').mockReturnValueOnce(true);
        expect(defaultAppName(testTempDir)).toEqual('project2');
        // Test maximal suggested app name
        jest.spyOn(promptHelpers, 'appPathExists').mockReturnValue(true);
        expect(defaultAppName(testTempDir)).toEqual('project1000');
    });

    test('isVersionIncluded', () => {
        expect(isVersionIncluded('1.1.1', '0.0.1')).toEqual(true);
        expect(isVersionIncluded('1.1.1', '1.1.1')).toEqual(true);
        expect(isVersionIncluded('1.1.1', '1.1.2')).toEqual(false);
        expect(isVersionIncluded('2.2.2-snapshot', '1.1.1')).toEqual(true);
        expect(isVersionIncluded(latestVersionString, '1.1.1')).toEqual(true);
        expect(isVersionIncluded('not-a-version', '0.0.0')).toEqual(false);
    });

    test('hidePrompts', () => {
        const prompts: Record<Partial<promptNames>, UI5ApplicationQuestion> = {
            [promptNames.name]: {
                name: promptNames.name
            },
            [promptNames.description]: {
                when: () => true,
                name: promptNames.description
            },
            [promptNames.addDeployConfig]: {
                when: (answers: UI5ApplicationAnswers) => answers.name === 'abcd1234',
                name: promptNames.addDeployConfig
            },
            [promptNames.title]: {
                name: promptNames.title
            },
            [promptNames.namespace]: {
                name: promptNames.namespace
            },
            [promptNames.targetFolder]: {
                name: promptNames.targetFolder
            },
            [promptNames.ui5Version]: {
                name: promptNames.ui5Version
            },
            [promptNames.addFlpConfig]: {
                name: promptNames.addFlpConfig
            },
            [promptNames.ui5Theme]: {
                name: promptNames.ui5Theme
            },
            [promptNames.enableEslint]: {
                name: promptNames.enableEslint
            },
            [promptNames.enableNPMWorkspaces]: {
                name: promptNames.enableNPMWorkspaces
            },
            [promptNames.enableCodeAssist]: {
                name: promptNames.enableCodeAssist
            },
            [promptNames.skipAnnotations]: {
                name: promptNames.skipAnnotations
            },
            [promptNames.enableTypeScript]: {
                name: promptNames.enableTypeScript
            },
            [promptNames.showAdvanced]: {
                name: promptNames.showAdvanced
            }
        };
        // All prompts returned
        expect(hidePrompts(prompts).length).toEqual(15);
        // Hide prompts that are not applicable for CAP projects
        let filteredPrompts = hidePrompts(prompts, {}, true);
        expect(filteredPrompts.length).toEqual(13);
        expect(filteredPrompts).not.toContainEqual({ name: promptNames.targetFolder });
        expect(filteredPrompts).not.toContainEqual({ name: promptNames.enableEslint });

        // Hide prompts based on propmt options
        const promptOpts: UI5ApplicationPromptOptions = {
            [promptNames.addDeployConfig]: {
                hide: true
            },
            [promptNames.skipAnnotations]: {
                hide: true
            },
            [promptNames.ui5Version]: {
                hide: true
            }
        };
        filteredPrompts = hidePrompts(prompts, promptOpts);
        expect(filteredPrompts.length).toEqual(12);
        expect(filteredPrompts).toEqual(expect.not.arrayContaining([{ name: promptNames.addDeployConfig }]));
        expect(filteredPrompts).toEqual(expect.not.arrayContaining([{ name: promptNames.skipAnnotations }]));
        expect(filteredPrompts).toEqual(expect.not.arrayContaining([{ name: promptNames.ui5Version }]));
    });
    test('validateTargetFolder', async () => {
        // Test when name length > 2 and both validations pass
        jest.spyOn(projectValidators, 'validateProjectFolder').mockReturnValue(true);
        jest.spyOn(validators, 'validateFioriAppProjectFolder').mockResolvedValue(true);
        const resultForValidCase = await validateTargetFolder('/some/target/path', 'validName', true);
        expect(resultForValidCase).toBe(true);
    });
    test('validateTargetFolder - project folder validation error', async () => {
        // Test when Project validation fails
        const projectErrorMessage = 'Project validation error';
        jest.spyOn(projectValidators, 'validateProjectFolder').mockReturnValue(projectErrorMessage);
        const resultForProjectError = await validateTargetFolder('/some/target/path', 'validName');
        expect(resultForProjectError).toBe(projectErrorMessage);
    });
    test('validateTargetFolder - fiori app project validation error', async () => {
        // Test when Fiori validation fails
        const fioriErrorMessage = 'Fiori validation error';
        jest.spyOn(validators, 'validateFioriAppProjectFolder').mockResolvedValue(fioriErrorMessage);
        const resultForFioriError = await validateTargetFolder('/some/target/path', 'validName', true);
        expect(resultForFioriError).toBe(fioriErrorMessage);
    });
});
