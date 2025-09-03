import CFLocal = require('@sap/cf-tools/out/src/cf-local');
import CFToolsCli = require('@sap/cf-tools/out/src/cli');
import { eFilters } from '@sap/cf-tools/out/src/types';

import type { CfCredentials } from '../../types';

const ENV = { env: { 'CF_COLOR': 'false' } };
const CREATE_SERVICE_KEY = 'create-service-key';

/**
 * Gets the authentication token.
 *
 * @returns {Promise<string>} The authentication token.
 */
export async function getAuthToken(): Promise<string> {
    const response = await CFToolsCli.Cli.execute(['oauth-token'], ENV);
    if (response.exitCode === 0) {
        return response.stdout;
    }
    return response.stderr;
}

/**
 * Checks if Cloud Foundry is installed.
 */
export async function checkForCf(): Promise<void> {
    try {
        const response = await CFToolsCli.Cli.execute(['version'], ENV);
        if (response.exitCode !== 0) {
            throw new Error(response.stderr);
        }
    } catch (error) {
        throw new Error('Cloud Foundry is not installed in your space.');
    }
}

/**
 * Logs out from Cloud Foundry.
 */
export async function cFLogout(): Promise<void> {
    await CFToolsCli.Cli.execute(['logout']);
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
        throw new Error(
            `Failed to get service instance credentials from CFLocal for guid ${serviceInstanceGuid}. Reason: ${e.message}`
        );
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
        const cliResult = await CFToolsCli.Cli.execute([CREATE_SERVICE_KEY, serviceInstanceName, serviceKeyName], ENV);
        if (cliResult.exitCode !== 0) {
            throw new Error(cliResult.stderr);
        }
    } catch (e) {
        throw new Error(`Failed to create service key for instance name ${serviceInstanceName}. Reason: ${e.message}`);
    }
}
