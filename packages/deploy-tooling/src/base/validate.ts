import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { TransportChecksService, ListPackageService } from '@sap-ux/axios-extension';
import { TransportRequest } from '@sap-ux/axios-extension/src/abap/types';
import type { Logger } from '@sap-ux/logger';
import chalk from 'chalk';

export type ValidationInput = {
    appName: string;
    description: string | undefined;
    package: string | undefined;
    transport: string | undefined;
};

export type ValidationOutput = {
    summary: SummaryRecord[],
    result: boolean
}

export type SummaryRecord = {
    message: string,
    status: SummaryStatus
}

export enum SummaryStatus {
    Valid,
    Invalid,
    Unknown
}

const summaryMessage = {
    clientCheckPass: 'SAPUI5 ABAP Repository follows the rules of creating BSP application',
    packageCheckPass: 'Package is found on ABAP system',
    packageNotFound: 'Package does not exist on ABAP system',
    pacakgeAdtAccessError: 'Package could not be validated. Please check manually.',
    transportCheckPass: 'Transport Request is found on ABAP system',
    transportNotFound: 'Transport Request does not exist on ABAP system',
    transportAdtAccessError: 'Transport Request could not be validated. Please check manually.',
    transportNotRequired: 'Transport Request is not required for local package'
};

/**
 * Validation of deploy configuration before running deploy-test.
 * @param input Deploy configuration that needs to be validated
 * @param provider AbapServiceProvider
 * @param logger Logger used by deploy tooling
 * @returns Validation result and a summary report of identified issues.
 */
export async function validateBeforeDeploy(input: ValidationInput,
    provider: AbapServiceProvider, logger: Logger): Promise<ValidationOutput> {

    const output = {
        summary: [],
        result: true
    }

    // output is passed by reference and status updated during the internal pipeline below.
    validateInputFormat(input, output);
    await validatePackage(input, output, provider, logger);
    await validateTransportRequest(input, output, provider, logger);

    return output;
}

/**
 * Format a list of summary records that is ready to be printed on the console.
 * @param summary A list of summary records
 * @returns Formatted summary string
 */
export function formatSummary(summary: SummaryRecord[]): string {
    let summaryStr = summary
        .map((next) => {
            let statusSymbol;
            switch (next.status) {
                case SummaryStatus.Valid:
                    statusSymbol = chalk.green('√');
                    break;
                case SummaryStatus.Invalid:
                    statusSymbol = chalk.red('×');
                    break;
                case SummaryStatus.Unknown:
                default:
                    statusSymbol = chalk.yellow('?');
                    break;
            }
            return `${statusSymbol} ${next.message}`;
        })
        .reduce((aggregated, current) => `${aggregated}${current}\n`);

    return summaryStr;
}

/**
 * Client-side validation on the deploy configuration based on the
 * known input format constraints.
 * @param input 
 * @returns 
 */
function validateInputFormat(input: ValidationInput, output: ValidationOutput): void {

    output.summary.push({
        message: summaryMessage.clientCheckPass,
        status: SummaryStatus.Valid
    });
}

/**
 * Query ADT backend service to verify input package name is valid.
 * @param input Inputs to query ADT service
 * @param output Output to be updated during this function call
 * @param provider AbapServiceProvider
 * @param logger
 */
async function validatePackage(
    input: ValidationInput,
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
            throw new Error('AdtService cannot be instantiated');
        }
        const packages = await adtService.listPackages({ phrase: input.package });
        const isValidPackage = packages.findIndex((packageName: string) => packageName === input.package) >= 0;

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
 * @param input Inputs to query ADT service
 * @param output Output to be updated during this function call
 * @param provider AbapServiceProvider
 * @param logger
 */
async function validateTransportRequest(
    input: ValidationInput,
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
            throw new Error('AdtService cannot be instantiated');
        }
        const trList = await adtService.getTransportRequests(input.package!, input.appName);
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
            logger.error(e);
            output.summary.push({
                message: summaryMessage.transportAdtAccessError,
                status: SummaryStatus.Unknown
            });
            output.result = false;
        }
    }
}