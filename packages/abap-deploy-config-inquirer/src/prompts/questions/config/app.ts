import type { InputQuestion, Question } from 'inquirer';
import { t } from '../../../i18n.js';
import {
    promptNames,
    type AbapDeployConfigAnswersInternal,
    type AbapDeployConfigPromptOptions
} from '../../../types.js';
import { isAdaptationProjectType } from '../../../utils.js';
import { showUi5AppDeployConfigQuestion } from '../../conditions.js';
import { PromptState } from '../../prompt-state.js';
import { validateAppDescription, validateUi5AbapRepoName } from '../../validators.js';

/**
 * Returns the UI5 ABAP repository prompt.
 *
 * @param options - aba deploy config prompt options
 * @returns input question for UI5 ABAP repository
 */
function getUi5AbapRepoPrompt(options: AbapDeployConfigPromptOptions): Question<AbapDeployConfigAnswersInternal> {
    const isAdpWorkflow = isAdaptationProjectType(options.adpProjectType);
    return {
        when: (): boolean => showUi5AppDeployConfigQuestion(isAdpWorkflow, options.ui5AbapRepo),
        type: 'input',
        name: promptNames.ui5AbapRepo,
        message: (): string => {
            return PromptState.transportAnswers.transportConfig?.getApplicationPrefix()
                ? t('prompts.config.app.ui5AbapRepo.messageMaxLength', {
                      applicationPrefix: PromptState.transportAnswers.transportConfig?.getApplicationPrefix()
                  })
                : t('prompts.config.app.ui5AbapRepo.message');
        },
        guiOptions: {
            hint: t('prompts.config.app.ui5AbapRepo.hint'),
            mandatory: true,
            breadcrumb: t('prompts.config.app.ui5AbapRepo.message')
        },
        default: (previousAnswers: AbapDeployConfigAnswersInternal) =>
            previousAnswers.ui5AbapRepo || options.ui5AbapRepo?.default,
        validate: (input: string): string | boolean => validateUi5AbapRepoName(input),
        filter: (input: string): string | undefined =>
            !PromptState.isYUI ? input?.trim()?.toUpperCase() : input?.trim()
    } as InputQuestion<AbapDeployConfigAnswersInternal>;
}

/**
 * Returns the description prompt.
 *
 * @param options - abap deploy config prompt options
 * @returns input question for description
 */
function getDescriptionPrompt(options: AbapDeployConfigPromptOptions): Question<AbapDeployConfigAnswersInternal> {
    return {
        when: (): boolean => showUi5AppDeployConfigQuestion(options.ui5AbapRepo),
        type: 'input',
        name: promptNames.description,
        message: t('prompts.config.app.description.message'),
        guiOptions: {
            hint: t('prompts.config.app.description.hint'),
            breadcrumb: true
        },
        default: (previousAnswers: AbapDeployConfigAnswersInternal): string | undefined =>
            previousAnswers.description || options.description?.default,
        filter: (input: string): string | undefined => input?.trim(),
        validate: (input: string): boolean | string => validateAppDescription(input)
    } as InputQuestion<AbapDeployConfigAnswersInternal>;
}

/**
 * Returns the app config prompts.
 *
 * @param options - abap deploy config prompt options
 * @returns list of list of questions for app config prompting
 */
export function getAppConfigPrompts(
    options: AbapDeployConfigPromptOptions
): Question<AbapDeployConfigAnswersInternal>[] {
    return [getUi5AbapRepoPrompt(options), getDescriptionPrompt(options)];
}
