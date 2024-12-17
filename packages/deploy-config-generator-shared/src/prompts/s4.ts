import { t } from '../utils/i18n';
import type { Question } from 'inquirer';

/**
 * Enumeration of prompt names
 */
enum promptNames {
    s4Continue = 's4Continue'
}

/**
 * S/4 specific prompting for the user to confirm if they want to continue with the generation of the configuration.
 *
 * @param configType - the type of configuration being generated e.g FLP, Deployment
 * @returns
 */
export function getS4ContinuePrompt(configType: string): Question[] {
    return [
        {
            type: 'confirm',
            name: promptNames.s4Continue,
            message: t('prompts.s4.message', { configType }),
            default: false
        }
    ];
}
