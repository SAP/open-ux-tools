import type { SecureStore } from '../types';
import { exec } from 'child_process';
import { promisify } from 'util';
import { type Logger } from '@sap-ux/logger';
import { errorString } from '../../utils';
import { getAccountsFromSystemsFile } from '../systems-file-utils';
import { type SupportedPlatform, getPlatformCommands } from './commands';
const execAsync = promisify(exec);

type Entities<T> = {
    [key: string]: T;
};

/**
 * Helper function to check if the platform is supported.
 * @param platform - The platform of the operating system (e.g., 'darwin', 'win32', etc.).
 * @returns True if the platform is supported, otherwise false.
 */
function isValidPlatform(platform: NodeJS.Platform): platform is SupportedPlatform {
    return ['darwin', 'win32'].includes(platform);
}

/**
 * Wrapper class for storing and retrieving credentials securely using OS specific cli commands:
 * - macOS: `security` command.
 * - Windows: `cmdkey` command.
 * - Linux: `secret-tool` command.
 */
export class CredentialStoreWrapper implements SecureStore {
    private readonly log: Logger;

    constructor(log: Logger) {
        this.log = log;
    }

    /**
     * Helper function to execute PowerShell commands for storing credentials
     * on Windows using New-StoredCredential and Get-StoredCredential.
     */
    private async executePowerShellCommand(command: string): Promise<string> {
        try {
            const { stdout, stderr } = await execAsync(`powershell -Command "${command}"`);
            if (stderr) {
                throw new Error(stderr);
            }
            return stdout;
        } catch (e) {
            this.log.error(`Error executing PowerShell command: ${command}`);
            this.log.error(errorString(e));
            throw e;
        }
    }

    /**
     * Saves a credential to the secure store.
     * @param service - The service name associated with the credential.
     * @param key - The key/username for the credential.
     * @param value - The value/password to store, serialized as a string.
     * @returns True if the credential was saved successfully, otherwise false.
     */
    public async save<T>(service: string, key: string, value: T): Promise<boolean> {
        const platform = process.platform;

        if (!isValidPlatform(platform)) {
            this.log.error(`Unsupported platform for saving credentials: ${platform}`);
            return false;
        }

        try {
            const serializedValue = Buffer.from(JSON.stringify(value)).toString('base64');
            if (platform === 'win32') {
                // Use PowerShell cmdlets for Windows (New-StoredCredential)
                const uniqueKey = `${service}/${key}`;
                const command = `New-StoredCredential -Target '${uniqueKey}' -UserName '${key}' -Password '${serializedValue}' -Persist LocalMachine`;
                await this.executePowerShellCommand(command);
            } else {
                const commands = getPlatformCommands(platform);
                await execAsync(commands.saveCommand(service, key, serializedValue));
            }
            return true;
        } catch (e) {
            this.log.error(`Error saving credential: Service: [${service}], Key: [${key}]`);
            this.log.error(errorString(e));
            return false;
        }
    }

    /**
     * Retrieves a credential from the secure store.
     * @param service - The service name associated with the credential.
     * @param key - The key/username for the credential.
     * @returns The stored value as an object or undefined if not found.
     */
    public async retrieve<T>(service: string, key: string): Promise<T | undefined> {
        const platform = process.platform;

        if (!isValidPlatform(platform)) {
            this.log.error(`Unsupported platform for retrieving credentials: ${platform}`);
            return undefined;
        }

        try {
            let serializedValue: string | undefined;
            if (platform === 'win32') {
                // Use PowerShell cmdlets to retrieve credentials from the Windows Credential Manager
                const psScriptFile = "./win32-get-credential-script.ps1"; 
                const uniqueKey = `${service}/${key}`;
                const { stdout, stderr } = await execAsync(`powershell -ExecutionPolicy RemoteSigned -NoProfile -File "${psScriptFile}" ${uniqueKey}`);
        
                if (stderr) {
                    this.log.error(`Error retrieving credential from Credential Manager: ${stderr}`);
                    return undefined;
                }
                const password = stdout.trim();
                if (password && password !== 'Credential not found') {
                    this.log.info(`Credential retrieved: Service: [${service}], Key: [${key}]`);
                    return JSON.parse(password);
                } else {
                    this.log.warn(`Credential not found: Service: [${service}], Key: [${key}]`);
                    return undefined;
                }
            } else {
                const commands = getPlatformCommands(platform);
                const { stdout } = await execAsync(commands.retrieveCommand(service, key));
                serializedValue = stdout ? Buffer.from(stdout.trim(), 'base64').toString('utf-8') : undefined;
            }
            if (serializedValue) {
                this.log.info(`Credential retrieved successfully: Service: [${service}], Key: [${key}]`);
                return JSON.parse(serializedValue);
            }
            return undefined;
        } catch (e) {
            this.log.error(`Error retrieving credential: Service: [${service}], Key: [${key}]`);
            this.log.error(errorString(e));
            return undefined;
        }
    }

