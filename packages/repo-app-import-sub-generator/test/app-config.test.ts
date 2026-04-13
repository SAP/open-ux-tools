import { jest } from '@jest/globals';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import type { Editor } from 'mem-fs-editor';
import type { AppInfo, QfaJsonConfig } from '../src/app/types';
import { t } from '../src/utils/i18n';
import { fioriAppSourcetemplateId, qfaJsonFileName } from '../src/utils/constants';
import { join } from 'node:path';
import { type OdataServiceAnswers } from '@sap-ux/odata-service-inquirer';

// Pre-import actual modules before mocking - avoid importing @sap-ux/project-access
// directly as it triggers problematic ESM dependency chain
const actualFileHelpers = await import('../src/utils/file-helpers');
const actualUi5Info = await import('@sap-ux/ui5-info');
const actualProjectAccess = await import('@sap-ux/project-access');

const mockReadManifest = jest.fn();
const mockGetUI5Versions = jest.fn();
const mockGetMinimumUI5Version = jest.fn();

jest.unstable_mockModule('../src/utils/logger', () => {
    const mock = {
        logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
        configureLogging: jest.fn()
    };
    return { default: mock, ...mock };
});

jest.unstable_mockModule('../src/utils/file-helpers', () => ({
    ...actualFileHelpers,
    readManifest: mockReadManifest
}));

jest.unstable_mockModule('@sap-ux/ui5-info', () => ({
    ...actualUi5Info,
    getUI5Versions: mockGetUI5Versions
}));

jest.unstable_mockModule('@sap-ux/project-access', () => ({
    ...actualProjectAccess,
    getMinimumUI5Version: mockGetMinimumUI5Version
}));

jest.unstable_mockModule('@sap-ux/feature-toggle', () => ({
    isInternalFeaturesSettingEnabled: jest.fn()
}));

const { getAppConfig, getAbapDeployConfig } = await import('../src/app/app-config');
const { PromptState } = await import('../src/prompts/prompt-state');
const RepoAppDownloadLogger = (await import('../src/utils/logger')).default;
const { TestFixture } = await import('./fixtures');

const testFixture = new TestFixture();
const mockQfaJson: QfaJsonConfig = JSON.parse(testFixture.getContents(join('downloaded-app', qfaJsonFileName)));

