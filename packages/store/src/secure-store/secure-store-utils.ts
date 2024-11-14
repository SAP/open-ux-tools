import type { SupportedPlatform } from './types';
import { exec } from 'child_process';
import { promisify } from 'util';
import { type Logger } from '@sap-ux/logger';
import { errorString } from '../utils';
import { Entities } from './types';

const execAsync = promisify(exec);

// Type guard function to ensure the platform is a supported one
export function isValidPlatform(platform: NodeJS.Platform): platform is SupportedPlatform {
    return ['darwin', 'win32', 'linux'].includes(platform);
}

// Platform-specific utility functions for handling credentials
export async function saveCredential(service: string, key: string, value: string, log: Logger): Promise<boolean> {
    const platform = process.platform;
    const base64Value = Buffer.from(value).toString('base64');
    
    try {
        if (platform === 'darwin') {
            await execAsync(`security add-generic-password -a "${key}" -s "${service}" -w "${base64Value}" -D "${key}" -U`);
        } else if (platform === 'win32') {
            await execAsync(`cmdkey /add:${service} /user:${key} /pass:${value}`);
        } else {
            log.error(`Unsupported platform: ${platform}`);
            return false;
        }
        log.info(`Credential saved: Service: [${service}], Key: [${key}]`);
        return true;
    } catch (e) {
        log.error(`Error saving credential: Service: [${service}], Key: [${key}]`);
        log.error(errorString(e));
        return false;
    }
}

export async function retrieveCredential(service: string, key: string, log: Logger): Promise<string | undefined> {
    const platform = process.platform;
    
    try {
        if (platform === 'darwin') {
            const { stdout } = await execAsync(`security find-generic-password -a ${key} -s ${service} -w`);
            return Buffer.from(stdout.trim(), 'base64').toString('utf8');
        } else if (platform === 'win32') {
            const { stdout } = await execAsync(`cmdkey /list:${service}`);
            const match = stdout.match(new RegExp(`${key}:(.+)`, 'i'));
            return match ? match[1].trim() : undefined;
        } else {
            log.error(`Unsupported platform: ${platform}`);
            return undefined;
        }
    } catch (e) {
        log.error(`Error retrieving credential: Service: [${service}], Key: [${key}]`);
        log.error(errorString(e));
        return undefined;
    }
}

export async function deleteCredential(service: string, key: string, log: Logger): Promise<boolean> {
    const platform = process.platform;
    
    try {
        if (platform === 'darwin') {
            await execAsync(`security delete-generic-password -a ${key} -s ${service}`);
        } else if (platform === 'win32') {
            await execAsync(`cmdkey /delete:${service}`);
        } else {
            log.error(`Unsupported platform: ${platform}`);
            return false;
        }
        log.info(`Credential deleted: Service: [${service}], Key: [${key}]`);
        return true;
    } catch (e) {
        log.error(`Error deleting credential: Service: [${service}], Key: [${key}]`);
        log.error(errorString(e));
        return false;
    }
}

// Helper function to retrieve all credentials for a service on macOS
export  async function getAllAccountsByService<T>(service: string, log: Logger): Promise<Entities<T>> {
    const result: Entities<T> = {};

    try {
        const { stdout } = await execAsync(`security dump-keychain`, { maxBuffer: 1024 * 1024 * 10 });
        const entries = stdout.split("keychain: ");
        
        for (const entry of entries) {
            if (entry.includes(`"svce"<blob>="${service}"`)) {
                const accountMatch = entry.match(/"acct"<blob>="(.+?)"/);
                const accountName = accountMatch ? accountMatch[1] : null;

                if (accountName) {
                    const retrievedPassword = await retrieveCredential(service, accountName, log);
                    if (retrievedPassword) {
                        let parsedPassword;
                        try {
                            parsedPassword = JSON.parse(retrievedPassword);
                        } catch (e) {
                            // Use the raw value if it's not parsable
                            parsedPassword = retrievedPassword; 
                        }
                        result[accountName] = parsedPassword;
                    }
                }
            }
        }
        console.log(" -- result --", result)
        log.info(`Successfully retrieved all accounts for service: [${service}]`);
    } catch (e) {
        log.error(`Error retrieving all accounts for service: [${service}]`);
        log.error(errorString(e));
    }
    return result;
}