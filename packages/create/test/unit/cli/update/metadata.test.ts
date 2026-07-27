import { jest } from '@jest/globals';
import { Command } from 'commander';
import type { ToolsLogger } from '@sap-ux/logger';

// ── Tracing / validation mocks ───────────────────────────────────────────────
const mockGetLogger = jest.fn() as jest.Mock;
const mockSetLogLevelVerbose = jest.fn() as jest.Mock;
jest.unstable_mockModule('../../../../src/tracing/logger', () => ({
    getLogger: mockGetLogger,
    setLogLevelVerbose: mockSetLogLevelVerbose
}));

const mockTraceChanges = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
jest.unstable_mockModule('../../../../src/tracing/trace', () => ({
    traceChanges: mockTraceChanges
}));

const mockValidateBasePath = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
jest.unstable_mockModule('../../../../src/validation/index', () => ({
    validateBasePath: mockValidateBasePath
}));

// ── BTP utils ────────────────────────────────────────────────────────────────
const mockIsAppStudio = jest.fn().mockReturnValue(false);
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    isAppStudio: mockIsAppStudio,
    WebIDEUsage: { ODATA_ABAP: 'odata_abap' }
}));

// ── project-access ───────────────────────────────────────────────────────────
import { createProjectAccessMock } from '../__mocks__/project-access-mock.js';

const mockReadManifest = jest.fn<any>().mockResolvedValue({
    'sap.app': {
        dataSources: {
            mainService: { settings: { odataVersion: '2.0' } }
        }
    }
});
const mockAppAccess = {
    app: {
        mainService: 'mainService',
        services: { mainService: { uri: '/sap/opu/odata/sap/ZTEST_SRV/' } }
    },
    readManifest: mockReadManifest
};
const mockCreateApplicationAccess = jest.fn<any>().mockResolvedValue(mockAppAccess);

jest.unstable_mockModule('@sap-ux/project-access', () =>
    createProjectAccessMock({ createApplicationAccess: mockCreateApplicationAccess })
);

// ── UI5Config ────────────────────────────────────────────────────────────────
const mockGetBackendConfigs = jest
    .fn()
    .mockReturnValue([{ url: 'https://test.example.com', path: '/sap/opu/odata/sap/', client: '100' }]);
const mockUi5ConfigInstance = { getBackendConfigsFromFioriToolsProxyMiddleware: mockGetBackendConfigs };
const mockUi5ConfigNewInstance = jest.fn<any>().mockResolvedValue(mockUi5ConfigInstance);

jest.unstable_mockModule('@sap-ux/ui5-config', () => ({
    UI5Config: { newInstance: mockUi5ConfigNewInstance }
}));

// ── axios-extension ──────────────────────────────────────────────────────────
const mockMetadata = jest.fn<any>().mockResolvedValue('<edmx:Edmx/>');
const mockFetchExternalServices = jest.fn<any>().mockResolvedValue([{ name: 'ValHelp' }]);
const mockServiceFn = jest.fn().mockReturnValue({ metadata: mockMetadata });

class MockAbapServiceProvider {
    service = mockServiceFn;
    fetchExternalServices = mockFetchExternalServices;
}

const mockCreateForDestination = jest.fn().mockImplementation(() => new MockAbapServiceProvider());
const mockTlsPatch = { isPatchRequired: jest.fn().mockReturnValue(false), apply: jest.fn() };

jest.unstable_mockModule('@sap-ux/axios-extension', () => ({
    AbapServiceProvider: MockAbapServiceProvider,
    TlsPatch: mockTlsPatch,
    createForDestination: mockCreateForDestination
}));

// ── Store ────────────────────────────────────────────────────────────────────
const mockSystemRead = jest.fn<any>().mockResolvedValue({
    name: 'TestSystem',
    url: 'https://test.example.com',
    username: 'user',
    password: 'pass'
});
const mockSystemService = { read: mockSystemRead };
const mockGetService = jest.fn<any>().mockResolvedValue(mockSystemService);

