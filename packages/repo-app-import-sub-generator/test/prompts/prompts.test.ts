import { t } from '../../src/utils/i18n';
import { validateFioriAppTargetFolder } from '@sap-ux/project-input-validator';
import { getPrompts } from '../../src/prompts/prompts';
import { PromptNames } from '../../src/app/types';
import { PromptState } from '../../src/prompts/prompt-state';
import * as helpers from '../../src/prompts/prompt-helpers';
import * as downloadUtils from '../../src/utils/download-utils';
import RepoAppDownloadLogger from '../../src/utils/logger';

jest.mock('@sap-ux/odata-service-inquirer', () => ({
    getSystemSelectionQuestions: jest.fn().mockResolvedValue({
        prompts: [{
            name: 'systemSelection',
            type: 'list',
            choices: [{ name: 'Sys', value: { system: { name: 'Sys' } } }]
        }],
        answers: {
            connectedSystem: { serviceProvider: {} }
        }
    })
}));

jest.mock('../../src/prompts/prompt-helpers', () => ({
    fetchAppListForSelectedSystem: jest.fn().mockResolvedValue([
        { appId: 'app1', repoName: 'repo1' },
        { appId: 'app2', repoName: 'repo2' }
    ]),
    formatAppChoices: jest.fn().mockReturnValue([
        { name: 'App 1', value: { appId: 'app1', repoName: 'repo1' } },
        { name: 'App 2', value: { appId: 'app2', repoName: 'repo2' } }
    ])
}));

jest.mock('../../src/utils/download-utils', () => ({
    downloadApp: jest.fn()
}));

jest.mock('@sap-ux/project-input-validator', () => ({
    validateFioriAppTargetFolder: jest.fn().mockResolvedValue(true)
}));

jest.mock('@sap-ux/project-input-validator', () => ({
    validateFioriAppTargetFolder: jest.fn().mockResolvedValue(true)
}));

