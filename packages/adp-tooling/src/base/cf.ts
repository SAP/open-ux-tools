import { Cli } from '@sap/cf-tools';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const CF_LOGIN_COMMAND_NAME = 'cf.login';
const VERSION_ARG = 'version';
const CF_ENV = { env: { 'CF_COLOR': 'false' } };

/**
 * Check if the project is a CF project.
 *
 * @param {string} basePath - The path to the adaptation project.
 * @returns {boolean} true if the project is a CF project, false otherwise
 */
export function isCFEnvironment(basePath: string): boolean {
    const configJsonPath = join(basePath, '.adp', 'config.json');
    if (existsSync(configJsonPath)) {
        const config = JSON.parse(readFileSync(configJsonPath, 'utf-8'));
        if (config.environment === 'CF') {
            return true;
        }
    }
    return false;
}

/**
 * Checks whether the {@link CF_LOGIN_COMMAND_NAME} command is defined in the VS Code env.
 *
 * @param vscode - The instance to the VS Code env.
 * @returns {Promise<boolean>} Resolves with true if external login is available.
 */
export async function isCFExternalLoginEnabled(vscode: any): Promise<boolean> {
    const commands = await vscode?.commands?.getCommands();
    return commands?.includes(CF_LOGIN_COMMAND_NAME);
}

/**
 * Checks through the CF cli whether the Cloud Foundry is installed.
 *
 * @returns {Promise<boolean>} Resolves with true if the Cloud Foundry is installed.
 */
export async function isCFInstalled(): Promise<boolean> {
    try {
        const versionResponse = await Cli.execute([VERSION_ARG], CF_ENV);
        return versionResponse.exitCode === 0;
    } catch (error) {
        return false;
    }
}
