import { getSystemQuestions } from './system-selection/questions';
import type { Question } from 'inquirer';
import type { ServiceConfig, ServiceConfigQuestion, SystemSelectionAnswers, UiServiceAnswers } from '../types';
import { PromptState } from './prompt-state';
import { getConfigQuestions } from './configuration/questions';
import type { Logger } from '@sap-ux/logger';
import LoggerHelper from '../logger-helper';

/**
 * Get the system selection prompts.
 *
 * @param answers - the answers to prepopulate the prompts
 * @param systemName - the name of the system
 * @param logger - optional logger instance to use for logging
 * @returns the system selection prompts
 */
export async function getSystemSelectionPrompts(
    answers?: UiServiceAnswers,
    systemName?: string,
    logger?: Logger
): Promise<{
    prompts: Question<UiServiceAnswers>[];
    answers: Partial<SystemSelectionAnswers>;
}> {
    if (logger) {
        LoggerHelper.logger = logger;
    }
    return {
        prompts: await getSystemQuestions(LoggerHelper.logger, answers, systemName),
        answers: PromptState.systemSelection
    };
}

/**
 * Get the configuration prompts.
 *
 * @param systemSelectionAnswers - the system selection answers to use if system selection prompting was skipped
 * @param logger - optional logger instance to use for logging
 * @returns the configuration prompts
 */
export function getConfigPrompts(
    systemSelectionAnswers: SystemSelectionAnswers,
    logger?: Logger
): { prompts: ServiceConfigQuestion[]; answers: Partial<ServiceConfig> } {
    if (logger) {
        LoggerHelper.logger = logger;
    }
    if (!PromptState.systemSelection.connectedSystem) {
        Object.assign(PromptState.systemSelection, systemSelectionAnswers);
    }
    return {
        prompts: getConfigQuestions(LoggerHelper.logger),
        answers: PromptState.serviceConfig
    };
}
