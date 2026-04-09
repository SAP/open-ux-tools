import { resolveServeStaticOptions, resolveSrcPath } from '../../src/base/utils';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const testDirname = dirname(fileURLToPath(import.meta.url));

describe('utils', () => {
    test('resolveServeStaticOptions: global options', () => {
        const config = {
            paths: [
                { path: '/resources', src: '/path/to/resources', maxAge: 123, fallthrough: false },
                { path: '/test-resources', src: '/path/to/test-resources', maxAge: 456, fallthrough: true }
            ],
            dotfiles: 'ignore',
            etag: false,
            setHeaders: () => {}
        };
        expect(resolveServeStaticOptions(config)).toMatchSnapshot();
    });

    test('resolveServeStaticOptions: call with minimal config', () => {
        const config = {
            path: '/resources',
            src: '/path/to/resources',
            maxAge: 123,
            fallthrough: false,
            setHeaders: () => {}
        };
        expect(resolveServeStaticOptions(config)).toMatchSnapshot();
    });

    test('resolveSrcPath: call with absolute src path', () => {
        expect(resolveSrcPath('/root', '/path/to/resources')).toBe('/path/to/resources');
    });

    test('resolveSrcPath: call with relative src path', () => {
        expect(resolveSrcPath(testDirname, 'path/to/resources')).toBe(join('test', 'base', 'path', 'to', 'resources'));
    });
});
