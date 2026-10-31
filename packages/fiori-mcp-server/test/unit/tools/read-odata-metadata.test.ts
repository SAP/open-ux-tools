import { jest } from '@jest/globals';

const mockLoggerWarn = jest.fn<any>();
const mockLoggerInfo = jest.fn<any>();
const mockFormatXml = jest.fn<any>((xml: string) => `<formatted>${xml}</formatted>`);
// Mirrors the real persistMetadata: inline when small, spill to a file reference when large.
const mockPersistMetadata = jest.fn<any>((appPath: string, uri: string, formatted: string) =>
    formatted.length < 100_000
        ? { metadata: formatted }
        : { metadataFile: `${appPath}/.context/${uri}-metadata.xml`, sizeBytes: formatted.length }
);

const mockGetMergedManifest = jest.fn<() => Promise<object>>();
jest.unstable_mockModule('../../../src/utils', () => ({
    formatXml: mockFormatXml,
    persistMetadata: mockPersistMetadata,
    logger: {
        warn: mockLoggerWarn,
        info: mockLoggerInfo,
        error: jest.fn(),
        debug: jest.fn()
    }
}));

const mockReadUi5Config = jest.fn<any>();
const mockIsCFEnvironment = jest.fn<any>().mockResolvedValue(false);
jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    readUi5Config: mockReadUi5Config,
    isCFEnvironment: mockIsCFEnvironment,
    getMergedManifest: mockGetMergedManifest
}));

const mockCreateAbapServiceProvider = jest.fn<any>();
jest.unstable_mockModule('@sap-ux/system-access', () => ({
    createAbapServiceProvider: mockCreateAbapServiceProvider
}));

const { readODataMetadataAdp } = await import('../../../src/tools/read-odata-metadata.js');
const { ReadODataMetadataOutputSchema } = await import('../../../src/types/output.js');

const APP_PATH = '/tmp/myapp';

function makeMetadata(rawXml = '<edmx/>') {
    return jest.fn<any>().mockResolvedValue(rawXml);
}

function makeAbapProvider(serviceMetadata = makeMetadata()) {
    return {
        service: jest.fn<any>().mockReturnValue({ metadata: serviceMetadata })
    };
}

