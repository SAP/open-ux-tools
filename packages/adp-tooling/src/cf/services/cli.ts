import { Cli, cfGetInstanceCredentials, eFilters } from '@sap/cf-tools';

import type { ToolsLogger } from '@sap-ux/logger';

import { t } from '../../i18n';
import type { ServiceKeys } from '../../types';

const ENV = { env: { 'CF_COLOR': 'false' } };

/**
 * Checks if Cloud Foundry is installed.
 *
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<boolean>} True if CF is installed, false otherwise.
 */
export async function isCfInstalled(logger: ToolsLogger): Promise<boolean> {
    try {
        const response = await Cli.execute(['version'], ENV);
        if (response.exitCode !== 0) {
            throw new Error(response.stderr);
        }
        return true;
    } catch (e) {
        logger.error(t('error.cfNotInstalled', { error: e.message }));
        return false;
    }
}

/**
 * Gets the service instance credentials.
 *
 * @param {string} serviceInstanceGuid - The service instance GUID.
 * @returns {Promise<ServiceKeys[]>} The service instance credentials.
 */
export async function getServiceKeys(serviceInstanceGuid: string): Promise<ServiceKeys[]> {
    try {
        return await cfGetInstanceCredentials({
            filters: [
                {
                    value: serviceInstanceGuid,
                    key: eFilters.service_instance_guids
                }
            ]
        });
    } catch (e) {
        throw new Error(t('error.cfGetInstanceCredentialsFailed', { serviceInstanceGuid, error: e.message }));
    }
}

/**
 * Creates a service key.
 *
 * @param {string} serviceInstanceName - The service instance name.
 * @param {string} serviceKeyName - The service key name.
 */
export async function createServiceKey(serviceInstanceName: string, serviceKeyName: string): Promise<void> {
    try {
        const cliResult = await Cli.execute(['create-service-key', serviceInstanceName, serviceKeyName], ENV);
        if (cliResult.exitCode !== 0) {
            throw new Error(cliResult.stderr);
        }
    } catch (e) {
        throw new Error(t('error.createServiceKeyFailed', { serviceInstanceName, error: e.message }));
    }
}

/**
 * Request CF API.
 *
 * @param {string} url - The URL.
 * @returns {Promise<T>} The response.
 */
export async function requestCfApi<T = unknown>(url: string): Promise<T> {
    try {
        const response = await Cli.execute(['curl', url], ENV);
        if (response.exitCode === 0) {
            // Check for empty response which typically indicates authentication issues
            if (!response.stdout || response.stdout.trim() === '') {
                throw new Error(
                    'Empty response from CF API. This typically indicates an authentication issue. ' +
                    'Please verify your CF login status with \'cf target\' and re-authenticate if needed with \'cf login\'.'
                );
            }
            try {
                return JSON.parse(response.stdout);
            } catch (e) {
                throw new Error(t('error.failedToParseCFAPIResponse', { error: e.message }));
            }
        }
        throw new Error(response.stderr);
    } catch (e) {
        throw new Error(t('error.failedToRequestCFAPI', { error: e.message }));
    }
}
