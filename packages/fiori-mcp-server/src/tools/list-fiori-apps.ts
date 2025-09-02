import { findFioriArtifacts, getProjectType } from '@sap-ux/project-access';
import type { AllAppResults, ProjectType } from '@sap-ux/project-access';
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
    const applications = newFoundFioriArtifacts.applications ?? [];

    return {
        applications:
            (await Promise.all(
                applications.map(async (app: AllAppResults): Promise<FioriApp> => {
                    const projectType: ProjectType = await getProjectType(app.projectRoot);
                    return {
                        name: app.manifest['sap.app']?.id ?? basename(app.appRoot),
                        appPath: app.appRoot,
                        projectPath: app.projectRoot,
                        projectType,
                        odataVersion: app.manifest['sap.app']?.dataSources?.mainService?.settings?.odataVersion ?? '4.0'
                    };
                })
            )) ?? []
    };
}
