import { t } from '../utils/index.js';
import type { YUIQuestion } from '@sap-ux/inquirer-common';

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
export function getConfirmMtaContinuePrompt(): YUIQuestion[] {
    return [
        {
            type: 'confirm',
            name: promptNames.addCapMtaContinue,
            message: t('prompts.confirmCAPMtaContinue.message'),
            default: false
        }
    ];
}
