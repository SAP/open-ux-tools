import CFLocal = require('@sap/cf-tools/out/src/cf-local');

import type { ToolsLogger } from '@sap-ux/logger';

import type { CfConfig, Organization } from '../../types';

/**
 * Check if the external login is enabled.
 *
 * @param {any} vscode - The vscode instance.
 * @returns {Promise<boolean>} Whether the external login is enabled.
 */
export async function isExternalLoginEnabled(vscode: any): Promise<boolean> {
    const commands = await vscode.commands.getCommands();
    return commands?.includes('cf.login');
}

/**
 * Check if the user is logged in Cloud Foundry.
 *
 * @param {CfConfig} cfConfig - The CF config.
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<boolean>} Whether the user is logged in.
 */
export async function isLoggedInCf(cfConfig: CfConfig, logger: ToolsLogger): Promise<boolean> {
    if (!cfConfig) {
        logger?.error('CF config is not provided');
        return false;
    }

    try {
        const orgs = (await CFLocal.cfGetAvailableOrgs()) as Organization[];
        logger?.log(`Available organizations: ${JSON.stringify(orgs)}`);
        return true;
    } catch (e) {
        logger?.error(`Error occurred while trying to check if it is logged in: ${e?.message}`);
    }

    return false;
}
