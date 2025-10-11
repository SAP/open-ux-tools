import type { ToolsLogger } from '@sap-ux/logger';

import { initI18n, t } from '../../../../src/i18n';
import { getFDCApps } from '../../../../src/cf/services/api';
import { getAppHostIds, getCfApps } from '../../../../src/cf/app/discovery';
import type { CFApp, CfConfig, CfCredentials, Organization, Space, Uaa } from '../../../../src/types';

jest.mock('../../../../src/cf/services/api', () => ({
    ...jest.requireActual('../../../../src/cf/services/api'),
    getFDCApps: jest.fn()
}));

const mockGetFDCApps = getFDCApps as jest.MockedFunction<typeof getFDCApps>;

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
            const credentials: CfCredentials[] = [
                {
                    uaa: {} as any,
                    uri: 'test-uri',
                    endpoints: {},
                    'html5-apps-repo': {
                        app_host_id: 'host-123'
                    }
                }
            ];

            const result = getAppHostIds(credentials);

            expect(result).toEqual(['host-123']);
        });

        test('should extract multiple app host ids from single credential', () => {
            const credentials: CfCredentials[] = [
                {
                    uaa: {} as any,
                    uri: 'test-uri',
                    endpoints: {},
                    'html5-apps-repo': {
                        app_host_id: 'host-123, host-456, host-789'
                    }
                }
            ];

            const result = getAppHostIds(credentials);

            expect(result).toEqual(['host-123', 'host-456', 'host-789']);
        });

        test('should extract app host ids from multiple credentials', () => {
            const credentials: CfCredentials[] = [
                {
                    uaa: {} as any,
                    uri: 'test-uri-1',
                    endpoints: {},
                    'html5-apps-repo': {
                        app_host_id: 'host-123, host-456'
                    }
                },
                {
                    uaa: {} as any,
                    uri: 'test-uri-2',
                    endpoints: {},
                    'html5-apps-repo': {
                        app_host_id: 'host-789'
                    }
                }
            ];

            const result = getAppHostIds(credentials);

            expect(result).toEqual(['host-123', 'host-456', 'host-789']);
        });

        test('should handle credentials with spaces around app host ids', () => {
            const credentials: CfCredentials[] = [
                {
                    uaa: {} as any,
                    uri: 'test-uri',
                    endpoints: {},
                    'html5-apps-repo': {
                        app_host_id: ' host-123 , host-456 , host-789 '
                    }
                }
            ];

            const result = getAppHostIds(credentials);

            expect(result).toEqual(['host-123', 'host-456', 'host-789']);
        });

        test('should remove duplicate app host ids', () => {
            const credentials: CfCredentials[] = [
                {
                    uaa: {} as any,
                    uri: 'test-uri-1',
                    endpoints: {},
                    'html5-apps-repo': {
                        app_host_id: 'host-123, host-456'
                    }
                },
                {
                    uaa: {} as any,
                    uri: 'test-uri-2',
                    endpoints: {},
                    'html5-apps-repo': {
                        app_host_id: 'host-123, host-789'
                    }
                }
            ];

            const result = getAppHostIds(credentials);

            expect(result).toEqual(['host-123', 'host-456', 'host-789']);
        });

        test('should handle credentials without html5-apps-repo', () => {
            const credentials: CfCredentials[] = [
                {
                    uaa: {} as any,
                    uri: 'test-uri',
                    endpoints: {}
                }
            ];

            const result = getAppHostIds(credentials);

            expect(result).toEqual([]);
        });

        test('should handle credentials with empty html5-apps-repo', () => {
            const credentials: CfCredentials[] = [
                {
                    uaa: {} as any,
                    uri: 'test-uri',
                    endpoints: {},
                    'html5-apps-repo': {}
                }
            ];

            const result = getAppHostIds(credentials);

            expect(result).toEqual([]);
        });

        test('should handle empty credentials array', () => {
            const credentials: CfCredentials[] = [];

            const result = getAppHostIds(credentials);

            expect(result).toEqual([]);
        });

        test('should handle mixed credentials with and without app host ids', () => {
            const credentials: CfCredentials[] = [
                {
                    uaa: {} as any,
                    uri: 'test-uri-1',
                    endpoints: {},
                    'html5-apps-repo': {
                        app_host_id: 'host-123'
                    }
                },
                {
                    uaa: {} as any,
                    uri: 'test-uri-2',
                    endpoints: {}
                },
                {
                    uaa: {} as any,
                    uri: 'test-uri-3',
                    endpoints: {},
                    'html5-apps-repo': {
                        app_host_id: 'host-456, host-789'
                    }
                }
            ];

            const result = getAppHostIds(credentials);

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
            const credentials: CfCredentials[] = [
                {
                    uaa: {} as any,
                    uri: 'test-uri',
                    endpoints: {},
                    'html5-apps-repo': {
                        app_host_id: 'host-123, host-456'
                    }
                }
            ];

            mockGetFDCApps.mockResolvedValue(mockApps);

            const result = await getCfApps(credentials, mockCfConfig, mockLogger);

            expect(result).toEqual(mockApps);
            expect(mockGetFDCApps).toHaveBeenCalledWith(['host-123', 'host-456'], mockCfConfig, mockLogger);
            expect(mockLogger.log).toHaveBeenCalledWith('App Host Ids: ["host-123","host-456"]');
        });

        test('should throw error when app host ids exceed 100', async () => {
            const credentials: CfCredentials[] = Array.from({ length: 101 }, (_, i) => ({
                uaa: {} as Uaa,
                uri: `test-uri-${i}`,
                endpoints: {},
                'html5-apps-repo': {
                    app_host_id: `host-${i}`
                }
            }));

            await expect(getCfApps(credentials, mockCfConfig, mockLogger)).rejects.toThrow(
                t('error.tooManyAppHostIds', { appHostIdsLength: 101 })
            );
            expect(mockGetFDCApps).not.toHaveBeenCalled();
        });

        test('should handle empty credentials array', async () => {
            const credentials: CfCredentials[] = [];

            mockGetFDCApps.mockResolvedValue([]);

            const result = await getCfApps(credentials, mockCfConfig, mockLogger);

            expect(result).toEqual([]);
            expect(mockGetFDCApps).toHaveBeenCalledWith([], mockCfConfig, mockLogger);
            expect(mockLogger.log).toHaveBeenCalledWith('App Host Ids: []');
        });

        test('should propagate errors from getFDCApps', async () => {
            const credentials: CfCredentials[] = [
                {
                    uaa: {} as Uaa,
                    uri: 'test-uri',
                    endpoints: {},
                    'html5-apps-repo': {
                        app_host_id: 'host-123'
                    }
                }
            ];

            const error = new Error('API Error');
            mockGetFDCApps.mockRejectedValue(error);

            await expect(getCfApps(credentials, mockCfConfig, mockLogger)).rejects.toThrow('API Error');
        });
    });
});
