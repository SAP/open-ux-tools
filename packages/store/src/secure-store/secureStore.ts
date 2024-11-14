import type { SecureStore } from './types';
import { ToolsLogger, type Logger } from '@sap-ux/logger';
import { errorString } from '../utils';
import { Entities } from './types';
import { saveCredential, retrieveCredential, deleteCredential, getAllAccountsByService } from './secure-store-utils';

export class SecureStoreHandler implements SecureStore {
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
        return await deleteCredential(service, key, this.log);
    }

    public async getAll<T>(service: string): Promise<Entities<T>> {
        if (process.platform === 'darwin') {
            return await getAllAccountsByService<T>(service, this.log);
        } else if (process.platform === 'win32') {
            this.log.error('getAll is not supported on Windows with cmdkey.');
            return {};
        } else {
            this.log.error(`Unsupported platform for getAll method: ${process.platform}`);
            return {};
        }
    }
}

// test for now - remove later !!!
const log: Logger = new ToolsLogger();
const wrapper = new SecureStoreHandler(log);
wrapper.getAll('fiori/v2/system');
