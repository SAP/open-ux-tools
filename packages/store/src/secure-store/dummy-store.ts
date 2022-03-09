import type { SecureStore } from './types';
import type { Logger } from '@sap-ux/logger';

export class DummyStore implements SecureStore {
    private readonly log: Logger;

    constructor(log: Logger) {
        this.log = log;
    }

    public async save<T>(service: string, key: string, _value: T): Promise<boolean> {
        this.log.warn(`Dummy store. Trying to save for service: ${service}, key: ${key}`);
        return Promise.resolve(true);
    }

    public async retrieve<T>(service: string, key: string): Promise<T | undefined> {
        this.log.warn(`Dummy store. Trying to retrieve for service: ${service}, key: ${key}`);
        return Promise.resolve(undefined);
    }

    public async delete(service: string, key: string): Promise<boolean> {
        this.log.warn(`Dummy store. Trying to delete for service: ${service}, key: ${key}`);
        return Promise.resolve(true);
    }

    public async getAll<T>(service: string): Promise<{ [key: string]: T }> {
        this.log.warn(`Dummy store. Trying to get all values for service: [${service}]`);
        return Promise.resolve({});
    }
}
