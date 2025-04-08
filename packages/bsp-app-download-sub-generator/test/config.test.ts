import { getAppConfig, getAbapDeployConfig } from '../src/app/config';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import type { Editor } from 'mem-fs-editor';
import { getLatestUI5Version } from '@sap-ux/ui5-info';
import { getMinimumUI5Version } from '@sap-ux/project-access';
import { PromptState } from '../src/prompts/prompt-state';
import type { AppInfo, AppContentConfig } from '../src/app/types';
import { readManifest } from '../src/utils/file-helpers';
import { sampleAppContentTestData } from './fixtures/example-app-content';
import { t } from '../src/utils/i18n';
import { adtSourceTemplateId } from '../src/utils/constants';
import BspAppDownloadLogger from '../src/utils/logger';

jest.mock('../src/utils/logger', () => ({
    logger: {
        error: jest.fn()
    }
}));

jest.mock('../src/utils/file-helpers', () => ({
    ...jest.requireActual('../src/utils/file-helpers'),
    readManifest: jest.fn()
}));

jest.mock('@sap-ux/ui5-info', () => ({
    ...jest.requireActual('@sap-ux/ui5-info'),
    getLatestUI5Version: jest.fn()
}));

jest.mock('@sap-ux/project-access', () => ({
    ...jest.requireActual('@sap-ux/project-access'),
    getMinimumUI5Version: jest.fn()
}));

