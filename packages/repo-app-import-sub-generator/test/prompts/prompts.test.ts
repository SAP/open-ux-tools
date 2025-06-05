import { t } from '../../src/utils/i18n';
import { validateFioriAppTargetFolder } from '@sap-ux/project-input-validator';
import { getPrompts } from '../../src/prompts/prompts';
import { PromptNames, type QuickDeployedAppConfig } from '../../src/app/types';
import { PromptState } from '../../src/prompts/prompt-state';
import * as helpers from '../../src/prompts/prompt-helpers';
import * as downloadUtils from '../../src/utils/download-utils';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { formatAppChoices } from '../../src/prompts/prompt-helpers';
import { validateAppSelection } from '../../src/utils/validators';

jest.mock('@sap-ux/odata-service-inquirer', () => ({
    ...jest.requireActual('@sap-ux/odata-service-inquirer'),
    getSystemSelectionQuestions: jest.fn()
}));

jest.mock('../../src/prompts/prompt-helpers', () => ({
    fetchAppListForSelectedSystem: jest.fn(),
    formatAppChoices: jest.fn()
}));

jest.mock('../../src/utils/download-utils', () => ({
    downloadApp: jest.fn()
}));

jest.mock('@sap-ux/project-input-validator', () => ({
    validateFioriAppTargetFolder: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../src/utils/validators', () => ({
    validateAppSelection: jest.fn()
}));
describe('getPrompts', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mockGetSystemSelectionQuestions = require('@sap-ux/odata-service-inquirer').getSystemSelectionQuestions;
    const mockFetchAppList = helpers.fetchAppListForSelectedSystem as jest.Mock;
    const mockDownloadApp = downloadUtils.downloadApp as jest.Mock;

    const mockServiceProvider = {
        defaults: {
            baseURL: 'https://mock.sap-system.com',
            params: {
                'sap-client': '100'
            }
        },
        name: 'System 1'
    } as unknown as AbapServiceProvider;

    const appRootPath = '/app/path';
    const appValue = { appId: 'app1', repoName: 'repo1' };
    const appList = [{ name: 'App 1', value: appValue }];

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();
        PromptState.reset();
    });

    it('should return system, app, and target folder prompts without Quick Deployed App config', async () => {
        mockGetSystemSelectionQuestions.mockResolvedValue({
            prompts: [
                {
                    name: PromptNames.systemSelection,
                    type: 'list',
                    choices: [{ name: 'System 1', value: { system: { name: 'MockSystem' } } }]
                }
            ],
            answers: {
                connectedSystem: { serviceProvider: mockServiceProvider }
            }
        });

        (formatAppChoices as jest.Mock).mockReturnValue(appList);

        (validateAppSelection as jest.Mock).mockResolvedValue(true);
        (validateFioriAppTargetFolder as jest.Mock).mockResolvedValue(true);

        mockFetchAppList.mockResolvedValue([{ appId: 'app1', repoName: 'repo1' }]);
        mockDownloadApp.mockResolvedValue(undefined);

        const prompts = await getPrompts(appRootPath, undefined, undefined, true); // run as CLI

        // system selection prompt
        const systemSelectionPrompt = prompts.find((p) => p.name === PromptNames.systemSelection);

        expect(systemSelectionPrompt).toBeDefined();
        expect(systemSelectionPrompt).toHaveProperty('type', 'list');
        expect(systemSelectionPrompt).toHaveProperty('choices', [
            { name: 'System 1', value: { system: { name: 'MockSystem' } } }
        ]);
        expect(systemSelectionPrompt).toHaveProperty('name', PromptNames.systemSelection);

        // app selection prompt
        const appSelectionPrompt = prompts.find((p) => p.name === PromptNames.selectedApp);
        expect(appSelectionPrompt).toBeDefined();
        expect(appSelectionPrompt).toHaveProperty('type', 'list');
        expect(await (appSelectionPrompt as any)?.when({ [PromptNames.systemSelection]: mockServiceProvider })).toBe(
            true
        );
        expect((appSelectionPrompt as any)?.choices()).toEqual(appList);
        expect(appSelectionPrompt).toHaveProperty('when');
        expect(appSelectionPrompt).toHaveProperty('message', t('prompts.appSelection.message'));
        expect(appSelectionPrompt).toHaveProperty('guiOptions', {
            mandatory: false,
            breadcrumb: t('prompts.appSelection.breadcrumb'),
            applyDefaultWhenDirty: true
        });
        expect(await (appSelectionPrompt as any)?.validate(appValue)).toBe(true);
        expect((appSelectionPrompt as any)?.default()).toBe(undefined);
        expect(appSelectionPrompt).toHaveProperty('name', PromptNames.selectedApp);

        // target folder prompt
        const targetFolderPrompt = prompts.find((p) => p.name === PromptNames.targetFolder);
        expect(targetFolderPrompt).toBeDefined();
        expect(targetFolderPrompt).toHaveProperty('type', 'input');
        expect(targetFolderPrompt).toHaveProperty('message', t('prompts.targetPath.message'));
        expect(targetFolderPrompt).toHaveProperty('guiOptions', {
            mandatory: true,
            applyDefaultWhenDirty: true,
            breadcrumb: t('prompts.targetPath.breadcrumb')
        });
        expect(await (targetFolderPrompt as any)?.validate(appRootPath, appValue)).toBe(true);
        expect(targetFolderPrompt?.default()).toBe(appRootPath);
    });

    it('should return system, app, and target folder prompts with Quick Deployed App config', async () => {
        mockGetSystemSelectionQuestions.mockResolvedValue({
            prompts: [
                {
                    name: PromptNames.systemSelection,
                    type: 'list',
                    choices: [{ name: 'System 1', value: { system: { name: 'MockSystem' } } }],
                    default: 0
                }
            ],
            answers: {
                connectedSystem: { serviceProvider: mockServiceProvider }
            }
        });

        (formatAppChoices as jest.Mock).mockReturnValue(appList);

        (validateAppSelection as jest.Mock).mockResolvedValue(true);
        (validateFioriAppTargetFolder as jest.Mock).mockResolvedValue(true);

        mockFetchAppList.mockResolvedValue([{ appId: 'app1', repoName: 'repo1' }]);
        mockDownloadApp.mockResolvedValue(undefined);

        const quickDeployedAppConfig = {
            appId: 'app1',
            serviceProviderInfo: mockServiceProvider
        } as unknown as QuickDeployedAppConfig;
        const prompts = await getPrompts(appRootPath, quickDeployedAppConfig);

        // system selection prompt
        const systemSelectionPrompt = prompts.find((p) => p.name === PromptNames.systemSelection);
        expect(systemSelectionPrompt).toBeDefined();
        expect(systemSelectionPrompt).toHaveProperty('type', 'list');
        expect(systemSelectionPrompt).toHaveProperty('choices', [
            { name: 'System 1', value: { system: { name: 'MockSystem' } } }
        ]);
        expect((systemSelectionPrompt as any)?.default).toBe(0);
        expect(systemSelectionPrompt).toHaveProperty('name', PromptNames.systemSelection);

        // app selection prompt
        const appSelectionPrompt = prompts.find((p) => p.name === PromptNames.selectedApp);
        expect(appSelectionPrompt).toBeDefined();
        expect(appSelectionPrompt).toHaveProperty('type', 'list');
        expect(await (appSelectionPrompt as any)?.when({ [PromptNames.systemSelection]: mockServiceProvider })).toBe(
            true
        );
        expect((appSelectionPrompt as any)?.choices()).toEqual(appList);
        expect(appSelectionPrompt).toHaveProperty('when');
        expect(appSelectionPrompt).toHaveProperty('message', t('prompts.appSelection.message'));
        expect(appSelectionPrompt).toHaveProperty('guiOptions', {
            mandatory: false,
            breadcrumb: t('prompts.appSelection.breadcrumb'),
            applyDefaultWhenDirty: true
        });
        expect(await (appSelectionPrompt as any)?.validate(appValue)).toBe(true);
        expect((appSelectionPrompt as any)?.default()).toBe(0);
        expect(appSelectionPrompt).toHaveProperty('name', PromptNames.selectedApp);

        // target folder prompt
        const targetFolderPrompt = prompts.find((p) => p.name === PromptNames.targetFolder);
        expect(targetFolderPrompt).toBeDefined();
        expect(targetFolderPrompt).toHaveProperty('type', 'input');
        expect(targetFolderPrompt).toHaveProperty('message', t('prompts.targetPath.message'));
        expect(targetFolderPrompt).toHaveProperty('guiOptions', {
            mandatory: true,
            applyDefaultWhenDirty: true,
            breadcrumb: t('prompts.targetPath.breadcrumb')
        });
        expect(await (targetFolderPrompt as any)?.when({ [PromptNames.targetFolder]: appRootPath })).toBe(true);
        expect(await (targetFolderPrompt as any)?.validate(appRootPath, appValue)).toBe(true);
    });

    it('should return prompts allowing the user to override the default path and app selection when Quick Deployed App config is provided', async () => {
        mockGetSystemSelectionQuestions.mockResolvedValue({
            prompts: [
                {
                    name: PromptNames.systemSelection,
                    type: 'list',
                    choices: [{ name: 'System 1', value: { system: { name: 'MockSystem' } } }],
                    default: 0
                }
            ],
            answers: {
                connectedSystem: { serviceProvider: mockServiceProvider }
            }
        });

        const appListWithMoreOptions = [
            ...appList,
            { name: 'App 2', value: { appId: 'app2', repoName: 'repo2' } },
            { name: 'App 3', value: { appId: 'app3', repoName: 'repo3' } }
        ];

        (formatAppChoices as jest.Mock).mockReturnValue(appListWithMoreOptions);

        (validateAppSelection as jest.Mock).mockResolvedValue(true);
        (validateFioriAppTargetFolder as jest.Mock).mockResolvedValue(true);

        mockFetchAppList.mockResolvedValue([{ appId: 'app1', repoName: 'repo1' }]);
        mockDownloadApp.mockResolvedValue(undefined);

        const quickDeployedAppConfig = {
            serviceProviderInfo: mockServiceProvider
        } as unknown as QuickDeployedAppConfig;
        const prompts = await getPrompts(appRootPath, quickDeployedAppConfig);

        // system selection prompt
        const systemSelectionPrompt = prompts.find((p) => p.name === PromptNames.systemSelection);
        expect(systemSelectionPrompt).toBeDefined();

        // app selection prompt
        const selectedAnswer = {
            [PromptNames.systemSelection]: mockServiceProvider,
            [PromptNames.selectedApp]: { appId: 'app3', repoName: 'repo3' },
            [PromptNames.targetFolder]: 'someother/path'
        };
        const appSelectionPrompt = prompts.find((p) => p.name === PromptNames.selectedApp);
        expect(await (appSelectionPrompt as any)?.when(selectedAnswer)).toBe(true);
        expect(await (appSelectionPrompt as any)?.validate(appValue)).toBe(true);
        //expect((appSelectionPrompt as any)?.default()).toBe(0);
        expect(appSelectionPrompt).toHaveProperty('name', PromptNames.selectedApp);

        // target folder prompt
        const targetFolderPrompt = prompts.find((p) => p.name === PromptNames.targetFolder);
        expect(targetFolderPrompt).toBeDefined();
        expect(targetFolderPrompt).toHaveProperty('type', 'input');
        expect(targetFolderPrompt).toHaveProperty('message', t('prompts.targetPath.message'));
        expect(targetFolderPrompt).toHaveProperty('guiOptions', {
            mandatory: true,
            applyDefaultWhenDirty: true,
            breadcrumb: t('prompts.targetPath.breadcrumb')
        });
        expect(await (targetFolderPrompt as any)?.when(selectedAnswer)).toBe(true);
        expect(await (targetFolderPrompt as any)?.validate('someother/path', appValue)).toBe(true);
    });
});
