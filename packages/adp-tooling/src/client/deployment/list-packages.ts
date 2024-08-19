import { ListPackageService } from '@sap-ux/axios-extension';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

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