describe('getAppConfig', () => {
    const mockApp: AppInfo = {
        appId: 'testAppId',
        title: 'Test App',
        description: 'Test Description', 
        repoName: 'testRepoName',
        url: 'https://example.com/testApp'
    };
    const mockAppContentJson: AppContentConfig = sampleAppContentTestData;
    const mockFs = {} as Editor;
    const expectedAppConfig = {
        app: {
            id: mockApp.appId,
            title: mockApp.title,
            description: mockApp.description,
            sourceTemplate: { id: adtSourceTemplateId },
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
                    mainEntityName: sampleAppContentTestData.serviceBindingDetails.mainEntityName
                }
            }
        },
        service: {
            path: '/odata/service',
            version: expect.any(String),
            metadata: undefined,
            url: 'https://test-url.com'
        },
        appOptions: {
            addAnnotations: true,
            addTests: true
        },
        ui5: {
            version: sampleAppContentTestData.projectAttribute.minimumUi5Version
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();
    });

    it('should generate app configuration successfully', async () => {
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
            defaults: { baseURL: 'https://test-url.com' }
        } as unknown as AbapServiceProvider;

        PromptState.systemSelection = {
            connectedSystem: { serviceProvider: mockServiceProvider }
        };

        (readManifest as jest.Mock).mockReturnValue(mockManifest);
        (getLatestUI5Version as jest.Mock).mockResolvedValue('1.100.0');
        (getMinimumUI5Version as jest.Mock).mockReturnValue('1.90.0');

        const result = await getAppConfig(mockApp, '/path/to/project', mockAppContentJson, mockFs);
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

        const mockServiceProvider = {
            defaults: { baseURL: 'https://test-url.com' }
        } as unknown as AbapServiceProvider;

        PromptState.systemSelection = {
            connectedSystem: { serviceProvider: mockServiceProvider }
        };

        (readManifest as jest.Mock).mockReturnValue(mockManifest);
        (getLatestUI5Version as jest.Mock).mockResolvedValue('1.100.0');
        (getMinimumUI5Version as jest.Mock).mockReturnValue('1.90.0');

        const mockAppContentJsonWithNavEntity = {
            ...mockAppContentJson,
            serviceBindingDetails: {
                ...mockAppContentJson.serviceBindingDetails,
                mainEntityName: mockAppContentJson.serviceBindingDetails.mainEntityName,
                navigationEntity: {
                    EntitySet: 'EnitySet',
                    Name: 'SomeNavigationProperty'
                }
            }
        }
        const result = await getAppConfig(mockApp, '/path/to/project', mockAppContentJsonWithNavEntity, mockFs);
        const expectedAppConfigWithNavEntity = {
            ...expectedAppConfig,
            template: {
                ...expectedAppConfig.template,
                settings: {
                    entityConfig: {
                        mainEntityName: mockAppContentJson.serviceBindingDetails.mainEntityName,
                        navigationEntity: {
                            EntitySet: mockAppContentJsonWithNavEntity.serviceBindingDetails.navigationEntity.EntitySet,
                            Name: mockAppContentJsonWithNavEntity.serviceBindingDetails.navigationEntity.Name
                        }
                    }
                }
            }
        };
        expect(result).toEqual(expectedAppConfigWithNavEntity);
    });

    it('should throw an error if manifest data sources are missing', async () => {
        const mockManifest = {
            'sap.app': {}
        };

        (readManifest as jest.Mock).mockReturnValue(mockManifest);
        const result = await getAppConfig(mockApp, '/path/to/project', mockAppContentJson, mockFs);
        expect(BspAppDownloadLogger.logger.error).toBeCalledWith(t('error.dataSourcesNotFound')); 
    });

    it('should log an error if fetchServiceMetadata throws an error', async () => {
        const mockProvider = {
            service: jest.fn().mockReturnValue({
                metadata: jest.fn().mockRejectedValue(new Error('Metadata fetch failed'))
            })
        } as unknown as AbapServiceProvider;
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
        const mockServiceProvider = {
            defaults: { baseURL: 'https://test-url.com' },
            service: jest.fn().mockReturnValue({
                metadata: jest.fn().mockRejectedValue(new Error(errorMsg))
            })
        } as unknown as AbapServiceProvider;

        PromptState.systemSelection = {
            connectedSystem: { serviceProvider: mockServiceProvider }
        };

        (readManifest as jest.Mock).mockReturnValue(mockManifest);

        await getAppConfig(mockApp, '/path/to/project', mockAppContentJson, mockFs);
        expect(BspAppDownloadLogger.logger?.error).toHaveBeenCalledWith(t('error.metadataFetchError', { error: errorMsg }));
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
            defaults: { baseURL: 'https://test-url.com' },
            service: jest.fn().mockReturnValue({
                metadata: jest.fn().mockResolvedValue({
                    dataServices: {
                        schema: []
                    }
                })
            })
        } as unknown as AbapServiceProvider;

        PromptState.systemSelection = {
            connectedSystem: { serviceProvider: mockServiceProvider }
        };
        (readManifest as jest.Mock).mockReturnValue(mockManifest);
        (getLatestUI5Version as jest.Mock).mockResolvedValue('1.100.0');
        (getMinimumUI5Version as jest.Mock).mockReturnValue('1.90.0');

        const mockAppContentJsonWithoutUi5Version = {
            ...sampleAppContentTestData,
            projectAttribute: {
                ...sampleAppContentTestData.projectAttribute,
                minimumUi5Version: null
            }
        } as unknown as AppContentConfig;
        await getAppConfig(mockApp, '/path/to/project', mockAppContentJsonWithoutUi5Version, mockFs);
        expect(BspAppDownloadLogger.logger?.error).not.toHaveBeenCalled();
    });

});

describe('getAbapDeployConfig', () => {
    it('should generate the correct deployment configuration', () => {
        const app: AppInfo = {
            url: 'https://target-url.com',
            repoName: 'TEST_REPO', 
            appId: 'TEST_APP_ID',
            title: 'Test App',
            description: 'Test Description'
        };

        const expectedConfig = {
            target: {
                url: 'https://target-url.com',
                destination: 'TEST_REPO'
            },
            app: {
                name: 'TEST_REPO_NAME',
                package: 'TEST_PACKAGE',
                description: 'This is a test repository',
                transport: 'REPLACE_WITH_TRANSPORT'
            }
        };

        // Call the function
        const result = getAbapDeployConfig(app, sampleAppContentTestData);

        // Assertions
        expect(result).toEqual(expectedConfig);
    });
});
             