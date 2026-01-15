import { runAsWorker } from 'synckit';
import { getPathMappings } from '@sap-ux/project-access';

/**
 * Get path mappings synchronously
 *
 * @param projectRoot - root of the project
 * @returns - path mappings
 */
runAsWorker(async (projectRoot: string) => {
    try {
        return await getPathMappings(projectRoot);
    } catch (error) {
        // Return an empty object so the main thread applies its defaults
        return {};
    }
});