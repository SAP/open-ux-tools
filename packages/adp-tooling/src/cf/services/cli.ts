import CFLocal = require('@sap/cf-tools/out/src/cf-local');
import CFToolsCli = require('@sap/cf-tools/out/src/cli');
import { eFilters } from '@sap/cf-tools/out/src/types';

import type { ToolsLogger } from '@sap-ux/logger';

import { t } from '../../i18n';
import type { CfCredentials } from '../../types';

const ENV = { env: { 'CF_COLOR': 'false' } };

/**
 * Checks if Cloud Foundry is installed.
 *
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<boolean>} True if CF is installed, false otherwise.
 */
export async function isCfInstalled(logger: ToolsLogger): Promise<boolean> {
    try {
        const response = await CFToolsCli.Cli.execute(['version'], ENV);
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
 * @returns {Promise<CfCredentials[]>} The service instance credentials.
 */
export async function getServiceKeys(serviceInstanceGuid: string): Promise<CfCredentials[]> {
    try {
        return await CFLocal.cfGetInstanceCredentials({
            filters: [
                {
                    value: serviceInstanceGuid,
                    // key: eFilters.service_instance_guid
                    key: eFilters.service_instance_guid
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
        const cliResult = await CFToolsCli.Cli.execute(
            ['create-service-key', serviceInstanceName, serviceKeyName],
            ENV
        );
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
        const response = await CFToolsCli.Cli.execute(['curl', url], ENV);
        if (response.exitCode === 0) {
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
