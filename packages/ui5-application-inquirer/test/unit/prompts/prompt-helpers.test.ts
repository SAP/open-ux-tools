import { latestVersionString } from '@sap-ux/ui5-info';
import { join } from 'path';
import { initI18nUi5AppInquirer } from '../../../src/i18n';
import * as promptHelpers from '../../../src/prompts/prompt-helpers';
import { appPathExists, defaultAppName, hidePrompts, isVersionIncluded } from '../../../src/prompts/prompt-helpers';
import type { UI5ApplicationAnswers, UI5ApplicationPromptOptions, UI5ApplicationQuestion } from '../../../src/types';
import { promptNames } from '../../../src/types';

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
});
