import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { TransportChecksService, ListPackageService, AtoService } from '@sap-ux/axios-extension';
import type { TransportRequest } from '@sap-ux/axios-extension/src/abap/types';
import type { Logger } from '@sap-ux/logger';
import { green, red, yellow } from 'chalk';
import {
    validateAppName,
    validateAppDescription,
    validateClient,
    validatePackage,
    validateTransportRequestNumber,
    validateUrl
} from '@sap-ux/project-input-validator';
import { EOL } from 'os';
import type { AbapDeployConfig } from '../types';
import type { Destinations } from '@sap-ux/btp-utils';
import { isAppStudio, isOnPremiseDestination, listDestinations, Authentication } from '@sap-ux/btp-utils';

export type ValidationInputs = {
    appName: string;
    description: string;
    package: string;
    transport: string;
    client: string;
    url: string;
    destination: string;
};

export type ValidationOutput = {
    summary: SummaryRecord[];
    result: boolean;
};

export type SummaryRecord = {
    message: string;
    status: SummaryStatus;
};

export enum SummaryStatus {
    Valid,
    Invalid,
    Unknown
}

export const summaryMessage = {
    allClientCheckPass: 'SAPUI5 ABAP Repository follows the rules of creating BSP application',
    adtServiceUndefined: 'AdtService cannot be instantiated',
    packageCheckPass: 'Package is found on ABAP system',
    packageNotFound: 'Package does not exist on ABAP system',
    pacakgeAdtAccessError: 'Package could not be validated. Please check manually.',
    transportCheckPass: 'Transport Request is found on ABAP system',
    transportNotFound: 'Transport Request does not exist on ABAP system',
    transportAdtAccessError: 'Transport Request could not be validated. Please check manually.',
    transportNotRequired: 'Transport Request is not required for local package',
    atoAdtAccessError: 'Development prefix could not be validated. Please check manually.'
};

let cachedDestinationsList: Destinations = {};

/**
 * Validation of deploy configuration before running deploy-test.
 *
 * @param config Deploy configuration that needs to be validated
 * @param provider AbapServiceProvider
 * @param logger Logger used by deploy tooling
 * @returns Validation result and a summary report of identified issues.
 */
export async function validateBeforeDeploy(
    config: AbapDeployConfig,
    provider: AbapServiceProvider,
    logger: Logger
): Promise<ValidationOutput> {
    const output = {
        summary: [] as SummaryRecord[],
        result: true
    };

    const input: ValidationInputs = {
        appName: config.app.name ?? '',
        description: config.app.description ?? '',
        package: config.app.package ?? '',
        transport: config.app.transport ?? '',
        client: config.target.client ?? '',
        url: config.target.url ?? '',
        destination: config.target.destination ?? ''
    };

    // output is passed by reference and status updated during the internal pipeline below.
    await validateInputTextFormat(input, output, provider, logger);
    convertInputsForAdtValidations(input, output);
    await validatePackageWithAdt(input, output, provider, logger);
    await validateTransportRequestWithAdt(input, output, provider, logger);

    return output;
}

/**
 * Format a list of summary records that is ready to be printed on the console.
 * The reduce function makes sure a EOL is added at the beginning of the output.
 *
 * @param summary A list of summary records
 * @returns Formatted summary string
 */
export function formatSummary(summary: SummaryRecord[]): string {
    const summaryStr = summary
        .map((next) => {
            let statusSymbol = '';
            switch (next.status) {
                case SummaryStatus.Valid:
                    statusSymbol = green('√');
                    break;
                case SummaryStatus.Invalid:
                    statusSymbol = red('×');
                    break;
                case SummaryStatus.Unknown:
                default:
                    statusSymbol = yellow('?');
                    break;
            }
            return `${' '.repeat(4)}${statusSymbol} ${next.message}`;
        })
        .reduce((aggregated, current) => {
            return `${aggregated}${EOL}${current}`;
        }, '');

    return summaryStr;
}

/**
 *
 * @param input
 * @param output
 */
function convertInputsForAdtValidations(input: ValidationInputs, output: ValidationOutput): void {
    const upperCasePackageName = input.package.toUpperCase();
    const upperCaseTransport = input.transport.toUpperCase();
    if (upperCasePackageName !== input.package) {
        input.package = upperCasePackageName;
        output.summary.push({
            message: `Package name contains lower case letter(s). ${input.package} is used for ADT validation.`,
            status: SummaryStatus.Unknown
        });
    }
    if (upperCaseTransport !== input.transport) {
        input.transport = upperCaseTransport;
        output.summary.push({
            message: `Transport request number contains lower case letter(s). ${input.transport} is used for ADT validation.`,
            status: SummaryStatus.Unknown
        });
    }
}

