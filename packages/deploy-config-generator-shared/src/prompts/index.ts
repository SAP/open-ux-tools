import { t } from '../utils';
import type { Question } from 'inquirer';

/**
 * Enumeration of prompt names
 */
enum promptNames {
    addCapMtaContinue = 'addCapMtaContinue'
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
            name: promptNames.addCapMtaContinue,
            message: t('prompts.confirmCAPMtaContinue.message'),
            default: false
        }
    ];
}
