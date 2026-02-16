import { existsSync, readFileSync } from 'node:fs';

import type { ToolsLogger } from '@sap-ux/logger';

import { getReusableLibraryPaths } from '../../../../src/cf/project/ui5-app-info';

jest.mock('fs', () => ({
    existsSync: jest.fn(),
    readFileSync: jest.fn()
}));

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;

describe('getReusableLibraryPaths', () => {
    const basePath = '/test/project';
    const mockLogger = {
        warn: jest.fn()
    } as unknown as ToolsLogger;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should extract reusable library paths from ui5AppInfo.json', () => {
        const ui5AppInfo = {
            asyncHints: {
                libs: [
                    {
                        name: 'my.reusable.lib',
                        html5AppName: 'myreusablelib',
                        url: { url: '/resources/my/reusable/lib' }
                    },
                    {
                        name: 'another.lib',
                        html5AppName: 'anotherlib',
                        url: { url: '/resources/another/lib' }
                    }
                ]
            }
        };

        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(JSON.stringify({ 'test-app': ui5AppInfo }));

        const result = getReusableLibraryPaths(basePath, mockLogger);

        expect(result).toEqual([
            {
                path: '/resources/my/reusable/lib',
                src: './.adp/reuse/myreusablelib',
                fallthrough: false
            },
            {
                path: '/resources/another/lib',
                src: './.adp/reuse/anotherlib',
                fallthrough: false
            }
        ]);
        expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    test('should return empty array when ui5AppInfo.json does not exist', () => {
        mockExistsSync.mockReturnValue(false);

        const result = getReusableLibraryPaths(basePath, mockLogger);

        expect(result).toEqual([]);
        expect(mockLogger.warn).toHaveBeenCalledWith('ui5AppInfo.json not found in project root');
    });

    test('should return empty array when no reusable libraries found', () => {
        const ui5AppInfo = {
            asyncHints: {
                libs: [
                    { name: 'sap.m' },
                    { name: 'sap.ui.core', html5AppName: 'sap-ui-core' },
                    { name: 'sap.ui', html5AppName: 'sap-ui', url: '/resources/sap/ui' }
                ]
            }
        };

        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(JSON.stringify({ 'test-app': ui5AppInfo }));

        const result = getReusableLibraryPaths(basePath, mockLogger);

        expect(result).toEqual([]);
    });

    test('should filter out libraries missing html5AppName or url', () => {
        const ui5AppInfo = {
            asyncHints: {
                libs: [
                    {
                        name: 'valid.lib',
                        html5AppName: 'validlib',
                        url: { url: '/resources/valid/lib' }
                    },
                    {
                        name: 'missing.html5AppName',
                        url: { url: '/resources/missing/lib' }
                    },
                    {
                        name: 'missing.url',
                        html5AppName: 'missingurl'
                    },
                    {
                        name: 'invalid.url.type',
                        html5AppName: 'invalidurltype',
                        url: '/resources/invalid/lib'
                    }
                ]
            }
        };

        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(JSON.stringify({ 'test-app': ui5AppInfo }));

        const result = getReusableLibraryPaths(basePath, mockLogger);

        expect(result).toEqual([
            {
                path: '/resources/valid/lib',
                src: './.adp/reuse/validlib',
                fallthrough: false
            }
        ]);
    });

    test('should handle empty asyncHints or libs array', () => {
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValue(JSON.stringify({ 'test-app': {} }));

        const result = getReusableLibraryPaths(basePath, mockLogger);

        expect(result).toEqual([]);
    });
});
