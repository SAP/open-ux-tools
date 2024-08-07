import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';
import { bail, handleErrorMessage } from '../src/error-handler';
import LoggerHelper from '../src/logger-helper';
import { PromptState } from '../src/prompts/prompt-state';

jest.mock('@sap-ux/fiori-generator-shared', () => ({
    ...jest.requireActual('@sap-ux/fiori-generator-shared'),
    getHostEnvironment: jest.fn()
}));

const mockGetHostEnvironment = getHostEnvironment as jest.Mock;

describe('Test error handler', () => {
    it('should throw error with error message', () => {
        try {
            bail('prompting error');
            fail('should not reach here');
        } catch (e) {
            expect(e.message).toBe('prompting error');
        }
    });

    it('should throw error on cli', () => {
        mockGetHostEnvironment.mockReturnValueOnce(hostEnvironment.cli);
        try {
            handleErrorMessage('prompting error');
        } catch (e) {
            expect(e.message).toBe('prompting error');
        }
    });

    it('should log error in vscode and update prompt state', () => {
        mockGetHostEnvironment.mockReturnValueOnce(hostEnvironment.vscode);
        const loggerSpy = jest.spyOn(LoggerHelper.logger, 'debug');

        handleErrorMessage('prompting error');
        expect(PromptState.transportAnswers.transportConfigError).toBe('prompting error');
        expect(loggerSpy).toHaveBeenCalledWith('prompting error');
    });
});
