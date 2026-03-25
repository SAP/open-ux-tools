import { type CFResource, Cli, cfGetServiceKeys, eFilters } from '@sap/cf-tools';

import type { ToolsLogger } from '@sap-ux/logger';

import { t } from '../../i18n';
import type { ServiceKeys, ServiceKeySortField } from '../../types';

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
 * Gets the service instance credentials, sorted by the specified metadata field.
 *
 * @param serviceInstanceGuid - The service instance GUID.
 * @param sortBy - The metadata field to sort by, defaults to 'updated_at'.
 * @param logger - Optional logger.
 * @returns The service instance credentials sorted by the specified field (newest first).
 */
export async function getServiceKeys(
    serviceInstanceGuid: string,
    sortBy: ServiceKeySortField = 'updated_at',
    logger?: ToolsLogger
): Promise<ServiceKeys[]> {
    try {
        const resources = await cfGetServiceKeys({
            filters: [
                {
                    value: serviceInstanceGuid,
                    key: eFilters.service_instance_guids
                }
            ]
        });

        logger?.info(`Found ${resources.length} service key(s) for instance '${serviceInstanceGuid}'`);

        const sorted = [...resources].sort((a, b) => {
            const dateA = a[sortBy as keyof CFResource];
            const dateB = b[sortBy as keyof CFResource];
            if (!dateA && !dateB) {
                return 0;
            }
            if (!dateA) {
                return 1;
            }
            if (!dateB) {
                return -1;
            }
            return new Date(dateB).getTime() - new Date(dateA).getTime();
        });

        if (sorted.length > 0) {
            logger?.debug(`Service keys sorted by '${sortBy}', using key '${sorted[0].name}' as primary`);
        }

        const results = await Promise.all(
            sorted.map(async (resource) => {
                try {
                    return await requestCfApi<ServiceKeys>(`/v3/service_credential_bindings/${resource.guid}/details`);
                } catch (e) {
                    logger?.warn(`Failed to fetch credentials for service key '${resource.name}': ${e.message}`);
                    return undefined;
                }
            })
        );

        const filtered = results.filter((r): r is ServiceKeys => r !== undefined);
        logger?.debug(`Retrieved credentials for ${filtered.length} of ${sorted.length} service key(s)`);
        return filtered;
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
        const cliResult = await Cli.execute(['create-service-key', serviceInstanceName, serviceKeyName, '--wait'], ENV);
        if (cliResult.exitCode !== 0) {
            throw new Error(cliResult.stderr);
        }
    } catch (e) {
        throw new Error(t('error.createServiceKeyFailed', { serviceInstanceName, error: e.message }));
    }
}

/**
 * Updates a Cloud Foundry service instance with the given parameters.
 *
 * @param {string} serviceInstanceName - The service instance name.
 * @param {object} parameters - The configuration parameters to update.
 */
export async function updateServiceInstance(serviceInstanceName: string, parameters: object): Promise<void> {
    try {
        const cliResult = await Cli.execute(
            ['update-service', serviceInstanceName, '-c', JSON.stringify(parameters), '--wait'],
            ENV
        );
        if (cliResult.exitCode !== 0) {
            throw new Error(cliResult.stderr);
        }
    } catch (e) {
        throw new Error(t('error.failedToUpdateServiceInstance', { serviceInstanceName, error: e.message }));
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
                throw new Error(t('error.emptyCFAPIResponse'));
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
