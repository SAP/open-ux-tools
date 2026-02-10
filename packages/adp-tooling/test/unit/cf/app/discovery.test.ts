import type AdmZip from 'adm-zip';
import type { ToolsLogger } from '@sap-ux/logger';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

import { initI18n, t } from '../../../../src/i18n';
import { getFDCApps } from '../../../../src/cf/services/api';
import { extractXSApp } from '../../../../src/cf/utils/validation';
import {
    getAppHostIds,
    getCfApps,
    getOAuthPathsFromXsApp,
    getBackendUrlsFromServiceKeys,
    getBackendUrlsWithPaths
} from '../../../../src/cf/app/discovery';
import type { CFApp, CfConfig, ServiceKeys, Organization, Space, Uaa, XsApp } from '../../../../src/types';

jest.mock('fs', () => ({
    readFileSync: jest.fn(),
    existsSync: jest.fn()
}));

jest.mock('mem-fs-editor', () => ({
    create: jest.fn()
}));

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn()
}));

jest.mock('../../../../src/cf/services/api');

jest.mock('../../../../src/cf/utils/validation', () => ({
    ...jest.requireActual('../../../../src/cf/utils/validation'),
    extractXSApp: jest.fn()
}));

const mockGetFDCApps = getFDCApps as jest.MockedFunction<typeof getFDCApps>;
const mockExtractXSApp = extractXSApp as jest.MockedFunction<typeof extractXSApp>;
const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;

const mockApps: CFApp[] = [
    {
        appId: 'app-1',
        appName: 'App 1',
        appVersion: '1.0.0',
        serviceName: 'service-1',
        title: 'Test App 1',
        appHostId: 'host-123'
    },
    {
        appId: 'app-2',
        appName: 'App 2',
        appVersion: '2.0.0',
        serviceName: 'service-2',
        title: 'Test App 2',
        appHostId: 'host-456'
    }
];

