import {
    getAbapTargetPrompts,
    getAuthPrompts,
    getAppConfigPrompts,
    getPackagePrompts,
    getTransportRequestPrompts,
    getConfirmPrompts
} from './questions';
import type { AbapDeployConfigQuestion, AbapDeployConfigPromptOptions } from '../types';

/**
 * Get the abap deployment config questions.
 *
 * @param options - abap deploy config prompt options
 * @returns the abap deployment config questions
 */
export async function getAbapDeployConfigQuestions(
    options?: AbapDeployConfigPromptOptions
): Promise<AbapDeployConfigQuestion[]> {
    options = options ?? {};

    const targetPrompts = await getAbapTargetPrompts(options);
    const authPrompts = getAuthPrompts(options);
    const questions = [...targetPrompts, ...authPrompts];

    if (options.ui5AbapRepo?.hide !== true) {
        questions.push(getAppConfigPrompts(options));
    }

    const packagePrompts = getPackagePrompts(options);
    const transportRequestPrompts = getTransportRequestPrompts(options);
    const confirmPrompts = getConfirmPrompts(options);

    questions.push(...packagePrompts, ...transportRequestPrompts, ...confirmPrompts);

    return questions as AbapDeployConfigQuestion[];
}
