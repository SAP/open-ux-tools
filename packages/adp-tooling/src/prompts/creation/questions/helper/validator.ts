import type { ToolsLogger } from '@sap-ux/logger';
import { t } from '../../../../i18n';
import type { DeployConfigAnswers } from '../../../../types';
import { InputChoice } from '../../../../types';
import type { AbapClient } from '../backend/abap-client';
import { validatePackageAdp } from '@sap-ux/project-input-validator';
import type { AxiosError } from '@sap-ux/axios-extension';
import { AdaptationProjectType } from '@sap-ux/axios-extension';
import { parseParameters } from '../../../../common';

/**
 * Validates the user's choice for selecting an ABAP package.
 * This function checks if the user wants to enter the package name manually or selects it from a list.
 * If not entering manually, it verifies that there are available packages by listing them from the ABAP system.
 *
 * @param {InputChoice} value - The user's choice on how to input the package name.
 * @param {AbapClient} abapClient - The ABAP client.
 * @returns {Promise<string | boolean>} A promise that resolves to true if the input choice is valid or a validation error message otherwise.
 */
export async function validatePackageChoiceInput(
    value: InputChoice,
    abapClient: AbapClient
): Promise<string | boolean> {
    if (value === InputChoice.ENTER_MANUALLY) {
        return true;
    }
    try {
        const packages = await abapClient.listPackages('');
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
 * @param {AbapClient} abapClient - The ABAP client.
 * @returns {Promise<string | boolean>} A promise that resolves to true if the input method is valid,
 *                                      or an error message string if there are issues with the prerequisites or fetching transports.
 */
export async function validateTransportChoiceInput(
    value: InputChoice,
    packageName: string,
    repository: string,
    abapClient: AbapClient
): Promise<string | boolean> {
    try {
        if (!value) {
            return t('validators.chooseTransportInput');
        }
        if (value === InputChoice.CHOOSE_FROM_EXISTING) {
            if (!packageName || !repository) {
                return t('validators.invalidTranposportPrereq');
            }

            const transportList = await abapClient.listTransports(packageName, repository);
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
 * @param {AbapClient} abapClient - The ABAP client.
 * @param {string[] | undefined} transportList - An array to store the list of transports.
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<void>}
 */
export async function setTransportList(
    packageName: string,
    repository: string,
    abapClient: AbapClient,
    transportList: string[] | undefined,
    logger?: ToolsLogger
): Promise<void> {
    try {
        const fetchedTransports = await abapClient.listTransports(packageName, repository);

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
 * @param {AbapClient} abapClient - The ABAP client.
 * @param {string[]} transportList - An array to store the list of transports if applicable.
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<string | boolean>} A promise that resolves with true if validation is successful, or an error message otherwise.
 */
export async function validatePackageName(
    value: string,
    answers: DeployConfigAnswers,
    abapClient: AbapClient,
    transportList: string[],
    logger?: ToolsLogger
): Promise<string | boolean> {
    const errorMessage = validatePackageAdp(value, answers.abapRepository);
    if (errorMessage) {
        return errorMessage;
    }

    try {
        const systemInfo = await abapClient.getSystemInfo(undefined, value);

        if (systemInfo.adaptationProjectTypes[0] !== AdaptationProjectType.CLOUD_READY) {
            return t('validators.package.notCloudPackage');
        }

        if (answers.abapRepository) {
            await setTransportList(value, answers.abapRepository, abapClient, transportList, logger);
        }

        return true;
    } catch (e) {
        return handlePackageValidationErrors(e, logger);
    }
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
 * Validates that FLP Parameters are in correct format.
 *
 * @param {string} paramString - The FLP Parameters string
 * @returns {string | boolean} If parameters are in correct format returns true otherwise error message.
 */
export function validateParameters(paramString: string): string | boolean {
    if (!paramString) {
        return true;
    }

    try {
        parseParameters(paramString);
    } catch (error) {
        return error.message;
    }

    return true;
}
