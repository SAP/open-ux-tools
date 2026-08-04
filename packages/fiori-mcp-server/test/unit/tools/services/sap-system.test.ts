import { jest } from '@jest/globals';

// ── External dependency mocks ────────────────────────────────────────────────

const mockGetAll = jest.fn<any>();
const mockGetServiceStore = jest.fn<any>().mockResolvedValue({ getAll: mockGetAll });
jest.unstable_mockModule('@sap-ux/store', () => ({
    getService: mockGetServiceStore,
    getSapToolsDirectory: () => '/mock/.saptools'
}));

const mockListDestinations = jest.fn<any>();
const mockIsAbapODataDestination = jest.fn<any>().mockReturnValue(true);
const mockIsAppStudio = jest.fn<() => boolean>().mockReturnValue(false);
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    Authentication: { NO_AUTHENTICATION: 'NoAuthentication' },
    isAbapODataDestination: mockIsAbapODataDestination,
    isAppStudio: mockIsAppStudio,
    listDestinations: mockListDestinations
}));

const mockAbapServiceProvider = jest.fn<any>();
const mockCatalog = jest.fn<any>();
const mockListServices = jest.fn<any>();
const mockServiceFn = jest.fn<any>();
const mockMetadata = jest.fn<any>();
const mockTlsIsPatchRequired = jest.fn<any>().mockReturnValue(false);
const mockTlsApply = jest.fn<any>();

jest.unstable_mockModule('@sap-ux/axios-extension', () => ({
    AbapServiceProvider: mockAbapServiceProvider,
    ODataVersion: { v4: 'v4' },
    TlsPatch: { isPatchRequired: mockTlsIsPatchRequired, apply: mockTlsApply }
}));

const mockParseEdmx = jest.fn<any>();
jest.unstable_mockModule('@sap-ux/edmx-parser', () => ({ parse: mockParseEdmx }));

const mockXmlFormat = jest.fn<any>();
jest.unstable_mockModule('xml-formatter', () => ({ default: mockXmlFormat }));

jest.unstable_mockModule('../../../../src/utils/index.js', () => ({
    logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() }
}));

const { getSapSystems, getSystemsOrDestinations, findSystem, getServiceMetadata } =
    await import('../../../../src/tools/services/sap-system.js');

// ── Test data ────────────────────────────────────────────────────────────────

const SYSTEM_A = { name: 'SystemA', url: 'https://system-a.example.com', client: '100' };
const SYSTEM_B = { name: 'SystemB', url: 'https://system-b.example.com', client: '200' };

const DEST_A = {
    Name: 'DEST_A',
    Host: 'https://dest-a.example.com',
    'sap-client': '100',
    Authentication: 'BasicAuthentication'
};
const DEST_B = {
    Name: 'DEST_B',
    Host: 'https://dest-b.example.com',
    'sap-client': '200',
    Authentication: 'BasicAuthentication'
};
const DEST_NOAUTH = {
    Name: 'DEST_NOAUTH',
    Host: 'https://noauth.example.com',
    'sap-client': '',
    Authentication: 'NoAuthentication'
};

const SAMPLE_METADATA =
    '<edmx:Edmx Version="4.0"><edmx:DataServices><Schema Namespace="test"/></edmx:DataServices></edmx:Edmx>';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeProviderMock() {
    const service = { metadata: mockMetadata };
    mockServiceFn.mockReturnValue(service);
    mockListServices.mockResolvedValue([]);
    mockCatalog.mockReturnValue({ listServices: mockListServices });
    mockAbapServiceProvider.mockImplementation(() => ({
        catalog: mockCatalog,
        service: mockServiceFn
    }));
}

// ── getSapSystems ────────────────────────────────────────────────────────────

describe('getSapSystems', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetAll.mockResolvedValue([SYSTEM_A, SYSTEM_B]);
    });

    test('returns all systems without sensitive data by default', async () => {
        const result = await getSapSystems();
        expect(mockGetAll).toHaveBeenCalledWith({ includeSensitiveData: false });
        expect(result).toEqual([SYSTEM_A, SYSTEM_B]);
    });

    test('passes includeSensitiveData=true when requested', async () => {
        await getSapSystems(true);
        expect(mockGetAll).toHaveBeenCalledWith({ includeSensitiveData: true });
    });
});

// ── getSystemsOrDestinations ─────────────────────────────────────────────────

describe('getSystemsOrDestinations', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetAll.mockResolvedValue([SYSTEM_A, SYSTEM_B]);
        mockIsAppStudio.mockReturnValue(false);
        mockIsAbapODataDestination.mockReturnValue(true);
        mockListDestinations.mockResolvedValue({ DEST_A, DEST_B, DEST_NOAUTH });
    });

    test('returns BackendSystems when not on BAS', async () => {
        const result = await getSystemsOrDestinations();
        expect(result).toEqual([SYSTEM_A, SYSTEM_B]);
    });

    test('returns filtered Destinations on BAS', async () => {
        mockIsAppStudio.mockReturnValue(true);
        mockIsAbapODataDestination.mockImplementation((d: any) => d.Name !== 'DEST_NOAUTH');
        const result = await getSystemsOrDestinations();
        // DEST_NOAUTH has Authentication === NO_AUTHENTICATION so it should be filtered out
        const names = (result as any[]).map((d: any) => d.Name);
        expect(names).toContain('DEST_A');
        expect(names).toContain('DEST_B');
        expect(names).not.toContain('DEST_NOAUTH');
    });

    test('filters out NO_AUTHENTICATION destinations on BAS', async () => {
        mockIsAppStudio.mockReturnValue(true);
        mockIsAbapODataDestination.mockReturnValue(true);
        // DEST_NOAUTH.Authentication === 'NoAuthentication' matches Authentication.NO_AUTHENTICATION mock value
        const result = await getSystemsOrDestinations();
        expect((result as any[]).map((d: any) => d.Name)).not.toContain('DEST_NOAUTH');
    });
});

