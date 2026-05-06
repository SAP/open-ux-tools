import { runAsWorker } from 'synckit';
import { getPathMappings } from '@sap-ux/project-access';

/**
 * Get path mappings synchronously
 *
 * @param projectRoot - root of the project
 * @param _memFs - will be ignored (exists just for signature compatibility with async version)
 * @param _fileName - will be ignored (exists just for signature compatibility with async version)
 * @returns - path mappings
 */
runAsWorker(async (projectRoot: string, _memFs?: unknown, _fileName?: string) => {
    try {
        return await getPathMappings(projectRoot);
    } catch {
        // Return an empty object so the main thread applies its defaults
        return {};
    }
});
