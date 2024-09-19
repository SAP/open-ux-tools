import * as appStudio from '@sap-ux/btp-utils';
import { getLivereloadServer, getConnectLivereload } from '../../../src';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import livereload from 'livereload';
import * as connectLivereload from 'connect-livereload';
import portfinder from 'portfinder';
import { defaultLiveReloadOpts, defaultConnectLivereloadOpts } from '../../../src/base/constants';
import { join } from 'path';
import { watchManifestChanges } from '../../../src/base/livereload';

jest.mock('connect-livereload', () => ({
    __esModule: true,
    default: jest.fn()
}));

jest.mock('@sap-ux/btp-utils', () => {
    return {
        __esModule: true,
        ...jest.requireActual('@sap-ux/btp-utils')
    };
});

describe('Livereload', () => {
    const livereloadSpy = jest.spyOn(livereload, 'createServer').mockImplementation((): any => {
        return {
            watch: jest.fn(),
            config: { port: 35729 }
        };
    });
    jest.spyOn(portfinder, 'getPort').mockImplementation((options, callback) => {
        //@ts-expect-error - ignore for testing purposes
        callback(null, options.port);
    });

    const logger = new ToolsLogger({
        transports: [new NullTransport()]
    });
    const options = {};
    const https = {
        key: join(__dirname, '../', '../', 'fixtures', 'key.txt'),
        cert: join(__dirname, '../', '../', 'fixtures', 'cert.txt')
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('livereload server with default configuration', async () => {
        await getLivereloadServer(options);
        expect(livereloadSpy).toHaveBeenCalledTimes(1);
        expect(livereloadSpy).toHaveBeenCalledWith({ port: 35729, ...defaultLiveReloadOpts });
        expect(process.env.FIORI_TOOLS_LIVERELOAD_PORT).toBeDefined();
        expect(process.env.FIORI_TOOLS_LIVERELOAD_PORT).toBe('35729');
    });

    test('livereload server with custom port', async () => {
        await getLivereloadServer({ port: 12345 }, undefined, logger);
        expect(livereloadSpy).toHaveBeenCalledTimes(1);
        expect(livereloadSpy).toHaveBeenCalledWith(expect.objectContaining({ port: 12345 }));
    });

    test('livereload server with wrong https', async () => {
        await getLivereloadServer(options, { key: 'key' });
        expect(livereloadSpy).toHaveBeenCalledTimes(1);
        expect(livereloadSpy).not.toHaveBeenCalledWith(expect.objectContaining({ https: expect.any(Object) }));
    });

    test('livereload server with wrong https', async () => {
        await getLivereloadServer(options, {});
        expect(livereloadSpy).toHaveBeenCalledTimes(1);
        expect(livereloadSpy).not.toHaveBeenCalledWith(expect.objectContaining({ https: expect.any(Object) }));
    });

    test('livereload server with https', async () => {
        await getLivereloadServer(options, https);
        expect(livereloadSpy).toHaveBeenCalledTimes(1);
        expect(livereloadSpy).toHaveBeenCalledWith(
            expect.objectContaining({ https: { key: 'secret key', cert: 'secret cert' } })
        );
    });
});

describe('Connect Livereload', () => {
    const connectLivereloadSpy = jest.spyOn(connectLivereload, 'default').mockImplementation(jest.fn());

    beforeEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    test('connect-livereload on app studio', async () => {
        jest.spyOn(appStudio, 'isAppStudio').mockReturnValue(true);
        const exposeSpy = jest.spyOn(appStudio, 'exposePort').mockResolvedValue('http://example.com/');

        await getConnectLivereload({ port: 12345 });

        expect(connectLivereloadSpy).toHaveBeenCalledTimes(1);
        expect(exposeSpy).toHaveBeenCalledWith(12345);
        expect(connectLivereloadSpy).toHaveBeenCalledWith(
            expect.objectContaining({ port: 12345, src: 'http://example.com/livereload.js?snipver=1&port=443' })
        );
    });

    test('connect-livereload with default configuration', () => {
        getConnectLivereload({});
        expect(connectLivereloadSpy).toHaveBeenCalledTimes(1);
        expect(connectLivereloadSpy).toHaveBeenCalledWith(defaultConnectLivereloadOpts);
    });

    test('connect-livereload with custom configuration', () => {
        getConnectLivereload({ port: 12345 });
        expect(connectLivereloadSpy).toHaveBeenCalledTimes(1);
        expect(connectLivereloadSpy).toHaveBeenCalledWith(expect.objectContaining({ port: 12345 }));
    });
});

describe('adp backend sync', () => {
    const onSpy = jest.fn<void, [string, (event: string, path: string) => void]>();

    beforeEach(() => {
        jest.spyOn(livereload, 'createServer').mockImplementation((): any => {
            return {
                watcher: {
                    on: onSpy
                },
                config: { port: 35729 }
            };
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
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
});
