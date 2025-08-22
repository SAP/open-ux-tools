import { findFioriArtifacts } from '@sap-ux/project-access';
import type { AllAppResults } from '@sap-ux/project-access';
import type { FioriApp, ListFioriAppsInput, ListFioriAppsOutput } from '../types';
import { basename } from 'path';

/**
 * Scans the provided workspace paths for Fiori applications and returns
 * a structured list of discovered apps.
 *
 * @param params - Input parameters for the search.
 * @returns A promise resolving to an object containing a list of discovered Fiori applications.
 */
export async function listFioriApps(params: ListFioriAppsInput): Promise<ListFioriAppsOutput> {
    const { searchPath = [] } = params;
    const newFoundFioriArtifacts = await findFioriArtifacts({
        wsFolders: searchPath,
        artifacts: ['applications']
    });

    return {
        applications:
            newFoundFioriArtifacts.applications?.map((app: AllAppResults): FioriApp => {
                return {
                    name: app.manifest['sap.app']?.id ?? basename(app.appRoot),
                    path: app.appRoot,
                    type: 'list-report',
                    version: app.manifest['sap.app']?.dataSources?.mainService?.settings?.odataVersion ?? '4.0'
                };
            }) ?? []
    };
}
