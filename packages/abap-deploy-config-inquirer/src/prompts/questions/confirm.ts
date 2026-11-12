import { showIndexQuestion } from '../conditions.js';
import { validateConfirmQuestion } from '../validators.js';
import { t } from '../../i18n.js';
import {
    promptNames,
    type AbapDeployConfigPromptOptions,
    type AbapDeployConfigAnswersInternal,
    type AbapDeployConfigQuestion
} from '../../types.js';
import type { ConfirmQuestion } from '@sap-ux/inquirer-common';

/**
 * Returns the index prompt.
 *
 * @param options - abap deploy config prompt options
 * @returns  confirm question for generating the index file
 */
function getIndexPrompt(options: AbapDeployConfigPromptOptions): AbapDeployConfigQuestion {
    return {
        when: (): boolean => showIndexQuestion(options),
        name: promptNames.index,
        type: 'confirm',
        message: t('prompts.confirm.index.message'),
        guiOptions: {
            breadcrumb: t('prompts.confirm.index.hint')
        },
        default: false
    } as ConfirmQuestion<AbapDeployConfigAnswersInternal>;
}

/**
 * Returns the overwrite prompt.
 *
 * @returns confirm question for overwriting the files
 */
function getOverwritePrompt(): AbapDeployConfigQuestion {
    return {
        name: promptNames.overwriteAbapConfig,
        type: 'confirm',
        message: t('prompts.confirm.overwrite.message'),
        guiOptions: {
            hint: t('prompts.confirm.overwrite.hint')
        },
        default: true,
        validate: (overwrite: boolean): boolean => validateConfirmQuestion(overwrite)
    } as unknown as ConfirmQuestion<AbapDeployConfigAnswersInternal>;
}

/**
 * Returns the confirmation prompts.
 *
 * @param options - abap deploy config prompt options
 * @returns list of questions for confirm prompting
 */
export function getConfirmPrompts(options: AbapDeployConfigPromptOptions): AbapDeployConfigQuestion[] {
    const questions = [getIndexPrompt(options)];
    if (options.overwriteAbapConfig?.hide !== true) {
        questions.push(getOverwritePrompt());
    }
    return questions;
}
