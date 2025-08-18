import { findFioriArtifacts } from '@sap-ux/project-access';
import type { AllAppResults } from '@sap-ux/project-access';
import type { FioriApp, ListFioriAppsInput, ListFioriAppsOutput } from '../types';

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
                    name: app.manifest['sap.app']?.id,
                    path: app.appRoot,
                    type: 'list-report',
                    version: app.manifest['sap.app']?.dataSources?.mainService?.settings?.odataVersion ?? '4.0'
                };
            }) ?? []
    };
}
