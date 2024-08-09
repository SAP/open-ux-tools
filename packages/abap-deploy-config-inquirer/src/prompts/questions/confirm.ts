import { showIndexQuestion, showOverwriteQuestion } from '../conditions';
import { validateConfirmQuestion } from '../validators';
import { t } from '../../i18n';
import {
    abapDeployConfigInternalPromptNames,
    type AbapDeployConfigPromptOptions,
    type AbapDeployConfigAnswersInternal
} from '../../types';
import type { ConfirmQuestion, Question } from 'inquirer';

/**
 * Returns the index prompt.
 *
 * @param options - abap deploy config prompt options
 * @returns  confirm question for generating the index file
 */
function getIndexPrompt(options: AbapDeployConfigPromptOptions): Question<AbapDeployConfigAnswersInternal> {
    return {
        when: (): boolean => showIndexQuestion(options),
        name: abapDeployConfigInternalPromptNames.index,
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
 * @param options - abap deploy config prompt options
 * @returns confirm question for overwriting the files
 */
function getOverwritePrompt(options: AbapDeployConfigPromptOptions): Question<AbapDeployConfigAnswersInternal> {
    return {
        when: (): boolean => showOverwriteQuestion(options),

        name: abapDeployConfigInternalPromptNames.overwrite,
        type: 'confirm',
        message: t('prompts.confirm.overwrite.message'),
        guiOptions: {
            hint: t('prompts.confirm.overwrite.hint')
        },
        default: true,
        validate: (overwrite: boolean): boolean => validateConfirmQuestion(overwrite)
    } as ConfirmQuestion<AbapDeployConfigAnswersInternal>;
}

/**
 * Returns the confirmation prompts.
 *
 * @param options - abap deploy config prompt options
 * @returns list of questions for confirm prompting
 */
export function getConfirmPrompts(options: AbapDeployConfigPromptOptions): Question<AbapDeployConfigAnswersInternal>[] {
    return [getIndexPrompt(options), getOverwritePrompt(options)];
}
