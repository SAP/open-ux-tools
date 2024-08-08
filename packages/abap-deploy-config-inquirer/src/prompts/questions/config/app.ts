import { showUi5AppDeployConfigQuestion } from '../../conditions';
import { validateAppDescription, validateUi5AbapRepoName } from '../../validators';
import { PromptState } from '../../prompt-state';
import { t } from '../../../i18n';
import { defaultAbapRepositoryName, defaultAppDescription } from '../../defaults';
import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';
import {
    abapDeployConfigInternalPromptNames,
    type AbapDeployConfigAnswers,
    type AbapDeployConfigPromptOptions
} from '../../../types';
import type { InputQuestion, Question } from 'inquirer';

/**
 * Returns the UI5 ABAP repository prompt.
 *
 * @param options - aba deploy config prompt options
 * @returns input question for UI5 ABAP repository
 */
function getUi5AbapRepoPrompt(options: AbapDeployConfigPromptOptions): Question<AbapDeployConfigAnswers> {
    return {
        when: (): boolean => showUi5AppDeployConfigQuestion(),
        type: 'input',
        name: abapDeployConfigInternalPromptNames.ui5AbapRepo,
        message: (): string => {
            return PromptState.transportAnswers.transportConfig?.getApplicationPrefix()
                ? t('prompts.config.app.ui5AbapRepo.messageMaxLength', {
                      applicationPrefix: PromptState.transportAnswers.transportConfig.getApplicationPrefix()
                  })
                : t('prompts.config.app.ui5AbapRepo.message');
        },
        guiOptions: {
            hint: t('prompts.config.app.ui5AbapRepo.hint'),
            mandatory: true,
            breadcrumb: t('prompts.config.app.ui5AbapRepo.message')
        },
        default: (previousAnswers: AbapDeployConfigAnswers) => defaultAbapRepositoryName(previousAnswers, options),
        validate: (input: string): string | boolean => validateUi5AbapRepoName(input),
        filter: (input: string): string =>
            getHostEnvironment() === hostEnvironment.cli ? input?.trim()?.toUpperCase() : input?.trim()
    } as InputQuestion<AbapDeployConfigAnswers>;
}

/**
 * Returns the description prompt.
 *
 * @param options - abap deploy config prompt options
 * @returns input question for description
 */
function getDescriptionPrompt(options: AbapDeployConfigPromptOptions): Question<AbapDeployConfigAnswers> {
    return {
        when: (): boolean => showUi5AppDeployConfigQuestion(),
        type: 'input',
        name: abapDeployConfigInternalPromptNames.description,
        message: t('prompts.config.app.description.message'),
        guiOptions: {
            hint: t('prompts.config.app.description.hint'),
            breadcrumb: true
        },
        default: (previousAnswers: AbapDeployConfigAnswers): string | undefined =>
            defaultAppDescription(previousAnswers, options),
        filter: (input: string): string | undefined => input?.trim(),
        validate: (input: string): boolean | string => validateAppDescription(input)
    } as InputQuestion<AbapDeployConfigAnswers>;
}

/**
 * Returns the app config prompts.
 *
 * @param options - abap deploy config prompt options
 * @returns list of list of questions for app config prompting
 */
export function getAppConfigPrompts(options: AbapDeployConfigPromptOptions): Question<AbapDeployConfigAnswers>[] {
    return [getUi5AbapRepoPrompt(options), getDescriptionPrompt(options)];
}