describe('CF App Discovery', () => {
    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAppHostIds', () => {
        test('should extract single app host id from credentials', () => {
            const serviceKeys: ServiceKeys[] = [
                {
                    credentials: {
                        uaa: {} as any,
                        uri: 'test-uri',
                        endpoints: {},
                        'html5-apps-repo': {
                            app_host_id: 'host-123'
                        }
                    }
                }
            ];

            const result = getAppHostIds(serviceKeys);

            expect(result).toEqual(['host-123']);
        });

        test('should extract multiple app host ids from single credential', () => {
            const serviceKeys: ServiceKeys[] = [
                {
                    credentials: {
                        uaa: {} as any,
                        uri: 'test-uri',
                        endpoints: {},
                        'html5-apps-repo': {
                            app_host_id: 'host-123, host-456, host-789'
                        }
                    }
                }
            ];

            const result = getAppHostIds(serviceKeys);

            expect(result).toEqual(['host-123', 'host-456', 'host-789']);
        });

        test('should extract app host ids from multiple credentials', () => {
            const serviceKeys: ServiceKeys[] = [
                {
                    credentials: {
                        uaa: {} as any,
                        uri: 'test-uri-1',
                        endpoints: {},
                        'html5-apps-repo': {
                            app_host_id: 'host-123, host-456'
                        }
                    }
                },
                {
                    credentials: {
                        uaa: {} as any,
                        uri: 'test-uri-2',
                        endpoints: {},
                        'html5-apps-repo': {
                            app_host_id: 'host-789'
                        }
                    }
                }
            ];

            const result = getAppHostIds(serviceKeys);

            expect(result).toEqual(['host-123', 'host-456', 'host-789']);
        });

        test('should handle credentials with spaces around app host ids', () => {
            const serviceKeys: ServiceKeys[] = [
                {
                    credentials: {
                        uaa: {} as any,
                        uri: 'test-uri',
                        endpoints: {},
                        'html5-apps-repo': {
                            app_host_id: ' host-123 , host-456 , host-789 '
                        }
                    }
                }
            ];

            const result = getAppHostIds(serviceKeys);

            expect(result).toEqual(['host-123', 'host-456', 'host-789']);
        });

        test('should remove duplicate app host ids', () => {
            const serviceKeys: ServiceKeys[] = [
                {
                    credentials: {
                        uaa: {} as any,
                        uri: 'test-uri-1',
                        endpoints: {},
                        'html5-apps-repo': {
                            app_host_id: 'host-123, host-456'
                        }
                    }
                },
                {
                    credentials: {
                        uaa: {} as any,
                        uri: 'test-uri-2',
                        endpoints: {},
                        'html5-apps-repo': {
                            app_host_id: 'host-123, host-789'
                        }
                    }
                }
            ];

            const result = getAppHostIds(serviceKeys);

            expect(result).toEqual(['host-123', 'host-456', 'host-789']);
        });

        test('should handle credentials without html5-apps-repo', () => {
            const serviceKeys: ServiceKeys[] = [
                {
                    credentials: {
                        uaa: {} as any,
                        uri: 'test-uri',
                        endpoints: {}
                    }
                }
            ];

            const result = getAppHostIds(serviceKeys);

            expect(result).toEqual([]);
        });

        test('should handle credentials with empty html5-apps-repo', () => {
            const serviceKeys: ServiceKeys[] = [
                {
                    credentials: {
                        uaa: {} as any,
                        uri: 'test-uri',
                        endpoints: {},
                        'html5-apps-repo': {}
                    }
                }
            ];

            const result = getAppHostIds(serviceKeys);

            expect(result).toEqual([]);
        });

        test('should handle empty credentials array', () => {
            const serviceKeys: ServiceKeys[] = [];

            const result = getAppHostIds(serviceKeys);

            expect(result).toEqual([]);
        });

        test('should handle mixed credentials with and without app host ids', () => {
            const serviceKeys: ServiceKeys[] = [
                {
                    credentials: {
                        uaa: {} as any,
                        uri: 'test-uri-1',
                        endpoints: {},
                        'html5-apps-repo': {
                            app_host_id: 'host-123'
                        }
                    }
                },
                {
                    credentials: {
                        uaa: {} as any,
                        uri: 'test-uri-2',
                        endpoints: {}
                    }
                },
                {
                    credentials: {
                        uaa: {} as any,
                        uri: 'test-uri-3',
                        endpoints: {},
                        'html5-apps-repo': {
                            app_host_id: 'host-456, host-789'
                        }
                    }
                }
            ];

            const result = getAppHostIds(serviceKeys);

            expect(result).toEqual(['host-123', 'host-456', 'host-789']);
        });
    });

    describe('getCfApps', () => {
        const mockLogger = {
            log: jest.fn()
        } as unknown as ToolsLogger;

        const mockCfConfig: CfConfig = {
            org: {} as Organization,
            space: {} as Space,
            token: 'test-token',
            url: 'https://test.cf.com'
        };

        test('should successfully discover apps with valid credentials', async () => {
            const serviceKeys: ServiceKeys[] = [
                {
                    credentials: {
                        uaa: {} as any,
                        uri: 'test-uri',
                        endpoints: {},
                        'html5-apps-repo': {
                            app_host_id: 'host-123, host-456'
                        }
                    }
                }
            ];

            mockGetFDCApps.mockResolvedValue(mockApps);

            const result = await getCfApps(serviceKeys, mockCfConfig, mockLogger);

            expect(result).toEqual(mockApps);
            expect(mockGetFDCApps).toHaveBeenCalledWith(['host-123', 'host-456'], mockCfConfig, mockLogger);
            expect(mockLogger.log).toHaveBeenCalledWith('App Host Ids: ["host-123","host-456"]');
        });

        test('should throw error when app host ids exceed 100', async () => {
            const serviceKeys: ServiceKeys[] = Array.from({ length: 101 }, (_, i) => ({
                credentials: {
                    uaa: {} as Uaa,
                    uri: `test-uri-${i}`,
                    endpoints: {},
                    'html5-apps-repo': {
                        app_host_id: `host-${i}`
                    }
                }
            }));

            await expect(getCfApps(serviceKeys, mockCfConfig, mockLogger)).rejects.toThrow(
                t('error.tooManyAppHostIds', { appHostIdsLength: 101 })
            );
            expect(mockGetFDCApps).not.toHaveBeenCalled();
        });

        test('should handle empty credentials array', async () => {
            const serviceKeys: ServiceKeys[] = [];

            mockGetFDCApps.mockResolvedValue([]);

            const result = await getCfApps(serviceKeys, mockCfConfig, mockLogger);

            expect(result).toEqual([]);
            expect(mockGetFDCApps).toHaveBeenCalledWith([], mockCfConfig, mockLogger);
            expect(mockLogger.log).toHaveBeenCalledWith('App Host Ids: []');
        });

        test('should propagate errors from getFDCApps', async () => {
            const serviceKeys: ServiceKeys[] = [
                {
                    credentials: {
                        uaa: {} as Uaa,
                        uri: 'test-uri',
                        endpoints: {},
                        'html5-apps-repo': {
                            app_host_id: 'host-123'
                        }
                    }
                }
            ];

            const error = new Error('API Error');
            mockGetFDCApps.mockRejectedValue(error);

            await expect(getCfApps(serviceKeys, mockCfConfig, mockLogger)).rejects.toThrow('API Error');
        });
    });

    describe('getBackendUrlsFromServiceKeys', () => {
        test('should extract URLs from endpoints', () => {
            const serviceKeys: ServiceKeys[] = [
                {
                    credentials: {
                        uaa: {} as any,
                        uri: 'test-uri',
                        endpoints: {
                            'backend-service': { url: 'https://backend.example.com/api' },
                            'odata-service': { url: 'https://odata.example.com/odata' }
                        },
                        'html5-apps-repo': {}
                    }
                }
            ];

            const result = getBackendUrlsFromServiceKeys(serviceKeys);

            expect(result).toEqual(['https://backend.example.com/api', 'https://odata.example.com/odata']);
        });

        test('should return empty array when no service keys', () => {
            expect(getBackendUrlsFromServiceKeys([])).toEqual([]);
        });

        test('should return empty array when service keys is undefined', () => {
            expect(getBackendUrlsFromServiceKeys(undefined as any)).toEqual([]);
        });

        test('should return empty array when endpoints is missing', () => {
            const serviceKeys: ServiceKeys[] = [
                {
                    credentials: {
                        uaa: {} as any,
                        uri: 'test-uri',
                        endpoints: {},
                        'html5-apps-repo': {}
                    }
                }
            ];

            const result = getBackendUrlsFromServiceKeys(serviceKeys);

            expect(result).toEqual([]);
        });

        test('should skip endpoints without url property', () => {
            const serviceKeys: ServiceKeys[] = [
                {
                    credentials: {
                        uaa: {} as any,
                        uri: 'test-uri',
                        endpoints: {
                            'backend-service': { url: 'https://backend.example.com/api' },
                            'invalid-service': {}
                        },
                        'html5-apps-repo': {}
                    }
                }
            ];

            const result = getBackendUrlsFromServiceKeys(serviceKeys);

            expect(result).toEqual(['https://backend.example.com/api']);
        });

        test('should handle empty endpoints object', () => {
            const serviceKeys: ServiceKeys[] = [
                {
                    credentials: {
                        uaa: {} as any,
                        uri: 'test-uri',
                        endpoints: {},
                        'html5-apps-repo': {}
                    }
                }
            ];

            const result = getBackendUrlsFromServiceKeys(serviceKeys);

            expect(result).toEqual([]);
        });
    });

    describe('getBackendUrlsWithPaths', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('should map URLs to paths from .adp/reuse folder', () => {
            const serviceKeys: ServiceKeys[] = [
                {
                    credentials: {
                        uaa: {} as any,
                        uri: 'test-uri',
                        endpoints: {
                            'backend-dest': { url: 'https://backend.example.com', destination: 'backend-dest' },
                            'odata-dest': { url: 'https://odata.example.com', destination: 'odata-dest' }
                        },
                        'html5-apps-repo': {}
                    }
                }
            ];

            const xsAppContent = {
                routes: [
                    { source: '/sap/opu/odata', destination: 'backend-dest' },
                    { source: '/api/v1', destination: 'odata-dest' }
                ]
            };

            mockExistsSync.mockImplementation((path: any) => {
                const pathStr = String(path);
                return pathStr.includes(join('.adp', 'reuse'));
            });
            mockReadFileSync.mockReturnValue(JSON.stringify(xsAppContent));

            const result = getBackendUrlsWithPaths(serviceKeys, '/test/base');

            expect(result).toEqual([
                { url: 'https://backend.example.com', paths: ['/sap/opu/odata'] },
                { url: 'https://odata.example.com', paths: ['/api/v1'] }
            ]);
        });

        test('should use dist folder when .adp/reuse does not exist', () => {
            const serviceKeys: ServiceKeys[] = [
                {
                    credentials: {
                        uaa: {} as any,
                        uri: 'test-uri',
                        endpoints: {
                            'backend-dest': { url: 'https://backend.example.com', destination: 'backend-dest' }
                        },
                        'html5-apps-repo': {}
                    }
                }
            ];

            const xsAppContent = {
                routes: [{ source: '/sap/opu/odata', destination: 'backend-dest' }]
            };

            mockExistsSync.mockImplementation((path: any) => {
                const pathStr = String(path);
                return !pathStr.includes(join('.adp', 'reuse'));
            });
            mockReadFileSync.mockReturnValue(JSON.stringify(xsAppContent));

            const result = getBackendUrlsWithPaths(serviceKeys, '/test/base');

            expect(result).toEqual([{ url: 'https://backend.example.com', paths: ['/sap/opu/odata'] }]);
        });

        test('should handle multiple paths for same destination', () => {
            const serviceKeys: ServiceKeys[] = [
                {
                    credentials: {
                        uaa: {} as any,
                        uri: 'test-uri',
                        endpoints: {
                            'backend-dest': { url: 'https://backend.example.com', destination: 'backend-dest' }
                        },
                        'html5-apps-repo': {}
                    }
                }
            ];

            const xsAppContent = {
                routes: [
                    { source: '/sap/opu/odata', destination: 'backend-dest' },
                    { source: '/api/v1', destination: 'backend-dest' },
                    { source: '/api/v2', destination: 'backend-dest' }
                ]
            };

            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(xsAppContent));

            const result = getBackendUrlsWithPaths(serviceKeys, '/test/base');

            expect(result).toHaveLength(1);
            expect(result[0].url).toBe('https://backend.example.com');
            expect(result[0].paths).toHaveLength(3);
            expect(result[0].paths).toContain('/sap/opu/odata');
            expect(result[0].paths).toContain('/api/v1');
            expect(result[0].paths).toContain('/api/v2');
        });

        test('should skip routes without destination', () => {
            const serviceKeys: ServiceKeys[] = [
                {
                    credentials: {
                        uaa: {} as any,
                        uri: 'test-uri',
                        endpoints: {
                            'backend-dest': { url: 'https://backend.example.com', destination: 'backend-dest' }
                        },
                        'html5-apps-repo': {}
                    }
                }
            ];

            const xsAppContent = {
                routes: [{ source: '/sap/opu/odata', destination: 'backend-dest' }, { source: '/no-destination' }]
            };

            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(xsAppContent));

            const result = getBackendUrlsWithPaths(serviceKeys, '/test/base');

            expect(result).toEqual([{ url: 'https://backend.example.com', paths: ['/sap/opu/odata'] }]);
        });

        test('should skip html5-apps-repo-rt service routes', () => {
            const serviceKeys: ServiceKeys[] = [
                {
                    credentials: {
                        uaa: {} as any,
                        uri: 'test-uri',
                        endpoints: {
                            'backend-dest': { url: 'https://backend.example.com', destination: 'backend-dest' }
                        },
                        'html5-apps-repo': {}
                    }
                }
            ];

            const xsAppContent = {
                routes: [
                    { source: '/sap/opu/odata', destination: 'backend-dest' },
                    { source: '/static', destination: 'static-dest', service: 'html5-apps-repo-rt' }
                ]
            };

            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(xsAppContent));

            const result = getBackendUrlsWithPaths(serviceKeys, '/test/base');

            expect(result).toEqual([{ url: 'https://backend.example.com', paths: ['/sap/opu/odata'] }]);
        });

        test('should throw error when xs-app.json file is missing', () => {
            const serviceKeys: ServiceKeys[] = [
                {
                    credentials: {
                        uaa: {} as any,
                        uri: 'test-uri',
                        endpoints: {
                            'backend-dest': { url: 'https://backend.example.com', destination: 'backend-dest' }
                        },
                        'html5-apps-repo': {}
                    }
                }
            ];

            mockExistsSync.mockReturnValue(false);

            expect(() => getBackendUrlsWithPaths(serviceKeys, '/test/base')).toThrow(
                'The xs-app.json file was not found in any of the expected locations'
            );
        });

        test('should handle invalid JSON in xs-app.json', () => {
            const serviceKeys: ServiceKeys[] = [
                {
                    credentials: {
                        uaa: {} as any,
                        uri: 'test-uri',
                        endpoints: {
                            'backend-dest': { url: 'https://backend.example.com', destination: 'backend-dest' }
                        },
                        'html5-apps-repo': {}
                    }
                }
            ];

            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue('invalid json');

            expect(() => getBackendUrlsWithPaths(serviceKeys, '/test/base')).toThrow(/The xs-app.json file is invalid/);
        });

        test('should skip destinations not in endpoint mapping', () => {
            const serviceKeys: ServiceKeys[] = [
                {
                    credentials: {
                        uaa: {} as any,
                        uri: 'test-uri',
                        endpoints: {
                            'backend-dest': { url: 'https://backend.example.com', destination: 'backend-dest' }
                        },
                        'html5-apps-repo': {}
                    }
                }
            ];

            const xsAppContent = {
                routes: [
                    { source: '/sap/opu/odata', destination: 'backend-dest' },
                    { source: '/unknown', destination: 'unknown-dest' }
                ]
            };

            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(xsAppContent));

            const result = getBackendUrlsWithPaths(serviceKeys, '/test/base');

            expect(result).toEqual([{ url: 'https://backend.example.com', paths: ['/sap/opu/odata'] }]);
        });

        test('should clean regex patterns from paths', () => {
            const serviceKeys: ServiceKeys[] = [
                {
                    credentials: {
                        uaa: {} as any,
                        uri: 'test-uri',
                        endpoints: {
                            'backend-dest': { url: 'https://backend.example.com', destination: 'backend-dest' }
                        },
                        'html5-apps-repo': {}
                    }
                }
            ];

            const xsAppContent = {
                routes: [{ source: '^/sap/opu/odata(.*)$', destination: 'backend-dest' }]
            };

            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(xsAppContent));

            const result = getBackendUrlsWithPaths(serviceKeys, '/test/base');

            expect(result).toEqual([{ url: 'https://backend.example.com', paths: ['/sap/opu/odata'] }]);
        });

        test('should skip routes without source', () => {
            const serviceKeys: ServiceKeys[] = [
                {
                    credentials: {
                        uaa: {} as any,
                        uri: 'test-uri',
                        endpoints: {
                            'backend-dest': { url: 'https://backend.example.com', destination: 'backend-dest' }
                        },
                        'html5-apps-repo': {}
                    }
                }
            ];

            const xsAppContent = {
                routes: [{ source: '/sap/opu/odata', destination: 'backend-dest' }, { destination: 'backend-dest' }]
            };

            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(xsAppContent));

            const result = getBackendUrlsWithPaths(serviceKeys, '/test/base');

            expect(result).toEqual([{ url: 'https://backend.example.com', paths: ['/sap/opu/odata'] }]);
        });
    });

    describe('getOAuthPathsFromXsApp', () => {
        const mockZipEntries = [] as AdmZip.IZipEntry[];

        beforeEach(() => {
            mockExtractXSApp.mockReturnValue(undefined);
        });

        test('should return empty array when xs-app or routes are missing', () => {
            mockExtractXSApp.mockReturnValue(undefined);
            expect(getOAuthPathsFromXsApp(mockZipEntries)).toEqual([]);

            mockExtractXSApp.mockReturnValue({} as XsApp);
            expect(getOAuthPathsFromXsApp(mockZipEntries)).toEqual([]);

            mockExtractXSApp.mockReturnValue({ routes: [] } as XsApp);
            expect(getOAuthPathsFromXsApp(mockZipEntries)).toEqual([]);
        });

        test('should extract paths from routes', () => {
            mockExtractXSApp.mockReturnValue({
                routes: [
                    { source: '/sap/opu/odata', service: 'odata-service' },
                    { source: '/api/v1', service: 'api-service' },
                    { source: '/static', service: 'html5-apps-repo-rt' },
                    { service: 'api-service' }
                ]
            } as XsApp);

            const result = getOAuthPathsFromXsApp(mockZipEntries);

            expect(result).toEqual(['/sap/opu/odata', '/api/v1']);
        });

        test('should clean regex patterns from paths', () => {
            // Test removing leading ^ and trailing $
            mockExtractXSApp.mockReturnValue({
                routes: [{ source: '^/sap/opu/odata$', service: 'odata-service' }]
            } as XsApp);
            expect(getOAuthPathsFromXsApp(mockZipEntries)).toEqual(['/sap/opu/odata']);

            // Test removing capture groups (note: /api/(.*)/v1 becomes /api/v1 after normalization)
            mockExtractXSApp.mockReturnValue({
                routes: [
                    { source: '/sap/opu/odata(.*)', service: 'odata-service' },
                    { source: '/api/(.*)/v1', service: 'api-service' }
                ]
            } as XsApp);
            expect(getOAuthPathsFromXsApp(mockZipEntries)).toEqual(['/sap/opu/odata', '/api/v1']);

            // Test removing regex quantifiers
            mockExtractXSApp.mockReturnValue({
                routes: [
                    { source: '/sap/opu/odata$1', service: 'odata-service' },
                    { source: '/api/v1$2', service: 'api-service' }
                ]
            } as XsApp);
            expect(getOAuthPathsFromXsApp(mockZipEntries)).toEqual(['/sap/opu/odata', '/api/v1']);

            // Test removing trailing * and optional /
            mockExtractXSApp.mockReturnValue({
                routes: [
                    { source: '/sap/opu/odata/*', service: 'odata-service' },
                    { source: '/api/v1*', service: 'api-service' }
                ]
            } as XsApp);
            expect(getOAuthPathsFromXsApp(mockZipEntries)).toEqual(['/sap/opu/odata', '/api/v1']);

            // Test complex regex pattern
            mockExtractXSApp.mockReturnValue({
                routes: [{ source: '^/sap/opu/odata(.*)$1/*', service: 'odata-service' }]
            } as XsApp);
            expect(getOAuthPathsFromXsApp(mockZipEntries)).toEqual(['/sap/opu/odata']);
        });

        test('should remove duplicate paths', () => {
            mockExtractXSApp.mockReturnValue({
                routes: [
                    { source: '/sap/opu/odata', service: 'odata-service' },
                    { source: '/sap/opu/odata', service: 'another-service' },
                    { source: '/api/v1', service: 'api-service' }
                ]
            } as XsApp);

            const result = getOAuthPathsFromXsApp(mockZipEntries);

            expect(result).toEqual(['/sap/opu/odata', '/api/v1']);
        });

        test('should handle edge cases', () => {
            mockExtractXSApp.mockReturnValue({
                routes: [
                    { source: '/sap/opu/odata', service: 'odata-service' },
                    { source: '^$', service: 'api-service' },
                    { source: '(.*)', service: 'another-service' }
                ]
            } as XsApp);
            expect(getOAuthPathsFromXsApp(mockZipEntries)).toEqual(['/sap/opu/odata']);

            mockExtractXSApp.mockReturnValue({
                routes: [{ source: '/sap/opu/odata(.*)(.*)', service: 'odata-service' }]
            } as XsApp);
            expect(getOAuthPathsFromXsApp(mockZipEntries)).toEqual(['/sap/opu/odata']);
        });
    });
});
