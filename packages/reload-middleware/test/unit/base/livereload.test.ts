import { getLivereloadServer, getConnectLivereload } from '../../../src/base';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import livereload from 'livereload';
import * as connectLivereload from 'connect-livereload';
import portfinder from 'portfinder';
import { defaultLiveReloadOpts, defaultConnectLivereloadOpts } from '../../../src/base/constants';
import { join } from 'path';

jest.mock('connect-livereload', () => ({
    __esModule: true,
    default: jest.fn()
}));

describe('Livereload', () => {
    const livereloadSpy = jest.spyOn(livereload, 'createServer').mockImplementation(jest.fn());
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
