import { normalizePath } from '../../src/path/normalize';
import * as fs from 'node:fs';

describe('normalizePath', () => {
    const originalPlatform = process.platform;

    let realpathSpy: jest.SpyInstance;

    beforeEach(() => {
        realpathSpy = jest.spyOn(fs.realpathSync, 'native').mockReturnValue('C:\\');
    });

    afterEach(() => {
        realpathSpy.mockRestore();
        jest.resetModules();
        Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    test('should normalize path - darwin os', () => {
        const path = '/Users/testuser/project/src/index.js';
        const result = normalizePath(path);
        // leading slash is not adjusted on OSX
        expect(result).toBe(`/Users/testuser/project/src/index.js`);
    });

    test('should normalize Windows path with uppercase drive letter - windows', () => {
        Object.defineProperty(process, 'platform', { value: 'win32' });
        const result = normalizePath('C:/Users/testuser/project/src/index.js');
        expect(result).toBe(`C:/Users/testuser/project/src/index.js`);
    });

    test('should normalize Windows path with lowercase drive letter - windows', () => {
        Object.defineProperty(process, 'platform', { value: 'win32' });
        const result = normalizePath('c:/Users/testuser/project/src/index.js');
        expect(result).toBe(`C:/Users/testuser/project/src/index.js`);
    });
});
