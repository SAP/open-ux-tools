import prompts from 'prompts';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import { ErrorHandler } from '@sap-ux/inquirer-common';
import { getLogger } from '../../tracing/index.js';
import { t } from '../../i18n.js';

/**
 * Checks connection to a backend system.
 * Note: For re-entrance ticket and OAuth2 authentication, connection checks are skipped
 * as authentication happens in browser/external flow.
 *
 * @param config - System configuration to test
 * @param config.url - System URL
 * @param config.client - SAP client (optional)
 * @param config.systemType - System type (OnPrem, AbapCloud, etc.)
 * @param config.authenticationType - Authentication type (basic, reentranceTicket, oauth2)
 * @param config.username - Username for basic auth (optional)
 * @param config.password - Password for basic auth (optional)
 * @returns Connection check result with success status and optional error message
 */
export async function checkSystemConnection(config: {
    url: string;
    client?: string;
    systemType: string;
    authenticationType: string;
    username?: string;
    password?: string;
}): Promise<{ success: boolean; error?: string }> {
    // Basic URL validation
    try {
        const _url = new URL(config.url);
    } catch {
        return { success: false, error: t('systemConnection.invalidUrl', { url: config.url }) };
    }

    // Attempt actual connection check
    try {
        const logger = getLogger();

        // Build target configuration for system-access
        const target = {
            url: config.url,
            client: config.client,
            authenticationType: config.authenticationType as any
        };

        // Build request options with auth if provided
        // For basic auth with credentials, include them
        // For reentranceTicket/oauth2, omit auth (will get 401 but proves reachability)
        const requestOptions =
            config.authenticationType === 'basic' && config.username && config.password
                ? {
                      auth: {
                          username: config.username,
                          password: config.password
                      }
                  }
                : undefined;

        // Create service provider using system-access utilities
        // prompt=false because we're in non-interactive connection check mode
        const service = await createAbapServiceProvider(target, requestOptions, false, logger);

        // Attempt a lightweight HTTP request to verify connectivity
        // Use root endpoint with short timeout - 401 or 200 means system is reachable
        await service.get('/', { timeout: 5000 });

        return { success: true };
    } catch (error: any) {
        // 401 means system is reachable but requires auth - treat as success
        if (error.response?.status === 401) {
            return { success: true };
        }

        // Use ErrorHandler for comprehensive error analysis
        const errorHandler = new ErrorHandler(getLogger(), false);
        const errorMsg = errorHandler.logErrorMsgs(error, undefined, false);

        // For other errors, provide detailed message
        return {
            success: false,
            error: errorMsg || t('systemConnection.unknownError')
        };
    }
}

/**
 * Checks connection to a backend system, or prompts user whether to save anyway if check fails.
 * If skipConnectionValidation is true, always returns true without checking.
 *
 * @param config - System configuration to test
 * @param config.url - System URL
 * @param config.client - SAP client (optional)
 * @param config.systemType - System type (OnPrem, AbapCloud, etc.)
 * @param config.authenticationType - Authentication type (basic, reentranceTicket, oauth2)
 * @param config.username - Username for basic auth (optional)
 * @param config.password - Password for basic auth (optional)
 * @param skipConnectionValidation - If true, skip the connection check
 * @returns True if connection succeeded or user chose to save anyway, false if user chose not to save
 */
export async function checkConnectionOrPrompt(
    config: {
        url: string;
        client?: string;
        systemType: string;
        authenticationType: string;
        username?: string;
        password?: string;
    },
    skipConnectionValidation: boolean
): Promise<boolean> {
    const logger = getLogger();

    if (skipConnectionValidation) {
        logger.info(t('systemConnection.skippingCheck'));
        return true;
    }

    logger.info(t('systemConnection.verifying'));
    const result = await checkSystemConnection(config);

    if (result.success) {
        logger.info(t('systemConnection.connectionSuccessful'));
        return true;
    }

    logger.warn(t('systemConnection.connectionFailed', { error: result.error ?? t('systemConnection.unknownError') }));

    const answer = await prompts({
        type: 'confirm',
        name: 'saveAnyway',
        message: t('systemConnection.saveAnywayPrompt'),
        initial: false
    });

    return answer.saveAnyway === true;
}
