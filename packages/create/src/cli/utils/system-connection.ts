import prompts from 'prompts';
import { createForAbap } from '@sap-ux/axios-extension';
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
        const hasCredentials = config.authenticationType === 'basic' && config.username && config.password;

        const service = createForAbap({
            baseURL: config.url,
            auth: hasCredentials
                ? {
                      username: config.username!,
                      password: config.password!
                  }
                : undefined,
            params: config.client ? { 'sap-client': config.client } : undefined
        });

        // Attempt lightweight request with 5-second timeout
        // Use /sap/bc/ping for systems that support it, or root path as fallback
        try {
            await service.get('/sap/bc/ping', { timeout: 5000 });
            return { success: true };
        } catch (error: any) {
            // If /sap/bc/ping fails with 404, try root path to check if system is reachable
            if (error.response?.status === 404) {
                await service.get('/', { timeout: 5000 });
                return { success: true };
            }
            throw error;
        }
    } catch (error: any) {
        // 401 means system is reachable but auth failed (acceptable for non-basic auth types)
        if (error.response?.status === 401) {
            // For basic auth with credentials, 401 is a failure
            if (config.authenticationType === 'basic' && config.username && config.password) {
                return { success: false, error: 'Authentication failed (HTTP 401 Unauthorized)' };
            }
            // For other auth types, 401 means system is reachable (success)
            return { success: true };
        }

        // Network errors indicate unreachable system
        if (error.code === 'ECONNREFUSED') {
            return { success: false, error: 'Connection refused - system may be unreachable' };
        }
        if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
            return { success: false, error: 'Connection timeout after 5000ms' };
        }
        if (error.code === 'ENOTFOUND') {
            return { success: false, error: 'DNS lookup failed - hostname not found' };
        }
        if (error.code === 'ECONNRESET') {
            return { success: false, error: 'Connection reset by server' };
        }

        return { success: false, error: error.message || 'Connection failed' };
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
