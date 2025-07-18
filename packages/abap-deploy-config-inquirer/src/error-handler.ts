import { PromptState } from './prompts/prompt-state';
import LoggerHelper from './logger-helper';

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
export function handleTransportConfigError(errorMsg: string): void {
    if (!PromptState.isYUI) {
        bail(errorMsg);
    } else {
        PromptState.transportAnswers.transportConfigError = errorMsg;
        LoggerHelper.logger.debug(errorMsg);
    }
}
