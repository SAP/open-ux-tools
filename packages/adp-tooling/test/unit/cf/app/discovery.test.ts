import type AdmZip from 'adm-zip';
import type { ToolsLogger } from '@sap-ux/logger';

import { initI18n, t } from '../../../../src/i18n';
import { getFDCApps } from '../../../../src/cf/services/api';
import { extractXSApp } from '../../../../src/cf/utils/validation';
import {
    getAppHostIds,
    getBackendUrlFromServiceKeys,
    getCfApps,
    getOAuthPathsFromXsApp
} from '../../../../src/cf/app/discovery';
import type { CFApp, CfConfig, ServiceKeys, Organization, Space, Uaa, XsApp } from '../../../../src/types';

jest.mock('../../../../src/cf/services/api', () => ({
    ...jest.requireActual('../../../../src/cf/services/api'),
    getFDCApps: jest.fn()
}));

jest.mock('../../../../src/cf/utils/validation', () => ({
    ...jest.requireActual('../../../../src/cf/utils/validation'),
    extractXSApp: jest.fn()
}));

const mockGetFDCApps = getFDCApps as jest.MockedFunction<typeof getFDCApps>;
const mockExtractXSApp = extractXSApp as jest.MockedFunction<typeof extractXSApp>;

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

    describe('getBackendUrlFromServiceKeys', () => {
        test('should extract backend URL from first endpoint with URL', () => {
            const serviceKeys: ServiceKeys[] = [
                {
                    credentials: {
                        uaa: {} as Uaa,
                        uri: 'test-uri',
                        endpoints: {
                            endpoint1: {
                                url: '/backend.example'
                            },
                            endpoint2: {
                                url: '/another-backend.example'
                            }
                        }
                    }
                }
            ];

            const result = getBackendUrlFromServiceKeys(serviceKeys);

            expect(result).toBe('/backend.example');
        });

        test('should return first endpoint with URL when multiple endpoints exist', () => {
            const serviceKeys: ServiceKeys[] = [
                {
                    credentials: {
                        uaa: {} as Uaa,
                        uri: 'test-uri',
                        endpoints: {
                            endpoint1: {},
                            endpoint2: {
                                url: '/backend.example'
                            },
                            endpoint3: {
                                url: '/another-backend.example'
                            }
                        }
                    }
                }
            ];

            const result = getBackendUrlFromServiceKeys(serviceKeys);

            expect(result).toBe('/backend.example');
        });

        test('should return undefined when no endpoints have URL', () => {
            const serviceKeys: ServiceKeys[] = [
                {
                    credentials: {
                        uaa: {} as Uaa,
                        uri: 'test-uri',
                        endpoints: {
                            endpoint1: {},
                            endpoint2: {}
                        }
                    }
                }
            ];

            const result = getBackendUrlFromServiceKeys(serviceKeys);

            expect(result).toBeUndefined();
        });

        test('should return undefined for various edge cases', () => {
            expect(getBackendUrlFromServiceKeys([])).toBeUndefined();
            expect(getBackendUrlFromServiceKeys(null as any)).toBeUndefined();
            expect(getBackendUrlFromServiceKeys(undefined as any)).toBeUndefined();
            expect(
                getBackendUrlFromServiceKeys([
                    {
                        credentials: {
                            uaa: {} as Uaa,
                            uri: 'test-uri',
                            endpoints: {}
                        }
                    }
                ])
            ).toBeUndefined();
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
