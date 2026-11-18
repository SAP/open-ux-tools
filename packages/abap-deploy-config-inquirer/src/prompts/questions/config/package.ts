import { PromptState } from '../../prompt-state.js';
import {
    defaultOrShowManualPackageQuestion,
    defaultOrShowSearchPackageQuestion,
    showPackageInputChoiceQuestion
} from '../../conditions.js';
import { t } from '../../../i18n.js';
import { getSystemConfig } from '../../../utils.js';
import { getPackageChoices, getPackageInputChoices, shouldRunValidation } from '../../helpers.js';
import { defaultPackage, defaultPackageChoice } from '../../defaults.js';
import { validatePackageChoiceInput, validatePackageChoiceInputForCli, validatePackage } from '../../validators.js';
import {
    promptNames,
    type PackageInputChoices,
    type AbapDeployConfigAnswersInternal,
    type AbapDeployConfigPromptOptions,
    type AbapDeployConfigQuestion
} from '../../../types.js';
import type { ChoiceOptions, InputQuestion, ListQuestion, SearchQuestion } from '@sap-ux/inquirer-common';
import type { AutoCompleteQuestion } from '../../../types.js';
import type { IValidationLink, IMessageSeverity } from '@sap-devx/yeoman-ui-types';
import { Severity } from '@sap-devx/yeoman-ui-types';
import { DEFAULT_PACKAGE_ABAP } from '../../../constants.js';

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
): AbapDeployConfigQuestion[] {
    let packageInputChoiceValid: boolean | string | IValidationLink;
    let morePackageResultsMsg = '';
    let prevAnswers = {};
    let prevValidationResult: boolean | string = false;

    PromptState.isYUI = isYUI;

    const questions: AbapDeployConfigQuestion[] = [
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
            validate: async (input: PackageInputChoices): Promise<boolean | string | IValidationLink> => {
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
        },
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
                defaultPackage(previousAnswers.packageManual || options.packageManual?.default, options?.packageManual),
            validate: async (input: string, answers: AbapDeployConfigAnswersInternal): Promise<boolean | string> => {
                if (shouldRunValidation(prevAnswers as AbapDeployConfigAnswersInternal, answers)) {
                    prevValidationResult = await validatePackage(
                        input,
                        answers,
                        options.packageManual,
                        options.ui5AbapRepo,
                        options.backendTarget,
                        undefined,
                        options.adpProjectType
                    );
                }
                prevAnswers = answers;
                return prevValidationResult;
            },
            additionalMessages: (input: string): IMessageSeverity | undefined => {
                if (input === DEFAULT_PACKAGE_ABAP.toLowerCase()) {
                    return {
                        message: t('warnings.packageTmpLowercase'),
                        severity: Severity.warning
                    };
                }
                return undefined;
            }
        } as InputQuestion<AbapDeployConfigAnswersInternal>,
        packageAutocompleteQuestion()
    ];

    /**
     * Builds the package autocomplete/search prompt. The App Wizard (YUI) renders a prompt from its
     * `type` string and recognises `'autocomplete'` (a type-ahead box that calls `source` on each
     * keystroke); it does not render inquirer 13's native `'search'` arm. The CLI, conversely, runs
     * inquirer and renders `'search'`. So the YUI branch emits `type: 'autocomplete'` and the CLI
     * branch emits `type: 'search'`, both sharing the same choice lookup and validation.
     *
     * @returns the package autocomplete prompt, shaped for the current host (YUI or CLI)
     */
    function packageAutocompleteQuestion(): AbapDeployConfigQuestion {
        const when = (previousAnswers: AbapDeployConfigAnswersInternal): boolean =>
            packageInputChoiceValid === true &&
            defaultOrShowSearchPackageQuestion(
                previousAnswers.packageInputChoice,
                options?.packageAutocomplete?.useAutocomplete
            );
        const guiOptions = {
            hint: t('prompts.config.package.packageAutocomplete.hint'),
            mandatory: true,
            breadcrumb: true
        };
        const additionalInfo = (): string => morePackageResultsMsg;
        const getChoices = async (input: string): Promise<string[]> => {
            const results = await getPackageChoices(
                !PromptState.isYUI,
                input,
                getSystemConfig(useStandalone, PromptState.abapDeployConfig, options.backendTarget),
                prevAnswers as AbapDeployConfigAnswersInternal,
                options.backendTarget
            );
            morePackageResultsMsg = results.morePackageResultsMsg;
            return results.packages;
        };
        const validate = async (
            input: string | ChoiceOptions,
            answers: AbapDeployConfigAnswersInternal
        ): Promise<boolean | string> => {
            // Autocomplete can return the entire choice object as the answer, so we need to extract the value
            const pkgValue: string = typeof input === 'string' ? input : ((input as ChoiceOptions)?.value as string);
            if (shouldRunValidation(prevAnswers as AbapDeployConfigAnswersInternal, answers)) {
                prevValidationResult = await validatePackage(
                    pkgValue,
                    answers,
                    options.packageAutocomplete,
                    options.ui5AbapRepo,
                    options.backendTarget,
                    undefined,
                    options.adpProjectType
                );
            }
            prevAnswers = answers;
            return prevValidationResult;
        };

        if (PromptState.isYUI) {
            const autocompleteQuestion: AutoCompleteQuestion<AbapDeployConfigAnswersInternal> = {
                when,
                type: 'autocomplete',
                name: promptNames.packageAutocomplete,
                message: t('prompts.config.package.packageAutocomplete.message'),
                guiOptions,
                source: (_previousAnswers: AbapDeployConfigAnswersInternal, input: string): Promise<string[]> =>
                    getChoices(input ?? ''),
                additionalInfo,
                validate
            };
            return autocompleteQuestion;
        }

        return {
            when,
            type: 'search',
            name: promptNames.packageAutocomplete,
            message: `${t('prompts.config.package.packageAutocomplete.message')}${t(
                'prompts.config.package.packageAutocomplete.messageTypeFilter'
            )}`,
            guiOptions,
            // inquirer 13's native `search` arm no longer passes the previous answers to `source`;
            // the latest answers are captured from `validate` via the `prevAnswers` closure instead.
            source: (input: string | undefined): Promise<string[]> => getChoices(input ?? ''),
            additionalInfo,
            validate
        } as SearchQuestion<AbapDeployConfigAnswersInternal>;
    }

    return questions;
}
