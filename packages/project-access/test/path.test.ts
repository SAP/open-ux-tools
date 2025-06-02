import { normalizePath } from '../src';
import * as fs from 'fs';
import url from 'url';

describe('normalizePath', () => {
    const winfileURL = 'file:///C:/Users/testuser/project/src/index.js';

    let realpathSpy: jest.SpyInstance;

    afterEach(() => {
        if (realpathSpy) {
            realpathSpy.mockRestore();
        }
        jest.resetModules();
    });

    test('should normalize path - darwin os', () => {
        // realpathSpy = jest.spyOn(fs.realpathSync, 'native').mockReturnValue('C:\\');
        const fileURL = 'file:///Users/testuser/project/src/index.js';
        const result = normalizePath(fileURL);
        // leading slash is not adjusted on OSX
        expect(result).toBe(`/Users/testuser/project/src/index.js`);
    });

    test('should normalize Windows path with uppercase drive letter - windows', () => {
        const uppercaseDriveLetter = 'C:\\';
        Object.defineProperty(process, 'platform', { value: 'win32' });
        realpathSpy = jest.spyOn(fs.realpathSync, 'native').mockReturnValue(uppercaseDriveLetter);
        jest.spyOn(url, 'fileURLToPath').mockImplementation((fileURL: any) => {
            return fileURL.replace('file:///C:/', 'C:/');
        });
        const result = normalizePath(winfileURL);
        expect(result).toBe(`C:/Users/testuser/project/src/index.js`);
    });

    test('should normalize Windows path with lowercase drive letter - windows', () => {
        const lowercaseDriveLetter = 'c:\\';
        Object.defineProperty(process, 'platform', { value: 'win32' });
        realpathSpy = jest.spyOn(fs.realpathSync, 'native').mockReturnValue(lowercaseDriveLetter);
        jest.spyOn(url, 'fileURLToPath').mockImplementation((fileURL: any) => {
            return fileURL.replace('file:///C:/', 'C:/');
        });
        const result = normalizePath(winfileURL);
        expect(result).toBe(`c:/Users/testuser/project/src/index.js`);
    });

});
