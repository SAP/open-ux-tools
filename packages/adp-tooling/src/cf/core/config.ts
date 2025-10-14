import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

import type { ToolsLogger } from '@sap-ux/logger';

import type { CfConfig, Config } from '../../types';

/**
 * Get the home directory.
 *
 * @returns {string} The home directory.
 */
function getHomedir(): string {
    let homedir = os.homedir();
    const homeDrive = process.env?.['HOMEDRIVE'];
    const homePath = process.env?.['HOMEPATH'];
    if (process.platform === 'win32' && typeof homeDrive === 'string' && typeof homePath === 'string') {
        homedir = path.join(homeDrive, homePath);
    }

    return homedir;
}

/**
 * Load the CF configuration.
 *
 * @param {ToolsLogger} logger - The logger.
 * @returns {CfConfig} The CF configuration.
 */
export function loadCfConfig(logger: ToolsLogger): CfConfig {
    let cfHome = process.env['CF_HOME'];
    if (!cfHome) {
        cfHome = path.join(getHomedir(), '.cf');
    }

    const configFileLocation = path.join(cfHome, 'config.json');

    let config = {} as Config;
    try {
        const configAsString = fs.readFileSync(configFileLocation, 'utf-8');
        config = JSON.parse(configAsString) as Config;
    } catch (e) {
        logger?.error('Cannot receive token from config.json');
    }

    const result = {} as CfConfig;
    if (config) {
        if (config.Target) {
            const apiCfIndex = config.Target.indexOf('api.cf.');
            result.url = config.Target.substring(apiCfIndex + 'api.cf.'.length);
        }

        if (config.AccessToken) {
            result.token = config.AccessToken.substring('bearer '.length);
        }

        if (config.OrganizationFields) {
            result.org = {
                Name: config.OrganizationFields.Name,
                GUID: config.OrganizationFields.GUID
            };
        }

        if (config.SpaceFields) {
            result.space = {
                Name: config.SpaceFields.Name,
                GUID: config.SpaceFields.GUID
            };
        }
    }

    return result;
}
