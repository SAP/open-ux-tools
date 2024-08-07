import { PromptState } from '../../prompt-state';
import {
    defaultOrShowManualPackageQuestion,
    defaultOrShowSearchPackageQuestion,
    showPackageInputChoiceQuestion
} from '../../conditions';
import { t } from '../../../i18n';
import { getPackageChoices, getPackageInputChoices } from '../../helpers';
import { defaultPackage, defaultPackageChoice } from '../../default';
import { validatePackage, validatePackageChoiceInput, validatePackageChoiceInputForCli } from '../../validators';
import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';
import {
    abapDeployConfigInternalPromptNames,
    type PackageInputChoices,
    type AbapDeployConfigAnswers,
    type AbapDeployConfigPromptOptions
} from '../../../types';
import type { InputQuestion, ListQuestion, Question } from 'inquirer';
import type { AutocompleteQuestionOptions } from 'inquirer-autocomplete-prompt';

/**
 * Returns the package prompts.
 *
 * @param options - abap deploy config prompt options
 * @returns list of list of questions for package prompting
 */
export function getPackagePrompts(options: AbapDeployConfigPromptOptions): Question<AbapDeployConfigAnswers>[] {
    let packageInputChoiceValid: boolean | string;
    let morePackageResultsMsg = '';
    const isCli = getHostEnvironment(PromptState.isYUI) === hostEnvironment.cli;

    const questions: Question[] = [
        {
            when: (): boolean => showPackageInputChoiceQuestion(),
            type: 'list',
            name: abapDeployConfigInternalPromptNames.packageInputChoice,
            message: t('prompts.config.package.packageInputChoice.message'),
            guiOptions: {
                applyDefaultWhenDirty: true
            },
            choices: () => getPackageInputChoices(),
            default: (previousAnswers: AbapDeployConfigAnswers): string =>
                defaultPackageChoice(previousAnswers.packageInputChoice),
            validate: async (input: PackageInputChoices): Promise<boolean | string> => {
                packageInputChoiceValid = await validatePackageChoiceInput(input, options, {
                    url: PromptState.abapDeployConfig.url,
                    client: PromptState.abapDeployConfig.client,
                    destination: PromptState.abapDeployConfig.destination
                });
                return packageInputChoiceValid;
            }
        } as ListQuestion<AbapDeployConfigAnswers>,
        {
            when: async (previousAnswers: AbapDeployConfigAnswers): Promise<boolean> => {
                if (isCli) {
                    await validatePackageChoiceInputForCli(
                        options,
                        {
                            url: PromptState.abapDeployConfig.url,
                            client: PromptState.abapDeployConfig.client,
                            destination: PromptState.abapDeployConfig.destination
                        },
                        previousAnswers.packageInputChoice
                    );
                    packageInputChoiceValid = true;
                }
                return false;
            },
            type: 'input',
            name: abapDeployConfigInternalPromptNames.packageCliExecution
        },
        {
            when: (previousAnswers: AbapDeployConfigAnswers): boolean =>
                defaultOrShowManualPackageQuestion(isCli, previousAnswers),
            type: 'input',
            name: abapDeployConfigInternalPromptNames.packageManual,
            message: t('prompts.config.package.packageManual.message'),
            guiOptions: {
                hint: t('prompts.config.package.packageManual.hint'),
                mandatory: true,
                breadcrumb: true
            },
            default: (previousAnswers: AbapDeployConfigAnswers): string => defaultPackage(options, previousAnswers),
            validate: (input: string): boolean | string => validatePackage(input)
        } as InputQuestion<AbapDeployConfigAnswers>,
        {
            when: (previousAnswers: AbapDeployConfigAnswers): boolean =>
                packageInputChoiceValid === true && defaultOrShowSearchPackageQuestion(isCli, previousAnswers),
            type: 'autocomplete',
            name: abapDeployConfigInternalPromptNames.packageAutocomplete,
            message: `${t('prompts.config.package.packageAutocomplete.message')}${
                isCli ? t('prompts.config.package.packageAutocomplete.messageTypeFilter') : ''
            }`,
            guiOptions: {
                hint: t('prompts.config.package.packageAutocomplete.hint'),
                mandatory: true,
                breadcrumb: true
            },
            source: async (previousAnswers: AbapDeployConfigAnswers, input: string): Promise<string[] | undefined> => {
                const results = await getPackageChoices(isCli, input, previousAnswers, options);
                morePackageResultsMsg = results.morePackageResultsMsg;
                return results.packages;
            },
            additionalInfo: () => morePackageResultsMsg
        } as AutocompleteQuestionOptions<AbapDeployConfigAnswers>
    ];

    return questions;
}
