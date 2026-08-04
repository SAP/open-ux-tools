import prompts from 'prompts';
import { createForAbap } from '@sap-ux/axios-extension';
import { getLogger } from '../../tracing/index.js';

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
        return { success: false, error: `Invalid URL: ${config.url}` };
    }

    // For basic auth with credentials, attempt actual connection
    if (config.authenticationType === 'basic' && config.username && config.password) {
        try {
            const service = await createForAbap({
                baseURL: config.url,
                auth: {
                    username: config.username,
                    password: config.password
                },
                params: config.client ? { 'sap-client': config.client } : undefined
            });

            // Attempt lightweight request with 5-second timeout
            await service.get('/sap/bc/ping', { timeout: 5000 });
            return { success: true };
        } catch (error: any) {
            if (error.response?.status === 401) {
                return { success: false, error: 'Authentication failed (HTTP 401 Unauthorized)' };
            }
            if (error.code === 'ECONNREFUSED') {
                return { success: false, error: 'Connection refused - system may be unreachable' };
            }
            if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
                return { success: false, error: 'Connection timeout after 5000ms' };
            }
            return { success: false, error: error.message || 'Connection failed' };
        }
    }

    // For other auth types or missing credentials, only validate URL format
    // Re-entrance ticket and OAuth require browser flow, can't be tested here
    return { success: true };
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
        logger.info('Skipping connection check (--skip-check flag provided)');
        return true;
    }

    logger.info('Verifying connection to backend system...');
    const result = await checkSystemConnection(config);

    if (result.success) {
        logger.info('✓ Connection successful');
        return true;
    }

    logger.warn(`Connection check failed: ${result.error || 'Unknown error'}`);

    const answer = await prompts({
        type: 'confirm',
        name: 'saveAnyway',
        message: 'Connection check failed. Save system anyway?',
        initial: false
    });

    return answer.saveAnyway === true;
}
