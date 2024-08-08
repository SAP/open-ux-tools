import { PromptState } from './prompts/prompt-state';
import LoggerHelper from './logger-helper';
import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';

/**
 * Throws error message to end prompting in cli.
 *
 * @param errorMessage - error message
 */
export function bail(errorMessage: string): void {
    throw new Error(errorMessage);
}

/**
 * Handles error message.
 *
 * @param errorMsg - error message
 */
export function handleErrorMessage(errorMsg: string): void {
    if (getHostEnvironment() === hostEnvironment.cli) {
        bail(errorMsg);
    } else {
        PromptState.transportAnswers.transportConfigError = errorMsg;
        LoggerHelper.logger.debug(errorMsg);
    }
}
