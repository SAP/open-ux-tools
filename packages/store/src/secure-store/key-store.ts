import { type Logger } from '@sap-ux/logger';
import { errorString } from '../utils';
import type { SecureStore } from './types';
//import { keyring } from '@zowe/secrets-for-zowe-sdk';
const { keyring } = require("@zowe/secrets-for-zowe-sdk");

type Entities<T> = {
    [key: string]: T;
};

/**
 * KeyStoreManager is responsible for securely managing credentials using
 * a keyring implementation. It provides methods to save, retrieve, delete, 
 * and fetch all credentials for a given service.
 */
export class KeyStoreManager implements SecureStore {
    private readonly log: Logger;
    private readonly keyring: typeof keyring;

    constructor(log: Logger) {
        this.log = log;
        this.keyring = keyring;
    }

    private serialize<T>(value: T): string | undefined {
        try {
            return JSON.stringify(value);
        } catch (e) {
            this.log.error(`Failed to serialize value: ${errorString(e)}`);
            return undefined;
        }
    }

    private deserialize<T>(serialized: string): T | undefined {
        try {
            return JSON.parse(serialized) as T;
        } catch (e) {
            this.log.error(`Failed to deserialize value: ${errorString(e)}`);
            return undefined;
        }
    }

    private validateInput(service: string, key: string): boolean {
        if (!service || !key) {
            this.log.error('Invalid input: Service or Key is missing.');
            return false;
        }
        return true;
    }

    public async save<T>(service: string, key: string, value: T): Promise<boolean> {
        if (!this.validateInput(service, key)) {
            return false;
        }
        try {
            const serialized = this.serialize(value);
            if (!serialized) {
                throw new Error('Serialization failed, value cannot be saved.');
            }
            await this.keyring.setPassword(service, key, serialized);
            this.log.info(`Credential saved. Service: [${service}], Key: [${key}]`);
            return true;
        } catch (e) {
            this.log.error(`Failed to save credential. Service: [${service}], Key: [${key}]. Error: ${errorString(e)}`);
            return false;
        }
    }

    public async retrieve<T>(service: string, key: string): Promise<T | undefined> {
        if (!this.validateInput(service, key)) {
            return undefined;
        }
        try {
            const serializedValue = await this.keyring.getPassword(service, key);
            if (!serializedValue) {
                this.log.warn(`No credential found. Service: [${service}], Key: [${key}]`);
                return undefined;
            }

            const value = this.deserialize<T>(serializedValue);
            if (!value) {
                throw new Error('Deserialization failed, invalid stored data.');
            }
            this.log.info(`Credential retrieved. Service: [${service}], Key: [${key}]`);
            return value;
        } catch (e) {
            this.log.error(`Failed to retrieve credential. Service: [${service}], Key: [${key}]. Error: ${errorString(e)}`);
            return undefined;
        }
    }

    public async delete(service: string, key: string): Promise<boolean> {
        if (!this.validateInput(service, key)) {
            return false;
        }
        let deleted = false;
        try {
            deleted = await this.keyring.deletePassword(service, key);
        } catch (e) {
            this.log.error(`Failed to delete credential. Service: [${service}], Key: [${key}]. Error: ${errorString(e)}`);
            return false;
        }

        if (deleted) {
            this.log.info(`Credential deleted. Service: [${service}], Key: [${key}]`);
        } else {
            this.log.warn(`No credential to delete. Service: [${service}], Key: [${key}]`);
        }
        return deleted;
    }

    public async getAll<T>(service: string): Promise<Entities<T>> {
        const results: Entities<T> = {};
        try {
            const entries = await this.keyring.findCredentials(service);
            entries.forEach(({ account, password }: { account: string, password: string }) => {
                if (account) {
                    const value = this.deserialize<T>(password);
                    if (value) {
                        results[account] = value;
                    } else {
                        this.log.error(`Failed to parse credential for Account: [${account}]`);
                    }
                }
            });

            this.log.info(`All credentials retrieved. Service: [${service}], Count: ${Object.keys(results).length}`);
            return results;
        } catch (e) {
            this.log.error(`Failed to retrieve credentials for Service: [${service}]. Error: ${errorString(e)}`);
            return results;
        }
    }
}

