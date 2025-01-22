import { PromptState } from '../../prompt-state';
import {
    defaultOrShowManualPackageQuestion,
    defaultOrShowSearchPackageQuestion,
    showPackageInputChoiceQuestion
} from '../../conditions';
import { t } from '../../../i18n';
import { getSystemConfig } from '../../../utils';
import { getPackageChoices, getPackageInputChoices } from '../../helpers';
import { defaultPackage, defaultPackageChoice } from '../../defaults';
import { validatePackage, validatePackageChoiceInput, validatePackageChoiceInputForCli } from '../../validators';
import {
    promptNames,
    type PackageInputChoices,
    type AbapDeployConfigAnswersInternal,
    type AbapDeployConfigPromptOptions
} from '../../../types';
import type { InputQuestion, ListChoiceOptions, ListQuestion, Question } from 'inquirer';
import type { AutocompleteQuestionOptions } from 'inquirer-autocomplete-prompt';

/**
 * Returns the package prompts.
 *
 * @param options - abap deploy config prompt options
 * @param useStandalone - whether the prompts are used standalone, defaults to true
 * @param isYUI - if true, the prompt is being called from the Yeoman UI extension host
 * @returns list of list of questions for package prompting
 */
export function getPackagePrompts(
    options: AbapDeployConfigPromptOptions,
    useStandalone = true,
    isYUI = false
): Question<AbapDeployConfigAnswersInternal>[] {
    let packageInputChoiceValid: boolean | string;
    let morePackageResultsMsg = '';
    PromptState.isYUI = isYUI;

    const questions: Question<AbapDeployConfigAnswersInternal>[] = [
        {
            when: (): boolean => showPackageInputChoiceQuestion(options?.packageAutocomplete?.useAutocomplete),
            type: 'list',
            name: promptNames.packageInputChoice,
            message: t('prompts.config.package.packageInputChoice.message'),
            guiOptions: {
                applyDefaultWhenDirty: true
            },
            choices: () => getPackageInputChoices(),
            default: (previousAnswers: AbapDeployConfigAnswersInternal): string =>
                defaultPackageChoice(previousAnswers.packageInputChoice),
            validate: async (input: PackageInputChoices): Promise<boolean | string> => {
                packageInputChoiceValid = await validatePackageChoiceInput(
                    input,
                    getSystemConfig(useStandalone, PromptState.abapDeployConfig, options.backendTarget),
                    options.backendTarget
                );
                return packageInputChoiceValid;
            }
        } as ListQuestion<AbapDeployConfigAnswersInternal>,
        {
            when: async (previousAnswers: AbapDeployConfigAnswersInternal): Promise<boolean> => {
                if (!PromptState.isYUI) {
                    await validatePackageChoiceInputForCli(
                        getSystemConfig(useStandalone, PromptState.abapDeployConfig, options.backendTarget),
                        previousAnswers.packageInputChoice,
                        options.backendTarget
                    );

                    packageInputChoiceValid = true;
                }
                return false;
            },
            type: 'input',
            name: promptNames.packageCliExecution
        } as InputQuestion<AbapDeployConfigAnswersInternal>,
        {
            when: (previousAnswers: AbapDeployConfigAnswersInternal): boolean =>
                defaultOrShowManualPackageQuestion(
                    previousAnswers.packageInputChoice,
                    options?.packageAutocomplete?.useAutocomplete
                ),
            type: 'input',
            name: promptNames.packageManual,
            message: t('prompts.config.package.packageManual.message'),
            guiOptions: {
                hint: t('prompts.config.package.packageManual.hint'),
                mandatory: true,
                breadcrumb: true
            },
            default: (previousAnswers: AbapDeployConfigAnswersInternal): string =>
                defaultPackage(previousAnswers.packageManual || options.packageManual?.default),
            validate: async (input: string, answers: AbapDeployConfigAnswersInternal): Promise<boolean | string> =>
                await validatePackage(input, answers, options.backendTarget)
        } as InputQuestion<AbapDeployConfigAnswersInternal>,
        {
            when: (previousAnswers: AbapDeployConfigAnswersInternal): boolean =>
                packageInputChoiceValid === true &&
                defaultOrShowSearchPackageQuestion(
                    previousAnswers.packageInputChoice,
                    options?.packageAutocomplete?.useAutocomplete
                ),
            type: 'autocomplete',
            name: promptNames.packageAutocomplete,
            message: `${t('prompts.config.package.packageAutocomplete.message')}${
                !PromptState.isYUI ? t('prompts.config.package.packageAutocomplete.messageTypeFilter') : ''
            }`,
            guiOptions: {
                hint: t('prompts.config.package.packageAutocomplete.hint'),
                mandatory: true,
                breadcrumb: true
            },
            source: async (
                previousAnswers: AbapDeployConfigAnswersInternal,
                input: string
            ): Promise<string[] | undefined> => {
                const results = await getPackageChoices(
                    !PromptState.isYUI,
                    input,
                    getSystemConfig(useStandalone, PromptState.abapDeployConfig, options.backendTarget),
                    previousAnswers,
                    options.backendTarget
                );
                morePackageResultsMsg = results.morePackageResultsMsg;
                return results.packages;
            },
            additionalInfo: () => morePackageResultsMsg,
            validate: async (
                input: string | ListChoiceOptions,
                answers: AbapDeployConfigAnswersInternal
            ): Promise<boolean | string> => {
                // Autocomplete can the entire choice object as the answer, so we need to extract the value
                const pkgValue: string = (input as ListChoiceOptions)?.value
                    ? (input as ListChoiceOptions).value
                    : input;
                return await validatePackage(pkgValue, answers, options.backendTarget);
            }
        } as AutocompleteQuestionOptions<AbapDeployConfigAnswersInternal>
    ];

    return questions;
}
