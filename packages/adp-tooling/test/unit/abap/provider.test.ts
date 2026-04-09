import { jest } from '@jest/globals';
import type { ToolsLogger } from '@sap-ux/logger';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

// MOCKS - use jest.unstable_mockModule for ESM compatibility
const mockIsAppStudio = jest.fn();
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    isAppStudio: mockIsAppStudio,
    listDestinations: jest.fn(),
    getAppStudioProxyURL: jest.fn(),
    getAppStudioBaseURL: jest.fn(),
    getCredentialsForDestinationService: jest.fn(),
    getDestinationUrlForAppStudio: jest.fn(),
    exposePort: jest.fn(),
    generateABAPCloudDestinationName: jest.fn(),
    createOAuth2UserTokenExchangeDest: jest.fn(),
    BAS_DEST_INSTANCE_CRED_HEADER: 'bas-destination-instance-cred',
    isAbapSystem: jest.fn(),
    isAbapEnvironmentOnBtp: jest.fn(),
    isGenericODataDestination: jest.fn(),
    isPartialUrlDestination: jest.fn(),
    isFullUrlDestination: jest.fn(),
    isOnPremiseDestination: jest.fn(),
    isHTML5DynamicConfigured: jest.fn(),
    getDisplayName: jest.fn(),
    isS4HC: jest.fn(),
    isAbapODataDestination: jest.fn(),
    AbapEnvType: {},
    DestinationType: {},
    OAuthUrlType: {},
    Authentication: {},
    Suffix: {},
    ProxyType: {},
    WebIDEUsage: {},
    WebIDEAdditionalData: {},
    DestinationProxyType: {}
}));

const mockCreateAbapServiceProvider = jest.fn();
jest.unstable_mockModule('@sap-ux/system-access', () => ({
    createAbapServiceProvider: mockCreateAbapServiceProvider,
    isUrlTarget: jest.fn(),
    isDestinationTarget: jest.fn(),
    isBasicAuth: jest.fn(),
    isServiceAuth: jest.fn(),
    getCredentialsFromStore: jest.fn(),
    storeCredentials: jest.fn(),
    getCredentialsFromEnvVariables: jest.fn(),
    getCredentialsWithPrompts: jest.fn(),
    questions: {},
    inquirer: {}
}));

const mockGetProviderConfig = jest.fn();
jest.unstable_mockModule('../../../src/abap/config', () => ({
    getProviderConfig: mockGetProviderConfig
}));

const { getConfiguredProvider } = await import('../../../src/abap/provider');

const logger = {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
} as unknown as ToolsLogger;

const dummyProvider = {} as unknown as AbapServiceProvider;

const system = 'SYS_010';
const client = '010';
const username = 'user1';
const password = 'pass1';

describe('getConfiguredProvider', () => {
    beforeEach(() => {
        mockIsAppStudio.mockReturnValue(false);
        mockCreateAbapServiceProvider.mockResolvedValue(dummyProvider);
        mockGetProviderConfig.mockResolvedValue({ system, client });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return a configured provider when called with credentials', async () => {
        const provider = await getConfiguredProvider({ system, client, username, password }, logger);

        expect(mockCreateAbapServiceProvider).toHaveBeenCalled();
        expect(provider).toBe(dummyProvider);
    });

    it('should return a configured provider when called without credentials', async () => {
        const provider = await getConfiguredProvider({ system, client }, logger);
        expect(mockCreateAbapServiceProvider).toHaveBeenCalled();
        expect(provider).toBe(dummyProvider);
    });

    it('should log an error and throw if provider creation fails', async () => {
        const error = new Error('Provider creation failed');
        mockCreateAbapServiceProvider.mockRejectedValueOnce(error);

        await expect(getConfiguredProvider({ system, client }, logger)).rejects.toThrow('Provider creation failed');
        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining(`Failed to instantiate provider for system: ${system}`)
        );
    });
});
