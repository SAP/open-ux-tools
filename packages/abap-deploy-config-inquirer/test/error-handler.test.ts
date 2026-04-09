import { jest } from '@jest/globals';
import { bail, handleTransportConfigError } from '../src/error-handler';
import LoggerHelper from '../src/logger-helper';
import { PromptState } from '../src/prompts/prompt-state';

describe('Test error handler', () => {
    it('should throw error with error message', () => {
        try {
            bail('prompting error');
            throw new Error('should not reach here');
        } catch (e: any) {
            expect(e.message).toBe('prompting error');
        }
    });

    it('should throw error on cli', () => {
        PromptState.isYUI = false;
        try {
            handleTransportConfigError('prompting error');
        } catch (e: any) {
            expect(e.message).toBe('prompting error');
        }
    });

    it('should log error in vscode and update prompt state', () => {
        PromptState.isYUI = true;
        const loggerSpy = jest.spyOn(LoggerHelper.logger, 'debug');

        handleTransportConfigError('prompting error');
        expect(PromptState.transportAnswers.transportConfigError).toBe('prompting error');
        expect(loggerSpy).toHaveBeenCalledWith('prompting error');
    });
});
