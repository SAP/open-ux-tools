import { t } from '../utils/i18n';
import type { Question } from 'inquirer';

/**
 * Enumeration of prompt names
 */
enum promptNames {
    confirmConfigUpdate = 'confirmConfigUpdate'
}

/**
 * Returns prompt which asks whether the user wants to continue with the configuration update even though it is managed centrally as part of the CI pipeline.
 *
 * @param configType - the type of configuration being generated e.g FLP, Deployment
 * @returns the prompt question
 */
export function getConfirmConfigUpdatePrompt(configType?: string): Question[] {
    return [
        {
            type: 'confirm',
            name: promptNames.confirmConfigUpdate,
            message: t('prompts.confirmConfigUpdate.message', { configType }),
            default: false
        }
    ];
}

/**
 * Generate a new prompt asking if the user wants to create an approuter configuration within a CAP project.
 *
 * @returns the CAP MTA continue question.
 */
export function getConfirmMtaContinuePrompt(): Question[] {
    return [
        {
            type: 'confirm',
            name: 'addCapMtaContinue',
            message: t('prompts.confirmCAPMtaContinue.message'),
            default: false
        }
    ];
}
