import { jest } from '@jest/globals';

// Mock functions
export const mockIsAppStudio = jest.fn<() => boolean>().mockReturnValue(false);
export const mockIsAbapSystem = jest.fn<() => boolean>().mockReturnValue(true);
export const mockListDestinations = jest.fn();
export const mockReadFileSync = jest.fn();

export const mockedStoreService = {
    read: jest.fn().mockReturnValue(undefined),
    write: jest.fn()
};
const mockGetService = jest.fn().mockResolvedValue(mockedStoreService);

// Mock @sap-ux/btp-utils
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    isAppStudio: mockIsAppStudio,
    isAbapSystem: mockIsAbapSystem,
    listDestinations: mockListDestinations
}));

// Inline the constants and classes from @sap-ux/store to avoid OOM from dynamic import
const AuthenticationType = {
    Basic: 'basic',
    ReentranceTicket: 'reentranceTicket',
    OAuth2RefreshToken: 'oauth2',
    OAuth2ClientCredential: 'oauth2ClientCredential'
} as const;

const SystemType = {
    AbapCloud: 'AbapCloud',
    AbapOnPrem: 'OnPrem',
    Generic: 'Generic'
} as const;

const ConnectionType = {
    AbapCatalog: 'abap_catalog',
    GenericHost: 'generic_host',
    ODataService: 'odata_service'
} as const;

class BackendSystemKey {
    private readonly url: string;
    private readonly client?: string;
    constructor({ url, client }: { url: string; client?: string }) {
        this.url = url.trim().replace(/\/$/, '');
        this.client = client?.trim();
    }
    public getId(): string {
        return this.url + `${this.client ? '/' + this.client : ''}`;
    }
}

class BackendSystem {
    public readonly name: string;
    public readonly url: string;
    public readonly client?: string;
    public readonly systemType: any;
    public readonly connectionType: any;
    public readonly serviceKeys?: unknown;
    public readonly refreshToken?: string;
    public readonly username?: string;
    public readonly password?: string;
    public readonly userDisplayName?: string;
    public readonly authenticationType?: any;
    public readonly hasSensitiveData?: boolean;
    constructor(opts: any) {
        Object.assign(this, opts);
    }
}

const Entity = {
    System: 'system',
    TelemetrySetting: 'telemetrySetting',
    ApiHub: 'api-hub'
} as const;

jest.unstable_mockModule('@sap-ux/store', () => ({
    getService: mockGetService,
    AuthenticationType,
    SystemType,
    ConnectionType,
    BackendSystemKey,
    BackendSystem,
    Entity,
    getBackendSystemType: jest.fn(),
    getFilesystemWatcherFor: jest.fn(),
    getFioriToolsDirectory: jest.fn(),
    getSapToolsDirectory: jest.fn()
}));

// Mock @sap-ux/axios-extension to avoid OOM from its large dependency tree
export const mockCreateForAbap = jest.fn();
export const mockCreateForAbapOnCloud = jest.fn();
export const mockCreateForDestination = jest.fn();

jest.unstable_mockModule('@sap-ux/axios-extension', () => ({
    AbapCloudEnvironment: {
        Standalone: 'standalone',
        EmbeddedSteampunk: 'embeddedsteampunk'
    },
    createForAbapOnCloud: mockCreateForAbapOnCloud,
    createForAbap: mockCreateForAbap,
    createForDestination: mockCreateForDestination
}));

// Mock @sap-ux/logger
const mockLoggerFns = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
};

export class MockToolsLogger {
    info = mockLoggerFns.info;
    warn = mockLoggerFns.warn;
    error = mockLoggerFns.error;
    debug = mockLoggerFns.debug;
    constructor(_opts?: any) {}
}

export class MockNullTransport {
    constructor() {}
}

jest.unstable_mockModule('@sap-ux/logger', () => ({
    ToolsLogger: MockToolsLogger,
    NullTransport: MockNullTransport
}));

// Mock node:fs - only mock readFileSync, keep everything else
jest.unstable_mockModule('node:fs', () => ({
    readFileSync: mockReadFileSync,
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
    readdirSync: jest.fn(),
    statSync: jest.fn(),
    unlinkSync: jest.fn(),
    rmdirSync: jest.fn(),
    copyFileSync: jest.fn(),
    renameSync: jest.fn(),
    accessSync: jest.fn(),
    chmodSync: jest.fn()
}));
