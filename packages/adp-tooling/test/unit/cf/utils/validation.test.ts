import type AdmZip from 'adm-zip';
import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';

import {
    validateSmartTemplateApplication,
    extractXSApp,
    validateODataEndpoints
} from '../../../../src/cf/utils/validation';
import { initI18n, t } from '../../../../src/i18n';
import { ApplicationType, type CfCredentials, type XsApp } from '../../../../src/types';
import { getApplicationType } from '../../../../src/source/manifest';

jest.mock('../../../../src/source/manifest', () => ({
    ...jest.requireActual('../../../../src/source/manifest'),
    getApplicationType: jest.fn()
}));

const mockGetApplicationType = getApplicationType as jest.MockedFunction<typeof getApplicationType>;

describe('CF Utils Validation', () => {
    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('validateSmartTemplateApplication', () => {
        test('should not throw when application type is supported and flex is enabled', async () => {
            const manifest: Manifest = {
                'sap.app': {
                    id: 'test.app'
                },
                'sap.ui5': {
                    flexEnabled: true
                }
            } as unknown as Manifest;

            mockGetApplicationType.mockReturnValue(ApplicationType.FIORI_ELEMENTS);

            await expect(validateSmartTemplateApplication(manifest)).resolves.not.toThrow();
            expect(mockGetApplicationType).toHaveBeenCalledWith(manifest);
        });

        test('should not throw when application type is supported and flex is not explicitly disabled', async () => {
            const manifest: Manifest = {
                'sap.app': {
                    id: 'test.app'
                }
            } as unknown as Manifest;

            mockGetApplicationType.mockReturnValue(ApplicationType.FREE_STYLE);

            await expect(validateSmartTemplateApplication(manifest)).resolves.not.toThrow();
        });

        test('should throw error when application type is not supported', async () => {
            const manifest: Manifest = {
                'sap.app': {
                    id: 'test.app'
                }
            } as unknown as Manifest;

            mockGetApplicationType.mockReturnValue(ApplicationType.NONE);

            await expect(validateSmartTemplateApplication(manifest)).rejects.toThrow(
                t('error.adpDoesNotSupportSelectedApplication')
            );
        });

        test('should throw error when flex is explicitly disabled', async () => {
            const manifest: Manifest = {
                'sap.app': {
                    id: 'test.app',
                    title: 'Test App',
                    type: 'application',
                    applicationVersion: {
                        version: '1.0.0'
                    }
                },
                'sap.ui5': {
                    flexEnabled: false,
                    dependencies: {
                        minUI5Version: '1.60.0'
                    },
                    contentDensities: {
                        compact: true,
                        cozy: true
                    }
                }
            } as unknown as Manifest;

            mockGetApplicationType.mockReturnValue(ApplicationType.FIORI_ELEMENTS);

            await expect(validateSmartTemplateApplication(manifest)).rejects.toThrow(
                t('error.appDoesNotSupportFlexibility')
            );
        });
    });

    describe('extractXSApp', () => {
        test('should extract and parse xs-app.json successfully', () => {
            const mockXsApp: XsApp = {
                welcomeFile: 'index.html',
                authenticationMethod: 'route',
                routes: [
                    {
                        source: '/odata/',
                        endpoint: 'odata-endpoint'
                    }
                ]
            };

            const mockZipEntry = {
                entryName: 'webapp/xs-app.json',
                getData: jest.fn().mockReturnValue(Buffer.from(JSON.stringify(mockXsApp)))
            };

            const zipEntries = [mockZipEntry] as unknown as AdmZip.IZipEntry[];

            const result = extractXSApp(zipEntries);

            expect(result).toEqual(mockXsApp);
            expect(mockZipEntry.getData).toHaveBeenCalled();
        });

        test('should throw error when no xs-app.json is found', () => {
            const mockZipEntry = {
                entryName: 'webapp/manifest.json',
                getData: jest.fn()
            };

            const zipEntries = [mockZipEntry] as unknown as AdmZip.IZipEntry[];

            expect(() => extractXSApp(zipEntries)).toThrow(
                t('error.failedToParseXsAppJson', { error: 'Unexpected end of JSON input' })
            );
        });

        test('should throw error when xs-app.json parsing fails', () => {
            const mockZipEntry = {
                entryName: 'webapp/xs-app.json',
                getData: jest.fn().mockReturnValue(Buffer.from('invalid json'))
            };

            const zipEntries = [mockZipEntry] as unknown as AdmZip.IZipEntry[];

            expect(() => extractXSApp(zipEntries)).toThrow(
                t('error.failedToParseXsAppJson', { error: 'Unexpected token \'i\', "invalid json" is not valid JSON' })
            );
        });
    });

    describe('validateODataEndpoints', () => {
        const mockLogger = {
            log: jest.fn(),
            error: jest.fn()
        } as unknown as ToolsLogger;

        const mockManifest: Manifest = {
            'sap.app': {
                id: 'test.app',
                dataSources: {
                    'odata-service': {
                        uri: '/odata/service/',
                        type: 'OData'
                    }
                }
            }
        } as unknown as Manifest;

        test('should validate successfully when all endpoints match', async () => {
            const mockXsApp: XsApp = {
                routes: [
                    {
                        source: '/odata/',
                        endpoint: 'odata-endpoint'
                    }
                ]
            };

            const mockCredentials: CfCredentials[] = [
                {
                    uaa: {
                        clientid: 'test-client',
                        clientsecret: 'test-secret',
                        url: '/uaa.test.com'
                    },
                    uri: '/service.test.com',
                    endpoints: {
                        'odata-endpoint': '/odata.test.com'
                    }
                }
            ];

            const mockXsAppEntry = {
                entryName: 'webapp/xs-app.json',
                getData: jest.fn().mockReturnValue(Buffer.from(JSON.stringify(mockXsApp)))
            };

            const mockManifestEntry = {
                entryName: 'webapp/manifest.json',
                getData: jest.fn().mockReturnValue(Buffer.from(JSON.stringify(mockManifest)))
            };

            const zipEntries = [mockXsAppEntry, mockManifestEntry] as unknown as AdmZip.IZipEntry[];

            await expect(validateODataEndpoints(zipEntries, mockCredentials, mockLogger)).resolves.not.toThrow();
            expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('ODATA endpoints:'));
            expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Extracted manifest:'));
        });

        test('should throw error when route endpoint does not match service key endpoints', async () => {
            const mockXsApp: XsApp = {
                routes: [
                    {
                        source: '/odata/',
                        endpoint: 'non-existent-endpoint'
                    }
                ]
            };

            const mockCredentials: CfCredentials[] = [
                {
                    uaa: {
                        clientid: 'test-client',
                        clientsecret: 'test-secret',
                        url: '/uaa.test.com'
                    },
                    uri: '/service.test.com',
                    endpoints: {
                        'odata-endpoint': '/odata.test.com'
                    }
                }
            ];

            const mockXsAppEntry = {
                entryName: 'webapp/xs-app.json',
                getData: jest.fn().mockReturnValue(Buffer.from(JSON.stringify(mockXsApp)))
            };

            const mockManifestEntry = {
                entryName: 'webapp/manifest.json',
                getData: jest.fn().mockReturnValue(Buffer.from(JSON.stringify(mockManifest)))
            };

            const zipEntries = [mockXsAppEntry, mockManifestEntry] as unknown as AdmZip.IZipEntry[];

            await expect(validateODataEndpoints(zipEntries, mockCredentials, mockLogger)).rejects.toThrow(
                t('error.oDataEndpointsValidationFailed')
            );
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('OData endpoints validation failed:')
            );
        });

        test('should throw error when data source does not match any route', async () => {
            const mockXsApp: XsApp = {
                routes: [
                    {
                        source: '/different/',
                        endpoint: 'odata-endpoint'
                    }
                ]
            };

            const mockCredentials: CfCredentials[] = [
                {
                    uaa: {
                        clientid: 'test-client',
                        clientsecret: 'test-secret',
                        url: '/uaa.test.com'
                    },
                    uri: '/service.test.com',
                    endpoints: {
                        'odata-endpoint': '/odata.test.com'
                    }
                }
            ];

            const mockXsAppEntry = {
                entryName: 'webapp/xs-app.json',
                getData: jest.fn().mockReturnValue(Buffer.from(JSON.stringify(mockXsApp)))
            };

            const mockManifestEntry = {
                entryName: 'webapp/manifest.json',
                getData: jest.fn().mockReturnValue(Buffer.from(JSON.stringify(mockManifest)))
            };

            const zipEntries = [mockXsAppEntry, mockManifestEntry] as unknown as AdmZip.IZipEntry[];

            await expect(validateODataEndpoints(zipEntries, mockCredentials, mockLogger)).rejects.toThrow(
                t('error.oDataEndpointsValidationFailed')
            );
        });

        test('should throw error when manifest.json has data sources but xs-app.json has no routes', async () => {
            const mockXsApp: XsApp = {
                routes: []
            };

            const mockCredentials: CfCredentials[] = [];

            const mockXsAppEntry = {
                entryName: 'webapp/xs-app.json',
                getData: jest.fn().mockReturnValue(Buffer.from(JSON.stringify(mockXsApp)))
            };

            const mockManifestEntry = {
                entryName: 'webapp/manifest.json',
                getData: jest.fn().mockReturnValue(Buffer.from(JSON.stringify(mockManifest)))
            };

            const zipEntries = [mockXsAppEntry, mockManifestEntry] as unknown as AdmZip.IZipEntry[];

            await expect(validateODataEndpoints(zipEntries, mockCredentials, mockLogger)).rejects.toThrow(
                t('error.oDataEndpointsValidationFailed')
            );
        });

        test('should throw error when xs-app.json has routes but manifest.json has no data sources', async () => {
            const mockXsApp: XsApp = {
                routes: [
                    {
                        source: '/odata/',
                        endpoint: 'odata-endpoint'
                    }
                ]
            };

            const mockManifest: Manifest = {
                'sap.app': {
                    id: 'test.app'
                }
            } as unknown as Manifest;

            const mockCredentials: CfCredentials[] = [];

            const mockXsAppEntry = {
                entryName: 'webapp/xs-app.json',
                getData: jest.fn().mockReturnValue(Buffer.from(JSON.stringify(mockXsApp)))
            };

            const mockManifestEntry = {
                entryName: 'webapp/manifest.json',
                getData: jest.fn().mockReturnValue(Buffer.from(JSON.stringify(mockManifest)))
            };

            const zipEntries = [mockXsAppEntry, mockManifestEntry] as unknown as AdmZip.IZipEntry[];

            await expect(validateODataEndpoints(zipEntries, mockCredentials, mockLogger)).rejects.toThrow(
                t('error.oDataEndpointsValidationFailed')
            );
        });

        test('should handle xs-app.json parsing error', async () => {
            const mockManifest: Manifest = {
                'sap.app': {
                    id: 'test.app'
                }
            } as unknown as Manifest;

            const mockCredentials: CfCredentials[] = [];

            const mockXsAppEntry = {
                entryName: 'webapp/xs-app.json',
                getData: jest.fn().mockReturnValue(Buffer.from('invalid json'))
            };

            const mockManifestEntry = {
                entryName: 'webapp/manifest.json',
                getData: jest.fn().mockReturnValue(Buffer.from(JSON.stringify(mockManifest)))
            };

            const zipEntries = [mockXsAppEntry, mockManifestEntry] as unknown as AdmZip.IZipEntry[];

            await expect(validateODataEndpoints(zipEntries, mockCredentials, mockLogger)).rejects.toThrow(
                t('error.oDataEndpointsValidationFailed')
            );
        });

        test('should handle manifest.json parsing error', async () => {
            const mockXsApp: XsApp = {
                routes: []
            };

            const mockCredentials: CfCredentials[] = [];

            const mockXsAppEntry = {
                entryName: 'webapp/xs-app.json',
                getData: jest.fn().mockReturnValue(Buffer.from(JSON.stringify(mockXsApp)))
            };

            const mockManifestEntry = {
                entryName: 'webapp/manifest.json',
                getData: jest.fn().mockReturnValue(Buffer.from('invalid json'))
            };

            const zipEntries = [mockXsAppEntry, mockManifestEntry] as unknown as AdmZip.IZipEntry[];

            await expect(validateODataEndpoints(zipEntries, mockCredentials, mockLogger)).rejects.toThrow(
                t('error.oDataEndpointsValidationFailed')
            );
        });

        test('should handle credentials without endpoints', async () => {
            const mockXsApp: XsApp = {
                routes: [
                    {
                        source: '/odata/',
                        endpoint: 'odata-endpoint'
                    }
                ]
            };

            const mockCredentials: CfCredentials[] = [
                {
                    uaa: {
                        clientid: 'test-client',
                        clientsecret: 'test-secret',
                        url: '/uaa.test.com'
                    },
                    uri: '/service.test.com',
                    endpoints: undefined
                }
            ];

            const mockXsAppEntry = {
                entryName: 'webapp/xs-app.json',
                getData: jest.fn().mockReturnValue(Buffer.from(JSON.stringify(mockXsApp)))
            };

            const mockManifestEntry = {
                entryName: 'webapp/manifest.json',
                getData: jest.fn().mockReturnValue(Buffer.from(JSON.stringify(mockManifest)))
            };

            const zipEntries = [mockXsAppEntry, mockManifestEntry] as unknown as AdmZip.IZipEntry[];

            await expect(validateODataEndpoints(zipEntries, mockCredentials, mockLogger)).rejects.toThrow(
                t('error.oDataEndpointsValidationFailed')
            );
        });

        test('should handle multiple credentials with endpoints', async () => {
            const mockXsApp: XsApp = {
                routes: [
                    {
                        source: '/odata1/',
                        endpoint: 'odata-endpoint-1'
                    },
                    {
                        source: '/odata2/',
                        endpoint: 'odata-endpoint-2'
                    }
                ]
            };

            const mockManifest: Manifest = {
                'sap.app': {
                    id: 'test.app',
                    dataSources: {
                        'odata-service-1': {
                            uri: '/odata1/service/',
                            type: 'OData'
                        },
                        'odata-service-2': {
                            uri: '/odata2/service/',
                            type: 'OData'
                        }
                    }
                }
            } as unknown as Manifest;

            const mockCredentials: CfCredentials[] = [
                {
                    uaa: {
                        clientid: 'test-client-1',
                        clientsecret: 'test-secret-1',
                        url: '/uaa1.test.com'
                    },
                    uri: '/service1.test.com',
                    endpoints: {
                        'odata-endpoint-1': '/odata1.test.com'
                    }
                },
                {
                    uaa: {
                        clientid: 'test-client-2',
                        clientsecret: 'test-secret-2',
                        url: '/uaa2.test.com'
                    },
                    uri: '/service2.test.com',
                    endpoints: {
                        'odata-endpoint-2': '/odata2.test.com'
                    }
                }
            ];

            const mockXsAppEntry = {
                entryName: 'webapp/xs-app.json',
                getData: jest.fn().mockReturnValue(Buffer.from(JSON.stringify(mockXsApp)))
            };

            const mockManifestEntry = {
                entryName: 'webapp/manifest.json',
                getData: jest.fn().mockReturnValue(Buffer.from(JSON.stringify(mockManifest)))
            };

            const zipEntries = [mockXsAppEntry, mockManifestEntry] as unknown as AdmZip.IZipEntry[];

            await expect(validateODataEndpoints(zipEntries, mockCredentials, mockLogger)).resolves.not.toThrow();
        });
    });
});
