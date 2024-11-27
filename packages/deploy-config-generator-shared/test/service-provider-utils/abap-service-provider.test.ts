import { getOrCreateServiceProvider, deleteCachedServiceProvider } from '../../src/service-provider-utils';
import { isAppStudio } from '@sap-ux/btp-utils';
import { createAbapServiceProvider } from '@sap-ux/system-access';
import { PromptState } from '../../src/prompts/prompt-state';
import { AbapServiceProvider } from '@sap-ux/axios-extension';
import { AuthenticationType } from '@sap-ux/store';
import { ToolsLogger } from '@sap-ux/logger';

jest.mock('@sap-ux/system-access', () => ({
    ...jest.requireActual('@sap-ux/system-access'),
    createAbapServiceProvider: jest.fn()
}));

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn()
}));

const mockCreateAbapServiceProvider = createAbapServiceProvider as jest.Mock;
const mockIsAppStudio = isAppStudio as jest.Mock;
const logger = new ToolsLogger();

describe('getOrCreateServiceProvider', () => {
    afterEach(() => {
        deleteCachedServiceProvider();
    });

    it('should return an instance of AbapServiceProvider (VSCode)', async () => {
        mockIsAppStudio.mockReturnValueOnce(false);
        mockCreateAbapServiceProvider.mockResolvedValueOnce(new AbapServiceProvider());
        PromptState.abapDeployConfig = {
            url: 'http://target.url',
            client: '100',
            scp: false,
            isS4HC: true
        };

        const credentials = {
            username: 'user1',
            password: 'password1'
        };

        const serviceProvider = await getOrCreateServiceProvider({}, logger, undefined, credentials);

        expect(serviceProvider).toBeInstanceOf(AbapServiceProvider);
        expect(mockCreateAbapServiceProvider).toBeCalledWith(
            {
                url: 'http://target.url',
                client: '100',
                scp: false,
                authenticationType: AuthenticationType.ReentranceTicket
            },
            { ignoreCertErrors: false, auth: { username: 'user1', password: 'password1' } },
            false,
            logger
        );

        // use existing provider when called again
        const serviceProvider2 = await getOrCreateServiceProvider(
            {
                url: 'http://target.url',
                client: '100'
            },
            logger,
            undefined,
            credentials
        );
        expect(serviceProvider2).toBe(serviceProvider);
    });

    it('should return an instance of AbapServiceProvider (BAS)', async () => {
        mockIsAppStudio.mockReturnValueOnce(true);
        mockCreateAbapServiceProvider.mockResolvedValueOnce(new AbapServiceProvider());
        PromptState.abapDeployConfig = {
            destination: 'MOCK_DESTINATION'
        };

        const serviceProvider = await getOrCreateServiceProvider({}, logger);

        expect(serviceProvider).toBeInstanceOf(AbapServiceProvider);
        expect(mockCreateAbapServiceProvider).toBeCalledWith(
            {
                destination: 'MOCK_DESTINATION'
            },
            { ignoreCertErrors: false },
            false,
            logger
        );
    });

    it('should use connected service provider', async () => {
        mockIsAppStudio.mockReturnValueOnce(false);
        const abapServiceProvider = new AbapServiceProvider();
        const systemConfig = {
            destination: 'MOCK_DESTINATION'
        };

        const backendTarget = {
            abapTarget: systemConfig,
            serviceProvider: abapServiceProvider
        };

        const serviceProvider = await getOrCreateServiceProvider(systemConfig, logger, backendTarget);
        expect(serviceProvider).toBe(abapServiceProvider);
    });
});
