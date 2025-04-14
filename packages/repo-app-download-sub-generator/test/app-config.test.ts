import { getAppConfig, getAbapDeployConfig } from '../src/app/app-config';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import type { Editor } from 'mem-fs-editor';
import { getUI5Versions } from '@sap-ux/ui5-info';
import { getMinimumUI5Version } from '@sap-ux/project-access';
import { PromptState } from '../src/prompts/prompt-state';
import type { AppInfo, QfaJsonConfig } from '../src/app/types';
import { readManifest } from '../src/utils/file-helpers';
import { t } from '../src/utils/i18n';
import { fioriAppSourcetemplateId } from '../src/utils/constants';
import RepoAppDownloadLogger from '../src/utils/logger';
import { TestFixture } from './fixtures';
import { join } from 'path';
import { qfaJsonFileName } from '../src/utils/constants';

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
    getUI5Versions: jest.fn()
}));

jest.mock('@sap-ux/project-access', () => ({
    ...jest.requireActual('@sap-ux/project-access'),
    getMinimumUI5Version: jest.fn()
}));


jest.mock('@sap-ux/feature-toggle', () => ({
    isInternalFeaturesSettingEnabled: jest.fn(),
}));

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
            path: '/odata/service',
            version: expect.any(String),
            metadata: undefined,
            url: 'https://test-url.com'
        },
        appOptions: {
            addAnnotations: true,
            addTests: true
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
        (getUI5Versions as jest.Mock).mockResolvedValue(availableUI5Versions);
    });

    it('should generate app configuration successfully', async () => {
        const mockServiceProvider = {
            defaults: { 
                baseURL: 'https://test-url.com',
                params: { 'sap-client': '100' }
            }
        } as unknown as AbapServiceProvider;

        PromptState.systemSelection = {
            connectedSystem: { serviceProvider: mockServiceProvider }
        };

        (readManifest as jest.Mock).mockReturnValue(mockManifest);
        (getMinimumUI5Version as jest.Mock).mockReturnValue('1.90.0');
        const mockQfaJsonWithoutNavEntity = {
            ...mockQfaJson, 
            serviceBindingDetails: {
                name: mockQfaJson.serviceBindingDetails.name,
                serviceName: mockQfaJson.serviceBindingDetails.serviceName,
                serviceVersion: mockQfaJson.serviceBindingDetails.serviceVersion,
                mainEntityName: mockQfaJson.serviceBindingDetails.mainEntityName,
            }
        }
        const result = await getAppConfig(mockApp, '/path/to/project', mockQfaJsonWithoutNavEntity, mockFs);
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
            defaults: { 
                baseURL: 'https://test-url.com',
                params: { 'sap-client': '100' } 
            }
        } as unknown as AbapServiceProvider;

        PromptState.systemSelection = {
            connectedSystem: { serviceProvider: mockServiceProvider }
        };

        (readManifest as jest.Mock).mockReturnValue(mockManifest);
        (getMinimumUI5Version as jest.Mock).mockReturnValue('1.90.0');

        const mockQfaJsonJsonWithNavEntity = {
            ...mockQfaJson,
            service_binding_details: {
                ...mockQfaJson.serviceBindingDetails,
                main_entity_name: mockQfaJson.serviceBindingDetails.mainEntityName,
                navigation_entity: mockQfaJson.serviceBindingDetails.navigationEntity
            }
        }
        const result = await getAppConfig(mockApp, '/path/to/project', mockQfaJsonJsonWithNavEntity, mockFs);
        expect(result).toEqual(expectedAppConfig);
    });

    it('should throw an error if manifest data sources are missing', async () => {
        const mockManifest = {
            'sap.app': {}
        };

        (readManifest as jest.Mock).mockReturnValue(mockManifest);
        const result = await getAppConfig(mockApp, '/path/to/project', mockQfaJson, mockFs);
        expect(RepoAppDownloadLogger.logger.error).toBeCalledWith(t('error.dataSourcesNotFound')); 
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
        const mockServiceProvider = {
            defaults: { 
                baseURL: 'https://test-url.com',
                params: { 'sap-client': '100' } 
            },
            service: jest.fn().mockReturnValue({
                metadata: jest.fn().mockRejectedValue(new Error(errorMsg))
            })
        } as unknown as AbapServiceProvider;

        PromptState.systemSelection = {
            connectedSystem: { serviceProvider: mockServiceProvider }
        };

        (readManifest as jest.Mock).mockReturnValue(mockManifest);

        await getAppConfig(mockApp, '/path/to/project', mockQfaJson, mockFs);
        expect(RepoAppDownloadLogger.logger?.error).toHaveBeenCalledWith(t('error.metadataFetchError', { error: errorMsg }));
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

        PromptState.systemSelection = {
            connectedSystem: { serviceProvider: mockServiceProvider }
        };
        (readManifest as jest.Mock).mockReturnValue(mockManifest);
        (getMinimumUI5Version as jest.Mock).mockReturnValue('1.90.0');

        const mockQfaJsonJsonWithoutUi5Version = {
            ...mockQfaJson,
            projectAttribute: {
                ...mockQfaJson.projectAttribute,
                minimum_ui5_version: null
            }
        } as unknown as QfaJsonConfig;
        await getAppConfig(mockApp, '/path/to/project', mockQfaJsonJsonWithoutUi5Version, mockFs);
        expect(RepoAppDownloadLogger.logger?.error).not.toHaveBeenCalled();
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
                url: 'https://test-url.com',
                client: '100',
                destination: 'TEST_REPO'
            },
            app: {
                name: 'TEST_REPOSITORY_NAME',
                package: 'TEST_PACKAGE',
                description: 'TEST_REPOSITORY_DESCRIPTION',
                transport: 'REPLACE_WITH_TRANSPORT'
            }
        };
        const result = getAbapDeployConfig(app, mockQfaJson);
        expect(result).toEqual(expectedConfig);
    });
});

             