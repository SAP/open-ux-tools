import type { AbapServiceProvider } from '@sap-ux/axios-extension';

import { ListPackageService } from '@sap-ux/axios-extension';
import { TransportChecksService } from '@sap-ux/axios-extension';

export const ABAP_PACKAGE_SEARCH_MAX_RESULTS = 50;

/**
 * Queries an ABAP system for a list of packages based on a search phrase.
 *
 * @param {string} phrase - The search phrase used to filter the packages.
 * @param {AbapServiceProvider} provider - The ABAP service provider used for the query.
 * @returns {Promise<string[]>} A promise that resolves to an array of package names, or an empty array if none found or on error.
 */
export async function listPackages(phrase: string, provider: AbapServiceProvider): Promise<string[]> {
    const packageService = await provider.getAdtService<ListPackageService>(ListPackageService);
    return packageService?.listPackages({ maxResults: ABAP_PACKAGE_SEARCH_MAX_RESULTS, phrase }) ?? [];
}

/**
 * Fetches a list of transport requests for a given package and repository using a specified ABAP service provider.
 *
 * @param {string} packageName - The name of the package for which transport requests are being fetched.
 * @param {string} repository - The repository associated with the package.
 * @param {AbapServiceProvider} provider - The ABAP service provider used to access transport services.
 * @returns {Promise<string[]>} A promise that resolves to an array of transport request numbers.
 */
export async function listTransports(
    packageName: string,
    repository: string,
    provider: AbapServiceProvider
): Promise<string[]> {
    const transportCheckService = await provider.getAdtService<TransportChecksService>(TransportChecksService);
    const transportRequests = await transportCheckService?.getTransportRequests(packageName, repository);
    return transportRequests?.map((transport) => transport.transportNumber) ?? [];
}
