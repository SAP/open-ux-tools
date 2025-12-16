import { runAsWorker } from 'synckit';
import { findFioriArtifacts, findProjectRoot, getProjectType } from '@sap-ux/project-access';
import type { WorkerResult } from './types';

/**
 * Get Fiori project artifacts for the given file path.
 *
 * @param filePath - file path to find the project artifacts for
 * @returns Found Fiori artifacts
 */
async function getProjectArtifacts(filePath: string): Promise<WorkerResult> {
    try {
        const projectRoot = await findProjectRoot(filePath, false);
        const projectType = await getProjectType(projectRoot);
        const artifacts = await findFioriArtifacts({
            wsFolders: [projectRoot],
            artifacts: ['applications', 'adaptations']
        });
        return { artifacts, projectType };
    } catch (error) {
        // debugLog('Worker failed with error:', error.message);
        return { artifacts: {}, projectType: 'EDMXBackend' };
    }
}

runAsWorker(getProjectArtifacts);