describe('getPrompts', () => {
    const mockGetSystemSelectionQuestions = require('@sap-ux/odata-service-inquirer').getSystemSelectionQuestions;
    const mockFetchAppList = helpers.fetchAppListForSelectedSystem as jest.Mock;
    const mockDownloadApp = downloadUtils.downloadApp as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();
        PromptState.reset();
    });

    it('should return prompts including system, app, and target folder', async () => {
        mockGetSystemSelectionQuestions.mockResolvedValue({
            prompts: [{
                name: PromptNames.systemSelection,
                type: 'list',
                choices: [{ name: 'System 1', value: { system: { name: 'MockSystem' } } }]
            }],
            answers: {
                connectedSystem: { serviceProvider: {} }
            }
        });

        mockFetchAppList.mockResolvedValue([{ appId: 'app1', repoName: 'repo1' }]);
        mockDownloadApp.mockResolvedValue(undefined);

        const prompts = await getPrompts('/app/path');
        expect(prompts).toBeInstanceOf(Array);
        expect(prompts.find(p => p.name === PromptNames.systemSelection)).toBeTruthy();
        expect(prompts.find(p => p.name === PromptNames.selectedApp)).toBeTruthy();
        expect(prompts.find(p => p.name === PromptNames.targetFolder)).toBeTruthy();
    });

    it('should return prompts including system, app, and target folder', async () => {
        mockGetSystemSelectionQuestions.mockResolvedValue({
            prompts: [{
                name: PromptNames.systemSelection,
                type: 'list',
                choices: [{ name: 'System 1', value: { system: { name: 'MockSystem' } } }]
            }],
            answers: {
                connectedSystem: { serviceProvider: {} }
            }
        });

        mockFetchAppList.mockResolvedValue([{ appId: 'app1', repoName: 'repo1' }]);
        mockDownloadApp.mockResolvedValue(undefined);

        const prompts = await getPrompts('/app/path');
        expect(prompts).toBeInstanceOf(Array);
        expect(prompts.find(p => p.name === PromptNames.systemSelection)).toBeTruthy();
        expect(prompts.find(p => p.name === PromptNames.selectedApp)).toBeTruthy();
        expect(prompts.find(p => p.name === PromptNames.targetFolder)).toBeTruthy();
    });

    it('should preselect default system if quickDeployedAppConfig is provided', async () => {
        const quickDeployedAppConfig = {
            appId: 'app1',
            serviceProviderInfo: {
                name: 'DefaultSystem'
            }
        };

        mockGetSystemSelectionQuestions.mockResolvedValue({
            prompts: [{
                name: PromptNames.systemSelection,
                type: 'list',
                choices: [
                    { name: 'System A', value: { system: { name: 'SystemA' } } },
                    { name: 'Default System', value: { system: { name: 'DefaultSystem' } } }
                ],
                default: 'DefaultSystem'
            }],
            answers: {
                connectedSystem: { serviceProvider: {} }
            }
        });

        mockFetchAppList.mockResolvedValue([{ appId: 'app1', repoName: 'repo1' }]);
        const prompts = await getPrompts(undefined, quickDeployedAppConfig);

        const systemPrompt = prompts.find(p => p.name === PromptNames.systemSelection) as any;
        expect(systemPrompt.default).toBe('DefaultSystem');
    });
    
    it('should use validateFioriAppTargetFolder in folder prompt', async () => {
        mockGetSystemSelectionQuestions.mockResolvedValue({
            prompts: [],
            answers: {}
        });
        const prompts = await getPrompts('/some/path');
        const projectPathPrompt = prompts.find(p => p.name === PromptNames.targetFolder) as any;
        await projectPathPrompt.validate('/some/path', {
            selectedApp: { appId: 'id1' }
        });
        expect(validateFioriAppTargetFolder).toHaveBeenCalledWith('/some/path', 'id1', true);
    });

    it('should handle quickDeployedAppConfig and return the correct prompts', async () => {
        mockGetSystemSelectionQuestions.mockResolvedValue({
            prompts: [{
                name: PromptNames.systemSelection,
                type: 'list',
                choices: [{ name: 'System 1', value: { system: { name: 'MockSystem' } } }]
            }],
            answers: {
                connectedSystem: { serviceProvider: {} }
            }
        });
        const quickDeployedAppConfig = {
            appId: 'app1',
            serviceProviderInfo: { name: 'System 1' }
        };
        // Call getPrompts with quickDeployedAppConfig
        const prompts = await getPrompts('/some/path', quickDeployedAppConfig);

        // Ensure prompts are returned correctly
        expect(prompts).toBeDefined();

        // Check if the system selection prompt exists
        const systemSelectionPrompt = prompts.find(p => p.name === PromptNames.systemSelection);
        expect(systemSelectionPrompt).toBeDefined();

        // Check if the system selection prompt is filtered correctly
        if (systemSelectionPrompt) {
            const listPrompt = systemSelectionPrompt as unknown as { choices: () => { name: string; value: {} }[] };
            expect(listPrompt.choices).toEqual([
                { name: 'System 1', value: { system: { name: 'MockSystem' } } }
            ]);
        }

        // Check if the app selection prompt exists and is populated correctly
        const appSelectionPrompt = prompts.find(p => p.name === PromptNames.selectedApp);
        expect(appSelectionPrompt).toBeDefined();
        if (appSelectionPrompt) {
            const listPrompt = appSelectionPrompt as unknown as { choices: () => { name: string; value: {} }[] };
            expect(appSelectionPrompt.when).toBeTruthy();
        }

        // Check if the target folder prompt exists and is included
        const targetFolderPrompt = prompts.find(p => p.name === PromptNames.targetFolder);
        expect(targetFolderPrompt).toBeDefined();
        if (targetFolderPrompt) {
            expect(targetFolderPrompt.when).toBeTruthy();
        }
    });

    it('should call getSystemSelectionQuestions with expected args when invalid destination is selecte by user', async () => {
        mockGetSystemSelectionQuestions.mockResolvedValue({
            prompts: [{
                name: PromptNames.systemSelection,
                type: 'list',
                choices: [{ name: 'System 1', value: { system: { name: 'MockSystem' } } }]
            }],
            answers: {}
        });
    
        const prompts = await getPrompts('/app/path');
        expect(mockGetSystemSelectionQuestions).toHaveBeenCalledWith(
            {
                serviceSelection: { hide: true },
                systemSelection: { defaultChoice: undefined }
            },
            true
        );
        expect(prompts.find(p => p.name === PromptNames.systemSelection)).toBeTruthy();
    });
});


