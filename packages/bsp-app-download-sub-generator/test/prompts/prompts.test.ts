import { getPrompts } from '../../src/prompts/prompts'; 
import { getSystemSelectionQuestions } from '@sap-ux/odata-service-inquirer';
import { fetchAppListForSelectedSystem, formatAppChoices } from '../../src/prompts/prompt-helpers';
import { PromptNames } from '../../src/app/types';
import type { BspAppDownloadAnswers, BspAppDownloadQuestions } from '../../src/app/types';
import { join } from 'path';
import { t } from '../../src/utils/i18n';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { validateFioriAppTargetFolder } from '@sap-ux/project-input-validator';

jest.mock('@sap-ux/odata-service-inquirer', () => ({
    getSystemSelectionQuestions: jest.fn()
}));

jest.mock('@sap-ux/project-input-validator', () => ({
    validateFioriAppTargetFolder: jest.fn()
}));

jest.mock('../../src/prompts/prompt-helpers', () => ({
    fetchAppListForSelectedSystem: jest.fn(), 
    formatAppChoices: jest.fn()
}));

describe('getPrompts', () => {
    const appRootPath = join('/mock/path');
    const mockServiceProvider = {
        getAppIndex: jest.fn().mockReturnValue({
            search: jest.fn().mockResolvedValue([{ id: 'app1' }, { id: 'app2' }])
        })
    } as unknown as AbapServiceProvider;
    const mockAnswers = {
        selectedApp: { appId: 'app1' }
    } as unknown as BspAppDownloadAnswers;
    const mockAppList = [{ appId: 'app1', name: 'Test App' }];

    beforeEach(() => {
        (getSystemSelectionQuestions as jest.Mock).mockResolvedValue({
            prompts: [{ type: 'input', name: 'system' }],
            answers: {
                connectedSystem: { serviceProvider: mockServiceProvider } 
            }
        });
        (fetchAppListForSelectedSystem as jest.Mock).mockResolvedValue([{ appId: 'app1', name: 'Test App' }]);
        (formatAppChoices as jest.Mock).mockReturnValue(mockAppList);
    });

    it('should return system questions, app selection, and target folder prompts', async () => {
        const prompts = await getPrompts(appRootPath);
        expect(prompts.length).toBeGreaterThanOrEqual(2);

        // system prompts
        const systemPrompt = prompts.find(p => p.name === 'system');
        expect(systemPrompt).toBeDefined();
        expect(systemPrompt?.type).toBe('input');
        expect(systemPrompt?.name).toBe('system');

        // app selection prompts
        const appSelectionPrompt = prompts.find(p => p.name === PromptNames.selectedApp) as BspAppDownloadQuestions;
        expect(appSelectionPrompt).toBeDefined();
        if (typeof appSelectionPrompt?.when === 'function') {
            await expect(appSelectionPrompt.when({ [PromptNames.systemSelection]: {
                connectedSystem: { serviceProvider: mockServiceProvider } 
            } } as unknown as BspAppDownloadAnswers)).resolves.toBe(true);
        };
        if (appSelectionPrompt?.type === 'list') {
            const listPrompt = appSelectionPrompt as unknown as { choices: () => { name: string; value: string }[] };
            expect(listPrompt.choices()).toEqual(mockAppList);
        };
        expect(appSelectionPrompt && appSelectionPrompt.validate && appSelectionPrompt.validate(mockAppList)).toBe(true);
        expect(appSelectionPrompt?.guiOptions?.breadcrumb).toBe(t('prompts.appSelection.breadcrumb'));

        // target folder prompt
        const targetFolderPrompt = prompts.find(p => p.name === PromptNames.targetFolder);
        expect(targetFolderPrompt).toBeDefined();
    });

    it('should handle no apps available scenario', async () => {
        (fetchAppListForSelectedSystem as jest.Mock).mockResolvedValue([]);

        const prompts = await getPrompts(appRootPath);

        const appSelectionPrompt = prompts.find(p => p.name === PromptNames.selectedApp);
        expect(appSelectionPrompt).toBeDefined();
        // no apps deployed message should be displayed
        expect(appSelectionPrompt && appSelectionPrompt.validate && appSelectionPrompt.validate('')).toBe(t('prompts.appSelection.noAppsDeployed'));
        if (appSelectionPrompt?.type === 'list') {
            const listPrompt = appSelectionPrompt as unknown as { choices: () => { name: string; value: string }[] };
            expect(listPrompt.choices()).toEqual([]);
        };
        
        // target folder prompt should not be displayed
        const targetFolderPrompt = prompts.find(p => p.name === PromptNames.targetFolder);
        expect(targetFolderPrompt).toBeDefined();
        if (typeof targetFolderPrompt?.when === 'function') {
            expect(targetFolderPrompt.when( {} as unknown as BspAppDownloadAnswers)).toBe(false);
        };
    });

    it('should validate the target folder path when it is valid', async () => {
        // Mock validateFioriAppTargetFolder to return true (valid path)
        (validateFioriAppTargetFolder as jest.Mock).mockResolvedValue(true);
        const prompts = await getPrompts(appRootPath);
    
        // target folder prompt
        const targetFolderPrompt = prompts.find(p => p.name === PromptNames.targetFolder);
        expect(targetFolderPrompt).toBeDefined();
        const result = targetFolderPrompt !== undefined && targetFolderPrompt.validate ? await targetFolderPrompt.validate(appRootPath, mockAnswers) : undefined;
    
        // Assert that validation returns true
        expect(result).toBe(true);
        expect(validateFioriAppTargetFolder).toHaveBeenCalledWith(appRootPath, 'app1', true);
    });

    it('should return error message when the target folder path is invalid', async () => {
        const errorMessage = `The project folder path already contains an SAP Fiori application in the folder: ${appRootPath}. Please choose a different folder and try again.`;
        (validateFioriAppTargetFolder as jest.Mock).mockResolvedValue(errorMessage);
        const prompts = await getPrompts(appRootPath);
    
        // target folder prompt
        const targetFolderPrompt = prompts.find(p => p.name === PromptNames.targetFolder);
        expect(targetFolderPrompt).toBeDefined();
        const result = targetFolderPrompt !== undefined && targetFolderPrompt.validate ? await targetFolderPrompt.validate(appRootPath, mockAnswers) : undefined;
    
        // Assert that validation returns the error message
        expect(result).toBe(errorMessage);
        expect(validateFioriAppTargetFolder).toHaveBeenCalledWith(appRootPath, 'app1', true);
    });

    it('should return default path when no target folder is provided', async () => {
        const prompts = await getPrompts(appRootPath);
    
        // target folder prompt
        const targetFolderPrompt = prompts.find(p => p.name === PromptNames.targetFolder);
        expect(targetFolderPrompt).toBeDefined();
        const result = await targetFolderPrompt?.default();
        expect(result).toBe(appRootPath);
    });
    
});