describe('getAppConfig', () => {
    const mockApp: AppInfo = {
        appId: 'testAppId',
        title: 'Test App',
        description: 'Test Description',
        repoName: 'testRepoName',
        url: 'https://example.com/testApp'
    };
    const mockSystem: OdataServiceAnswers = {
        connectedSystem: {
            destination: {
                Authentication: 'Basic',
                Host: 'test-url.com',
                Name: 'TEST_DESTINATION',
                Type: 'HTTP',
                ProxyType: 'Internet',
                Description: 'Test Destination'
            },
            backendSystem: {
                url: 'https://test-url.com',
                client: '100',
                name: 'TEST_BACKEND_SYSTEM'
            },

            serviceProvider: {
                defaults: {
                    baseURL: 'https://test-url.com',
                    params: { 'sap-client': '100' },
                    headers: {
                        common: {},
                        delete: {},
                        get: {},
                        head: {},
                        post: {},
                        put: {},
                        patch: {}
                    }
                }
            }
        }
    } as OdataServiceAnswers;

    const mockFs = {} as Editor;
    const expectedAppConfig = {
        app: {
            id: mockApp.appId,
            title: mockApp.title,
            description: mockApp.description,
            flpAppId: `${mockApp.appId}-tile`,
            sourceTemplate: { id: fioriAppSourcetemplateId },
            projectType: 'EDMXBackend'
        },
        package: {
            name: mockApp.appId,
            description: mockApp.description,
            devDependencies: {},
            scripts: {},
            version: '1.0.0'
        },
        template: {
            type: expect.any(String),
            settings: {
                entityConfig: {
                    mainEntityName: mockQfaJson.serviceBindingDetails.mainEntityName
                }
            }
        },
        service: {
            'client': '100',
            'destination': {
                'name': 'TEST_DESTINATION'
            },
            path: '/odata/service',
            version: expect.any(String),
            metadata: undefined,
            url: 'https://test-url.com'
        },
        appOptions: {
            addAnnotations: true,
            addTests: true,
            useVirtualPreviewEndpoints: true
        },
        ui5: {
            localVersion: '1.88.0'
        }
    };

    const mockManifest = {
        'sap.app': {
            dataSources: {
                mainService: {
                    uri: '/odata/service',
                    settings: { odataVersion: '4.0' }
                }
            },
            applicationVersion: { version: '1.0.0' }
        }
    };

    const availableUI5Versions = [{ version: '1.88.0' }];

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();
        mockGetUI5Versions.mockResolvedValue(availableUI5Versions);
    });

    it('should generate app configuration successfully', async () => {
        const mockServiceProvider = {
            defaults: {
                baseURL: 'https://test-url.com',
                params: { 'sap-client': '100' }
            }
        } as unknown as AbapServiceProvider;

        PromptState.systemSelection = {
            connectedSystem: mockSystem.connectedSystem
        };

        mockReadManifest.mockReturnValue(mockManifest);
        mockGetMinimumUI5Version.mockReturnValue('1.90.0');
        const mockQfaJsonWithoutNavEntity = {
            ...mockQfaJson,
            serviceBindingDetails: {
                name: mockQfaJson.serviceBindingDetails.name,
                serviceName: mockQfaJson.serviceBindingDetails.serviceName,
                serviceVersion: mockQfaJson.serviceBindingDetails.serviceVersion,
                mainEntityName: mockQfaJson.serviceBindingDetails.mainEntityName
            }
        };
        const context = {
            qfaJson: mockQfaJsonWithoutNavEntity,
            serviceProvider: mockServiceProvider
        };
        const result = await getAppConfig(mockApp, '/path/to/project', context, mockSystem, mockFs);
        expect(result).toEqual(expectedAppConfig);
    });

    it('should generate app configuration successfully when navigation entity is provided', async () => {
        const mockManifest = {
            'sap.app': {
                dataSources: {
                    mainService: {
                        uri: '/odata/service',
                        settings: { odataVersion: '4.0' }
                    }
                },
                applicationVersion: { version: '1.0.0' }
            }
        };

        PromptState.systemSelection = {
            connectedSystem: mockSystem.connectedSystem
        };

        mockReadManifest.mockReturnValue(mockManifest);
        mockGetMinimumUI5Version.mockReturnValue('1.90.0');

        const mockQfaJsonJsonWithNavEntity = {
            ...mockQfaJson,
            service_binding_details: {
                ...mockQfaJson.serviceBindingDetails,
                main_entity_name: mockQfaJson.serviceBindingDetails.mainEntityName,
                navigation_entity: mockQfaJson.serviceBindingDetails.navigationEntity
            }
        };
        const context = {
            qfaJson: mockQfaJsonJsonWithNavEntity,
            serviceProvider: mockSystem.connectedSystem?.serviceProvider as AbapServiceProvider
        };
        const result = await getAppConfig(mockApp, '/path/to/project', context, mockSystem, mockFs);
        expect(result).toEqual(expectedAppConfig);
    });

    it('should generate app config with the npm maintained UI5 local version for local preview', async () => {
        const mockManifest = {
            'sap.app': {
                dataSources: {
                    mainService: {
                        uri: '/odata/service',
                        settings: { odataVersion: '4.0' }
                    }
                },
                applicationVersion: { version: '1.0.0' }
            }
        };

        PromptState.systemSelection = {
            connectedSystem: mockSystem.connectedSystem
        };

        mockReadManifest.mockReturnValue(mockManifest);
        mockGetUI5Versions.mockResolvedValue([{ version: '1.134.0' }, { version: '1.132.0' }, { version: '1.124.0' }]);

        const mockQfaJsonJsonWithNavEntity = {
            ...mockQfaJson,
            service_binding_details: {
                ...mockQfaJson.serviceBindingDetails,
                main_entity_name: mockQfaJson.serviceBindingDetails.mainEntityName,
                navigation_entity: mockQfaJson.serviceBindingDetails.navigationEntity
            }
        };
        const context = {
            qfaJson: mockQfaJsonJsonWithNavEntity,
            serviceProvider: mockSystem.connectedSystem?.serviceProvider as AbapServiceProvider
        };
        const result = await getAppConfig(mockApp, '/path/to/project', context, mockSystem, mockFs);
        expect(result).toEqual({
            ...expectedAppConfig,
            ui5: {
                localVersion: '1.134.0'
            }
        });
    });

    it('should throw an error if manifest data sources are missing', async () => {
        const mockManifest = {
            'sap.app': {}
        };

        mockReadManifest.mockReturnValue(mockManifest);
        const context = {
            qfaJson: mockQfaJson,
            serviceProvider: mockSystem.connectedSystem?.serviceProvider as AbapServiceProvider
        };
        const result = await getAppConfig(mockApp, '/path/to/project', context, mockSystem, mockFs);
        expect(RepoAppDownloadLogger.logger.error).toHaveBeenCalledWith(t('error.dataSourcesNotFound'));
    });

    it('should log an error if fetchServiceMetadata throws an error', async () => {
        const mockManifest = {
            'sap.app': {
                dataSources: {
                    mainService: {
                        uri: '/odata/service',
                        settings: { odataVersion: '4.0' }
                    }
                }
            }
        };

        const errorMsg = 'Metadata fetch failed';

        PromptState.systemSelection = {
            connectedSystem: mockSystem.connectedSystem
        };

        mockReadManifest.mockReturnValue(mockManifest);
        const context = {
            qfaJson: mockQfaJson,
            serviceProvider: mockSystem.connectedSystem?.serviceProvider as AbapServiceProvider
        };
        await getAppConfig(mockApp, '/path/to/project', context, mockSystem, mockFs);
        expect(RepoAppDownloadLogger.logger?.error).toHaveBeenCalledWith(
            t('error.metadataFetchError', { error: errorMsg })
        );
    });

    it('should generate app config when minUi5Version is not provided in manifest', async () => {
        const mockManifest = {
            'sap.app': {
                dataSources: {
                    mainService: {
                        uri: '/odata/service',
                        settings: { odataVersion: '4.0' }
                    }
                },
                applicationVersion: { version: '1.0.0' }
            }
        };

        const mockServiceProvider = {
            defaults: {
                baseURL: 'https://test-url.com',
                params: { 'sap-client': '100' }
            },
            service: jest.fn().mockReturnValue({
                metadata: jest.fn().mockResolvedValue({
                    dataServices: {
                        schema: []
                    }
                })
            })
        } as unknown as AbapServiceProvider;
        const mockSystem2 = mockSystem;
        if (mockSystem2.connectedSystem?.serviceProvider) {
            mockSystem2.connectedSystem.serviceProvider = mockServiceProvider;
        }
        PromptState.systemSelection = {
            connectedSystem: mockSystem.connectedSystem
        };
        mockReadManifest.mockReturnValue(mockManifest);
        mockGetMinimumUI5Version.mockReturnValue('1.90.0');

        const mockQfaJsonJsonWithoutUi5Version = {
            ...mockQfaJson,
            projectAttribute: {
                ...mockQfaJson.projectAttribute,
                minimum_ui5_version: null
            }
        } as unknown as QfaJsonConfig;
        const context = {
            qfaJson: mockQfaJsonJsonWithoutUi5Version,
            serviceProvider: mockSystem.connectedSystem?.serviceProvider as AbapServiceProvider
        };
        await getAppConfig(mockApp, '/path/to/project', context, mockSystem, mockFs);
        expect(RepoAppDownloadLogger.logger?.error).not.toHaveBeenCalled();
    });
});

