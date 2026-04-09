import { jest } from '@jest/globals';
import { AbapServiceProvider } from '@sap-ux/axios-extension';
import { AuthenticationType } from '@sap-ux/store';
import { t } from '../../src/i18n';

const mockCreateAbapServiceProvider = jest.fn();
const mockIsAppStudio = jest.fn();

jest.unstable_mockModule('@sap-ux/system-access', () => ({
    createAbapServiceProvider: mockCreateAbapServiceProvider
}));

jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    isAppStudio: mockIsAppStudio,
    isOnPremiseDestination: jest.fn(),
    listDestinations: jest.fn(),
    isAbapEnvironmentOnBtp: jest.fn(),
    isS4HC: jest.fn(),
    getDisplayName: jest.fn(),
    isAbapSystem: jest.fn(),
    isAbapODataDestination: jest.fn(),
    isFullUrlDestination: jest.fn(),
    isPartialUrlDestination: jest.fn(),
    isGenericODataDestination: jest.fn(),
    isHTML5DynamicConfigured: jest.fn(),
    getDestinationUrlForAppStudio: jest.fn(),
    getAppStudioProxyURL: jest.fn(),
    getAppStudioBaseURL: jest.fn(),
    getCredentialsForDestinationService: jest.fn(),
    exposePort: jest.fn(),
    generateABAPCloudDestinationName: jest.fn(),
    createOAuth2UserTokenExchangeDest: jest.fn(),
    BAS_DEST_INSTANCE_CRED_HEADER: 'bas-destination-instance-cred',
    DestinationType: {},
    Authentication: {},
    Suffix: {},
    ProxyType: {},
    WebIDEUsage: {},
    WebIDEAdditionalData: {},
    AbapEnvType: {},
    DestinationProxyType: {},
    OAuthUrlType: {},
    ENV: {}
}));

const { AbapServiceProviderManager } = await import('../../src/service-provider-utils/abap-service-provider');
const { PromptState } = await import('../../src/prompts/prompt-state');
const LoggerHelper = (await import('../../src/logger-helper')).default;

describe('getOrCreateServiceProvider', () => {
    beforeAll(() => {
        // Since having this environment variable set to '0' affects behaviour
        // we need to delete it before running the tests. There are specific tests for
        // testing the behaviour with this variable set to '0'
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    });

    afterEach(() => {
        AbapServiceProviderManager.deleteExistingServiceProvider();
    });

    beforeEach(() => {
        AbapServiceProviderManager.resetIsDefaultProviderAbapCloud();
    });

    it('should return an instance of AbapServiceProvider (VSCode)', async () => {
        const abapServiceProvider = new AbapServiceProvider();
        mockIsAppStudio.mockReturnValueOnce(false);
        mockCreateAbapServiceProvider.mockResolvedValueOnce(abapServiceProvider);
        PromptState.abapDeployConfig = {
            url: 'http://target.url',
            client: '100',
            scp: false,
            isAbapCloud: true
        };

        const credentials = {
            username: 'user1',
            password: 'password1'
        };
        const isAbapCloudSpy = jest.spyOn(abapServiceProvider, 'isAbapCloud');
        const serviceProvider = await AbapServiceProviderManager.getOrCreateServiceProvider(undefined, credentials);

        expect(serviceProvider).toBeInstanceOf(AbapServiceProvider);
        expect(isAbapCloudSpy).toHaveBeenCalled();
        expect(mockCreateAbapServiceProvider).toHaveBeenCalledWith(
            {
                url: 'http://target.url',
                client: '100',
                scp: false,
                authenticationType: AuthenticationType.ReentranceTicket
            },
            { ignoreCertErrors: false, auth: { username: 'user1', password: 'password1' } },
            false,
            LoggerHelper.logger
        );

        // use existing provider when called again
        const serviceProvider2 = await AbapServiceProviderManager.getOrCreateServiceProvider(undefined, credentials);
        expect(serviceProvider2).toBe(serviceProvider);
    });

    it('should return an instance of AbapServiceProvider (BAS)', async () => {
        mockIsAppStudio.mockReturnValueOnce(true);
        const abapServiceProvider = new AbapServiceProvider();
        mockCreateAbapServiceProvider.mockResolvedValueOnce(abapServiceProvider);
        PromptState.abapDeployConfig = {
            destination: 'MOCK_DESTINATION'
        };
        const isAbapCloudSpy = jest.spyOn(abapServiceProvider, 'isAbapCloud');
        const serviceProvider = await AbapServiceProviderManager.getOrCreateServiceProvider();

        expect(serviceProvider).toBeInstanceOf(AbapServiceProvider);
        expect(isAbapCloudSpy).toHaveBeenCalled();
        expect(mockCreateAbapServiceProvider).toHaveBeenCalledWith(
            {
                destination: 'MOCK_DESTINATION'
            },
            { ignoreCertErrors: false },
            false,
            LoggerHelper.logger
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

        const serviceProvider = await AbapServiceProviderManager.getOrCreateServiceProvider(backendTarget);
        expect(serviceProvider).toBe(abapServiceProvider);
    });

    it('should get is default created service provider abap cloud', async () => {
        const abapServiceProvider = new AbapServiceProvider();
        mockIsAppStudio.mockReturnValueOnce(false);
        mockCreateAbapServiceProvider.mockResolvedValueOnce(abapServiceProvider);
        PromptState.abapDeployConfig = {
            url: 'http://target.url',
            client: '100',
            scp: false,
            isAbapCloud: true
        };

        const credentials = {
            username: 'user1',
            password: 'password1'
        };
        jest.spyOn(abapServiceProvider, 'isAbapCloud').mockResolvedValueOnce(true);
        await AbapServiceProviderManager.getOrCreateServiceProvider(undefined, credentials);
        expect(AbapServiceProviderManager.getIsDefaultProviderAbapCloud()).toBe(true);
    });

    it('should apply node setting `NODE_TLS_REJECT_UNAUTHORIZED=0` if set', async () => {
        // Set the environment variable to simulate the scenario
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        const logWarnSpy = jest.spyOn(LoggerHelper.logger, 'warn');
        const createNewServiceProviderSpy = jest.spyOn(AbapServiceProviderManager as any, 'createNewServiceProvider');
        const buildRequestOptionsSpy = jest.spyOn(AbapServiceProviderManager as any, 'buildRequestOptions');
        await AbapServiceProviderManager.getOrCreateServiceProvider(undefined);
        expect(logWarnSpy).toHaveBeenCalledWith(t('warnings.allowingUnauthorizedCertsNode'));
        expect(createNewServiceProviderSpy).toHaveBeenCalledWith(
            undefined,
            undefined,
            true // ignoreCertErrors should be true
        );
        expect(buildRequestOptionsSpy).toHaveBeenCalledWith(undefined, true);
    });
});
