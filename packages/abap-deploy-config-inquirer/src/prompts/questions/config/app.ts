import { showUi5AppDeployConfigQuestion } from '../../conditions';
import { validateAppDescription, validateUi5AbapRepoName } from '../../validators';
import { PromptState } from '../../prompt-state';
import { t } from '../../../i18n';
import { promptNames, type AbapDeployConfigAnswersInternal, type AbapDeployConfigPromptOptions } from '../../../types';
import type { InputQuestion, Question } from 'inquirer';

/**
 * Returns the UI5 ABAP repository prompt.
 *
 * @param options - aba deploy config prompt options
 * @returns input question for UI5 ABAP repository
 */
function getUi5AbapRepoPrompt(options: AbapDeployConfigPromptOptions): Question<AbapDeployConfigAnswersInternal> {
    return {
        when: (): boolean => showUi5AppDeployConfigQuestion(options?.ui5AbapRepo?.hide, options?.ui5AbapRepo?.default),
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
            previousAnswers.ui5AbapRepo || options.existingDeployTaskConfig?.name,
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
        when: (): boolean => showUi5AppDeployConfigQuestion(options?.ui5AbapRepo?.hide),
        type: 'input',
        name: promptNames.description,
        message: t('prompts.config.app.description.message'),
        guiOptions: {
            hint: t('prompts.config.app.description.hint'),
            breadcrumb: true
        },
        default: (previousAnswers: AbapDeployConfigAnswersInternal): string | undefined =>
            previousAnswers.description || options.existingDeployTaskConfig?.description,
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
