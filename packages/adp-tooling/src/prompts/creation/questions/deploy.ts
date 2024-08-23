import type { ToolsLogger } from '@sap-ux/logger';
import { validateAbapRepository, validateEmptyString } from '@sap-ux/project-input-validator';
import type { AutocompleteQuestion, InputQuestion, ListQuestion, YUIQuestion } from '@sap-ux/inquirer-common';

import {
    getInputChoiceOptions,
    validatePackageChoiceInput,
    validatePackageName,
    validateTransportChoiceInput
} from './helper';
import { t } from '../../../i18n';
import { InputChoice } from '../../../types';
import type { AbapProvider } from '../../../client';
import type { DeployConfigAnswers } from '../../../types';
import { ABAP_PACKAGE_SEARCH_MAX_RESULTS, AbapClient } from './backend/abap-client';
import { shouldShowTransportRelatedPrompt, showPackageManualQuestion } from './helper/conditions';

/**
 * Generates prompts for deployment settings based on the current system and project settings.
 *
 * @param {AbapProvider} abapProvider - The ABAP provider service.
 * @param {ToolsLogger} [logger] - The logger.
 * @returns {YUIQuestion<DeployConfigAnswers>[]} An list of deployment prompts.
 */
export async function getPrompts(
    abapProvider: AbapProvider,
    logger?: ToolsLogger
): Promise<YUIQuestion<DeployConfigAnswers>[]> {
    const transportList: string[] = [];
    const abapClient = new AbapClient(abapProvider, false);
    let packageInputChoiceValid: string | boolean;
    let morePackageResultsMsg: string;

    return [
        {
            type: 'input',
            name: 'abapRepository',
            message: t('prompts.abapRepository'),
            guiOptions: {
                hint: t('tooltips.abapRepository'),
                breadcrumb: t('prompts.abapRepository'),
                mandatory: true
            },
            validate: (value: string) => validateAbapRepository(value)
        } as InputQuestion<DeployConfigAnswers>,
        {
            type: 'input',
            name: 'deployConfigDescription',
            message: t('prompts.deployConfigDescription'),
            guiOptions: {
                hint: t('tooltips.deployConfigDescription'),
                breadcrumb: true
            }
        } as InputQuestion<DeployConfigAnswers>,
        {
            type: 'list',
            name: 'packageInputChoice',
            message: t('prompts.packageInputChoice'),
            choices: () => getInputChoiceOptions(),
            default: (answers: DeployConfigAnswers) => answers?.packageInputChoice ?? InputChoice.ENTER_MANUALLY,
            guiOptions: {
                applyDefaultWhenDirty: true,
                breadcrumb: t('prompts.packageInputChoice')
            },
            validate: async (value: InputChoice) => {
                packageInputChoiceValid = await validatePackageChoiceInput(value, abapClient);

                return packageInputChoiceValid;
            }
        } as ListQuestion<DeployConfigAnswers>,
        {
            type: 'input',
            name: 'packageManual',
            message: t('prompts.package'),
            guiOptions: {
                hint: t('tooltips.package'),
                breadcrumb: true,
                mandatory: true
            },
            when: (answers: DeployConfigAnswers) => showPackageManualQuestion(answers, packageInputChoiceValid),
            validate: async (value: string, answers: DeployConfigAnswers) =>
                await validatePackageName(value, answers, abapClient, transportList)
        } as InputQuestion<DeployConfigAnswers>,
        {
            type: 'autocomplete',
            name: 'packageAutocomplete',
            message: t('prompts.package'),
            guiOptions: {
                mandatory: true,
                breadcrumb: true,
                hint: t('tooltips.package')
            },
            source: async (_, input: string) => {
                let packages: string[] = [];
                try {
                    packages = await abapClient.listPackages(input);
                    morePackageResultsMsg =
                        packages && packages.length === ABAP_PACKAGE_SEARCH_MAX_RESULTS
                            ? t('info.moreSearchResults', { count: packages.length })
                            : '';
                    return packages;
                } catch (e) {
                    logger?.error(`Could not get packages. Error: ${e.message}`);
                }

                return packages;
            },
            additionalInfo: () => morePackageResultsMsg,
            when: (answers: DeployConfigAnswers) =>
                packageInputChoiceValid === true && answers?.packageInputChoice === InputChoice.CHOOSE_FROM_EXISTING,
            validate: async (value: string, answers: DeployConfigAnswers) =>
                await validatePackageName(value, answers, abapClient, transportList)
        } as AutocompleteQuestion<DeployConfigAnswers>,
        {
            type: 'list',
            name: 'transportInputChoice',
            message: t('prompts.transportInputChoice'),
            choices: () => getInputChoiceOptions(),
            default: (answers: DeployConfigAnswers) => answers.transportInputChoice ?? InputChoice.ENTER_MANUALLY,
            guiOptions: {
                applyDefaultWhenDirty: true
            },
            validate: async (value: InputChoice, answers: DeployConfigAnswers) => {
                const name =
                    answers.packageInputChoice === InputChoice.ENTER_MANUALLY
                        ? answers.packageManual!
                        : answers.packageAutocomplete!;
                return await validateTransportChoiceInput(value, name, answers.abapRepository, abapClient);
            },
            when: (answers: DeployConfigAnswers) => shouldShowTransportRelatedPrompt(answers)
        } as ListQuestion<DeployConfigAnswers>,
        {
            type: 'list',
            name: 'transportFromList',
            message: t('prompts.transport'),
            choices: () => transportList ?? [],
            validate: (value: string) => validateEmptyString(value),
            when: (answers: DeployConfigAnswers) =>
                shouldShowTransportRelatedPrompt(answers) &&
                answers?.transportInputChoice === InputChoice.CHOOSE_FROM_EXISTING,
            guiOptions: {
                hint: t('tooltips.transport'),
                breadcrumb: true,
                mandatory: true
            }
        } as ListQuestion<DeployConfigAnswers>,
        {
            type: 'input',
            name: 'transportManual',
            message: t('prompts.transport'),
            validate: (value: string) => validateEmptyString(value),
            when: (answers: DeployConfigAnswers) =>
                shouldShowTransportRelatedPrompt(answers) &&
                answers?.transportInputChoice === InputChoice.ENTER_MANUALLY,
            guiOptions: {
                hint: t('tooltips.transport'),
                breadcrumb: true,
                mandatory: true
            }
        } as InputQuestion<DeployConfigAnswers>
    ];
}
