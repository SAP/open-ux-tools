import type { BackendSystem } from '@sap-ux/store';
import { initI18n, getDisplayName, confirmPrompt } from '../../../src/utils';
import * as vscodeMod from 'vscode';
import { ConfirmationPromptType } from '../../../src/utils/constants';

describe('Test the system helpers', () => {
    beforeAll(async () => {
        await initI18n();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return the display name', async () => {
        const name = getDisplayName({ name: 'Test System' } as BackendSystem);
        expect(name).toBe('Test System');

        const name2 = getDisplayName({ name: 'Test System', userDisplayName: 'User 1' } as BackendSystem);
        expect(name2).toBe('Test System [User 1]');
    });

    it('should call the delete confirmation prompt with the correct parameters', async () => {
        const vsCodeWindow = vscodeMod.window;
        const showWarningMessageSpy = jest.spyOn(vsCodeWindow, 'showWarningMessage').mockImplementationOnce(() => {
            return Promise.resolve('Yes' as any);
        });

        const result = await confirmPrompt(ConfirmationPromptType.Delete, 'Test System');
        expect(showWarningMessageSpy).toHaveBeenCalledWith(
            'Delete [Test System]? Your Fiori application may not run locally anymore.',
            { modal: true },
            'Yes',
            'No'
        );
        expect(result).toBe(true);
    });

    it('should call the overwrite confirmation prompt with the correct parameters', async () => {
        const vsCodeWindow = vscodeMod.window;
        const showWarningMessageSpy = jest.spyOn(vsCodeWindow, 'showWarningMessage').mockImplementationOnce(() => {
            return Promise.resolve('Yes' as any);
        });

        const result = await confirmPrompt(ConfirmationPromptType.Overwrite, 'Test System');
        expect(showWarningMessageSpy).toHaveBeenCalledWith(
            'System already exists with name [Test System]. Do you want to overwrite?',
            { modal: true },
            'Yes',
            'No'
        );
        expect(result).toBe(true);
    });

    it('should not call a confirmation prompt and return false', async () => {
        const vsCodeWindow = vscodeMod.window;
        const showWarningMessageSpy = jest.spyOn(vsCodeWindow, 'showWarningMessage').mockImplementationOnce(() => {
            return Promise.resolve('Yes' as any);
        });

        const result = await confirmPrompt(undefined as any, 'Test System');
        expect(showWarningMessageSpy).not.toHaveBeenCalled();
        expect(result).toBe(false);
    });
});
