import type { ToolsLogger } from '@sap-ux/logger';
import type { AutocompleteQuestion, InputQuestion, ListQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
import type { AbapServiceProvider, AxiosError, SystemInfo } from '@sap-ux/axios-extension';
import { AdaptationProjectType } from '@sap-ux/axios-extension';

import type { AbapProvider } from '../../../client';
import { t } from '../../../i18n';
import type { DeployConfigAnswers } from '../../../types';
import { InputChoice } from '../../../types';
import { ABAP_PACKAGE_SEARCH_MAX_RESULTS, listPackages, listTransports } from '../../../client';
import { validateAbapRepository, validateEmptyString, validatePackageAdp } from '@sap-ux/project-input-validator';
import { getInputChoiceOptions } from './helper';
import { shouldShowTransportRelatedPrompt, showPackageManualQuestion } from './helper/conditions';

/**
 * Validates the user's choice for selecting an ABAP package.
 * This function checks if the user wants to enter the package name manually or selects it from a list.
 * If not entering manually, it verifies that there are available packages by listing them from the ABAP system.
 *
 * @param {InputChoice} value - The user's choice on how to input the package name.
 * @param {AbapServiceProvider} provider - The ABAP service provider.
 * @returns {Promise<string | boolean>} A promise that resolves to true if the input choice is valid or a validation error message otherwise.
 */
export async function validatePackageChoiceInput(
    value: InputChoice,
    provider: AbapServiceProvider
): Promise<string | boolean> {
    if (value === InputChoice.ENTER_MANUALLY) {
        return true;
    }
    try {
        const packages = await listPackages('', provider);
        if (!packages || (packages && packages.length === 0)) {
            return t('validators.abapPackagesNotFound');
        }
    } catch (error) {
        return t('validators.abapPackagesNotFound');
    }

    return true;
}

/**
 * Validates the user's choice of transport request input method for an ABAP package.
 * If choosing from existing transport requests, it checks that the package and repository are specified,
 * and that there are available transport requests.
 *
 * @param {InputChoice} value - The user's transport choice input method.
 * @param {string} packageName - The package name involved in the transport operation.
 * @param {string} repository - The repository associated with the package.
 * @param {AbapServiceProvider} provider - The ABAP service provider.
 * @returns {Promise<string | boolean>} A promise that resolves to true if the input method is valid,
 *                                      or an error message string if there are issues with the prerequisites or fetching transports.
 */
export async function validateTransportChoiceInput(
    value: InputChoice,
    packageName: string,
    repository: string,
    provider: AbapServiceProvider
): Promise<string | boolean> {
    try {
        if (!value) {
            return t('validators.chooseTransportInput');
        }
        if (value === InputChoice.CHOOSE_FROM_EXISTING) {
            if (!packageName || !repository) {
                return t('validators.invalidTranposportPrereq');
            }

            const transportList = await listTransports(packageName, repository, provider);
            if (!transportList || (transportList && transportList.length === 0)) {
                return t('validators.errorFetchingTransports');
            }
        }

        return true;
    } catch (error) {
        return t('validators.errorFetchingTransports');
    }
}

/**
 * Attempts to fetch and update a list of transports for a given package and repository.
 *
 * @param {string} packageName - The name of the package.
 * @param {string} repository - The repository identifier.
 * @param {AbapServiceProvider} provider - The ABAP service provider.
 * @param {string[] | undefined} transportList - An array to store the list of transports.
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<void>}
 */
export async function setTransportList(
    packageName: string,
    repository: string,
    provider: AbapServiceProvider,
    transportList: string[] | undefined,
    logger?: ToolsLogger
): Promise<void> {
    try {
        const fetchedTransports = await listTransports(packageName, repository, provider);

        if (!transportList) {
            transportList = [];
        } else {
            transportList.length = 0;
        }

        if (fetchedTransports) {
            transportList.push(...fetchedTransports);
        }
    } catch (e) {
        logger?.error(`Could not set transportList! Error: ${e.message}`);
    }
}

/**
 * Validates the package name by checking its type and potentially fetching and setting the transport list.
 *
 * @param {string} value - The package name to validate.
 * @param {DeployConfigAnswers} answers - Answers object containing deployment configuration answers.
 * @param {AbapServiceProvider} provider - ABAP service provider to fetch system information.
 * @param {string[]} transportList - An array to store the list of transports if applicable.
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<string | boolean>} A promise that resolves with true if validation is successful, or an error message otherwise.
 */
export async function validatePackageName(
    value: string,
    answers: DeployConfigAnswers,
    provider: AbapServiceProvider,
    transportList: string[],
    logger?: ToolsLogger
): Promise<string | boolean> {
    const errorMessage = validatePackageAdp(value, answers.abapRepository);
    if (errorMessage) {
        return errorMessage;
    }

    try {
        const systemInfo = await fetchPackageSystemInfo(value, provider);

        if (systemInfo.adaptationProjectTypes[0] !== AdaptationProjectType.CLOUD_READY) {
            return t('validators.package.notCloudPackage');
        }

        if (answers.abapRepository && answers.transportInputChoice === InputChoice.CHOOSE_FROM_EXISTING) {
            await setTransportList(value, answers.abapRepository, provider, transportList, logger);
        }

        return true;
    } catch (e) {
        return handlePackageValidationErrors(e, logger);
    }
}

/**
 * Fetches system information for a specific package.
 *
 * @param {string} packageName - The name of the package.
 * @param {AbapServiceProvider} provider - The provider from which to fetch the system info.
 * @returns {Promise<any>} A promise that resolves with the system information.
 */
async function fetchPackageSystemInfo(packageName: string, provider: AbapServiceProvider): Promise<SystemInfo> {
    const lrep = provider.getLayeredRepository();
    return lrep.getSystemInfo(undefined, packageName);
}

/**
 * Handles errors that occur during the package validation process.
 *
 * @param {Error} error - The error caught during the validation process.
 * @param {ToolsLogger} [logger] - The logger.
 * @returns {string} An appropriate error message based on the error details.
 */
function handlePackageValidationErrors(error: AxiosError, logger?: ToolsLogger): string {
    logger?.error(`Package validation failed. Reason: ${error.message}`);
    // If there is no such package the API will response with 400 or 404 status codes
    if (error.response && (error.response.status === 400 || error.response.status === 404)) {
        return t('validators.package.notCloudPackage');
    }
    // In case of different response status code than 400 or 404 we are showing the error message
    return error.message;
}

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
    const provider = abapProvider.getProvider();
    const transportList: string[] = [];

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
                packageInputChoiceValid = await validatePackageChoiceInput(value, provider);

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
                await validatePackageName(value, answers, provider, transportList)
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
                    packages = await listPackages(input, provider);
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
                await validatePackageName(value, answers, provider, transportList)
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
                return await validateTransportChoiceInput(value, name, answers.abapRepository, provider);
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
