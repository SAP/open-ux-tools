/**
 * Helper functions for extracting backend configuration and app title from i18n
 */
import { join } from 'node:path';
import { fileExists } from '../utils/index.js';
import { getPropertiesI18nBundle } from '@sap-ux/i18n';

/**
 * Result of backend and i18n configuration extraction
 */
export interface BackendAndI18nConfigResult {
    destination: string;
    scp: boolean | undefined;
    hostname: string;
    sapClient: string;
    appTitle: string;
}

/**
 * Extract backend configuration and app title from i18n properties
 * Combines backend settings from UI5 backend config with i18n app title extraction
 *
 * @param projectRoot - Root path of the project
 * @param webappPath - Webapp path within the project
 * @param getFirstBackend - Function to get the first backend configuration
 * @param existingDestination - Existing destination value
 * @param existingScp - Existing scp value
 * @param existingHostname - Existing hostname value
 * @param existingSapClient - Existing sapClient value
 * @returns Backend and i18n configuration result
 */
export async function extractBackendAndI18nConfig(
    projectRoot: string,
    webappPath: string,
    getFirstBackend: (projectRoot: string) => Promise<
        | {
              destination?: string;
              scp?: boolean;
              url?: string;
              sapClient?: string;
          }
        | undefined
    >,
    existingDestination: string,
    existingScp: boolean | undefined,
    existingHostname: string,
    existingSapClient: string
): Promise<BackendAndI18nConfigResult> {
    // Get backend configuration
    const ui5Backend = await getFirstBackend(projectRoot);
    const destination = ui5Backend?.destination ?? existingDestination;
    const scp = ui5Backend?.scp ?? existingScp;
    const hostname = ui5Backend?.url ?? existingHostname;
    const sapClient = ui5Backend?.sapClient ?? existingSapClient;

    // Extract app title from i18n
    let appTitle = '';
    const i18Path = join(projectRoot, webappPath, 'i18n/i18n.properties');
    if (await fileExists(i18Path)) {
        try {
            const i18nProperties = await getPropertiesI18nBundle(i18Path);
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const entry = i18nProperties['appTitle'] ?? i18nProperties['app_title'];
            appTitle = entry?.[0]?.value.value ?? '';
        } catch {
            // Expected: i18n bundle parsing may fail for malformed properties files in legacy projects.
            // Safe to continue with empty app title - it's optional metadata.
            appTitle = '';
        }
    }

    return {
        destination,
        scp,
        hostname,
        sapClient,
        appTitle
    };
}
