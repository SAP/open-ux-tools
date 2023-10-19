import { isAppStudio } from '@sap-ux/btp-utils';
import type { AbapTarget, AbapDeployConfig } from '../types';
import { isUrlTarget } from '@sap-ux/system-access';
import type { BspConfig } from '@sap-ux/axios-extension';

/**
 * Clones the given config and removes secrets so that it can be printed to a log file.
 *
 * @param config - config object
 * @returns config object that can be logged
 */
export function getConfigForLogging(
    config: AbapDeployConfig
): AbapDeployConfig | (Omit<AbapDeployConfig, 'credentials'> & { credentials: 'hidden' }) {
    if (config.credentials?.password) {
        return {
            ...config,
            credentials: 'hidden'
        };
    } else {
        return config;
    }
}

/**
 * Replace environment variable references of pattern `env:VAR_NAME` with the value of the corresponding environment variable.
 *
 * @param obj - any object structure
 */
export function replaceEnvVariables(obj: object): void {
    for (const key in obj) {
        const value = (obj as Record<string, unknown>)[key];
        if (typeof value === 'object') {
            replaceEnvVariables(value as object);
        } else if (typeof value === 'string' && value.startsWith('env:')) {
            const varName = value.split('env:')[1];
            (obj as Record<string, unknown>)[key] = process.env[varName];
        }
    }
}

/**
 * Helper function for throwing a missing property error.
 *
 * @param property Invalid missing property
 */
export function throwConfigMissingError(property: string): void {
    throw new Error(`Invalid deployment configuration. Property ${property} is missing.`);
}

/**
 * Validate the given target config. If anything mandatory is missing throw an error.
 *
 * @param target - target configuration to be validated
 * @returns reference to the given target config
 */
function validateTarget(target: AbapTarget): AbapTarget {
    if (isUrlTarget(target)) {
        if (target.client) {
            target.client = (target.client + '').padStart(3, '0');
        }
    } else if (!target.destination) {
        throwConfigMissingError(isAppStudio() ? 'target-destination' : 'target-url');
    }
    return target;
}

/**
 * Type checking the config object.
 *
 * @param config - config to be checked
 * @returns true if it is of type BSP config
 */
export function isBspConfig(config: Partial<BspConfig>): config is BspConfig {
    return (config as BspConfig).name !== undefined;
}

/**
 * Validate the given config. If anything mandatory is missing throw an error.
 *
 * @param config - the config to be validated
 * @returns reference to the given config
 */
export function validateConfig(config: AbapDeployConfig | undefined): AbapDeployConfig {
    if (!config) {
        throw new Error('The deployment configuration is missing.');
    }

    if (config.target) {
        config.target = validateTarget(config.target);
    } else {
        throwConfigMissingError('target');
    }
    if (!config.app) {
        throwConfigMissingError('app');
    }

    return config;
}
