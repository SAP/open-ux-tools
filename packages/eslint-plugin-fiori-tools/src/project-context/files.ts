import { runAsWorker } from 'synckit';
import type { FoundFioriArtifacts } from '@sap-ux/project-access';
import { findFioriArtifacts, findProjectRoot } from '@sap-ux/project-access';

//-----------------------------------------------------------------------------
// Debug Utility
//-----------------------------------------------------------------------------

// Create worker-specific debug logger

/**
 *
 * @param filePath
 */
async function getProjectArtifacts(filePath: string): Promise<FoundFioriArtifacts> {
    const startTime = performance.now();
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