const actualStore = await import('@sap-ux/store');
jest.unstable_mockModule('@sap-ux/store', () => ({
    ...actualStore,
    getService: mockGetService
}));

// ── odata-service-writer ─────────────────────────────────────────────────────
const mockUpdate = jest.fn<any>().mockResolvedValue(undefined);
const mockGetExternalServiceReferences = jest.fn<any>().mockReturnValue([{ name: 'ValHelpRef' }]);

jest.unstable_mockModule('@sap-ux/odata-service-writer', () => ({
    update: mockUpdate,
    getExternalServiceReferences: mockGetExternalServiceReferences,
    OdataVersion: { v2: '2.0', v4: '4.0' },
    ServiceType: { EDMX: 'edmx' }
}));

// ── node:fs/promises ─────────────────────────────────────────────────────────
const mockReadFile = jest.fn<any>().mockResolvedValue('ui5yaml content');
jest.unstable_mockModule('node:fs/promises', () => ({ readFile: mockReadFile }));

// ── mem-fs / mem-fs-editor ───────────────────────────────────────────────────
const mockFsCommit = jest.fn<any>().mockImplementation((cb: () => void) => cb());
const mockFsInstance = { commit: mockFsCommit };
const mockCreateEditor = jest.fn().mockReturnValue(mockFsInstance);
const mockCreateMemStore = jest.fn().mockReturnValue({});

jest.unstable_mockModule('mem-fs-editor', () => ({ create: mockCreateEditor }));
jest.unstable_mockModule('mem-fs', () => ({ create: mockCreateMemStore }));

// ── Dynamic import after all mocks ───────────────────────────────────────────
const { addMetadataUpdateCommand } = await import('../../../../src/cli/update/metadata.js');

// ─────────────────────────────────────────────────────────────────────────────

