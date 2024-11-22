/**
 * Uses @napi-rs/keyring to store and retrieve credentials.
 * Please install @napi-rs/keyring package before using this store & remove path from tsconfig.json to include it in the build.
 */
import type { SecureStore } from '../types';
import { Entry } from "@napi-rs/keyring";
import { type Logger } from '@sap-ux/logger';
import { errorString } from '../../utils';
import { getAccountsFromSystemsFile } from '../systems-file-utils';

/**
 * Implements a secure key store manager that interacts with the system's secure storage.
 */
export class SecureKeyStoreManager implements SecureStore {
    private readonly log: Logger;
    private readonly entryCache: Map<string, Entry>;

    constructor(log: Logger) {
        this.log = log;
        this.entryCache = new Map<string, Entry>();
        this.log.info("napi keyring SecureKeyStoreManager initialized.");
    }

    /**
     * Get or initialize an Entry object for a given service and key.
     * Uses a cache to prevent multiple initializations for the same service-key pair.
     * @param service - The service name/identifier.
     * @param key - The unique key.
     * @returns An Entry instance.
     */
    private getEntry(service: string, key: string): Entry | null {
        const cacheKey = `${service}:${key}`;
        if (this.entryCache.has(cacheKey)) {
            return this.entryCache.get(cacheKey) || null;
        }

        try {
            const entry = new Entry(service, key);
            this.entryCache.set(cacheKey, entry);
            return entry;
        } catch (e) {
            this.log.error(`Error initializing Entry for service: [${service}], key: [${key}]`);
            this.log.error(errorString(e));
            return null;
        }
    }

    /**
     * Save a key-value pair in the secure storage.
     * @param service - The service name/identifier.
     * @param key - The unique key.
     * @param value - The value to be saved.
     * @returns A Promise resolving to `true` if the operation is successful, `false` otherwise.
     */
    public async save<T>(service: string, key: string, value: T): Promise<boolean> {
        const entry = this.getEntry(service, key);
        if (!entry) return false;

        try {
            const serialized = JSON.stringify(value);
            entry.setPassword(serialized);
            this.log.info(`Saved to secure store. Service: [${service}], Key: [${key}]`);
            return true;
        } catch (e) {
            this.log.error(`Error saving to secure store. Service: [${service}], Key: [${key}]`);
            this.log.error(errorString(e));
            return false;
        }
    }

    /**
     * Retrieve a value from the secure storage.
     * @param service - The service name/identifier.
     * @param key - The unique key.
     * @returns A Promise resolving to the retrieved value or `undefined` if not found.
     */
    public async retrieve<T>(service: string, key: string): Promise<T | undefined> {
        const entry = this.getEntry(service, key);
        if (!entry) return undefined;

        try {
            const serializedValue = entry.getPassword();
            this.log.info(`Retrieved value from secure store. Service: [${service}], Key: [${key}]`);
            return serializedValue ? JSON.parse(serializedValue) : undefined;
        } catch (e) {
            this.log.error(`Error retrieving from secure store. Service: [${service}], Key: [${key}]`);
            this.log.error(errorString(e));
            return undefined;
        }
    }

    /**
     * Delete a key-value pair from the secure storage.
     * @param service - The service name/identifier.
     * @param key - The unique key.
     * @returns A Promise resolving to `true` if deletion is successful, `false` otherwise.
     */
    public async delete(service: string, key: string): Promise<boolean> {
        const entry = this.getEntry(service, key);
        if (!entry) return false;

        try {
            const deleted = entry.deletePassword();
            if (deleted) {
                const cacheKey = `${service}:${key}`;
                this.entryCache.delete(cacheKey);
            }
            this.log.info(`Deleted from secure store. Service: [${service}], Key: [${key}]`);
            return deleted;
        } catch (e) {
            this.log.error(`Error deleting from secure store. Service: [${service}], Key: [${key}]`);
            this.log.error(errorString(e));
            return false;
        }
    }

    /**
     * Retrieve all key-value pairs for a given service.
     * @param service - The service name/identifier.
     * @returns A Promise resolving to an object mapping keys to values.
     */
    public async getAll<T>(service: string): Promise<Record<string, T>> {
        const result: Record<string, T> = {};

        try {

            const accounts = getAccountsFromSystemsFile(this.log);

            for (const account of accounts) {
                const entry = this.getEntry(service, account);
                if (!entry) continue;

                try {
                    const serializedValue = entry.getPassword();
                    if (serializedValue) {
                        result[account] = JSON.parse(serializedValue);
                    }
                } catch (e) {
                    this.log.warn(`Failed to parse value for account: [${account}]`);
                }
            }

            this.log.info(`Retrieved all values for service: [${service}]`);
            return result;
        } catch (e) {
            this.log.error(`Error retrieving all values for service: [${service}]`);
            this.log.error(errorString(e));
            return {};
        }
    }
}
