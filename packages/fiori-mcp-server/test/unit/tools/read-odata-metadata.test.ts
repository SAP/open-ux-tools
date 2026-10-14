import { jest } from '@jest/globals';
import { join } from 'node:path';

const mockLoggerWarn = jest.fn<any>();
const mockLoggerInfo = jest.fn<any>();

const actualUtils = await import('../../../src/utils/index.js');
jest.unstable_mockModule('../../../src/utils', () => ({
    ...actualUtils,
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
jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    readUi5Config: mockReadUi5Config,
    getVariant: mockGetVariant,
    ManifestService: {
        initMergedManifest: mockInitMergedManifest
    }
}));

const mockCreateAbapServiceProvider = jest.fn<any>();
jest.unstable_mockModule('@sap-ux/system-access', () => ({
    createAbapServiceProvider: mockCreateAbapServiceProvider
}));

const mockPrettifyXml = jest.fn<any>((xml: string) => `<formatted>${xml}</formatted>`);
jest.unstable_mockModule('prettify-xml', () => ({
    default: mockPrettifyXml
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
        mockPrettifyXml.mockImplementation((xml: string) => `<formatted>${xml}</formatted>`);
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

    test('falls back to raw XML and warns when prettify-xml throws', async () => {
        mockPrettifyXml.mockImplementation(() => {
            throw new Error('bad xml');
        });
        const provider = makeAbapProvider(makeMetadata('<raw/>'));
        mockCreateAbapServiceProvider.mockReturnValue(provider);
        mockInitMergedManifest.mockResolvedValue(
            makeManifestService({ mainService: { type: 'OData', uri: '/sap/opu/odata/main' } })
        );

        const result = await readODataMetadataAdp({ appPath: APP_PATH });

        expect(result.entries[0].metadata).toEqual('<raw/>');
        expect(mockLoggerWarn).toHaveBeenCalledWith(expect.stringContaining('Failed to format XML'));
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
});
