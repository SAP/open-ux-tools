import { serveStaticMiddleware } from '../../src';
import type { ServeStaticConfig } from '../../src';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import * as expressServeStatic from 'serve-static';
import { relative, join } from 'path';

jest.mock('serve-static', () => ({
    __esModule: true,
    default: jest.fn()
}));

describe('serve-static-middleware', () => {
    const logger = new ToolsLogger({
        transports: [new NullTransport()]
    });
    const serveStaticMock = jest.spyOn(expressServeStatic as any, 'default').mockImplementation(() => {
        return (req: any, res: any, next: any) => {
            next();
        };
    });
    const configuration: ServeStaticConfig = {
        paths: [
            { path: '/resources', src: '/path/to/resources' },
            { path: '/test-resources', src: '/path/to/test-resources' }
        ]
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('serveStaticMiddleware: call with minimal config', () => {
        serveStaticMiddleware('/root', configuration, logger);
        expect(serveStaticMock).toHaveBeenCalledTimes(2);
        expect(serveStaticMock.mock.calls).toMatchSnapshot();
    });

    test('serveStaticMiddleware: call with additional options', () => {
        const config: ServeStaticConfig = {
            paths: [
                { path: '/resources', src: '/path/to/resources', maxAge: 123, fallthrough: false },
                { path: '/test-resources', src: '/path/to/test-resources', maxAge: 456, fallthrough: true }
            ]
        };
        serveStaticMiddleware('/root', config, logger);
        expect(serveStaticMock).toHaveBeenCalledTimes(2);
        expect(serveStaticMock.mock.calls).toMatchSnapshot();
    });

    test('serveStaticMiddleware: call with src path resolution', () => {
        const config: ServeStaticConfig = {
            paths: [
                { path: '/resources', src: 'resources' },
                { path: '/test-resources', src: 'test-resources' }
            ]
        };
        serveStaticMiddleware(__dirname, config, logger);
        expect(serveStaticMock).toHaveBeenCalledTimes(2);
        expect(serveStaticMock).toHaveBeenNthCalledWith(1, relative(process.cwd(), join(__dirname, 'resources')), {});
        expect(serveStaticMock).toHaveBeenNthCalledWith(
            2,
            relative(process.cwd(), join(__dirname, 'test-resources')),
            {}
        );
    });

    test('serveStaticMiddleware: call with global options', () => {
        const config: ServeStaticConfig = {
            dotfiles: 'ignore',
            etag: false,
            fallthrough: false,
            paths: [
                { path: '/resources', src: '/path/to/resources' },
                { path: '/test-resources', src: '/path/to/test-resources' }
            ]
        };
        serveStaticMiddleware('/root', config, logger);
        expect(serveStaticMock).toHaveBeenCalledTimes(2);
        expect(serveStaticMock.mock.calls).toMatchSnapshot();
    });
});
