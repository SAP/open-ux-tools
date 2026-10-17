import { jest } from '@jest/globals';
import { join } from 'node:path';

const mockLoggerWarn = jest.fn<any>();
const mockLoggerInfo = jest.fn<any>();
const mockFormatXml = jest.fn<any>((xml: string) => `<formatted>${xml}</formatted>`);

const actualUtils = await import('../../../src/utils/index.js');
jest.unstable_mockModule('../../../src/utils', () => ({
    ...actualUtils,
    formatXml: mockFormatXml,
    logger: {
        ...actualUtils.logger,
        warn: mockLoggerWarn,
        info: mockLoggerInfo,
        error: jest.fn(),
        debug: jest.fn()
    }
}));

const mockReadUi5Config = jest.fn<any>();
const mockGetVariant = jest.fn<any>().mockResolvedValue({ id: 'customer.app.variant' });
const mockInitMergedManifest = jest.fn<any>();
const mockIsCFEnvironment = jest.fn<any>().mockResolvedValue(false);
const mockManifestServiceCFInit = jest.fn<any>();
jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    readUi5Config: mockReadUi5Config,
    getVariant: mockGetVariant,
    isCFEnvironment: mockIsCFEnvironment,
    ManifestService: {
        initMergedManifest: mockInitMergedManifest
    },
    ManifestServiceCF: {
        init: mockManifestServiceCFInit
    }
}));

const mockCreateAbapServiceProvider = jest.fn<any>();
jest.unstable_mockModule('@sap-ux/system-access', () => ({
    createAbapServiceProvider: mockCreateAbapServiceProvider
}));

const mockMkdirSync = jest.fn<any>();
const mockWriteFileSync = jest.fn<any>();
const actualFs = await import('node:fs');
jest.unstable_mockModule('node:fs', () => ({
    ...actualFs,
    mkdirSync: mockMkdirSync,
    writeFileSync: mockWriteFileSync
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

function makeManifestService(
    dataSources: Record<string, { type: string; uri: string }>,
    ui5Models: Record<string, unknown> = {}
) {
    return {
        getManifest: jest.fn<any>().mockReturnValue({ 'sap.ui5': { models: ui5Models } }),
        getManifestDataSources: jest.fn<any>().mockReturnValue(dataSources)
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
        mockInitMergedManifest.mockResolvedValue(makeManifestService(dataSources, ui5Models));
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
        expect(result.entries[0].metadata).toContain('<formatted>');
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

        const expectedPath = join(APP_PATH, 'webapp', '.context', 'mainService-metadata.xml');
        expect(mockMkdirSync).toHaveBeenCalledWith(expect.stringContaining('.context'), { recursive: true });
        expect(mockWriteFileSync).toHaveBeenCalledWith(expectedPath, expect.any(String), 'utf-8');
    });

    test('does not write file when saveLocal is false (default)', async () => {
        setupProvider({ mainService: { type: 'OData', uri: '/sap/opu/odata/main' } });

        await readODataMetadataAdp({ appPath: APP_PATH });

        expect(mockWriteFileSync).not.toHaveBeenCalled();
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

    describe('Cloud Foundry projects', () => {
        function setupCfProvider(
            dataSources: Record<string, { type: string; uri: string }>,
            ui5Models: Record<string, unknown> = {}
        ) {
            mockIsCFEnvironment.mockResolvedValue(true);
            mockManifestServiceCFInit.mockResolvedValue(makeManifestService(dataSources, ui5Models));
        }

        test('uses ManifestServiceCF and does not create an ABAP service provider', async () => {
            setupCfProvider({ mainService: { type: 'OData', uri: '/odata/v4/main/' } });

            await readODataMetadataAdp({ appPath: APP_PATH });

            expect(mockManifestServiceCFInit).toHaveBeenCalledWith(APP_PATH, expect.anything());
            expect(mockCreateAbapServiceProvider).not.toHaveBeenCalled();
            expect(mockInitMergedManifest).not.toHaveBeenCalled();
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

        test('attaches matching ui5 model to CF entry', async () => {
            const model = { dataSource: 'mainService', settings: {} };
            setupCfProvider({ mainService: { type: 'OData', uri: '/odata/v4/main/' } }, { '': model });

            const result = await readODataMetadataAdp({ appPath: APP_PATH });

            expect(result.entries[0].model).toEqual(model);
        });

        test('does not attempt to fetch or write metadata for CF even when saveLocal is true', async () => {
            setupCfProvider({ mainService: { type: 'OData', uri: '/odata/v4/main/' } });

            await readODataMetadataAdp({ appPath: APP_PATH, saveLocal: true });

            expect(mockWriteFileSync).not.toHaveBeenCalled();
        });
    });
});
