import { config } from 'dotenv';
import { isAppStudio } from '@sap-ux/btp-utils';
import { t } from '../messages';
import type { AbapDeployConfig } from '../types';

/**
 *
 * @param obj
 */
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
 * Helper function for throwing a missing property error.
 *
 * @param property Invalid missing property
 */
function throwConfigMissingError(property: string): void {
    throw new Error(t('INVALID_DEPLOYMENT_CONFIGURATION_ERROR', { property }));
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
