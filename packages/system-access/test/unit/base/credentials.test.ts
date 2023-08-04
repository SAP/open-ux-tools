import prompts from 'prompts';
import { getCredentialsWithPrompts, getCredentialsFromStore } from '../../../src/base/credentials';
import type { BackendSystemKey } from '@sap-ux/store';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';

const mockedStoreService = {
    read: jest.fn().mockReturnValue({})
};
jest.mock('@sap-ux/store', () => {
    return {
        ...jest.requireActual('@sap-ux/store'),
        getService: jest.fn().mockImplementation(() => Promise.resolve(mockedStoreService))
    };
});

describe('base/credentials', () => {
    const logger = new ToolsLogger({ transports: [new NullTransport()] });
    const target = {
        url: 'http://target.example',
        client: '001'
    };

    describe('getCredentials', () => {
        test('read credentials from store', async () => {
            const credentials = await getCredentialsFromStore({ url: target.url }, logger);
            expect(credentials).toBeDefined();
        });

        test('fallback read without client parameter', async () => {
            mockedStoreService.read.mockImplementation((key: BackendSystemKey) =>
                key.getId().includes(target.client) ? undefined : {}
            );
            const credentials = await getCredentialsFromStore(target, logger);
            expect(credentials).toBeDefined();
        });
    });

    describe('getCredentialsWithPrompts', () => {
        const username = '~user';
        const password = '~pass';

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
});
