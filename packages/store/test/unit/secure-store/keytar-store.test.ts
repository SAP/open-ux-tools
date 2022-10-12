import * as keytar from 'keytar';
import { mocked } from 'ts-jest/utils';
import { getSecureStore } from '../../../src/secure-store';
import { KeytarStore } from '../../../src/secure-store/keytar-store';
import fc from 'fast-check';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';

jest.mock('keytar');
const mockedKeytar = mocked(keytar, true);

describe('KeytarStore', () => {
    const store = getSecureStore(new ToolsLogger({ transports: [new NullTransport()] }));
    const service = 'com/sap/dummy';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Saves an object as a serialized string', async () => {
        const value = { url: 'https://sap.com/oauth', refreshToken: '1234567890' };
        await store.save(service, value.url, value);
        expect(mockedKeytar.setPassword.mock.calls[0]).toHaveProperty(['1'], value.url);
        expect(mockedKeytar.setPassword.mock.calls[0]).toHaveProperty(['2'], JSON.stringify(value));
    });

    test('Retrieves an object from a serialized string', async () => {
        const value = { url: 'https://sap.com/oauth', refreshToken: '1234567890' };
        mockedKeytar.getPassword.mockResolvedValueOnce(JSON.stringify(value));
        const actualValue = await store.retrieve(service, value.url);
        expect(actualValue).toEqual(value);
    });

    test('Retrieve returns undefined if a value cannot be found', async () => {
        const value = { url: 'https://sap.com/oauth', refreshToken: '1234567890' };
        mockedKeytar.getPassword.mockResolvedValueOnce(JSON.stringify(undefined));
        const actualValue = await store.retrieve(service, value.url);
        expect(actualValue).toBeUndefined();
    });

    test('Delete return true on success', async () => {
        const value = { url: 'https://sap.com/oauth', refreshToken: '1234567890' };
        mockedKeytar.deletePassword.mockResolvedValueOnce(true);
        const actualValue = await store.delete(service, value.url);
        expect(actualValue).toBe(true);
    });

    test('Delete returns false if no key is found', async () => {
        const value = { url: 'https://sap.com/oauth', refreshToken: '1234567890' };
        mockedKeytar.deletePassword.mockResolvedValueOnce(false);
        const actualValue = await store.delete(service, value.url);
        expect(actualValue).toBe(false);
    });

    test('GetAll returns an object with urls as keys', async () => {
        const password1 = { refreshToken: '1234567890' };
        const entry1 = { account: 'url1', password: JSON.stringify(password1) };
        const password2 = { refreshToken: '2222222222' };
        const entry2 = { account: 'url2', password: JSON.stringify(password2) };

        mockedKeytar.findCredentials.mockResolvedValueOnce([entry1, entry2]);
        expect(store.getAll(service)).resolves.toEqual({ [entry1.account]: password1, [entry2.account]: password2 });
    });

    describe('On error', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        const nullLogger = new ToolsLogger({ transports: [new NullTransport()] });
        test('Save returns false', async () => {
            mockedKeytar.setPassword.mockImplementation(() => {
                throw new Error();
            });
            await fc.assert(
                fc.asyncProperty(fc.string(), fc.string(), fc.anything(), async (service, key, value) => {
                    return (await new KeytarStore(nullLogger, mockedKeytar).save(service, key, value)) === false;
                })
            );
        });

        test('Retrieve returns false', async () => {
            mockedKeytar.getPassword.mockImplementation(() => {
                throw new Error();
            });
            await fc.assert(
                fc.asyncProperty(fc.string(), fc.string(), async (service, key) => {
                    return (await new KeytarStore(nullLogger, mockedKeytar).retrieve(service, key)) === undefined;
                })
            );
        });

        test('Delete returns false', async () => {
            mockedKeytar.deletePassword.mockImplementation(() => {
                throw new Error();
            });
            await fc.assert(
                fc.asyncProperty(fc.string(), fc.string(), async (service, key) => {
                    return (await new KeytarStore(nullLogger, mockedKeytar).delete(service, key)) === false;
                })
            );
        });

        test('GetAll returns an empty object', async () => {
            mockedKeytar.findCredentials.mockImplementation(() => {
                throw new Error();
            });
            await fc.assert(
                fc.asyncProperty(fc.string(), async (service) => {
                    return Object.keys(await new KeytarStore(nullLogger, mockedKeytar).getAll(service)).length === 0;
                })
            );
        });
    });
});
