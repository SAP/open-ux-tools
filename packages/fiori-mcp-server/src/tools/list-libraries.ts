import type { App } from '@sap-ux/axios-extension';

import { getProvider } from './services/abap-context.js';
import type { ListFunctionalitiesInput } from '../types/index.js';

/** App index search filter that targets UI5 libraries with an `appdescr` file. */
const LIBRARY_FILTER = {
    fields: ['sap.app/id', 'sap.app/title', 'url', 'repoName'].join(','),
    'sap.ui/technology': 'UI5' as const,
    'sap.app/type': 'library' as const,
    fileType: 'appdescr'
};

/**
 * Queries the target system's app index for UI5 libraries with an `appdescr` file.
 *
 * @param params Input parameters; only `appPath` is read.
 * @returns Flattened library entries returned by the app index.
 */
export async function listLibrariesFromSystem(params: ListFunctionalitiesInput): Promise<Partial<App>[]> {
    const provider = await getProvider(params.appPath);
    const response = await provider.getAppIndex().search(LIBRARY_FILTER);
    return response.flat();
}