describe('getAbapDeployConfig', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should generate the correct deployment configuration', async () => {
        const expectedConfig = {
            target: {
                url: 'https://test-url.com',
                client: '100',
                destination: 'TEST_DESTINATION'
            },
            app: {
                name: 'TEST_REPOSITORY_NAME',
                package: 'TEST_PACKAGE',
                description: 'TEST_REPOSITORY_DESCRIPTION',
                transport: 'REPLACE_WITH_TRANSPORT'
            }
        };
        const transportMock: { transportNumber: string }[] = [];
        const mockTransportService = {
            getTransportRequests: jest.fn().mockResolvedValue(transportMock)
        };
        const mockServiceProvider = {
            getAdtService: jest.fn().mockResolvedValue(mockTransportService)
        } as unknown as AbapServiceProvider;
        const context = {
            qfaJson: mockQfaJson,
            serviceProvider: mockServiceProvider
        };
        const result = await getAbapDeployConfig(context);
        expect(result).toEqual(expectedConfig);
    });

    it('should return empty transport for local package ($TMP)', async () => {
        const localQfa = {
            ...mockQfaJson,
            metadata: { ...mockQfaJson.metadata, package: '$TMP' }
        } as QfaJsonConfig;
        const mockServiceProvider = {
            getAdtService: jest.fn()
        } as unknown as AbapServiceProvider;
        const context = {
            qfaJson: localQfa,
            serviceProvider: mockServiceProvider
        };
        const result = await getAbapDeployConfig(context);
        expect(result.app.transport).toBe('');
    });

    it('should use transport returned by transport service when transport request is available', async () => {
        const transportMock = [{ transportNumber: 'LT12345' }];
        const mockTransportService = {
            getTransportRequests: jest.fn().mockResolvedValue(transportMock)
        };
        const mockServiceProvider = {
            getAdtService: jest.fn().mockResolvedValue(mockTransportService)
        } as unknown as AbapServiceProvider;

        const context = {
            qfaJson: mockQfaJson,
            serviceProvider: mockServiceProvider
        };
        const result = await getAbapDeployConfig(context);
        expect(mockServiceProvider.getAdtService).toHaveBeenCalled();
        expect(result.app.transport).toBe('LT12345');
    });

    it('should return REPLACE_WITH_TRANSPORT when transport service returns no transports', async () => {
        const mockTransportService = {
            getTransportRequests: jest.fn().mockResolvedValue([])
        };
        const mockServiceProvider = {
            getAdtService: jest.fn().mockResolvedValue(mockTransportService)
        } as unknown as AbapServiceProvider;

        const context = {
            qfaJson: mockQfaJson,
            serviceProvider: mockServiceProvider
        };
        const result = await getAbapDeployConfig(context);
        expect(result.app.transport).toBe('REPLACE_WITH_TRANSPORT');
    });

    it('should generate new transport request when serviceProvider is not available in context', async () => {
        const context = {
            qfaJson: mockQfaJson
        } as unknown as { qfaJson: QfaJsonConfig };

        const result = await getAbapDeployConfig(context);
        expect(result.app.transport).toBe('REPLACE_WITH_TRANSPORT');
    });

    it('should log and throw error when transport service throws unexpected error', async () => {
        const errorMsg = 'Some backend error';
        const mockTransportService = {
            getTransportRequests: jest.fn().mockRejectedValue(new Error(errorMsg))
        };
        const mockServiceProvider = {
            getAdtService: jest.fn().mockResolvedValue(mockTransportService)
        } as unknown as AbapServiceProvider;

        const context = {
            qfaJson: mockQfaJson,
            serviceProvider: mockServiceProvider
        };

        await expect(getAbapDeployConfig(context)).rejects.toThrow(
            t('error.transportCheckFailed', { error: errorMsg })
        );
        expect(RepoAppDownloadLogger.logger.error).toHaveBeenCalledWith(
            t('error.transportCheckFailed', { error: errorMsg })
        );
    });
});
