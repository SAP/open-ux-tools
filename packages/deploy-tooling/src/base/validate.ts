import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { TransportChecksService, ListPackageService } from '@sap-ux/axios-extension';
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
} from '@sap-ux/deploy-input-validator';

export type ValidationInputs = {
    appName: ValidationInput;
    description: ValidationInput;
    package: ValidationInput;
    transport: ValidationInput;
    client: ValidationInput;
    url: ValidationInput;
};

export type ValidationInput = {
    value: string;
    helpers?: string[];
};

export type ValidationOutput = {
    summary: SummaryRecord[];
    result: boolean;
};

export type SummaryRecord = {
    message: string;
    status: SummaryStatus;
};

/**
 * Type definitiono of a map for validator functions. Each intput name defined in type ValidationInput is used as key.
 * Use validators map to access the validator function for each input name.
 */
type Validators = Record<keyof ValidationInputs, (input: string, ...helpers: string[]) => string | boolean>;

export enum SummaryStatus {
    Valid,
    Invalid,
    Unknown
}

export const summaryMessage = {
    allClientCheckPass: 'SAPUI5 ABAP Repository follows the rules of creating BSP application',
    noErrorMessageFromValidator: 'Validator did not return readable error message',
    adtServiceUndefined: 'AdtService cannot be instantiated',
    packageCheckPass: 'Package is found on ABAP system',
    packageNotFound: 'Package does not exist on ABAP system',
    pacakgeAdtAccessError: 'Package could not be validated. Please check manually.',
    transportCheckPass: 'Transport Request is found on ABAP system',
    transportNotFound: 'Transport Request does not exist on ABAP system',
    transportAdtAccessError: 'Transport Request could not be validated. Please check manually.',
    transportNotRequired: 'Transport Request is not required for local package'
};

/**
 * Validators map that binds validator implementation to each input in a ValidatorInput
 *
 * @see Validators
 */
const validators: Validators = {
    appName: validateAppName,
    description: validateAppDescription,
    package: validatePackage,
    transport: validateTransportRequestNumber,
    client: validateClient,
    url: validateUrl
};

/**
 * Validation of deploy configuration before running deploy-test.
 *
 * @param input Deploy configuration that needs to be validated
 * @param provider AbapServiceProvider
 * @param logger Logger used by deploy tooling
 * @returns Validation result and a summary report of identified issues.
 */
export async function validateBeforeDeploy(
    input: ValidationInputs,
    provider: AbapServiceProvider,
    logger: Logger
): Promise<ValidationOutput> {
    const output = {
        summary: [],
        result: true
    };

    // output is passed by reference and status updated during the internal pipeline below.
    validateInputTextFormat(input, output);
    await validatePackageWithAdt(input, output, provider, logger);
    await validateTransportRequestWithAdt(input, output, provider, logger);

    return output;
}

/**
 * Format a list of summary records that is ready to be printed on the console.
 *
 * @param summary A list of summary records
 * @returns Formatted summary string
 */
export function formatSummary(summary: SummaryRecord[]): string {
    const summaryStr = summary
        .map((next) => {
            let statusSymbol;
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
            return `${statusSymbol} ${next.message}`;
        })
        .reduce((aggregated, current) => `${aggregated}\r\n${current}`);

    return summaryStr;
}

/**
 * Client-side validation on the deploy configuration based on the
 * known input format constraints.
 *
 * @param input Deploy config that needs to be validated
 * @param output Validation output
 */
function validateInputTextFormat(input: ValidationInputs, output: ValidationOutput): void {
    // A series of client-side validations. No early termination of detecting invalid inputs.
    // Setting output.result to false if any of the checks is invalid.
    // Add individual error messages into output.summary array if validation failed.
    Object.keys(input).forEach((inputField) => {
        const keyValidationInput = inputField as keyof ValidationInputs;
        const validatorFn = validators[keyValidationInput];
        if (!validatorFn) {
            return;
        }
        const validationResult = validatorFn(
            input[keyValidationInput].value,
            ...(input[keyValidationInput].helpers ?? [])
        );
        if (typeof validationResult === 'string') {
            output.summary.push({
                message: validationResult,
                status: SummaryStatus.Invalid
            });
            output.result = false;
        } else if (validationResult !== true) {
            output.summary.push({
                message: summaryMessage.noErrorMessageFromValidator,
                status: SummaryStatus.Invalid
            });
            output.result = false;
        }
    });

    // If all the text validation passed, only show the following success message.
    if (output.result) {
        output.summary.push({
            message: summaryMessage.allClientCheckPass,
            status: SummaryStatus.Valid
        });
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

        const packages = await adtService.listPackages({ phrase: input.package.value });
        const isValidPackage = packages.findIndex((packageName: string) => packageName === input.package.value) >= 0;

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
        logger.error(e);
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

        const trList = await adtService.getTransportRequests(input.package.value, input.appName.value);
        const isValidTrList =
            trList.findIndex((tr: TransportRequest) => tr.transportNumber === input.transport.value) >= 0;

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
            logger.error(e);
            output.summary.push({
                message: summaryMessage.transportAdtAccessError,
                status: SummaryStatus.Unknown
            });
            output.result = false;
        }
    }
}
