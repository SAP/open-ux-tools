import prompts from 'prompts';
import {
    getCredentialsWithPrompts,
    getCredentialsFromStore,
    getCredentialsFromEnvVariables,
    storeCredentials
} from '../../../src/base/credentials';
import type { BackendSystem, BackendSystemKey } from '@sap-ux/store';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import { mockedStoreService } from '../../__mocks__';

describe('base/credentials', () => {
    const logger = new ToolsLogger({ transports: [new NullTransport()] });
    const target: BackendSystem = {
        name: 'Target System',
        url: 'http://target.example',
        client: '001',
        systemType: 'OnPrem',
        connectionType: 'abap_catalog'
    };
    const username = '~user';
    const password = '~pass';

    describe('storeCredentials', () => {
        test('successfully stored credentials', async () => {
            const success = await storeCredentials('~name', target, { username, password }, logger);
            expect(success).toBe(true);
        });

        test('error handled', async () => {
            mockedStoreService.write.mockRejectedValueOnce(Error);
            const success = await storeCredentials('~name', target, { username, password }, logger);
            expect(success).toBe(false);
        });
    });

    describe('getCredentialsFromStore', () => {
        test('read credentials from store', async () => {
            mockedStoreService.read.mockResolvedValueOnce({ username, password });
            const credentials = await getCredentialsFromStore({ url: target.url }, logger);
            expect(credentials).toBeDefined();
        });

        test('fallback read without client parameter', async () => {
            mockedStoreService.read.mockImplementation((key: BackendSystemKey) =>
                key.getId().includes(target.client as string) ? undefined : {}
            );
            const credentials = await getCredentialsFromStore(target, logger);
            expect(credentials).toBeDefined();
        });

        test('handle error thrown by store', async () => {
            mockedStoreService.read.mockRejectedValue(Error);
            const credentials = await getCredentialsFromStore(target, logger);
            expect(credentials).toBeUndefined();
        });
    });

    describe('getCredentialsWithPrompts', () => {
        test('no default provided', async () => {
            prompts.inject([username, password]);
            const creds = await getCredentialsWithPrompts();
            expect(creds.username).toBe(username);
            expect(creds.password).toBe(password);
        });

        test('default provided', async () => {
            prompts.inject([undefined, password]);
            const providedUser = '~other';
            const creds = await getCredentialsWithPrompts(providedUser);
            expect(creds.username).toBe(providedUser);
            expect(creds.password).toBe(password);
        });
    });

    describe('getCredentialsFromEnvVariables', () => {
        afterEach(() => {
            delete process.env.FIORI_TOOLS_USER;
            delete process.env.FIORI_TOOLS_PASSWORD;
        });

        test('no variables', async () => {
            const credentials = await getCredentialsFromEnvVariables();
            expect(credentials).toBeUndefined();
        });

        test('no password', async () => {
            process.env.FIORI_TOOLS_USER = username;
            const credentials = await getCredentialsFromEnvVariables();
            expect(credentials).toBeUndefined();
        });

        test('username / password available', async () => {
            process.env.FIORI_TOOLS_USER = username;
            process.env.FIORI_TOOLS_PASSWORD = password;
            const credentials = await getCredentialsFromEnvVariables();
            expect(credentials).toEqual({ username, password });
        });
    });
});
