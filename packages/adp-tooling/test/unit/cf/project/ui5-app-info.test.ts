import fs, { existsSync, readFileSync } from 'node:fs';

import { join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';

import type { ToolsLogger } from '@sap-ux/logger';
import { readUi5Yaml } from '@sap-ux/project-access';

import { getReusableLibraryPaths, downloadUi5AppInfo, writeUi5AppInfo } from '../../../../src/cf/project/ui5-app-info';
import { getOrCreateServiceInstanceKeys, getCfUi5AppInfo } from '../../../../src/cf/services/api';
import { getAppHostIds } from '../../../../src/cf/app/discovery';
import { getBaseAppId } from '../../../../src/base/helper';
import type { CfConfig, ServiceInfo, CfUi5AppInfo } from '../../../../src/types';

jest.mock('@sap-ux/project-access', () => ({
    readUi5Yaml: jest.fn()
}));

jest.mock('../../../../src/cf/services/api', () => ({
    getOrCreateServiceInstanceKeys: jest.fn(),
    getCfUi5AppInfo: jest.fn()
}));

jest.mock('../../../../src/cf/app/discovery', () => ({
    getAppHostIds: jest.fn()
}));

jest.mock('../../../../src/base/helper', () => ({
    getBaseAppId: jest.fn()
}));

const mockReadUi5Yaml = readUi5Yaml as jest.MockedFunction<typeof readUi5Yaml>;
const mockGetOrCreateServiceInstanceKeys = getOrCreateServiceInstanceKeys as jest.MockedFunction<
    typeof getOrCreateServiceInstanceKeys
>;
const mockGetCfUi5AppInfo = getCfUi5AppInfo as jest.MockedFunction<typeof getCfUi5AppInfo>;
const mockGetAppHostIds = getAppHostIds as jest.MockedFunction<typeof getAppHostIds>;
const mockGetBaseAppId = getBaseAppId as jest.MockedFunction<typeof getBaseAppId>;

describe('getReusableLibraryPaths', () => {
    const basePath = '/test/project';
    const mockLogger = {
        warn: jest.fn()
    } as unknown as ToolsLogger;

    let existsSyncSpy: jest.SpyInstance;
    let readFileSyncSpy: jest.SpyInstance;

    beforeEach(() => {
        existsSyncSpy = jest.spyOn(fs, 'existsSync');
        readFileSyncSpy = jest.spyOn(fs, 'readFileSync');
    });

    afterEach(() => {
        jest.restoreAllMocks();
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

        existsSyncSpy.mockReturnValue(true);
        readFileSyncSpy.mockReturnValue(JSON.stringify({ 'test-app': ui5AppInfo }));

        const result = getReusableLibraryPaths(basePath, mockLogger);

        expect(result).toEqual([
            {
                path: '/resources/my/reusable/lib',
                src: './.adp/reuse/myreusablelib',
                fallthrough: true
            },
            {
                path: '/resources/another/lib',
                src: './.adp/reuse/anotherlib',
                fallthrough: true
            }
        ]);
        expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    test('should return empty array when ui5AppInfo.json does not exist', () => {
        existsSyncSpy.mockReturnValue(false);

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

        existsSyncSpy.mockReturnValue(true);
        readFileSyncSpy.mockReturnValue(JSON.stringify({ 'test-app': ui5AppInfo }));

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

        existsSyncSpy.mockReturnValue(true);
        readFileSyncSpy.mockReturnValue(JSON.stringify({ 'test-app': ui5AppInfo }));

        const result = getReusableLibraryPaths(basePath, mockLogger);

        expect(result).toEqual([
            {
                path: '/resources/valid/lib',
                src: './.adp/reuse/validlib',
                fallthrough: true
            }
        ]);
    });

    test('should handle empty asyncHints or libs array', () => {
        existsSyncSpy.mockReturnValue(true);
        readFileSyncSpy.mockReturnValue(JSON.stringify({ 'test-app': {} }));

        const result = getReusableLibraryPaths(basePath, mockLogger);

        expect(result).toEqual([]);
    });
});

describe('writeUi5AppInfo', () => {
    const outputDir = join(__dirname, '../../../fixtures/test-output/write-ui5-app-info');
    const mockLogger = {
        info: jest.fn(),
        error: jest.fn()
    } as unknown as ToolsLogger;

    const mockUi5AppInfo: CfUi5AppInfo = {
        asyncHints: {
            libs: [{ name: 'sap.m' }, { name: 'sap.ui.core' }]
        }
    };

    beforeAll(() => {
        mkdirSync(outputDir, { recursive: true });
    });

    afterAll(() => {
        rmSync(outputDir, { recursive: true, force: true });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should write ui5AppInfo.json to project root', async () => {
        // Use the real implementation, not the module-level mock
        const { writeUi5AppInfo: realWriteUi5AppInfo } = jest.requireActual(
            '../../../../src/cf/project/ui5-app-info'
        );

        await realWriteUi5AppInfo(outputDir, mockUi5AppInfo, mockLogger);

        const filePath = join(outputDir, 'ui5AppInfo.json');
        expect(existsSync(filePath)).toBe(true);

        const content = JSON.parse(readFileSync(filePath, 'utf-8') as string);
        expect(content).toEqual(mockUi5AppInfo);
        expect(mockLogger.info).toHaveBeenCalledWith(`Written ui5AppInfo.json to ${outputDir}`);
    });

    test('should throw error when write fails', async () => {
        const { writeUi5AppInfo: realWriteUi5AppInfo } = jest.requireActual(
            '../../../../src/cf/project/ui5-app-info'
        );
        const invalidPath = '/invalid/path/that/does/not/exist';

        await expect(realWriteUi5AppInfo(invalidPath, mockUi5AppInfo, mockLogger)).rejects.toThrow();
        expect(mockLogger.error).toHaveBeenCalled();
    });
});

describe('downloadUi5AppInfo', () => {
    const projectPath = '/test/project';
    const mockLogger = { info: jest.fn(), error: jest.fn() } as unknown as ToolsLogger;
    const cfConfig = { url: 'cf.example.com', token: 'token', space: { GUID: 'space-guid' } } as unknown as CfConfig;
    const mockUi5AppInfo = { asyncHints: { libs: [] } } as unknown as CfUi5AppInfo;

    const mockFindCustomTask = jest.fn();
    const mockUi5Config = { findCustomTask: mockFindCustomTask };

    let writeFileSyncSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
        mockReadUi5Yaml.mockResolvedValue(mockUi5Config as any);
        mockGetOrCreateServiceInstanceKeys.mockResolvedValue({
            serviceKeys: [{ credentials: { 'html5-apps-repo': { app_host_id: 'host-id-1' } } }]
        } as unknown as ServiceInfo);
        mockGetAppHostIds.mockReturnValue(['host-id-1']);
        mockGetBaseAppId.mockResolvedValue('customer.base.app');
        mockGetCfUi5AppInfo.mockResolvedValue(mockUi5AppInfo);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should download and write ui5AppInfo.json successfully', async () => {
        mockFindCustomTask.mockReturnValue({ configuration: { serviceInstanceName: 'my-html5-repo' } });

        await downloadUi5AppInfo(projectPath, cfConfig, mockLogger);

        expect(mockReadUi5Yaml).toHaveBeenCalledWith(projectPath, 'ui5.yaml');
        expect(mockGetOrCreateServiceInstanceKeys).toHaveBeenCalledWith({ names: ['my-html5-repo'] }, mockLogger);
        expect(mockGetBaseAppId).toHaveBeenCalledWith(projectPath);
        expect(mockGetAppHostIds).toHaveBeenCalledWith([{ credentials: { 'html5-apps-repo': { app_host_id: 'host-id-1' } } }]);
        expect(mockGetCfUi5AppInfo).toHaveBeenCalledWith('customer.base.app', ['host-id-1'], cfConfig, mockLogger);
        expect(writeFileSyncSpy).toHaveBeenCalledWith(
            join(projectPath, 'ui5AppInfo.json'),
            JSON.stringify(mockUi5AppInfo, null, 2),
            'utf-8'
        );
    });

    test('should pass spaceGuids when space is present in bundler task config', async () => {
        mockFindCustomTask.mockReturnValue({
            configuration: { serviceInstanceName: 'my-html5-repo', space: 'my-space-guid' }
        });

        await downloadUi5AppInfo(projectPath, cfConfig, mockLogger);

        expect(mockGetOrCreateServiceInstanceKeys).toHaveBeenCalledWith(
            { names: ['my-html5-repo'], spaceGuids: ['my-space-guid'] },
            mockLogger
        );
    });

    test('should throw when serviceInstanceName is missing from bundler task', async () => {
        mockFindCustomTask.mockReturnValue({ configuration: {} });

        await expect(downloadUi5AppInfo(projectPath, cfConfig)).rejects.toThrow();

        expect(mockGetOrCreateServiceInstanceKeys).not.toHaveBeenCalled();
    });

    test('should throw when bundler task is not found in ui5.yaml', async () => {
        mockFindCustomTask.mockReturnValue(undefined);

        await expect(downloadUi5AppInfo(projectPath, cfConfig)).rejects.toThrow();
    });

    test('should throw when no service keys are found', async () => {
        mockFindCustomTask.mockReturnValue({ configuration: { serviceInstanceName: 'my-html5-repo' } });
        mockGetOrCreateServiceInstanceKeys.mockResolvedValue(null);

        await expect(downloadUi5AppInfo(projectPath, cfConfig, mockLogger)).rejects.toThrow(
            'No service keys found for service instance: my-html5-repo'
        );

        expect(mockGetCfUi5AppInfo).not.toHaveBeenCalled();
    });

    test('should throw when service info has empty serviceKeys array', async () => {
        mockFindCustomTask.mockReturnValue({ configuration: { serviceInstanceName: 'my-html5-repo' } });
        mockGetOrCreateServiceInstanceKeys.mockResolvedValue({ serviceKeys: [] } as unknown as ServiceInfo);

        await expect(downloadUi5AppInfo(projectPath, cfConfig, mockLogger)).rejects.toThrow(
            'No service keys found for service instance: my-html5-repo'
        );
    });

    test('should throw when no app host IDs are found in service keys', async () => {
        mockFindCustomTask.mockReturnValue({ configuration: { serviceInstanceName: 'my-html5-repo' } });
        mockGetAppHostIds.mockReturnValue([]);

        await expect(downloadUi5AppInfo(projectPath, cfConfig, mockLogger)).rejects.toThrow(
            'No app host IDs found in service keys.'
        );

        expect(mockGetCfUi5AppInfo).not.toHaveBeenCalled();
    });
});
