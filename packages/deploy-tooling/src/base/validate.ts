import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { TransportChecksService, ListPackageService } from '@sap-ux/axios-extension';
import { TransportRequest } from '@sap-ux/axios-extension/src/abap/types';
import type { Logger } from '@sap-ux/logger';

export type ValidationInput = {
    package: string;
    appName: string;
    transport: string;
    description: string;
};

export type ValidationOutput = {
    summary: string[],
    result: boolean
}

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

    validateInputFormat(input, output);
    await validatePackage(input, output, provider, logger);
    await validateTransportRequest(input, output, provider, logger);

    return output;
}

/**
 * Client-side validation on the deploy configuration based on the
 * known input format constraints.
 * @param input 
 * @returns 
 */
function validateInputFormat(input: ValidationInput, output: ValidationOutput): void {

}

/**
 * Query ADT backend service to verify input package name is valid.
 * @param input Inputs to query ADT service
 * @param output Output to be updated after this function call
 * @param provider AbapServiceProvider
 * @param logger
 */
async function validatePackage(
    input: ValidationInput,
    output: ValidationOutput,
    provider: AbapServiceProvider,
    logger: Logger
): Promise<boolean> {

    const adtService = await provider.getAdtService<ListPackageService>(ListPackageService);
    if (!adtService) {
        throw new Error('AdtService cannot be instantiated');
    }

    const packages = await adtService.listPackages({ phrase: input.package });

    if (!packages) {
        throw new Error('Invalid package list output');
    }

    return packages.findIndex((packageName: string) => packageName === input.package) >= 0;
}



/**
 * Query ADT backend service to verify input transport request.
 * @param input Inputs to query ADT service
 * @param output Output to be updated after this function call
 * @param provider AbapServiceProvider
 * @param logger
 */
async function validateTransportRequest(
    input: ValidationInput,
    output: ValidationOutput,
    provider: AbapServiceProvider,
    logger: Logger
): Promise<void> {
    try {
        const adtService = await provider.getAdtService<TransportChecksService>(TransportChecksService);
        if (!adtService) {
            throw new Error('AdtService is not instantiated');
        }
        const trList = await adtService.getTransportRequests(input.package, input.appName);
        const isValidTrList = trList.findIndex((tr: TransportRequest) => tr.transportNumber === input.transport) >= 0;

    } catch (e) {
        logger.error(e);
        output.result = false;
    }
}