import { jest } from '@jest/globals';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock functions
const mockConnectLivereload = jest.fn();
const mockIsAppStudio = jest.fn();
const mockExposePort = jest.fn();
const mockCreateServer = jest.fn();
const mockGetPort = jest.fn();

jest.unstable_mockModule('connect-livereload', () => ({
    default: mockConnectLivereload
}));

jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    isAppStudio: mockIsAppStudio,
    exposePort: mockExposePort
}));

jest.unstable_mockModule('livereload', () => ({
    default: { createServer: mockCreateServer },
    createServer: mockCreateServer
}));

jest.unstable_mockModule('portfinder', () => ({
    default: { getPort: mockGetPort },
    getPort: mockGetPort
}));

const { getLivereloadServer, getConnectLivereload } = await import('../../../src/index.js');
const { defaultLiveReloadOpts, defaultConnectLivereloadOpts } = await import('../../../src/base/constants.js');
const { watchManifestChanges } = await import('../../../src/base/livereload.js');
const { NullTransport, ToolsLogger } = await import('@sap-ux/logger');

describe('Livereload', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCreateServer.mockImplementation((): any => {
            return {
                watch: jest.fn(),
                config: { port: 35729 }
            };
        });
        mockGetPort.mockImplementation((options: any, callback: any) => {
            callback(null, options.port);
        });
    });

    const logger = new ToolsLogger({
        transports: [new NullTransport()]
    });
    const options = {};
    const https = {
        key: join(__dirname, '../', '../', 'fixtures', 'key.txt'),
        cert: join(__dirname, '../', '../', 'fixtures', 'cert.txt')
    };

    test('livereload server with default configuration', async () => {
        await getLivereloadServer(options);
        expect(mockCreateServer).toHaveBeenCalledTimes(1);
        expect(mockCreateServer).toHaveBeenCalledWith({ port: 35729, ...defaultLiveReloadOpts });
        expect(process.env.FIORI_TOOLS_LIVERELOAD_PORT).toBeDefined();
        expect(process.env.FIORI_TOOLS_LIVERELOAD_PORT).toBe('35729');
    });

    test('livereload server with custom port', async () => {
        await getLivereloadServer({ port: 12345 }, undefined, logger);
        expect(mockCreateServer).toHaveBeenCalledTimes(1);
        expect(mockCreateServer).toHaveBeenCalledWith(expect.objectContaining({ port: 12345 }));
    });

    test('livereload server with wrong https', async () => {
        await getLivereloadServer(options, { key: 'key' });
        expect(mockCreateServer).toHaveBeenCalledTimes(1);
        expect(mockCreateServer).not.toHaveBeenCalledWith(expect.objectContaining({ https: expect.any(Object) }));
    });

    test('livereload server with wrong https', async () => {
        await getLivereloadServer(options, {});
        expect(mockCreateServer).toHaveBeenCalledTimes(1);
        expect(mockCreateServer).not.toHaveBeenCalledWith(expect.objectContaining({ https: expect.any(Object) }));
    });

    test('livereload server with https', async () => {
        await getLivereloadServer(options, https);
        expect(mockCreateServer).toHaveBeenCalledTimes(1);
        expect(mockCreateServer).toHaveBeenCalledWith(
            expect.objectContaining({ https: { key: 'secret key', cert: 'secret cert' } })
        );
    });
});

describe('Connect Livereload', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockIsAppStudio.mockReturnValue(false);
    });

    test('connect-livereload on app studio', async () => {
        mockIsAppStudio.mockReturnValue(true);
        mockExposePort.mockResolvedValue('http://example.com/');

        await getConnectLivereload({ port: 12345 });

        expect(mockConnectLivereload).toHaveBeenCalledTimes(1);
        expect(mockExposePort).toHaveBeenCalledWith(12345);
        expect(mockConnectLivereload).toHaveBeenCalledWith(
            expect.objectContaining({ port: 12345, src: 'http://example.com/livereload.js?snipver=1&port=443' })
        );
    });

    test('connect-livereload with default configuration', async () => {
        await getConnectLivereload({});
        expect(mockConnectLivereload).toHaveBeenCalledTimes(1);
        expect(mockConnectLivereload).toHaveBeenCalledWith(defaultConnectLivereloadOpts);
    });

    test('connect-livereload with custom configuration', async () => {
        await getConnectLivereload({ port: 12345 });
        expect(mockConnectLivereload).toHaveBeenCalledTimes(1);
        expect(mockConnectLivereload).toHaveBeenCalledWith(expect.objectContaining({ port: 12345 }));
    });
});

describe('adp backend sync', () => {
    const onSpy = jest.fn<(event: string, callback: (event: string, path: string) => void) => void>();

    beforeEach(() => {
        jest.clearAllMocks();
        mockCreateServer.mockImplementation((): any => {
            return {
                watcher: {
                    on: onSpy
                },
                config: { port: 35729 }
            };
        });
        mockGetPort.mockImplementation((options: any, callback: any) => {
            callback(null, options.port);
        });
    });

    afterEach(() => {
        global.__SAP_UX_MANIFEST_SYNC_REQUIRED__ = false;
    });

    test('ignore property changes', async () => {
        const server = await getLivereloadServer({});

        watchManifestChanges(server);

        onSpy.mock.calls[0][1]('add', 'property.change');

        expect(global.__SAP_UX_MANIFEST_SYNC_REQUIRED__).toBeFalsy();
    });
    test('sync on appdescr_variant changes', async () => {
        const server = await getLivereloadServer({});

        watchManifestChanges(server);

        onSpy.mock.calls[0][1]('change', 'manifest.appdescr_variant');

        expect(global.__SAP_UX_MANIFEST_SYNC_REQUIRED__).toBe(true);
    });
    test('sync on manifest change', async () => {
        const server = await getLivereloadServer({});

        watchManifestChanges(server);

        onSpy.mock.calls[0][1]('add', '123_appdescr_fe_changePageConfiguration.change');

        expect(global.__SAP_UX_MANIFEST_SYNC_REQUIRED__).toBe(true);
    });

    test('sync on manifest change', async () => {
        const server = await getLivereloadServer({});

        watchManifestChanges(server);

        onSpy.mock.calls[0][1]('add', '123_appdescr_ui_gen_app_changePageConfig.change');

        expect(global.__SAP_UX_MANIFEST_SYNC_REQUIRED__).toBe(true);
    });

    test('sync on appdescr_ui5_setFlexExtensionPointEnabled change', async () => {
        const server = await getLivereloadServer({});

        watchManifestChanges(server);

        onSpy.mock.calls[0][1]('add', 'id_1234567890_appdescr_ui5_setFlexExtensionPointEnabled.change');

        expect(global.__SAP_UX_MANIFEST_SYNC_REQUIRED__).toBe(true);
    });
});