describe('update metadata command', () => {
    let loggerMock: ToolsLogger;
    const getArgv = (args: string[]) => ['', '', ...args];

    beforeEach(() => {
        jest.clearAllMocks();

        loggerMock = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        } as Partial<ToolsLogger> as ToolsLogger;
        mockGetLogger.mockReturnValue(loggerMock);

        // Restore defaults
        mockIsAppStudio.mockReturnValue(false);
        mockCreateApplicationAccess.mockResolvedValue(mockAppAccess);
        mockReadManifest.mockResolvedValue({
            'sap.app': { dataSources: { mainService: { settings: { odataVersion: '2.0' } } } }
        });
        mockGetBackendConfigs.mockReturnValue([
            { url: 'https://test.example.com', path: '/sap/opu/odata/sap/', client: '100' }
        ]);
        mockUi5ConfigNewInstance.mockResolvedValue(mockUi5ConfigInstance);
        mockSystemRead.mockResolvedValue({
            name: 'TestSystem',
            url: 'https://test.example.com',
            username: 'user',
            password: 'pass'
        });
        mockMetadata.mockResolvedValue('<edmx:Edmx/>');
        mockGetExternalServiceReferences.mockReturnValue([{ name: 'ValHelpRef' }]);
        mockFetchExternalServices.mockResolvedValue([{ name: 'ValHelp' }]);
        mockUpdate.mockResolvedValue(undefined);
        mockCreateForDestination.mockImplementation(() => new MockAbapServiceProvider());
        mockTlsPatch.isPatchRequired.mockReturnValue(false);
        mockFsCommit.mockImplementation((cb: () => void) => cb());
    });

    test('VSCode: fetches metadata and external services, writes files and commits', async () => {
        // Given
        const command = new Command('update');
        addMetadataUpdateCommand(command);

        // When
        await command.parseAsync(getArgv(['metadata', '/app/path']));

        // Then
        expect(mockMetadata).toHaveBeenCalledTimes(1);
        expect(mockFetchExternalServices).toHaveBeenCalledTimes(1);
        expect(mockUpdate).toHaveBeenCalledWith(
            '/app/path',
            expect.objectContaining({
                name: 'mainService',
                path: '/sap/opu/odata/sap/ZTEST_SRV/',
                metadata: '<edmx:Edmx/>',
                externalServices: [{ name: 'ValHelp' }]
            }),
            mockFsInstance,
            true // updateMiddlewares=true because externalServices.length > 0
        );
        expect(mockFsCommit).toHaveBeenCalledTimes(1);
        expect(loggerMock.error).not.toHaveBeenCalled();
    });

    test('BAS: uses destination, fetches metadata and external services', async () => {
        // Given
        mockIsAppStudio.mockReturnValue(true);
        mockGetBackendConfigs.mockReturnValue([
            { url: 'https://test.example.com', path: '/sap/opu/', destination: 'MY_DEST' }
        ]);
        const command = new Command('update');
        addMetadataUpdateCommand(command);

        // When
        await command.parseAsync(getArgv(['metadata', '/app/path']));

        // Then
        expect(mockCreateForDestination).toHaveBeenCalledWith({}, { Name: 'MY_DEST', WebIDEUsage: 'odata_abap' });
        expect(mockMetadata).toHaveBeenCalledTimes(1);
        expect(mockFetchExternalServices).toHaveBeenCalledTimes(1);
        expect(mockFsCommit).toHaveBeenCalledTimes(1);
        expect(loggerMock.error).not.toHaveBeenCalled();
    });

    test('--simulate: traces changes but does not commit', async () => {
        // Given
        const command = new Command('update');
        addMetadataUpdateCommand(command);

        // When
        await command.parseAsync(getArgv(['metadata', '/app/path', '--simulate']));

        // Then
        expect(mockTraceChanges).toHaveBeenCalledTimes(1);
        expect(mockFsCommit).not.toHaveBeenCalled();
        expect(mockSetLogLevelVerbose).toHaveBeenCalledTimes(1);
    });

    test('--verbose: sets log level verbose', async () => {
        // Given
        const command = new Command('update');
        addMetadataUpdateCommand(command);

        // When
        await command.parseAsync(getArgv(['metadata', '/app/path', '--verbose']));

        // Then
        expect(mockSetLogLevelVerbose).toHaveBeenCalledTimes(1);
    });

    test('--no-value-help: skips external service fetch', async () => {
        // Given
        const command = new Command('update');
        addMetadataUpdateCommand(command);

        // When
        await command.parseAsync(getArgv(['metadata', '/app/path', '--no-value-help']));

        // Then
        expect(mockFetchExternalServices).not.toHaveBeenCalled();
        expect(mockGetExternalServiceReferences).not.toHaveBeenCalled();
        expect(mockUpdate).toHaveBeenCalledWith(
            '/app/path',
            expect.objectContaining({ externalServices: undefined }),
            mockFsInstance,
            false // updateMiddlewares=false because no external services
        );
        expect(mockFsCommit).toHaveBeenCalledTimes(1);
    });

    test('no external service references: skips external fetch and uses updateMiddlewares=false', async () => {
        // Given
        mockGetExternalServiceReferences.mockReturnValue([]);
        const command = new Command('update');
        addMetadataUpdateCommand(command);

        // When
        await command.parseAsync(getArgv(['metadata', '/app/path']));

        // Then
        expect(mockFetchExternalServices).not.toHaveBeenCalled();
        expect(mockUpdate).toHaveBeenCalledWith(
            '/app/path',
            expect.objectContaining({ externalServices: undefined }),
            mockFsInstance,
            false
        );
        expect(mockFsCommit).toHaveBeenCalledTimes(1);
    });

    test('fetchExternalServices throws: logs warning and continues with main metadata only', async () => {
        // Given
        mockFetchExternalServices.mockRejectedValueOnce(new Error('Not an ABAP system'));
        const command = new Command('update');
        addMetadataUpdateCommand(command);

        // When
        await command.parseAsync(getArgv(['metadata', '/app/path']));

        // Then
        expect(loggerMock.warn).toHaveBeenCalledWith(expect.stringContaining('Not an ABAP system'));
        expect(mockUpdate).toHaveBeenCalledWith(
            '/app/path',
            expect.objectContaining({ externalServices: undefined }),
            mockFsInstance,
            false
        );
        expect(mockFsCommit).toHaveBeenCalledTimes(1);
        expect(loggerMock.error).not.toHaveBeenCalled();
    });

    test('no service in manifest: logs error and exits without writing', async () => {
        // Given
        mockCreateApplicationAccess.mockResolvedValue({
            app: { mainService: undefined, services: {} },
            readManifest: mockReadManifest
        });
        const command = new Command('update');
        addMetadataUpdateCommand(command);

        // When
        await command.parseAsync(getArgv(['metadata', '/app/path']));

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('No OData service found'));
        expect(mockUpdate).not.toHaveBeenCalled();
        expect(mockFsCommit).not.toHaveBeenCalled();
    });

    test('service has no URI: logs error and exits without writing', async () => {
        // Given
        mockCreateApplicationAccess.mockResolvedValue({
            app: { mainService: 'mainService', services: { mainService: { uri: undefined } } },
            readManifest: mockReadManifest
        });
        const command = new Command('update');
        addMetadataUpdateCommand(command);

        // When
        await command.parseAsync(getArgv(['metadata', '/app/path']));

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('has no URI'));
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    test('no backend config in ui5.yaml: logs error and exits without writing', async () => {
        // Given
        mockGetBackendConfigs.mockReturnValue([]);
        const command = new Command('update');
        addMetadataUpdateCommand(command);

        // When
        await command.parseAsync(getArgv(['metadata', '/app/path']));

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('No backend configuration found'));
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    test('VSCode: system not found in store: logs error and exits without writing', async () => {
        // Given
        mockSystemRead.mockResolvedValue(undefined);
        const command = new Command('update');
        addMetadataUpdateCommand(command);

        // When
        await command.parseAsync(getArgv(['metadata', '/app/path']));

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('No stored system found'));
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    test('BAS: missing destination in ui5.yaml: logs error and exits without writing', async () => {
        // Given
        mockIsAppStudio.mockReturnValue(true);
        mockGetBackendConfigs.mockReturnValue([{ url: 'https://test.example.com', path: '/sap/opu/' }]);
        const command = new Command('update');
        addMetadataUpdateCommand(command);

        // When
        await command.parseAsync(getArgv(['metadata', '/app/path']));

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('No destination configured'));
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    test('relative appPath is resolved to absolute before use', async () => {
        // Given
        const command = new Command('update');
        addMetadataUpdateCommand(command);

        // When
        await command.parseAsync(getArgv(['metadata', 'relative/path']));

        // Then — validateBasePath receives the resolved absolute path, not the raw relative one
        const { resolve } = await import('node:path');
        expect(mockValidateBasePath).toHaveBeenCalledWith(resolve('relative/path'));
    });

    test('metadata() throws: logs error message', async () => {
        // Given
        mockMetadata.mockRejectedValueOnce(new Error('Network error'));
        const command = new Command('update');
        addMetadataUpdateCommand(command);

        // When
        await command.parseAsync(getArgv(['metadata', '/app/path']));

        // Then
        expect(loggerMock.error).toHaveBeenCalledWith('Network error');
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    test('uses connectPath to look up stored system when present', async () => {
        // Given
        mockGetBackendConfigs.mockReturnValue([
            {
                url: 'https://test.example.com',
                path: '/sap/opu/',
                client: '200',
                connectPath: '/sap'
            }
        ]);
        const command = new Command('update');
        addMetadataUpdateCommand(command);

        // When
        await command.parseAsync(getArgv(['metadata', '/app/path']));

        // Then — BackendSystemKey is constructed with the resolved connectPath URL
        const { BackendSystemKey: ActualKey } = actualStore;
        expect(mockSystemRead).toHaveBeenCalledWith(
            new ActualKey({ url: 'https://test.example.com/sap', client: '200' })
        );
    });
});