// ── findSystem ───────────────────────────────────────────────────────────────

describe('findSystem', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockIsAppStudio.mockReturnValue(false);
        mockGetAll.mockResolvedValue([SYSTEM_A, SYSTEM_B]);
    });

    test('finds system by exact name', async () => {
        const result = await findSystem('SystemA');
        expect(result.system).toEqual(SYSTEM_A);
        expect(result.message).toBeUndefined();
    });

    test('finds system by case-insensitive name', async () => {
        const result = await findSystem('systema');
        expect(result.system).toEqual(SYSTEM_A);
    });

    test('finds system by prefix', async () => {
        const result = await findSystem('SystemA');
        expect(result.system).toEqual(SYSTEM_A);
    });

    test('finds system by partial name', async () => {
        const result = await findSystem('emA');
        expect(result.system).toEqual(SYSTEM_A);
    });

    test('finds system by host URL', async () => {
        const result = await findSystem('https://system-a.example.com');
        expect(result.system).toEqual(SYSTEM_A);
    });

    test('returns undefined with message when no system matches', async () => {
        const result = await findSystem('NoSuchSystem');
        expect(result.system).toBeUndefined();
        expect(result.message).toMatch(/No matching system found/);
    });

    test('returns undefined with message when multiple systems match', async () => {
        const sharedOrigin = 'https://shared.example.com';
        mockGetAll.mockResolvedValue([
            { name: 'SysAlpha', url: sharedOrigin, client: '100' },
            { name: 'SysBeta', url: sharedOrigin, client: '200' }
        ]);
        // No name match, no exact/partial match, but URL match returns both
        const result = await findSystem(sharedOrigin);
        expect(result.system).toBeUndefined();
        expect(result.message).toMatch(/Multiple systems found/);
    });
});

// ── getServiceMetadata ───────────────────────────────────────────────────────

describe('getServiceMetadata — VSCode', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockIsAppStudio.mockReturnValue(false);
        mockParseEdmx.mockReturnValue({ schemas: [] });
        mockXmlFormat.mockReturnValue(SAMPLE_METADATA);
        mockMetadata.mockResolvedValue(SAMPLE_METADATA);
        makeProviderMock();
    });

    test('fetches and returns formatted metadata', async () => {
        const result = await getServiceMetadata(SYSTEM_A, '/sap/opu/odata4/svc/');
        expect(mockMetadata).toHaveBeenCalledTimes(1);
        expect(result).toBe(SAMPLE_METADATA);
    });

    test('strips $metadata suffix from service path', async () => {
        await getServiceMetadata(SYSTEM_A, '/sap/opu/odata4/svc/$metadata');
        expect(mockServiceFn).toHaveBeenCalledWith('/sap/opu/odata4/svc/');
    });

    test('uses catalog match when service is listed', async () => {
        mockListServices.mockResolvedValue([{ path: '/sap/opu/odata4/matched/' }]);
        await getServiceMetadata(SYSTEM_A, '/sap/opu/odata4/matched/');
        expect(mockServiceFn).toHaveBeenCalledWith('/sap/opu/odata4/matched/');
    });

    test('sets basic auth when system has username and password', async () => {
        const systemWithAuth = { ...SYSTEM_A, username: 'user', password: 'pass' };
        await getServiceMetadata(systemWithAuth, '/sap/svc/');
        const [config] = mockAbapServiceProvider.mock.calls[0] as any[];
        expect(config.auth).toEqual({ username: 'user', password: 'pass' });
    });

    test('applies TLS patch when required', async () => {
        mockTlsIsPatchRequired.mockReturnValue(true);
        await getServiceMetadata(SYSTEM_A, '/sap/svc/');
        expect(mockTlsApply).toHaveBeenCalledTimes(1);
    });

    test('falls back to raw metadata when xml-formatter throws', async () => {
        mockXmlFormat.mockImplementation(() => {
            throw new Error('format error');
        });
        const result = await getServiceMetadata(SYSTEM_A, '/sap/svc/');
        expect(result).toBe(SAMPLE_METADATA);
    });

    test('throws when metadata is not parseable EDMX', async () => {
        mockParseEdmx.mockReturnValue(undefined);
        await expect(getServiceMetadata(SYSTEM_A, '/sap/svc/')).rejects.toThrow(/Failed to parse service metadata/);
    });

    test('includes parse error reason in thrown message', async () => {
        mockParseEdmx.mockImplementation(() => {
            throw new Error('unexpected token');
        });
        await expect(getServiceMetadata(SYSTEM_A, '/sap/svc/')).rejects.toThrow(/unexpected token/);
    });
});