/**
 * Client-side validation on the deploy configuration based on the
 * known input format constraints.
 *
 * @param input Deploy config that needs to be validated
 * @param output Validation output
 * @param provider AbapServiceProvider
 * @param logger Logger from the calling context
 */
async function validateInputTextFormat(
    input: ValidationInputs,
    output: ValidationOutput,
    provider: AbapServiceProvider,
    logger: Logger
): Promise<void> {
    // Prepare backend info for validation
    const prefix = await getSystemPrefix(output, provider, logger);

    // A sequence of client-side validations. No early termination of detecting invalid inputs.
    // Setting output.result to false if any of the checks is invalid.
    // Add individual error messages into output.summary array if validation failed.
    let result = validateAppName(input.appName, prefix);
    processInputValidationResult(result, output);
    result = validateAppDescription(input.description);
    processInputValidationResult(result, output);
    result = validateTransportRequestNumber(input.transport, input.package);
    processInputValidationResult(result, output);
    result = validatePackage(input.package);
    processInputValidationResult(result, output);
    result = validateClient(input.client);
    processInputValidationResult(result, output);
    result = validateUrlForOnPremTargetOnly(input.destination, input.url);
    processInputValidationResult(result, output);

    // If all the text validation passed, only show the following success message.
    if (output.result) {
        output.summary.push({
            message: summaryMessage.allClientCheckPass,
            status: SummaryStatus.Valid
        });
    }
}

/**
 * A wrapper of validateUrl(). It uses same logic in system-access module's createAbapServiceProvider()
 * function to determine the deploy target. Only validate URL for on-prem ABAP deploy target.
 *
 * @param destination
 * @param url
 * @returns
 */
function validateUrlForOnPremTargetOnly(destination: string, url: string): boolean | string {
    if (isAppStudio() && destination) {
        // No validation required for destination name
        return true;
    } else if (url) {
        return validateUrl(url);
    } else {
        return 'Invalid deploy target';
    }
}

/**
 * Helper function that calls ADT service to retrieve system specific prefix
 * requirement for Fiori app name.
 *
 * @param output Validation output
 * @param provider AbapServiceProvider
 * @param logger Logger from the calling context
 * @returns System specific development prefix constraint for Fiori app name
 */
async function getSystemPrefix(
    output: ValidationOutput,
    provider: AbapServiceProvider,
    logger: Logger
): Promise<string | undefined> {
    try {
        const adtService = await provider.getAdtService<AtoService>(AtoService);
        if (!adtService) {
            output.summary.push({
                message: `${summaryMessage.adtServiceUndefined} for AtoService`,
                status: SummaryStatus.Unknown
            });
            output.result = false;
            return undefined;
        }

        const atoSettings = await adtService.getAtoInfo();
        return atoSettings?.developmentPrefix;
    } catch (e) {
        logger.error(e.message);
        logger.debug(e);
        output.summary.push({
            message: summaryMessage.atoAdtAccessError,
            status: SummaryStatus.Unknown
        });
        output.result = false;
        return undefined;
    }
}

/**
 * Helper function to proces input validation result. Avoids sonarqube warning about
 * increasing complexity.
 *
 * @param validationResult Validation result is either true or error message
 * @param output validation output
 */
function processInputValidationResult(validationResult: boolean | string, output: ValidationOutput) {
    if (typeof validationResult === 'string') {
        output.summary.push({
            message: validationResult,
            status: SummaryStatus.Invalid
        });
        output.result = false;
    } else if (validationResult !== true) {
        // Strict check for validator functions that return false instead of error message.
        throw new Error('Expect error message string returned from validation function instead of false');
    }
}

/**
 * Query ADT backend service to verify input package name is valid.
 *
 * @param input Inputs to query ADT service
 * @param output Output to be updated during this function call
 * @param provider AbapServiceProvider
 * @param logger Logger from the calling context
 */
