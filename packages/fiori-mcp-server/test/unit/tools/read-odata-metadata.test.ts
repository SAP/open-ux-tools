import { jest } from '@jest/globals';

const mockLoggerWarn = jest.fn<any>();
const mockLoggerInfo = jest.fn<any>();
const mockFormatXml = jest.fn<any>((xml: string) => `<formatted>${xml}</formatted>`);
const mockWriteContextMetadata = jest.fn<any>(
    (appPath: string, name: string) => `${appPath}/.context/${name}-metadata.xml`
);

const mockGetMergedManifest = jest.fn<() => Promise<object>>();
jest.unstable_mockModule('../../../src/utils', () => ({
    getMergedManifest: mockGetMergedManifest,
    formatXml: mockFormatXml,
    writeContextMetadata: mockWriteContextMetadata,
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
    isCFEnvironment: mockIsCFEnvironment
}));

const mockCreateAbapServiceProvider = jest.fn<any>();
jest.unstable_mockModule('@sap-ux/system-access', () => ({
    createAbapServiceProvider: mockCreateAbapServiceProvider
}));

const { readODataMetadataAdp } = await import('../../../src/tools/read-odata-metadata.js');

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

    test('writes metadata file when saveLocal is true', async () => {
        setupProvider({ mainService: { type: 'OData', uri: '/sap/opu/odata/main' } });

        await readODataMetadataAdp({ appPath: APP_PATH, saveLocal: true });

        expect(mockWriteContextMetadata).toHaveBeenCalledWith(APP_PATH, 'mainService', expect.any(String));
    });

    test('does not write file when saveLocal is false (default)', async () => {
        setupProvider({ mainService: { type: 'OData', uri: '/sap/opu/odata/main' } });

        await readODataMetadataAdp({ appPath: APP_PATH });

        expect(mockWriteContextMetadata).not.toHaveBeenCalled();
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

    test('propagates metadata errors without writing a context file', async () => {
        const provider = setupProvider({ main: { type: 'OData', uri: '/odata/main' } });
        const error = new Error('Metadata unavailable');
        provider.service.mockReturnValue({ metadata: jest.fn<() => Promise<string>>().mockRejectedValue(error) });

        await expect(readODataMetadataAdp({ appPath: APP_PATH, saveLocal: true })).rejects.toThrow(error);

        expect(mockWriteContextMetadata).not.toHaveBeenCalled();
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

        test('does not attempt to fetch or write metadata for CF even when saveLocal is true', async () => {
            setupCfProvider({ mainService: { type: 'OData', uri: '/odata/v4/main/' } });

            await readODataMetadataAdp({ appPath: APP_PATH, saveLocal: true });

            expect(mockWriteContextMetadata).not.toHaveBeenCalled();
        });
    });
});
