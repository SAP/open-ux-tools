import { TransportChecksService } from '@sap-ux/axios-extension';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

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
    return transportRequests?.map((transport) => transport.transportNumber) || [];
}
