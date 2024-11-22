/**
 * Uses @zowe/secrets-for-zowe-sdk to store and retrieve credentials.
 * Please install @zowe/secrets-for-zowe-sdk package before using this store & remove path from tsconfig.json to include it in the build.
 */
import type { SecureStore } from '../types';
import { keyring } from "@zowe/secrets-for-zowe-sdk";
import { type Logger } from '@sap-ux/logger';
import { errorString } from '../../utils';

/**
 * SecureKeyStoreManager is responsible for securely managing credentials using
 * a keyring implementation. It provides methods to save, retrieve, delete, 
 * and fetch all credentials for a given service.
 */
export class SecureKeyStoreManager implements SecureStore {
    private readonly log: Logger;
    private readonly keyring: typeof keyring;

    /**
     * Constructor initializes the SecureKeyStoreManager.
     * 
     * @param log - Logger instance for logging messages.
     */
    constructor(log: Logger) {
        this.log = log;
        this.keyring = keyring;
        this.log.info("zowe sdk SecureKeyStoreManager initialized.");
    }

    /**
     * Saves a value to the secure store under the specified service and key.
     *
     * @param service - The service name associated with the credential.
     * @param key - The key or account name.
     * @param value - The value to be saved (e.g., a password or object).
     * @returns Promise resolving to `true` if saved successfully, otherwise `false`.
     */
    public async save<T>(service: string, key: string, value: T): Promise<boolean> {
        try {
            const serialized = JSON.stringify(value);
            await this.keyring.setPassword(service, key, serialized);
            this.log.info(`Successfully saved to secure store. Service: [${service}], Key: [${key}]`);
            return true;
        } catch (e) {
            this.log.error(`Failed to save to secure store. Service: [${service}], Key: [${key}]`);
            this.log.error(errorString(e));
            return false;
        }
    }

    /**
     * Retrieves a value from the secure store for the specified service and key.
     *
     * @param service - The service name associated with the credential.
     * @param key - The key or account name.
     * @returns Promise resolving to the retrieved value or `undefined` if not found or on error.
     */
    public async retrieve<T>(service: string, key: string): Promise<T | undefined> {
        try {
            const serializedValue = await this.keyring.getPassword(service, key);
            if (serializedValue) {
                const parsedValue = JSON.parse(serializedValue);
                this.log.info(`Successfully retrieved value for Service: [${service}], Key: [${key}]`);
                return parsedValue;
            } else {
                this.log.warn(`No value found for Service: [${service}], Key: [${key}]`);
                return undefined;
            }
        } catch (e) {
            this.log.error(`Failed to retrieve value. Service: [${service}], Key: [${key}]`);
            this.log.error(errorString(e));
            return undefined;
        }
    }

    /**
     * Deletes a value from the secure store for the specified service and key.
     *
     * @param service - The service name associated with the credential.
     * @param key - The key or account name.
     * @returns Promise resolving to `true` if deleted successfully, otherwise `false`.
     */
    public async delete(service: string, key: string): Promise<boolean> {
        try {
            const deleted = await this.keyring.deletePassword(service, key);
            if (deleted) {
                this.log.info(`Successfully deleted entry. Service: [${service}], Key: [${key}]`);
            } else {
                this.log.warn(`No entry found to delete. Service: [${service}], Key: [${key}]`);
            }
            return deleted;
        } catch (e) {
            this.log.error(`Failed to delete entry. Service: [${service}], Key: [${key}]`);
            this.log.error(errorString(e));
            return false;
        }
    }

    /**
     * Retrieves all credentials associated with the specified service.
     *
     * @param service - The service name for which to retrieve all credentials.
     * @returns Promise resolving to an object where keys are accounts and values are the parsed credentials.
     */
    public async getAll<T>(service: string): Promise<Record<string, T>> {
        try {
            const entries = await this.keyring.findCredentials(service);
            const results: Record<string, T> = {};

            entries.forEach(({ account, password }: { account: string; password: string }) => {
                try {
                    if (account) {
                        results[account] = JSON.parse(password) as T;
                    }
                } catch (e) {
                    this.log.error(`Error parsing credential for Account: [${account}] ${e}`);
                }
            });

            this.log.info(`Successfully retrieved all credentials for Service: [${service}]`);
            return results;
        } catch (e) {
            this.log.error(`Failed to retrieve all credentials. Service: [${service}]`);
            this.log.error(errorString(e));
            return {};
        }
    }
}

