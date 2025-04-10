import { getAppConfig, getAbapDeployConfig } from '../src/app/app-config';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import type { Editor } from 'mem-fs-editor';
import { getLatestUI5Version } from '@sap-ux/ui5-info';
import { getMinimumUI5Version } from '@sap-ux/project-access';
import { PromptState } from '../src/prompts/prompt-state';
import type { AppInfo, QfaJsonConfig } from '../src/app/types';
import { readManifest } from '../src/utils/file-helpers';
import { t } from '../src/utils/i18n';
import { adtSourceTemplateId } from '../src/utils/constants';
import BspAppDownloadLogger from '../src/utils/logger';
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
    getLatestUI5Version: jest.fn()
}));

jest.mock('@sap-ux/project-access', () => ({
    ...jest.requireActual('@sap-ux/project-access'),
    getMinimumUI5Version: jest.fn()
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
                    mainEntityName: mockQfaJson.service_binding_details.main_entity_name
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
            version: mockQfaJson.project_attribute.minimum_ui5_version ?? '1.90.0'
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
            defaults: { 
                baseURL: 'https://test-url.com',
                params: { 'sap-client': '100' }
            }
        } as unknown as AbapServiceProvider;

        PromptState.systemSelection = {
            connectedSystem: { serviceProvider: mockServiceProvider }
        };

        (readManifest as jest.Mock).mockReturnValue(mockManifest);
        (getLatestUI5Version as jest.Mock).mockResolvedValue('1.100.0');
        (getMinimumUI5Version as jest.Mock).mockReturnValue('1.90.0');
        const mockQfaJsonWithoutNavEntity = {
            ...mockQfaJson, 
            service_binding_details: {
                name: mockQfaJson.service_binding_details.name,
                service_name: mockQfaJson.service_binding_details.service_name,
                service_version: mockQfaJson.service_binding_details.service_version,
                main_entity_name: mockQfaJson.service_binding_details.main_entity_name,
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
        (getLatestUI5Version as jest.Mock).mockResolvedValue('1.100.0');
        (getMinimumUI5Version as jest.Mock).mockReturnValue('1.90.0');

        const mockQfaJsonJsonWithNavEntity = {
            ...mockQfaJson,
            service_binding_details: {
                ...mockQfaJson.service_binding_details,
                main_entity_name: mockQfaJson.service_binding_details.main_entity_name,
                navigation_entity: mockQfaJson.service_binding_details.navigation_entity
            }
        }
        const result = await getAppConfig(mockApp, '/path/to/project', mockQfaJsonJsonWithNavEntity, mockFs);
        const expectedAppConfigWithNavEntity = {
            ...expectedAppConfig,
            template: {
                ...expectedAppConfig.template,
                settings: {
                    entityConfig: {
                        mainEntityName: mockQfaJson.service_binding_details.main_entity_name,
                        navigationEntity: {
                            EntitySet: mockQfaJsonJsonWithNavEntity.service_binding_details.navigation_entity,
                            Name: mockQfaJsonJsonWithNavEntity.service_binding_details.navigation_entity
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
        const result = await getAppConfig(mockApp, '/path/to/project', mockQfaJson, mockFs);
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
        (getLatestUI5Version as jest.Mock).mockResolvedValue('1.100.0');
        (getMinimumUI5Version as jest.Mock).mockReturnValue('1.90.0');

        const mockQfaJsonJsonWithoutUi5Version = {
            ...mockQfaJson,
            project_attribute: {
                ...mockQfaJson.project_attribute,
                minimum_ui5_version: null
            }
        } as unknown as QfaJsonConfig;
        await getAppConfig(mockApp, '/path/to/project', mockQfaJsonJsonWithoutUi5Version, mockFs);
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
                url: 'https://test-url.com',
                client: '100',
                destination: 'TEST_REPO'
            },
            app: {
                name: 'ZSB_TRVL_APR2',
                package: '$TMP',
                description: 'Travel Approver 2.0',
                transport: 'REPLACE_WITH_TRANSPORT'
            }
        };
        const result = getAbapDeployConfig(app, mockQfaJson);
        expect(result).toEqual(expectedConfig);
    });
});
             