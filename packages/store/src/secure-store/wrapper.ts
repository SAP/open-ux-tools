import type { Logger } from '@sap-ux/logger';
import { errorString } from '../utils';
import type { SecureStore, Entities, SupportedPlatform } from './types';
import { platform } from 'os';
import { execSync } from 'child_process';

// Type guard function to ensure the platform is a SupportedPlatform
function isSupportedPlatform(platform: NodeJS.Platform): platform is SupportedPlatform {
    return ['darwin', 'win32', 'linux'].includes(platform);
}

export class Wrapper implements SecureStore {
    private readonly log: Logger;
    private readonly platform: SupportedPlatform;

    constructor(log: Logger) {
        console.log(" ------------- Wrapper constructor------------- ");
        this.log = log;
        const currentPlatform = platform();

        // Ensure the platform is valid
        if (isSupportedPlatform(currentPlatform)) {
            this.platform = currentPlatform;
        } else {
            // Handle unsupported platforms or set a default value
            throw new Error(`Unsupported platform: ${currentPlatform}`);
        }
        console.log('current platform: ', this.platform);
    }

    private executeCommand(command: string): Buffer {
        try {
            return execSync(command);
        } catch (error) {
            this.log.error(`Error executing command: ${command}`);
            this.log.error(errorString(error));
            throw error;
        }
    }

    private getCommandForPlatform(commandType: 'store' | 'retrieve' | 'delete', service: string, key: string, value?: string): string {
        const platformCommands: Record<SupportedPlatform, Record<string, string>> = {
            darwin: {
                store: `security add-generic-password -s ${service} -a ${key} -w ${value}`,
                retrieve: `security find-generic-password -s ${service} -a ${key} -w`,
                delete: `security delete-generic-password -s ${service} -a ${key}`,
            },
            win32: {
                store: `cmdkey /generic:${service} /user:${key} /pass:${value}`,
                retrieve: `cmdkey /list:${service}`,
                delete: `cmdkey /delete:${service}`,
            },
            linux: {
                store: `secret-tool store --label="${service}" service ${key} <<<"${value}"`,
                retrieve: `secret-tool lookup service ${key}`,
                delete: `secret-tool clear service ${key}`,
            }
        };

        const commands = platformCommands[this.platform];
        if (!commands) {
            throw new Error('Unsupported platform');
        }

        return commands[commandType];
    }
    private storeSecret(service: string, key: string, value: string): boolean {
        try {
            const command = this.getCommandForPlatform('store', service, key, value);
            this.executeCommand(command);
            console.log("------------- Wrapper constructor successfully store secret: ", command);
            return true;
        } catch {
            this.log.error(`Error storing secret. Service: [${service}], key: [${key}]`);
            return false;
        }
    }

    private retrieveSecret(service: string, key: string): string | undefined {
        try {
            const command = this.getCommandForPlatform('retrieve', service, key);
            const result = this.executeCommand(command);
            console.log("------------- Wrapper constructorsuccessfully retrieved secret: ", result.toString().trim());
            return result.toString().trim() ?? undefined;
        } catch (err) {
            console.log("------------- Wrapper constructor Error retrieving secret. ", service, key, err);
            this.log.error(`Error retrieving secret. Service: [${service}], key: [${key}]`);
            return undefined;
        }
    }

    private deleteSecret(service: string, key: string): boolean {
        try {
            const command = this.getCommandForPlatform('delete', service, key);
            this.executeCommand(command);
            console.log("------------- Wrapper constructorsuccessfully delete secret: ", command);
            return true;
        } catch {
            this.log.error(`Error deleting secret. Service: [${service}], key: [${key}]`);
            return false;
        }
    }

    public async save<T>(service: string, key: string, value: T): Promise<boolean> {
        console.log("------------- Wrapper constructor save: ", service, key, value);
        const serialized = JSON.stringify(value);
        return this.storeSecret(service, key, serialized);
    }

    public async retrieve<T>(service: string, key: string): Promise<T | undefined> {
        console.log("------------- Wrapper constructor retrieve: ", service, key);
        const serializedValue = this.retrieveSecret(service, key);
        return serializedValue ? JSON.parse(serializedValue) : undefined;
    }

    public async delete(service: string, key: string): Promise<boolean> {
        return this.deleteSecret(service, key);
    }

    public async getAll<T>(service: string): Promise<Entities<T>> {
        const result: Entities<T> = {};
    
        try {
            switch (this.platform) {
                case 'darwin':
                    await this.handleDarwin(service, result);
                    break;
                case 'win32':
                    await this.handleWin32(service, result);
                    break;
                case 'linux':
                    await this.handleLinux(service, result);
                    break;
                default:
                    throw new Error('Unsupported platform');
            }
        } catch (err) {
            console.log("------------- Wrapper constructor rror getting values for service ", service, err);
            this.log.error(`Error getting values for service: [${service}]`);
            this.log.error(errorString(err));
        }
    
        return result;
    }
    
    private async handleDarwin(service: string, result: Entities<any>): Promise<void> {
        const command = `security find-generic-password -s ${service} -g 2>&1 | grep 'acct'`;
        const output = this.executeCommand(command).toString();
        console.log("------------- Wrapper constructor handleDarwin output: ", output);
        const accounts = this.parseDarwinOutput(output);
        console.log("------------- Wrapper constructor handleDarwin accounts: ", accounts);
    
        for (const account of accounts) {
            const password = this.retrieveSecret(service, account);
            if (password) {
                result[account] = JSON.parse(password);
            }
        }
        console.log("------------- Wrapper constructorsuccessfully get All secret: ", result);
    }
    
    private async handleWin32(service: string, result: Entities<any>): Promise<void> {
        const command = 'cmdkey /list';
        const credentialsOutput = this.executeCommand(command).toString();
        const credentials = this.parseWin32Output(credentialsOutput, service);
    
        for (const credential of credentials) {
            const password = this.retrieveSecret(service, credential);
            if (password) {
                result[credential] = JSON.parse(password);
            }
        }
    }
    
    private async handleLinux(service: string, result: Entities<any>): Promise<void> {
        const command = `secret-tool search service ${service}`;
        const searchOutput = this.executeCommand(command).toString();
        const accounts = searchOutput.split('\n').filter(Boolean);
    
        for (const account of accounts) {
            const password = this.retrieveSecret(service, account);
            if (password) {
                result[account] = JSON.parse(password);
            }
        }
    }
    
    private parseDarwinOutput(output: string): string[] {
        return output.split('\n').map(line => {
            const match = line.match(/"acct"<blob>="([^"]+)"/);
            return match && match[1];
        }).filter(Boolean) as string[];
    }
    
    private parseWin32Output(output: string, service: string): string[] {
        return output.split('\n')
            .filter(line => line.includes(service))
            .map(line => {
                const accountMatch = line.match(/Target:(.*)/);
                return accountMatch ? accountMatch[1].trim() : '';
            })
            .filter(Boolean);
    }
}

