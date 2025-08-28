import os from 'os';
import fs from 'fs';
import path from 'path';

import type { ToolsLogger } from '@sap-ux/logger';

import type { CFConfig, Config } from '../../types';

const HOMEDRIVE = 'HOMEDRIVE';
const HOMEPATH = 'HOMEPATH';
const WIN32 = 'win32';

/**
 * Get the home directory.
 *
 * @returns {string} The home directory.
 */
function getHomedir(): string {
    let homedir = os.homedir();
    const homeDrive = process.env?.[HOMEDRIVE];
    const homePath = process.env?.[HOMEPATH];
    if (process.platform === WIN32 && typeof homeDrive === 'string' && typeof homePath === 'string') {
        homedir = path.join(homeDrive, homePath);
    }

    return homedir;
}

/**
 * Cloud Foundry Configuration Service
 */
export class CfConfigService {
    /**
     * The CF configuration.
     */
    private cfConfig: CFConfig;
    /**
     * The logger.
     */
    private logger: ToolsLogger;

    /**
     * Creates an instance of CfConfigService.
     *
     * @param {ToolsLogger} logger - The logger.
     */
    constructor(logger: ToolsLogger) {
        this.logger = logger;
    }

    /**
     * Get the current configuration.
     *
     * @returns {CFConfig} The configuration.
     */
    public getConfig(): CFConfig {
        if (!this.cfConfig) {
            this.cfConfig = this.loadConfig();
        }

        return this.cfConfig;
    }

    /**
     * Load the CF configuration.
     *
     * @returns {CFConfig} The CF configuration.
     */
    private loadConfig(): CFConfig {
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
            this.logger?.error('Cannot receive token from config.json');
        }

        const result = {} as CFConfig;
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
}
