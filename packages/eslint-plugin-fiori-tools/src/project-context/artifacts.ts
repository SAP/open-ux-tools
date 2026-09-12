import { runAsWorker } from 'synckit';
import {
    findFioriArtifacts,
    findProjectRoot,
    findRootsForPath,
    getCapEnvironment,
    getCdsFiles,
    getI18nPropertiesPaths,
    getProjectType
} from '@sap-ux/project-access';
import type { WorkerResult } from './types.js';
import { capPropertiesPath, getCapI18nFiles } from '@sap-ux/i18n';

/**
 * Get Fiori project artifacts for the given file path.
 *
 * @param filePath - file path to find the project artifacts for
 * @returns Found Fiori artifacts
 */
export async function getProjectArtifacts(filePath: string): Promise<WorkerResult> {
    try {
        const projectRoot = await findProjectRoot(filePath, true); // sapuxRequired for CAP apps to locate the project root
        const roots = await findRootsForPath(filePath);
        const projectType = await getProjectType(projectRoot);
        const artifacts = await findFioriArtifacts({
            wsFolders: [projectRoot],
            artifacts: ['applications', 'adaptations']
        });
        let i18nPathsByApp: { [appRoot: string]: string[] } = {};
        const isCap = projectType === 'CAPJava' || projectType === 'CAPNodejs';
        let capI18nPaths: string[] = [];
        if (isCap) {
            const env = await getCapEnvironment(projectRoot);
            const cdsFiles = await getCdsFiles(projectRoot, true);
            // Get CAP project i18n properties file paths
            capI18nPaths = getCapI18nFiles(projectRoot, env, cdsFiles).map((path) => capPropertiesPath(path, env));
        }
        for (const app of artifacts.applications ?? []) {
            // Get application i18n properties file paths
            const appI18nPaths = await getI18nPropertiesPaths(app.manifestPath);
            const i18nPaths = [...capI18nPaths, appI18nPaths['sap.app']];
            if (!isCap) {
                for (const model of Object.values(appI18nPaths.models)) {
                    if (!i18nPaths.includes(model.path)) {
                        i18nPaths.push(model.path);
                    }
                }
            }
            i18nPathsByApp = { ...i18nPathsByApp, [app.appRoot]: i18nPaths };
        }
        return { artifacts, projectType, i18nPathsByApp, appRoot: roots?.appRoot ?? projectRoot, projectRoot };
    } catch {
        return { artifacts: {}, projectType: 'EDMXBackend', i18nPathsByApp: {}, appRoot: '', projectRoot: '' };
    }
}

runAsWorker(getProjectArtifacts);
