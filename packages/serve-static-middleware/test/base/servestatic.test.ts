import { jest } from '@jest/globals';
import type { ServeStaticConfig } from '../../src';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import { relative, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const mockServeStatic = jest.fn();

jest.unstable_mockModule('serve-static', () => ({
    default: mockServeStatic
}));

const { serveStaticMiddleware } = await import('../../src');

const testDirname = dirname(fileURLToPath(import.meta.url));

describe('serve-static-middleware', () => {
    const logger = new ToolsLogger({
        transports: [new NullTransport()]
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockServeStatic.mockImplementation(() => {
            return (req: any, res: any, next: any) => {
                next();
            };
        });
    });

    const configuration: ServeStaticConfig = {
        paths: [
            { path: '/resources', src: '/path/to/resources' },
            { path: '/test-resources', src: '/path/to/test-resources' }
        ]
    };

    test('serveStaticMiddleware: call with minimal config', () => {
        serveStaticMiddleware('/root', configuration, logger);
        expect(mockServeStatic).toHaveBeenCalledTimes(2);
        expect(mockServeStatic.mock.calls).toMatchSnapshot();
    });

    test('serveStaticMiddleware: call with additional options', () => {
        const config: ServeStaticConfig = {
            paths: [
                { path: '/resources', src: '/path/to/resources', maxAge: 123, fallthrough: false },
                { path: '/test-resources', src: '/path/to/test-resources', maxAge: 456, fallthrough: true }
            ]
        };
        serveStaticMiddleware('/root', config, logger);
        expect(mockServeStatic).toHaveBeenCalledTimes(2);
        expect(mockServeStatic.mock.calls).toMatchSnapshot();
    });

    test('serveStaticMiddleware: call with src path resolution', () => {
        const config: ServeStaticConfig = {
            paths: [
                { path: '/resources', src: 'resources' },
                { path: '/test-resources', src: 'test-resources' }
            ]
        };
        serveStaticMiddleware(testDirname, config, logger);
        expect(mockServeStatic).toHaveBeenCalledTimes(2);
        expect(mockServeStatic).toHaveBeenNthCalledWith(1, relative(process.cwd(), join(testDirname, 'resources')), {});
        expect(mockServeStatic).toHaveBeenNthCalledWith(
            2,
            relative(process.cwd(), join(testDirname, 'test-resources')),
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
        expect(mockServeStatic).toHaveBeenCalledTimes(2);
        expect(mockServeStatic.mock.calls).toMatchSnapshot();
    });
});
