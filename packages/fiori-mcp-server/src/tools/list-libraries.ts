import type { App } from '@sap-ux/axios-extension';

import { getProvider } from './services/abap-context.js';
import type { ListFunctionalitiesInput } from '../types/index.js';

const LIBRARY_FILTER = {
    fields: ['sap.app/id', 'sap.app/title', 'url', 'repoName'].join(','),
    'sap.ui/technology': 'UI5' as const,
    'sap.app/type': 'library' as const,
    fileType: 'appdescr'
};

export async function listLibrariesFromSystem(params: ListFunctionalitiesInput): Promise<Partial<App>[]> {
    const provider = await getProvider(params.appPath);
    const response = await provider.getAppIndex().search(LIBRARY_FILTER);
    return response.flat();
}
