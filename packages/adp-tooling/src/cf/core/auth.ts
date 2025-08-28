import CFLocal = require('@sap/cf-tools/out/src/cf-local');

import type { ToolsLogger } from '@sap-ux/logger';

import { getAuthToken, checkForCf } from '../services/cli';
import type { CFConfig, Organization } from '../../types';

/**
 * Check if CF is installed.
 *
 * @returns {Promise<boolean>} True if CF is installed, false otherwise.
 */
export async function isCfInstalled(): Promise<boolean> {
    let isInstalled = true;
    try {
        await checkForCf();
    } catch (error) {
        isInstalled = false;
    }

    return isInstalled;
}

/**
 * Check if the external login is enabled.
 *
 * @param {any} vscode - The vscode instance.
 * @returns {Promise<boolean>} Whether the external login is enabled.
 */
export async function isExternalLoginEnabled(vscode: any): Promise<boolean> {
    const commands = await vscode.commands.getCommands();
    return commands.includes('cf.login');
}

/**
 * Check if the user is logged in Cloud Foundry.
 *
 * @param {CFConfig} cfConfig - The CF config.
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<boolean>} Whether the user is logged in.
 */
export async function isLoggedInCf(cfConfig: CFConfig, logger: ToolsLogger): Promise<boolean> {
    let isLogged = false;
    let orgs: Organization[] = [];

    await getAuthToken();

    if (cfConfig) {
        try {
            orgs = (await CFLocal.cfGetAvailableOrgs()) as Organization[];
            logger?.log(`Available organizations: ${JSON.stringify(orgs)}`);
            if (orgs.length > 0) {
                isLogged = true;
            }
        } catch (e) {
            logger?.error(`Error occurred while trying to check if it is logged in: ${e?.message}`);
            isLogged = false;
        }
    }

    return isLogged;
}
