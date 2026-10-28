import { downloadAppResources } from '../utils/index.js';
import type { DownloadAppResourcesInput, DownloadAppResourcesOutput } from '../types/index.js';

/**
 * Downloads the base app resources of the adaptation project
 * The tools automatically identitfy the correct platform for the adaptation project
 * Available platforms include Cloud Foundry (CF) and ABAP.
 *
 * @param params Input parameters including `appPath` and the optional `saveLocal` flag.
 * @returns Files of the Base App of the Adaptation Project
 */
export async function downloadBaseApp(params: DownloadAppResourcesInput): Promise<DownloadAppResourcesOutput> {
    const { appPath } = params;
    try {
        await downloadAppResources(appPath);
        return {
            status: 'success',
            message: 'Base app resources downloaded successfully',
            appPath
        };
    } catch (error) {
        return {
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
            appPath
        };
    }
}
