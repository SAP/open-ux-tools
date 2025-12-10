import { runAsWorker } from 'synckit';
import type { FoundFioriArtifacts } from '@sap-ux/project-access';
import { findFioriArtifacts, findProjectRoot } from '@sap-ux/project-access';

/**
 * Get Fiori project artifacts for the given file path.
 *
 * @param filePath - file path to find the project artifacts for
 * @returns Found Fiori artifacts
 */
async function getProjectArtifacts(filePath: string): Promise<FoundFioriArtifacts> {
    try {
        const projectRoot = await findProjectRoot(filePath, false);

        const artifacts = await findFioriArtifacts({
            wsFolders: [projectRoot],
            artifacts: ['applications', 'adaptations']
        });
        return artifacts;
    } catch (error) {
        // debugLog('Worker failed with error:', error.message);
        return {};
    }
}

runAsWorker(getProjectArtifacts);
