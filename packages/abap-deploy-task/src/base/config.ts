import { config } from 'dotenv';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { AbapDeployConfig, AbapTarget, UrlAbapTarget } from '../types';

/**
 * Check if it is a url or destination target.
 *
 * @param target target configuration
 * @returns true is it is a UrlAbapTarget
 */
export function isUrlTarget(target: AbapTarget): target is UrlAbapTarget {
    return (<UrlAbapTarget>target).url !== undefined;
}

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
function throwConfigMissingError(property: string): void {
    throw new Error(`Invalid deployment configuration. Property ${property} is missing.`);
}

/**
 *
 * @param config
 * @returns
 */
export function validateConfig(config: AbapDeployConfig | undefined): AbapDeployConfig {
    if (!config) {
        throw new Error('The deployment configuration is missing.');
    }

    if (config.target) {
        if (isUrlTarget(config.target)) {
            if (config.target.client) {
                config.target.client = (config.target.client + '').padStart(3, '0');
            }
        } else if (isAppStudio() && !config.target.destination) {
            throwConfigMissingError('target-destination');
        } else {
            throwConfigMissingError('target-url');
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