async function validatePackageWithAdt(
    input: ValidationInputs,
    output: ValidationOutput,
    provider: AbapServiceProvider,
    logger: Logger
): Promise<void> {
    if (output.result === false) {
        return;
    }

    // ADT expects input package
    const inputPackage = input.package;

    try {
        const adtService = await provider.getAdtService<ListPackageService>(ListPackageService);
        if (!adtService) {
            output.summary.push({
                message: `${summaryMessage.adtServiceUndefined} for ListPackageService`,
                status: SummaryStatus.Unknown
            });
            output.result = false;
            return;
        }
        const packages = await adtService.listPackages({ phrase: inputPackage });
        const isValidPackage = packages.findIndex((packageName: string) => packageName === inputPackage) >= 0;

        if (isValidPackage) {
            output.summary.push({
                message: summaryMessage.packageCheckPass,
                status: SummaryStatus.Valid
            });
        } else {
            output.summary.push({
                message: summaryMessage.packageNotFound,
                status: SummaryStatus.Invalid
            });
            output.result = false;
        }
    } catch (e) {
        logger.error(e.message);
        logger.debug(e);
        output.summary.push({
            message: summaryMessage.pacakgeAdtAccessError,
            status: SummaryStatus.Unknown
        });
        output.result = false;
    }
}

/**
 * Query ADT backend service to verify input transport request.
 *
 * @param input Inputs to query ADT service
 * @param output Output to be updated during this function call
 * @param provider AbapServiceProvider
 * @param logger Logger from the calling context
 */
async function validateTransportRequestWithAdt(
    input: ValidationInputs,
    output: ValidationOutput,
    provider: AbapServiceProvider,
    logger: Logger
): Promise<void> {
    if (output.result === false) {
        return;
    }

    try {
        const adtService = await provider.getAdtService<TransportChecksService>(TransportChecksService);
        if (!adtService) {
            output.summary.push({
                message: `${summaryMessage.adtServiceUndefined} for TransportChecksService`,
                status: SummaryStatus.Unknown
            });
            output.result = false;
            return;
        }

        const trList = await adtService.getTransportRequests(input.package, input.appName);
        const isValidTrList = trList.findIndex((tr: TransportRequest) => tr.transportNumber === input.transport) >= 0;

        if (isValidTrList) {
            output.summary.push({
                message: summaryMessage.transportCheckPass,
                status: SummaryStatus.Valid
            });
        } else {
            output.summary.push({
                message: summaryMessage.transportNotFound,
                status: SummaryStatus.Invalid
            });
            output.result = false;
        }
    } catch (e) {
        // TransportChecksService.getTransportRequests() API is used to provide valid
        // transport request list. If input packge is local package, no transport request
        // is returned and LocalPackageError is thrown as exception.
        // LocalPackageError is acceptable for validation purpose here.
        if (e.message === TransportChecksService.LocalPackageError) {
            output.summary.push({
                message: summaryMessage.transportNotRequired,
                status: SummaryStatus.Valid
            });
        } else {
            logger.error(e.message);
            logger.debug(e);
            output.summary.push({
                message: summaryMessage.transportAdtAccessError,
                status: SummaryStatus.Unknown
            });
            output.result = false;
        }
    }
}

/**
 * Returns true if specified destination is on-premise and if environment is App Studio
 * to show additional info.
 *
 * @param destination Identifier for destination to be checked.
 * @returns Promise boolean.
 */
export async function showAdditionalInfoForOnPrem(destination: string): Promise<boolean> {
    let showInfo = false;
    if (isAppStudio() && destination) {
        const destinations = await listDestinations();
        showInfo = isOnPremiseDestination(destinations[destination]);
    }
    return showInfo;
}

/**
 * Validates if the credentials are required for the destination based on the Authentication type.
 *
 * @param destination Identifier for destination to be checked.
 * @param logger Logger from the calling context.
 * @returns Promise boolean.
 */
export async function checkForCredentials(destination: string | undefined, logger: Logger): Promise<boolean> {
    let check = true;
    if (destination && isAppStudio()) {
        const destinations = await getDestinations();
        if (destinations[destination].Authentication === Authentication.SAML_ASSERTION) {
            logger.warn(
                `The SAP BTP destination is misconfigured, please check you have the appropriate trusts and permissions enabled.`
            );
            check = false;
        }
    }
    return check;
}

/**
 * Return a list of Destinations.
 *
 * @returns Array of Destination objects
 */
async function getDestinations(): Promise<Destinations> {
    if (Object.keys(cachedDestinationsList).length === 0) {
        cachedDestinationsList = await listDestinations();
    }
    return cachedDestinationsList;
}
