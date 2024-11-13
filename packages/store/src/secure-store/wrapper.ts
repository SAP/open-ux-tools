
import type { SecureStore } from './types';
import type { Logger } from '@sap-ux/logger';
import { exec } from 'child_process';
import { promisify } from 'util';
import { errorString } from '../utils';

const execAsync = promisify(exec);

type Entities<T> = {
    [key: string]: T;
};

// Wrapper functions for macOS (security) and Windows (cmdkey)
async function saveCredential(service: string, key: string, value: string, log: Logger): Promise<boolean> {
    const platform = process.platform;
    try {
        // Encode the JSON value in Base64
        const base64Value = Buffer.from(value).toString('base64');
        if (platform === 'darwin') {
            await execAsync(`security add-generic-password -a "${key}" -s "${service}" -w "${base64Value}" -U`);
            log.info(`----- Credential saved: Service: [${service}], Key: [${key}]`);
        } else if (platform === 'win32') {
            await execAsync(`cmdkey /add:${service} /user:${key} /pass:${value}`);
        } else {
            log.error(`Unsupported platform: ${platform}`);
            return false;
        }
        return true;
    } catch (e) {
        log.error(`Error saving credential: Service: [${service}], Key: [${key}]`);
        log.error(errorString(e));
        return false;
    }
}

async function retrieveCredential(service: string, key: string, log: Logger): Promise<string | undefined> {
    const platform = process.platform;
    try {
        if (platform === 'darwin') {
            const { stdout } = await execAsync(`security find-generic-password -a ${key} -s ${service} -w`);
            const value = Buffer.from(stdout.trim(), 'base64').toString('utf8'); // Decode Base64 value
            log.info(` ------ Credential retrieved: Service: [${service}], Key: [${key}]`);
            return value;
        } else if (platform === 'win32') {
            const { stdout } = await execAsync(`cmdkey /list:${service}`);
            const regex = new RegExp(`${key}:(.+)`, 'i');
            const match = stdout.match(regex);
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

async function deleteCredential(service: string, key: string, log: Logger): Promise<boolean> {
    const platform = process.platform;
    try {
        if (platform === 'darwin') {
            await execAsync(`security delete-generic-password -a ${key} -s ${service}`);
            log.info(`------ Credential deleted: Service: [${service}], Key: [${key}]`);
        } else if (platform === 'win32') {
            await execAsync(`cmdkey /delete:${service}`);
        } else {
            log.error(`Unsupported platform: ${platform}`);
            return false;
        }
        return true;
    } catch (e) {
        log.error(`Error deleting credential: Service: [${service}], Key: [${key}]`);
        log.error(errorString(e));
        return false;
    }
}

export class Wrapper implements SecureStore {
    private readonly log: Logger;

    constructor(log: Logger) {
        this.log = log;
    }

    public async save<T>(service: string, key: string, value: T): Promise<boolean> {
        try {
            const serialized = JSON.stringify(value);
            return await saveCredential(service, key, serialized, this.log);
        } catch (e) {
            this.log.error(`Error saving to secure store. Service: [${service}], Key: [${key}]`);
            this.log.error(errorString(e));
            return false;
        }
    }

    public async retrieve<T>(service: string, key: string): Promise<T | undefined> {
        try {
            const serializedValue = await retrieveCredential(service, key, this.log);
            return serializedValue ? JSON.parse(serializedValue) : undefined;
        } catch (e) {
            this.log.error(`Error retrieving from secure store. Service: [${service}], Key: [${key}]`);
            this.log.error(errorString(e));
            return undefined;
        }
    }

    public async delete(service: string, key: string): Promise<boolean> {
        try {
            return await deleteCredential(service, key, this.log);
        } catch (e) {
            this.log.error(`Error deleting from secure store. Service: [${service}], Key: [${key}]`);
            this.log.error(errorString(e));
            return false;
        }
    }

    public async getAll<T>(service: string): Promise<Entities<T>> {
        const platform = process.platform;
        const result: Entities<T> = {};
    
        try {
            if (platform === 'darwin') {

                // Execute the security command and capture both stdout and stderr
                const { stdout, stderr } = await execAsync(`security find-generic-password -s "${service}" -g`);

                // macOS outputs the password to stderr, so use stderr here
                const output = stdout + stderr;
                //console.log(" --- Combined output: ", output);

                // Extract the account (username) and password from the output
                const usernameMatch = output.match(/"acct"<blob>="(.*?)"/);  // Extract username
                const passwordMatch = output.match(/password: "(.*?)"/);  // Extract the Base64 encoded password

                // console.log(" --- usernameMatch: ", JSON.stringify(usernameMatch, null, 2));
                // console.log(" --- passwordMatch: ", JSON.stringify(passwordMatch, null, 2));
                // console.log(" !usernameMatch || !passwordMatch ", !usernameMatch || !passwordMatch);

                if (!usernameMatch || !passwordMatch) {
                    this.log.error(`Failed to find username or password for service: ${service}`);
                }
                else {
                    const username = usernameMatch[1]; // Extracted username
                    const base64Password = passwordMatch[1]; // Extracted Base64 password

                    // Decode the Base64 password
                    const decodedPassword = Buffer.from(base64Password, 'base64').toString('utf-8'); 

                    // Parse the decoded password as JSON (if it's a JSON string)
                    let passwordObject;
                    try {
                        passwordObject = JSON.parse(decodedPassword);
                    } catch (e) {
                        this.log.error(`Error parsing password JSON for service: ${service}`);
                        passwordObject = decodedPassword; // In case the password is not JSON, just return the string
                    }
                    const result: Entities<any> = {
                        [username]: passwordObject,  // The decoded and parsed password object
                    }
                    this.log.info(`------ Successfully retrieved all values for service: [${service}] result: ${JSON.stringify(result)}`);
                    return result;
                }
            } else if (platform === 'win32') {
                this.log.error('getAll is not supported on Windows with cmdkey due to listing limitations.');
            } else {
                this.log.error(`Unsupported platform for getAll method: ${platform}`);
            }
    
            return result;
        } catch (e) {
            this.log.error(`Error getting all values for service: [${service}]`);
            this.log.error(errorString(e));
            return {};
        }
    }
}
