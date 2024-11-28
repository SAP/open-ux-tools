import { KeyStoreManager } from '../../../src/secure-store/key-store';
import { keyring } from '@zowe/secrets-for-zowe-sdk';
import type { Logger } from '@sap-ux/logger';
import { text } from '../../../src/i18n';

jest.mock('@sap-ux/logger', () => ({
    Logger: class {
        info = jest.fn();
        warn = jest.fn();
        error = jest.fn();
    }
}));

describe('KeyStoreManager', () => {
    const log: Logger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    } as unknown as Logger;

    let keyStoreManager: KeyStoreManager;

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        keyStoreManager = new KeyStoreManager(log);
    });

    afterAll(async () => {
        jest.clearAllTimers();
        jest.restoreAllMocks();
        await Promise.resolve();
    });

    describe('save', () => {
        it('should save a credential successfully', async () => {
            (keyring.setPassword as jest.Mock).mockResolvedValue(true);

            const result = await keyStoreManager.save('testService', 'testKey', { value: 'testValue' });

            expect(result).toBe(true);
            expect(keyring.setPassword).toHaveBeenCalledWith(
                'testService',
                'testKey',
                JSON.stringify({ value: 'testValue' })
            );
            expect(log.info).toHaveBeenCalledWith(
                'Credential saved successfully. Service: [testService], Key: [testKey]'
            );
        });

        it('should handle serialization failure', async () => {
            const circularObject: any = {};
            circularObject.self = circularObject; // Circular reference

            const result = await keyStoreManager.save('testService', 'testKey', circularObject);

            expect(result).toBe(false);
            expect(keyring.setPassword).not.toHaveBeenCalled();
            expect(log.error).toHaveBeenCalledWith(expect.stringContaining('Failed to serialize value'));
        });

        it('should handle errors during save operation', async () => {
            (keyring.setPassword as jest.Mock).mockRejectedValue(new Error('Save failed'));

            const result = await keyStoreManager.save('testService', 'testKey', { value: 'testValue' });

            expect(result).toBe(false);
            expect(log.error).toHaveBeenCalledWith(expect.stringContaining('Failed to save credential'));
        });
    });

    describe('retrieve', () => {
        it('should retrieve a credential successfully', async () => {
            (keyring.getPassword as jest.Mock).mockResolvedValue(JSON.stringify({ value: 'testValue' }));

            const result = await keyStoreManager.retrieve<{ value: string }>('testService', 'testKey');

            expect(result).toEqual({ value: 'testValue' });
        });

        it('should return undefined if no credential is found', async () => {
            (keyring.getPassword as jest.Mock).mockResolvedValue(undefined);

            const result = await keyStoreManager.retrieve<{ value: string }>('testService', 'testKey');

            expect(result).toBeUndefined();
            expect(log.warn).toHaveBeenCalledWith('No credential found. Service: [testService], Key: [testKey]');
        });

        it('should handle deserialization failure', async () => {
            (keyring.getPassword as jest.Mock).mockResolvedValue('invalid json');

            const result = await keyStoreManager.retrieve<{ value: string }>('testService', 'testKey');

            expect(result).toBeUndefined();
            expect(log.error).toHaveBeenCalledWith(expect.stringContaining('Failed to deserialize value'));
        });

        it('should handle errors during retrieval', async () => {
            (keyring.getPassword as jest.Mock).mockRejectedValue(new Error('Retrieve failed'));

            const result = await keyStoreManager.retrieve<{ value: string }>('testService', 'testKey');

            expect(result).toBeUndefined();
            expect(log.error).toHaveBeenCalledWith(expect.stringContaining('Failed to retrieve credential'));
        });
    });

    describe('delete', () => {
        it('should delete a credential successfully', async () => {
            (keyring.deletePassword as jest.Mock).mockResolvedValue(true);

            const result = await keyStoreManager.delete('testService', 'testKey');

            expect(result).toBe(true);
            expect(log.info).toHaveBeenCalledWith('Credential deleted. Service: [testService], Key: [testKey]');
        });

        it('should handle case where no credential is found to delete', async () => {
            (keyring.deletePassword as jest.Mock).mockResolvedValue(false);

            const result = await keyStoreManager.delete('testService', 'testKey');

            expect(result).toBe(false);
            expect(log.warn).toHaveBeenCalledWith('No credential to delete. Service: [testService], Key: [testKey]');
        });

        it('should handle errors during delete operation', async () => {
            (keyring.deletePassword as jest.Mock).mockRejectedValue(new Error('Delete failed'));

            const result = await keyStoreManager.delete('testService', 'testKey');

            expect(result).toBe(false);
            expect(log.error).toHaveBeenCalledWith(expect.stringContaining('Failed to delete credential'));
        });
    });

    describe('getAll', () => {
        it('should retrieve all credentials successfully', async () => {
            (keyring.findCredentials as jest.Mock).mockResolvedValue([
                { account: 'account1', password: JSON.stringify({ value: 'value1' }) },
                { account: 'account2', password: JSON.stringify({ value: 'value2' }) }
            ]);

            const result = await keyStoreManager.getAll<{ value: string }>('testService');

            expect(result).toEqual({
                account1: { value: 'value1' },
                account2: { value: 'value2' }
            });
            expect(log.info).toHaveBeenCalledWith('All credentials retrieved. Service: [testService], Count: 2');
        });

        it('should handle deserialization failures for individual credentials', async () => {
            (keyring.findCredentials as jest.Mock).mockResolvedValue([
                { account: 'account1', password: 'invalid json' },
                { account: 'account2', password: JSON.stringify({ value: 'value2' }) }
            ]);

            const result = await keyStoreManager.getAll<{ value: string }>('testService');

            expect(result).toEqual({
                account2: { value: 'value2' }
            });
            expect(log.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to parse credential for Account: [account1]')
            );
        });

        it('should handle errors during retrieval of all credentials', async () => {
            (keyring.findCredentials as jest.Mock).mockRejectedValue(new Error('Find credentials failed'));

            const result = await keyStoreManager.getAll<{ value: string }>('testService');

            expect(result).toEqual({});
            expect(log.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to retrieve credentials for Service: [testService]')
            );
        });
    });

    describe('validateInput()', () => {
        it('should return true when both service and key are provided', () => {
            const service = 'myService';
            const key = 'myKey';

            const result = keyStoreManager['validateInput'](service, key);

            expect(result).toBe(true);
        });

        it('should return false when service is missing', () => {
            const service = '';
            const key = 'myKey';

            const result = keyStoreManager['validateInput'](service, key);

            expect(result).toBe(false);
            expect(log.error).toHaveBeenCalledWith('Invalid input: Service or Key is missing.');
        });

        it('should return false when key is missing', () => {
            const service = 'myService';
            const key = '';

            const result = keyStoreManager['validateInput'](service, key);

            expect(result).toBe(false);
            expect(log.error).toHaveBeenCalledWith('Invalid input: Service or Key is missing.');
        });

        it('should return false when both service and key are missing', () => {
            const service = '';
            const key = '';

            const result = keyStoreManager['validateInput'](service, key);

            expect(result).toBe(false);
            expect(log.error).toHaveBeenCalledWith('Invalid input: Service or Key is missing.');
        });
    });

    describe('validateInput save()', () => {
        it('should fail and return false when validateInput returns false', async () => {
            const service = '';
            const key = 'myKey';
            const value = { username: 'user', password: 'pass' };

            const result = await keyStoreManager.save(service, key, value);

            expect(result).toBe(false);
            expect(log.error).toHaveBeenCalledWith('Invalid input: Service or Key is missing.');
        });
    });

    describe('validateInput retrieve()', () => {
        it('should fail and return undefined when validateInput returns false', async () => {
            const service = 'myService';
            const key = '';

            const result = await keyStoreManager.retrieve(service, key);

            expect(result).toBeUndefined();
            expect(log.error).toHaveBeenCalledWith('Invalid input: Service or Key is missing.');
        });
    });

    describe('validateInput delete()', () => {
        it('should fail and return false when validateInput returns false', async () => {
            const service = '';
            const key = 'myKey';

            const result = await keyStoreManager.delete(service, key);

            expect(result).toBe(false);
            expect(log.error).toHaveBeenCalledWith('Invalid input: Service or Key is missing.');
        });
    });

    describe('validateInput getAll()', () => {
        it('should fail and return empty object when validateInput returns false', async () => {
            const service = '';
            const result = await keyStoreManager.getAll(service);

            expect(result).toEqual({});
            expect(log.error).toHaveBeenCalledWith(
                'Failed to retrieve credentials for Service: []. Error: Find credentials failed'
            );
        });
    });
});
