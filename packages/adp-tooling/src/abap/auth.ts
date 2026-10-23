import { isAxiosError } from '@sap-ux/axios-extension';
import { isAppStudio } from '@sap-ux/btp-utils';
import { type ToolsLogger } from '@sap-ux/logger';
import { t } from '../i18n.js';
import { SystemLookup } from '../source/systems.js';
import { SystemNotFoundError } from './config.js';
import { getConfiguredProvider } from './provider.js';

/**
 * Checks whether authentication is required for the given ABAP system.
 *
 * Attempts to fetch a CSRF token from the system's Layered Repository. If the request
 * succeeds, no authentication is required. A 401 response indicates that authentication
 * is required. If the system is not found in the store, authentication is assumed required
 * so sub-generators can prompt for credentials.
 *
 * When running in BAS and the destination already has Basic auth credentials configured,
 * a 401 means those credentials are invalid — an error is thrown instead of returning `true`
 * so callers can surface a distinct error message.
 * Any other error is re-thrown.
 *
 * @param {string} system - The ABAP system to check (e.g. system name or URL).
 * @param {ToolsLogger} logger - Logger used when configuring the ABAP provider.
 * @returns {Promise<boolean>} `true` if authentication is required, `false` otherwise.
 * @throws {Error} Re-throws any error that is not a 401 Unauthorized response or a missing system.
 * If in BAS and the destination has Basic auth credentials that were rejected.
 */
export async function isAuthRequired(system: string, logger: ToolsLogger): Promise<boolean> {
    try {
        const abapProvider = await getConfiguredProvider({ system }, logger);
        await abapProvider.getLayeredRepository().getCsrfToken();
        return false;
    } catch (error) {
        if (isAxiosError(error) && error.response?.status === 401) {
            await throwIfInvalidDestinationCredentials(error.message, system, logger);
            return true;
        }

        if (error instanceof SystemNotFoundError) {
            return true;
        }

        throw error;
    }
}

/**
 * Throws error when the 401 was caused by bad stored credentials rather than a missing
 * login. Only applies in BAS where destinations can carry Basic auth credentials —
 * on-prem VSCode flows don't store credentials in the destination.
 *
 * @param {string} errorMessage - The 401 Axios error message from the CSRF token request.
 * @param {string} system - The ABAP system name used to look up the destination config.
 * @param {ToolsLogger} logger - Logger passed through to {@link SystemLookup}.
 */
async function throwIfInvalidDestinationCredentials(
    errorMessage: string,
    system: string,
    logger: ToolsLogger
): Promise<void> {
    if (!isAppStudio() || !(await new SystemLookup(logger).isBasicAuthConfigured(system))) {
        return;
    }
    throw new Error(`${errorMessage}. ${t('error.checkDestinationAuthConfig')}`);
}
