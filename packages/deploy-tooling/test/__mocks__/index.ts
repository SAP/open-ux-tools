import { jest } from '@jest/globals';

// Define all mock objects directly - these are shared across test files
export const mockedAdtService = {
    createTransportRequest: jest.fn(),
    listPackages: jest.fn().mockResolvedValue([]),
    getTransportRequests: jest.fn(),
    getAtoInfo: jest.fn()
};

export const mockedUi5RepoService = {
    defaults: {},
    deploy: jest.fn(),
    undeploy: jest.fn()
};

export const mockedLrepService = {
    defaults: {},
    deploy: jest.fn(),
    undeploy: jest.fn()
};

export const mockedProvider = {
    defaults: {},
    getUi5AbapRepository: jest.fn().mockReturnValue(mockedUi5RepoService),
    getLayeredRepository: jest.fn().mockReturnValue(mockedLrepService),
    getAdtService: jest.fn().mockReturnValue(mockedAdtService)
};

export const mockedStoreService = {
    read: jest.fn().mockReturnValue({})
};

export const mockCreateForAbap = jest.fn().mockReturnValue(mockedProvider);
export const mockCreateForDestination = jest.fn().mockReturnValue(mockedProvider);
export const mockCreateForAbapOnCloud = jest.fn().mockReturnValue(mockedProvider);

// Stub classes for @sap-ux/axios-extension
class TransportChecksService {
    static readonly LocalPackageError = 'LocalPackageError';
}

class ListPackageService {}

class AtoService {}

class TransportRequestService {}

// Set up the module mocks
jest.unstable_mockModule('@sap-ux/axios-extension', () => ({
    createForAbap: mockCreateForAbap,
    createForAbapOnCloud: mockCreateForAbapOnCloud,
    createForDestination: mockCreateForDestination,
    isAxiosError: (error: any) => error?.isAxiosError === true,
    TransportChecksService,
    ListPackageService,
    AtoService,
    TransportRequestService,
    AbapCloudEnvironment: {},
    Ui5AbapRepositoryService: class {},
    LayeredRepositoryService: class {}
}));

jest.unstable_mockModule('@sap-ux/store', () => ({
    getService: jest.fn().mockResolvedValue(mockedStoreService),
    SystemService: class {},
    BackendSystem: class {},
    BackendSystemKey: class {
        static from(system: any) { return new this({ url: system?.url, client: system?.client }); }
        private url: string;
        private client?: string;
        constructor({ url, client }: { url: string; client?: string }) {
            this.url = url;
            this.client = client;
        }
        getId() { return this.url + (this.client ? '/' + this.client : ''); }
    },
    Entity: { BackendSystem: 'system', TelemetrySetting: 'telemetrySetting' },
    AuthenticationType: {
        Basic: 'basic',
        ReentranceTicket: 'reentranceTicket',
        OAuth2RefreshToken: 'oauth2',
        OAuth2ClientCredential: 'oauth2ClientCredential'
    },
    SystemType: {
        AbapCloud: 'AbapCloud',
        AbapOnPrem: 'OnPrem',
        Generic: 'Generic'
    },
    ConnectionType: {
        AbapCatalog: 'abap_catalog',
        GenericHost: 'generic_host',
        ODataService: 'odata_service'
    },
    getBackendSystemType: jest.fn(),
    getFioriToolsDirectory: jest.fn().mockReturnValue('/mock/.fioritools'),
    getSapToolsDirectory: jest.fn().mockReturnValue('/mock/.saptools'),
    getFilesystemWatcherFor: jest.fn(),
    FioriToolsSettings: { dir: '.fioritools' },
    SapTools: { dir: '.saptools' },
    ApiHubSettingsService: class {},
    ApiHubSettings: class {},
    ApiHubSettingsKey: class {},
    TelemetrySetting: class {},
    TelemetrySettingKey: class {}
}));
