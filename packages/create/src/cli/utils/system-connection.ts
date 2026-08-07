import prompts from 'prompts';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import type { AxiosError } from '@sap-ux/axios-extension';
import { getLogger } from '../../tracing/index.js';
import { text } from '../../i18n.js';

/**
 * Checks connection to a backend system.
 *
 * @param config - System configuration to test
 * @param config.url
 * @param config.client
 * @param config.systemType
 * @param config.authenticationType
 * @param config.username
 * @param config.password
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
        new URL(config.url);
    } catch {
        return { success: false, error: text('systemConnection.invalidUrl', { url: config.url }) };
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

        // Attempt lightweight request with 5-second timeout
        // Use /sap/bc/ping for systems that support it, or root path as fallback
        try {
            await service.get('/sap/bc/ping', { timeout: 5000 });
            return { success: true };
        } catch (error: any) {
            // If /sap/bc/ping fails with 404, try root path
            // Accept 401 from root as success (system is reachable, auth will happen later)
            if (error.response?.status === 404) {
                try {
                    await service.get('/', { timeout: 5000 });
                    return { success: true };
                } catch (rootError: any) {
                    if (rootError.response?.status === 401) {
                        // 401 on root means system is reachable
                        return { success: true };
                    }
                    throw rootError;
                }
            }
            throw error;
        }
    } catch (error: any) {
        // 401 means system is reachable but auth failed
        if (error.response?.status === 401) {
            // For basic auth (regardless of whether credentials were provided), 401 is a failure
            if (config.authenticationType === 'basic') {
                return { success: false, error: text('systemConnection.errors.authFailed') };
            }
            // For other auth types (reentranceTicket, oauth2), 401 means system is reachable (success)
            return { success: true };
        }

        // Network errors indicate unreachable system
        if (error.code === 'ECONNREFUSED') {
            return { success: false, error: text('systemConnection.errors.connectionRefused') };
        }
        if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
            return { success: false, error: text('systemConnection.errors.connectionTimeout', { timeout: 5000 }) };
        }
        if (error.code === 'ENOTFOUND') {
            return { success: false, error: text('systemConnection.errors.hostNotFound') };
        }
        if (error.code === 'ECONNRESET') {
            return { success: false, error: text('systemConnection.errors.connectionReset') };
        }

        return { success: false, error: error.message || text('systemConnection.unknownError') };
    }
}

/**
 * Checks connection to a backend system, or prompts user whether to save anyway if check fails.
 * If skipCheck is true, always returns true without checking.
 *
 * @param config - System configuration to test
 * @param config.url
 * @param config.client
 * @param config.systemType
 * @param config.authenticationType
 * @param config.username
 * @param config.password
 * @param skipCheck - If true, skip the connection check
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
    skipCheck: boolean
): Promise<boolean> {
    const logger = getLogger();

    if (skipCheck) {
        logger.info(text('systemConnection.skippingCheck'));
        return true;
    }

    logger.info(text('systemConnection.verifying'));
    const result = await checkSystemConnection(config);

    if (result.success) {
        logger.info(text('systemConnection.connectionSuccessful'));
        return true;
    }

    logger.warn(
        text('systemConnection.connectionFailed', { error: result.error || text('systemConnection.unknownError') })
    );

    const answer = await prompts({
        type: 'confirm',
        name: 'saveAnyway',
        message: text('systemConnection.saveAnywayPrompt'),
        initial: false
    });

    return answer.saveAnyway === true;
}
