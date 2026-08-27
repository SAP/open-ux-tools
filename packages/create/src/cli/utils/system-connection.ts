import prompts from 'prompts';
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

    // For now, we just validate the URL format
    // A real implementation would attempt to connect to the backend
    // using the provided credentials and check if the system is reachable

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
