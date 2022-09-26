import { config } from 'dotenv';
import { isAppStudio } from '@sap-ux/btp-utils';
import { getService, BackendSystem, BackendSystemKey } from '@sap-ux/store';
import { t } from '../messages';
import type { AbapDeployConfig } from '../types';

export function replaceEnvVariables(obj: object): void {
    config();
    for (const key in obj) {
        const value = (obj as Record<string, unknown>)[key];
        if (typeof value === 'object') {
            replaceEnvVariables(value as object);
        } else if (typeof value === 'string' && (value as string).indexOf('env:') === 0) {
            const varName = (value as string).split('env:')[1];
            (obj as Record<string, unknown>)[key] = process.env[varName];
        }
    }
}

/**
 * Check the secure storage if it has credentials for the given target.
 * @param config
 */
export async function updateCredentials(config: AbapDeployConfig) {
    if (!isAppStudio() && config.target.url) {
        const systemService = await getService<BackendSystem, BackendSystemKey>({ entityName: 'system' });
        let system = await systemService.read(
            new BackendSystemKey({ url: config.target.url, client: config.target.client })
        );
        if (!system && config.target.client) {
            // check if there are credentials for the default client
            system = await systemService.read(new BackendSystemKey({ url: config.target.url }));
        }
        if (system) {
            config.credentials = { ...system, ...(config.credentials ?? {}) };
        }
    }
}

/**
 * Helper function for throwing a missing property error.
 *
 * @param property Invalid missing property
 */
function throwConfigMissingError(property: string): void {
    throw new Error(t('INVALID_DEPLOYMENT_CONFIGURATION_ERROR', property));
}

/**
 *
 * @param config
 * @returns
 */
export function validateConfig(config: AbapDeployConfig | undefined): AbapDeployConfig {
    if (!config) {
        throw new Error(t('NO_CONFIG_ERROR'));
    }

    if (config.target) {
        if (!config.target.url && !isAppStudio()) {
            throwConfigMissingError('target-url');
        }
        if (config.target.client) {
            config.target.client = config.target.client + '';
            if (config.target.client.length === 1) {
                config.target.client = `00${config.target.client}`;
            } else if (config.target.client.length === 2) {
                config.target.client = `0${config.target.client}`;
            }
        }
    } else {
        throwConfigMissingError('target');
    }
    if (config.app) {
        if (!config.app.name) {
            throwConfigMissingError('app-name');
        }
    } else {
        throwConfigMissingError('app');
    }

    return config;
}
