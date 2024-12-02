import { type Logger } from '@sap-ux/logger';
import { errorString } from '../utils';
import type { SecureStore } from './types';
import type { keyring } from '@zowe/secrets-for-zowe-sdk';

type Entities<T> = { [key: string]: T };
export class KeyStoreManager implements SecureStore {
    private readonly log: Logger;
    private readonly keyring: typeof keyring;

    constructor(log: Logger, zoweSecretSdk: typeof keyring) {
        this.log = log;
        this.keyring = zoweSecretSdk;
    }

    /**
     * Helper function for serializing objects
     */
    private serialize<T>(value: T): string {
        try {
            return JSON.stringify(value);
        } catch (e) {
            throw new Error(`Failed to serialize value while storing credentials`);
        }
    }

    /**
     * Helper function for deserializing objects
     */
    private deserialize<T>(serialized: string): T {
        try {
            return JSON.parse(serialized) as T;
        } catch (e) {
            throw new Error(`Failed to deserialize value while retrieving credentials`);
        }
    }

    /**
     * Validate input parameters for service and key
     */
    private validateInput(service: string, key: string): boolean {
        if (!service || !key) {
            this.log.error('Invalid input: Service or Key is missing.');
            return false;
        }
        return true;
    }

    /**
     * Save credentials to the keyring
     */
    public async save<T>(service: string, key: string, value: T): Promise<boolean> {
        if (!this.validateInput(service, key)) {
            return false;
        }

        try {
            const serialized = this.serialize(value);
            await this.keyring.setPassword(service, key, serialized);
            this.log.info(`Credential saved successfully. Service: [${service}], Key: [${key}]`);
            return true;
        } catch (e) {
            this.log.error(`Failed to save credential. Service: [${service}], Key: [${key}]. Error: ${errorString(e)}`);
            return false;
        }
    }

    /**
     * Retrieve credentials from the keyring
     */
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

            return this.deserialize<T>(serializedValue);
        } catch (e) {
            if (e instanceof Error) {
                this.log.error(
                    `Deserialization error for Service: [${service}], Key: [${key}]. Error: ${errorString(e)}`
                );
            } else {
                this.log.error(
                    `Failed to retrieve credential. Service: [${service}], Key: [${key}]. Error: ${errorString(e)}`
                );
            }
            return undefined;
        }
    }

    /**
     * Delete credentials from the keyring
     */
    public async delete(service: string, key: string): Promise<boolean> {
        if (!this.validateInput(service, key)) {
            return false;
        }

        try {
            const deleted = await this.keyring.deletePassword(service, key);
            if (deleted) {
                this.log.info(`Credential deleted. Service: [${service}], Key: [${key}]`);
            } else {
                this.log.warn(`No credential to delete. Service: [${service}], Key: [${key}]`);
            }
            return deleted;
        } catch (e) {
            this.log.error(
                `Failed to delete credential. Service: [${service}], Key: [${key}]. Error: ${errorString(e)}`
            );
            return false;
        }
    }

    /**
     * Retrieve all credentials for a given service
     */
    public async getAll<T>(service: string): Promise<Entities<T>> {
        const results: Entities<T> = {};

        try {
            console.log(' -- my zowe get all ---');
            const entries = await this.keyring.findCredentials(service);
            if (!entries || entries.length === 0) {
                this.log.warn(`No credentials found for Service: [${service}]`);
                return results;
            }

            entries.forEach(({ account, password }: { account: string; password: string }) => {
                if (account) {
                    try {
                        const value = this.deserialize<T>(password);
                        results[account] = value;
                    } catch (e) {
                        this.log.error(
                            `Failed to parse credential for Account: [${account}]. Error: ${errorString(e)}`
                        );
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