    /**
     * Deletes a credential from the secure store.
     * @param service - The service name associated with the credential.
     * @param key - The key/username for the credential.
     * @returns True if the credential was deleted successfully, otherwise false.
     */
    public async delete(service: string, key: string): Promise<boolean> {
        const platform = process.platform;

        if (!isValidPlatform(platform)) {
            this.log.error(`Unsupported platform for deleting credentials: ${platform}`);
            return false;
        }

        try {
            if (platform === 'win32') {
                const uniqueKey = `${service}/${key}`;
                const command = `Remove-StoredCredential -Target '${uniqueKey}'`;
                await this.executePowerShellCommand(command);
            } else {
                const commands = getPlatformCommands(platform);
                await execAsync(commands.deleteCommand(service, key));
                // if (platform === 'darwin') {
                //     await execAsync(`security delete-generic-password -a "${key}" -s "${service}"`);
                // } else if (platform === 'win32') {
                //     await execAsync(`cmdkey /delete:${service}`);
                // } else if (platform === 'linux') {
                //     // Secret-tool doesn't directly delete, so we use a workaround:
                //     const { stdout } = await execAsync(`secret-tool lookup service "${service}" account "${key}"`);
                //     if (stdout) {
                //         await execAsync(`secret-tool clear service "${service}" account "${key}"`);
                //     }
                // }
            }
            this.log.info(`Credential deleted successfully: Service: [${service}], Key: [${key}]`);
            return true;
        } catch (e) {
            this.log.error(`Error deleting credential: Service: [${service}], Key: [${key}]`);
            this.log.error(errorString(e));
            return false;
        }
    }

    /**
     * Retrieves all credentials for a given service.
     * Only supported on macOS due to limitations with `cmdkey` on Windows.
     * @param service - The service name to retrieve credentials for.
     * @returns An object containing all key-value pairs for the service.
     */
    public async getAll<T>(service: string): Promise<Entities<T>> {
        const platform = process.platform;

        if (platform === 'darwin') {
            try {
                const result: Entities<T> = {};
                const accounts = getAccountsFromSystemsFile(this.log);
                //const accounts = ['test-key1', 'test-key2'];
    
                for (const account of accounts) {
                    try {
                        const password = await this.retrieve<string>(service, account);
                        if (password) {
                            result[account] = JSON.parse(password);
                        }
                    } catch (e) {
                        this.log.warn(`Failed to parse value for account: [${account}]`);
                    }
                }
                this.log.info(`Successfully retrieved all credentials for service: [${service}]`);
                return result;
            } catch (e) {
                this.log.error(`Error retrieving all credentials for service: [${service}]`);
                this.log.error(errorString(e));
                return {};
            }
        } else {
            try {
                const result: Entities<T> = {};
                const accounts = ['test-key1', 'test-key2'];
                // const accounts = getAccountsFromSystemsFile(this.log);
        
                for (const account of accounts) {
                    try {
                        const password = await this.retrieve<string>(service, account);
                        if (password) {
                            result[account] = JSON.parse(password);
                        }
                    } catch (e) {
                        this.log.warn(`Failed to parse value for account: [${account}]`);
                    }
                }
                this.log.info(`Successfully retrieved all credentials for service: [${service}]`);
                return result;
            } catch (e) {
                this.log.error(`Error retrieving all credentials for service: [${service}]`);
                this.log.error(errorString(e));
                return {};
            }
        } 
    }
}
