import { getSystemQuestions } from './system-selection/questions';
import type { Question } from 'inquirer';
import type { ServiceConfig, ServiceConfigQuestion, SystemSelectionAnswers, UiServiceAnswers } from '../types';
import { PromptState } from './prompt-state';
//import type { ServiceProvider, UiServiceGenerator } from '@sap-ux/axios-extension';
import { getConfigQuestions } from './configuration/questions';
import type { Logger } from '@sap-ux/logger';

/**
 * Get the system selection prompts.
 *
 * @returns the system selection prompts
 */
export async function getSystemSelectionPrompts(): Promise<{
    prompts: Question<UiServiceAnswers>[];
    answers: Partial<SystemSelectionAnswers>;
}> {
    return {
        prompts: await getSystemQuestions(),
        answers: PromptState.systemSelection
    };
}

/**
 * Get the configuration prompts.
 *
 * @param systemSelectionAnswers - the system selection answers to use if system selection prompting was skipped
 * @param logger - a logger compatible with the {@link Logger} interface
 * @returns the configuration prompts
 */
export function getConfigPrompts(
    systemSelectionAnswers?: SystemSelectionAnswers,
    logger?: Logger
): { prompts: ServiceConfigQuestion[]; answers: Partial<ServiceConfig> } {
    if (systemSelectionAnswers && !PromptState.systemSelection.connectedSystem) {
        logger?.error('setting connected system');
        Object.assign(PromptState.systemSelection, systemSelectionAnswers);
    }
    return {
        prompts: getConfigQuestions(logger),
        answers: PromptState.serviceConfig
    };
}