describe('readODataMetadataAdp', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockIsCFEnvironment.mockResolvedValue(false);
        mockFormatXml.mockImplementation((xml: string) => `<formatted>${xml}</formatted>`);
        mockReadUi5Config.mockResolvedValue({
            findCustomMiddleware: jest.fn<any>().mockReturnValue({
                configuration: { adp: { target: { url: 'http://host', client: '100' } } }
            })
        });
    });

    function setupProvider(
        dataSources: Record<string, { type: string; uri: string }>,
        ui5Models: Record<string, unknown> = {}
    ) {
        const provider = makeAbapProvider();
        mockCreateAbapServiceProvider.mockReturnValue(provider);
        mockGetMergedManifest.mockResolvedValue({
            'sap.app': { dataSources },
            'sap.ui5': { models: ui5Models }
        });
        return provider;
    }

    test('returns entries only for OData data sources, skips non-OData', async () => {
        setupProvider({
            mainService: { type: 'OData', uri: '/sap/opu/odata/main' },
            annotationService: { type: 'ODataAnnotation', uri: '/sap/bc/annotation' }
        });

        const result = await readODataMetadataAdp({ appPath: APP_PATH });

        expect(result.entries).toHaveLength(1);
        expect(result.entries[0].id).toEqual('mainService');
        expect(result.entries[0].url).toEqual('/sap/opu/odata/main');
        expect(result.entries[0].metadata).toEqual('<formatted><edmx/></formatted>');
        expect(mockGetMergedManifest).toHaveBeenCalledWith(APP_PATH);
    });

    test('attaches matching ui5 model to entry', async () => {
        const model = { dataSource: 'mainService', settings: { defaultCountMode: 'None' } };
        setupProvider({ mainService: { type: 'OData', uri: '/sap/opu/odata/main' } }, { '': model });

        const result = await readODataMetadataAdp({ appPath: APP_PATH });

        expect(result.entries[0].model).toEqual(model);
    });

    test('persists metadata keyed by the data-source URI and returns it inline when small', async () => {
        setupProvider({ mainService: { type: 'OData', uri: '/sap/opu/odata/main' } });

        const result = await readODataMetadataAdp({ appPath: APP_PATH });

        expect(mockPersistMetadata).toHaveBeenCalledWith(APP_PATH, '/sap/opu/odata/main', expect.any(String));
        expect(result.entries[0]).toHaveProperty('metadata');
        expect(ReadODataMetadataOutputSchema.safeParse(result).success).toBe(true);
    });

    test('spills large metadata to a file reference instead of returning it inline', async () => {
        const provider = setupProvider({ mainService: { type: 'OData', uri: '/sap/opu/odata/main' } });
        provider.service.mockReturnValue({ metadata: jest.fn<any>().mockResolvedValue('x'.repeat(200_000)) });

        const result = await readODataMetadataAdp({ appPath: APP_PATH });

        expect(result.entries[0]).toHaveProperty('metadataFile');
        expect(result.entries[0]).not.toHaveProperty('metadata');
        expect(ReadODataMetadataOutputSchema.safeParse(result).success).toBe(true);
    });

    test('passes url and client from ui5.yaml to createAbapServiceProvider', async () => {
        mockReadUi5Config.mockResolvedValue({
            findCustomMiddleware: jest.fn<any>().mockReturnValue({
                configuration: { adp: { target: { url: 'http://myhost', client: '200' } } }
            })
        });
        setupProvider({});

        await readODataMetadataAdp({ appPath: APP_PATH });

        expect(mockCreateAbapServiceProvider).toHaveBeenCalledWith(
            { url: 'http://myhost', client: '200' },
            { ignoreCertErrors: false },
            false,
            expect.anything()
        );
    });

    test('defaults url and client to empty strings when middleware is not configured', async () => {
        mockReadUi5Config.mockResolvedValue({
            findCustomMiddleware: jest.fn<any>().mockReturnValue(undefined)
        });
        setupProvider({});

        await readODataMetadataAdp({ appPath: APP_PATH });

        expect(mockCreateAbapServiceProvider).toHaveBeenCalledWith(
            { url: '', client: '' },
            expect.anything(),
            expect.anything(),
            expect.anything()
        );
    });

    test('fetches each OData service and detects the environment only once', async () => {
        const provider = setupProvider({
            main: { type: 'OData', uri: '/odata/main' },
            secondary: { type: 'OData', uri: '/odata/secondary' }
        });

        const result = await readODataMetadataAdp({ appPath: APP_PATH });

        expect(result.entries.map((entry) => entry.id)).toEqual(['main', 'secondary']);
        expect(provider.service).toHaveBeenCalledWith('/odata/main');
        expect(provider.service).toHaveBeenCalledWith('/odata/secondary');
        expect(mockIsCFEnvironment).toHaveBeenCalledTimes(1);
    });

    test('ignores models without a data source and keeps the last matching model', async () => {
        const model = { dataSource: 'main', settings: { sizeLimit: 100 } };
        setupProvider(
            { main: { type: 'OData', uri: '/odata/main' }, unbound: { type: 'OData', uri: '/odata/unbound' } },
            { resource: { type: 'sap.ui.model.resource.ResourceModel' }, first: { dataSource: 'main' }, last: model }
        );

        const result = await readODataMetadataAdp({ appPath: APP_PATH });

        expect(result.entries[0].model).toEqual(model);
        expect(result.entries[1].model).toBeUndefined();
    });

    test('returns a per-service error entry without persisting when metadata() fails', async () => {
        const provider = setupProvider({ main: { type: 'OData', uri: '/odata/main' } });
        const error = new Error('Metadata unavailable');
        provider.service.mockReturnValue({ metadata: jest.fn<() => Promise<string>>().mockRejectedValue(error) });

        const result = await readODataMetadataAdp({ appPath: APP_PATH });

        expect(result.entries[0]).toEqual({
            id: 'main',
            url: '/odata/main',
            model: undefined,
            error: 'Metadata unavailable'
        });
        expect(mockPersistMetadata).not.toHaveBeenCalled();
        expect(ReadODataMetadataOutputSchema.safeParse(result).success).toBe(true);
    });

    test('one failing service does not fail the others', async () => {
        const provider = setupProvider({
            good: { type: 'OData', uri: '/odata/good' },
            bad: { type: 'OData', uri: '/odata/bad' }
        });
        provider.service.mockImplementation((uri: string) => ({
            metadata:
                uri === '/odata/bad'
                    ? jest.fn<any>().mockRejectedValue(new Error('boom'))
                    : jest.fn<any>().mockResolvedValue('<edmx/>')
        }));

        const result = await readODataMetadataAdp({ appPath: APP_PATH });

        expect(result.entries).toHaveLength(2);
        expect(result.entries.find((e) => e.id === 'good')).toHaveProperty('metadata');
        expect(result.entries.find((e) => e.id === 'bad')).toHaveProperty('error', 'boom');
        expect(ReadODataMetadataOutputSchema.safeParse(result).success).toBe(true);
    });

    describe('Cloud Foundry projects', () => {
        function setupCfProvider(
            dataSources: Record<string, { type: string; uri: string }>,
            ui5Models: Record<string, unknown> = {}
        ) {
            mockIsCFEnvironment.mockResolvedValue(true);
            mockGetMergedManifest.mockResolvedValue({
                'sap.app': { dataSources },
                'sap.ui5': { models: ui5Models }
            });
        }

        test('uses the merged manifest builder and does not create an ABAP service provider', async () => {
            setupCfProvider({ mainService: { type: 'OData', uri: '/odata/v4/main/' } });

            await readODataMetadataAdp({ appPath: APP_PATH });

            expect(mockGetMergedManifest).toHaveBeenCalledWith(APP_PATH);
            expect(mockReadUi5Config).not.toHaveBeenCalled();
            expect(mockCreateAbapServiceProvider).not.toHaveBeenCalled();
        });

        test('returns OData data sources with empty metadata (EDMX unavailable for CF)', async () => {
            setupCfProvider({
                mainService: { type: 'OData', uri: '/odata/v4/main/' },
                annotationService: { type: 'ODataAnnotation', uri: '/annotation' }
            });

            const result = await readODataMetadataAdp({ appPath: APP_PATH });

            expect(result.entries).toHaveLength(1);
            expect(result.entries[0].id).toEqual('mainService');
            expect(result.entries[0].url).toEqual('/odata/v4/main/');
            expect(result.entries[0].metadata).toEqual('');
        });

        test.each([{}, { 'sap.app': {} }, { 'sap.app': { dataSources: {} } }])(
            'returns no entries for a manifest without data sources: %j',
            async (manifest) => {
                mockIsCFEnvironment.mockResolvedValue(true);
                mockGetMergedManifest.mockResolvedValue(manifest);

                await expect(readODataMetadataAdp({ appPath: APP_PATH })).resolves.toEqual({ entries: [] });

                expect(mockCreateAbapServiceProvider).not.toHaveBeenCalled();
            }
        );

        test('attaches matching ui5 model to CF entry', async () => {
            const model = { dataSource: 'mainService', settings: {} };
            setupCfProvider({ mainService: { type: 'OData', uri: '/odata/v4/main/' } }, { '': model });

            const result = await readODataMetadataAdp({ appPath: APP_PATH });

            expect(result.entries[0].model).toEqual(model);
        });

        test('does not attempt to fetch or write metadata for CF', async () => {
            setupCfProvider({ mainService: { type: 'OData', uri: '/odata/v4/main/' } });

            await readODataMetadataAdp({ appPath: APP_PATH });

            expect(mockPersistMetadata).not.toHaveBeenCalled();
        });
    });
});
