import { jest } from '@jest/globals';
import path, { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as actualFs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const mockExistsSync = jest.fn();

jest.unstable_mockModule('node:fs', () => ({
    ...actualFs,
    existsSync: mockExistsSync
}));

jest.unstable_mockModule('@sap-ux/project-input-validator', () => ({
    validateProjectFolder: jest.fn(),
    validateModuleName: jest.fn(),
    validateNamespace: jest.fn(),
    validateFioriAppTargetFolder: jest.fn(),
    validateFioriAppProjectFolder: jest.fn(),
    addi18nResourceBundle: jest.fn()
}));

const { initI18nUi5AppInquirer } = await import('../../../src/i18n');
const { appPathExists, defaultAppName, hidePrompts, isVersionIncluded } =
    await import('../../../src/prompts/prompt-helpers');
const { latestVersionString } = await import('@sap-ux/ui5-info');

import type { UI5ApplicationAnswers, UI5ApplicationPromptOptions, UI5ApplicationQuestion } from '../../../src/types';
const { promptNames } = await import('../../../src/types');

describe('prompt-helpers', () => {
    const testTempDir = join(__dirname, './test-tmp');

    beforeAll(async () => {
        // Wait for i18n to bootstrap so we can test localised strings
        await initI18nUi5AppInquirer();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        mockExistsSync.mockReset();
    });

    test('appPathExists', () => {
        // appPathExists calls existsSync under the hood
        const mockCwd = '/any/current/working/directory';
        let cwdSpy = jest.spyOn(process, 'cwd').mockReturnValueOnce(mockCwd);
        mockExistsSync.mockReturnValueOnce(false);
        expect(appPathExists('prompts')).toEqual(false);
        expect(cwdSpy).toHaveBeenCalled();
        cwdSpy.mockClear();

        const parentPath = join(__dirname, '../');
        mockExistsSync.mockReturnValueOnce(true);
        expect(appPathExists('prompts', parentPath)).toEqual(true);
        expect(cwdSpy).not.toHaveBeenCalled();
        cwdSpy.mockClear();

        cwdSpy = jest.spyOn(process, 'cwd').mockReturnValueOnce(parentPath);
        mockExistsSync.mockReturnValueOnce(true);
        expect(appPathExists('prompts')).toEqual(true);
        expect(cwdSpy).toHaveBeenCalled();
    });

    test('defaultAppName', () => {
        // defaultAppName calls exports.appPathExists -> existsSync internally
        mockExistsSync.mockReturnValue(false);
        expect(defaultAppName(testTempDir)).toEqual('project1');
        mockExistsSync.mockReturnValueOnce(true).mockReturnValue(false);
        expect(defaultAppName(testTempDir)).toEqual('project2');
        // Test maximal suggested app name
        mockExistsSync.mockReturnValue(true);
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
        const mockCdsInfo = {
            hasCdsUi5Plugin: true,
            hasMinCdsVersion: true,
            isCdsUi5PluginEnabled: true,
            isWorkspaceEnabled: false
        };

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
            [promptNames.skipAnnotations]: {
                name: promptNames.skipAnnotations
            },
            [promptNames.enableTypeScript]: {
                name: promptNames.enableTypeScript
            },
            [promptNames.enableVirtualEndpoints]: {
                name: promptNames.enableVirtualEndpoints
            },
            [promptNames.showAdvanced]: {
                name: promptNames.showAdvanced
            }
        };
        expect(hidePrompts(prompts).length).toEqual(14);
        expect(hidePrompts(prompts)).toContainEqual({ name: promptNames.enableEslint });
        // Hide prompts that are not applicable for CAP projects
        let filteredPrompts = hidePrompts(prompts, {}, mockCdsInfo);
        expect(filteredPrompts.length).toEqual(12);
        expect(filteredPrompts).not.toContainEqual({ name: promptNames.targetFolder });
        // enableEslint is always hidden as it's enabled by default in writer
        expect(filteredPrompts).not.toContainEqual({ name: promptNames.enableEslint });

        // Hide prompts based on prompt options
        let promptOpts: UI5ApplicationPromptOptions = {
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
        expect(filteredPrompts.length).toEqual(11);
        expect(filteredPrompts).toEqual(
            expect.not.arrayContaining([{ name: promptNames.addDeployConfig, when: expect.any(Function) }])
        );
        expect(filteredPrompts).toEqual(expect.not.arrayContaining([{ name: promptNames.skipAnnotations }]));
        expect(filteredPrompts).toEqual(expect.not.arrayContaining([{ name: promptNames.ui5Version }]));

        // More testing of prompt options (hide fn)
        promptOpts = {
            [promptNames.addDeployConfig]: {
                hide: (isCap: boolean) => {
                    return !isCap;
                }
            }
        };
        // show `addDeployConfig` prompt when isCap is true
        filteredPrompts = hidePrompts(prompts, promptOpts, mockCdsInfo);
        expect(filteredPrompts.length).toEqual(12);
        expect(filteredPrompts).toEqual(
            expect.arrayContaining([{ name: promptNames.addDeployConfig, when: expect.any(Function) }])
        );

        // hide `addDeployConfig` prompt when isCap is false
        filteredPrompts = hidePrompts(prompts, promptOpts, undefined);
        expect(filteredPrompts.length).toEqual(13);
        expect(filteredPrompts).toEqual(
            expect.not.arrayContaining([{ name: promptNames.addDeployConfig, when: expect.any(Function) }])
        );

        // hide `enableTypeScript` and `enableVirtualEndpoints` when hasMinCdsVersion is false
        filteredPrompts = hidePrompts(prompts, promptOpts, { ...mockCdsInfo, hasMinCdsVersion: false });
        expect(filteredPrompts.length).toEqual(10);
        expect(filteredPrompts).toEqual(
            expect.not.arrayContaining([
                { name: promptNames.enableTypeScript },
                { name: promptNames.enableVirtualEndpoints }
            ])
        );
    });
});
