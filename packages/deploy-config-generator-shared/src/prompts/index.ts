import { t } from '../utils';
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
