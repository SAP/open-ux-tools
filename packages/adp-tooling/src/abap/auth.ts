import { isAxiosError } from '@sap-ux/axios-extension';
import { type ToolsLogger } from '@sap-ux/logger';
import { getConfiguredProvider } from './provider.js';

/**
 * Checks whether authentication is required for the given ABAP system.
 *
 * Attempts to fetch a CSRF token from the system's Layered Repository. If the request
 * succeeds, no authentication is required. A 401 response indicates that authentication
 * is required. Any other error is re-thrown.
 *
 * @param {string} system - The ABAP system to check (e.g. system name or URL).
 * @param {ToolsLogger} logger - Logger used when configuring the ABAP provider.
 * @returns {Promise<boolean>} `true` if authentication is required, `false` otherwise.
 * @throws {Error} Re-throws any error that is not a 401 Unauthorized response.
 */
export async function isAuthRequired(system: string, logger: ToolsLogger): Promise<boolean> {
    const abapProvider = await getConfiguredProvider({ system }, logger);

    try {
        await abapProvider.getLayeredRepository().getCsrfToken();
        return false;
    } catch (error) {
        if (isAxiosError(error) && error.response?.status === 401) {
            return true;
        }
        throw error;
    }
}
