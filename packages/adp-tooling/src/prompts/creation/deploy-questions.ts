import { AutocompleteQuestion, InputQuestion, ListQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
import { AbapServiceProvider, AdaptationProjectType, AxiosError, SystemInfo } from '@sap-ux/axios-extension';

import {
    ProviderService,
    validateAbapRepository,
    validateEmptyInput,
    validatePackage,
    validatePackageChoiceInput,
    validateTransportChoiceInput
} from '../../base';
import { t } from '../../i18n';
import { ChoiceOption, DeployConfigAnswers, InputChoice } from '../../types';
import { listTransports } from '../../base/services/list-transports-service';
import { ABAP_PACKAGE_SEARCH_MAX_RESULTS, listPackages } from '../../base/services/list-packages-service';

/**
 * Returns the available options for input choices regarding packages.
 *
 * @returns {ChoiceOption[]} An array of options for user input regarding package choice.
 */
const getInputChoiceOptions = (): ChoiceOption[] => {
    return [
        { name: InputChoice.ENTER_MANUALLY, value: InputChoice.ENTER_MANUALLY },
        { value: InputChoice.CHOOSE_FROM_EXISTING, name: InputChoice.CHOOSE_FROM_EXISTING }
    ];
};

/**
 * Determines if transport-related prompts should be shown based on the package choice and its name.
 * Transport prompts should not be shown if the chosen package is '$TMP'.
 *
 * @param {DeployConfigAnswers} answers - The current answers containing the package choice and names.
 * @returns {boolean} True if transport-related prompts should be shown, otherwise false.
 */
export function shouldShowTransportRelatedPrompt(answers: DeployConfigAnswers): boolean {
    return (
        (answers?.packageAutocomplete?.toUpperCase() !== '$TMP' &&
            answers?.packageInputChoice === InputChoice.CHOOSE_FROM_EXISTING) ||
        (answers?.packageManual?.toUpperCase() !== '$TMP' && answers?.packageInputChoice === InputChoice.ENTER_MANUALLY)
    );
}

/**
 * Attempts to fetch and update a list of transports for a given package and repository.
 *
 * @param {string} packageName - The name of the package.
 * @param {string} repository - The repository identifier.
 * @param {AbapServiceProvider} provider - The ABAP service provider.
 * @param {string[] | undefined} transportList - An array to store the list of transports.
 * @returns {Promise<void>}
 */
export async function setTransportList(
    packageName: string,
    repository: string,
    provider: AbapServiceProvider,
    transportList: string[] | undefined
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
    } catch (error) {
        // In case that the request fails we should not break package validation
        // this.logger.error(`Could not set transportList! Error: ${error.message}`);
    }
}

/**
 * Validates the package name by checking its type and potentially fetching and setting the transport list.
 *
 * @param {string} value - The package name to validate.
 * @param {DeployConfigAnswers} answers - Answers object containing deployment configuration answers.
 * @param {AbapServiceProvider} provider - ABAP service provider to fetch system information.
 * @param {string[]} transportList - An array to store the list of transports if applicable.
 * @returns {Promise<string | boolean>} A promise that resolves with true if validation is successful, or an error message otherwise.
 */
export async function validatePackageName(
    value: string,
    answers: DeployConfigAnswers,
    provider: AbapServiceProvider,
    transportList: string[]
): Promise<string | boolean> {
    const errorMessage = validatePackage(value, answers.abapRepository);
    if (errorMessage) {
        return errorMessage;
    }

    try {
        const systemInfo = await fetchPackageSystemInfo(value, provider);

        // When passing package to the API for getting system info the response contains the type of the package (cloud or onPremise)
        // If the package is cloud in adaptationProjectTypes we will have array with only one element 'cloudReady', if it is 'onPremise' the element in the array will be 'onPremise'
        if (systemInfo.adaptationProjectTypes[0] !== AdaptationProjectType.CLOUD_READY) {
            return t('validators.package.notCloudPackage');
        }

        if (answers.abapRepository && answers.transportInputChoice === InputChoice.CHOOSE_FROM_EXISTING) {
            await setTransportList(value, answers.abapRepository, provider, transportList);
        }

        return true;
    } catch (e) {
        return handlePackageValidationErrors(e);
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
 * @returns {string} An appropriate error message based on the error details.
 */
function handlePackageValidationErrors(error: AxiosError): string {
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
 * @param {ProviderService} providerService - The ABAP provider service.
 * @returns {YUIQuestion<DeployConfigAnswers>[]} An list of deployment prompts.
 */
export function getPrompts(providerService: ProviderService): YUIQuestion<DeployConfigAnswers>[] {
    const provider = providerService.getProvider();
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
                packageInputChoiceValid = await validatePackageChoiceInput(value, providerService.getProvider());

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
            when: (answers: DeployConfigAnswers) => {
                return (
                    answers?.packageInputChoice === InputChoice.ENTER_MANUALLY ||
                    (answers.packageInputChoice === InputChoice.CHOOSE_FROM_EXISTING &&
                        typeof packageInputChoiceValid === 'string')
                );
            },
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
                let packages: string[] | undefined = [];
                try {
                    packages = await listPackages(input, provider);
                    morePackageResultsMsg =
                        packages && packages.length === ABAP_PACKAGE_SEARCH_MAX_RESULTS
                            ? t('info.moreSearchResults', { count: packages.length })
                            : '';
                    return packages ?? [];
                } catch (e) {
                    // TODO: What to do in case of error message?
                    // this.logger.error(`Could not get packages. Error: ${e.message}`);
                }

                return packages ?? [];
            },
            additionalInfo: () => morePackageResultsMsg,
            when: (answers: DeployConfigAnswers) => {
                return (
                    packageInputChoiceValid === true && answers?.packageInputChoice === InputChoice.CHOOSE_FROM_EXISTING
                );
            },
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
            validate: (value: string) => validateEmptyInput(value, 'transport'),
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
            validate: (value: string) => validateEmptyInput(value, 'transport'),
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
