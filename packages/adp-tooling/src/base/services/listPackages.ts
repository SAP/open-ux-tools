import { ListPackageService } from '@sap-ux/axios-extension';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

export const ABAP_PACKAGE_SEARCH_MAX_RESULTS = 50;

export async function listPackages(phrase: string, provider: AbapServiceProvider): Promise<string[] | undefined> {
    const packageService = await provider.getAdtService<ListPackageService>(ListPackageService);
    return packageService?.listPackages({ maxResults: ABAP_PACKAGE_SEARCH_MAX_RESULTS, phrase });
}
