import { jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));

import { type AbapServiceProvider, AdaptationProjectType } from '@sap-ux/axios-extension';
import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest, Package } from '@sap-ux/project-access';
import type {
    AttributesAnswers,
    ConfigAnswers,
    ConfigOptions,
    Language,
    SourceApplication,
    VersionDetail
} from '../../../src/index.js';
import type { CfConfig, CfServicesAnswers, CreateCfConfigParams } from '../../../src/types.js';

const mockGetProviderConfig = jest.fn() as jest.Mock;
const mockGetSupportedProject = jest.fn() as jest.Mock;
const mockIsFeatureEnabled = jest.fn() as jest.Mock;

const realAbapConfig = await import('../../../dist/abap/config.js');
const realSystems = await import('../../../dist/source/systems.js');

jest.unstable_mockModule('../../../src/abap/config', () => ({
    SystemNotFoundError: realAbapConfig.SystemNotFoundError,
    getProviderConfig: mockGetProviderConfig
}));

jest.unstable_mockModule('../../../src/source/systems', () => ({
    getSupportedProject: mockGetSupportedProject,
    SystemLookup: realSystems.SystemLookup,
    getEndpointNames: realSystems.getEndpointNames,
    transformBackendSystem: realSystems.transformBackendSystem,
    SupportedProject: realSystems.SupportedProject
}));

jest.unstable_mockModule('@sap-ux/feature-toggle', () => ({
    isFeatureEnabled: mockIsFeatureEnabled
}));

const { FlexLayer, getConfig, SupportedProject } = await import('../../../src/index.js');
const { getCfConfig } = await import('../../../src/writer/writer-config.js');
const { t } = await import('../../../src/i18n.js');
const { AppRouterType } = await import('../../../src/types.js');
const { Feature } = await import('../../../src/feature.js');

const basePath = join(__dirname, '../../fixtures/base-app/manifest.json');
const manifest = JSON.parse(readFileSync(basePath, 'utf-8'));

const systemDetails = {
    client: '010',
    url: 'some-url'
};

const activeLanguages: Language[] = [{ sap: 'value', i18n: 'DE' }];
const adaptationProjectTypes: AdaptationProjectType[] = [AdaptationProjectType.CLOUD_READY];

const getAtoInfoMock = jest.fn().mockResolvedValue({ operationsType: 'P' });
const isAbapCloudMock = jest.fn();
const getSystemInfoMock = jest.fn().mockResolvedValue({ adaptationProjectTypes, activeLanguages });
const mockAbapProvider = {
    getAtoInfo: getAtoInfoMock,
    isAbapCloud: isAbapCloudMock,
    getLayeredRepository: jest.fn().mockReturnValue({
        getSystemInfo: getSystemInfoMock
    })
} as unknown as AbapServiceProvider;

const configAnswers: ConfigAnswers = {
    application: { id: '1', bspName: 'bsp.name' } as SourceApplication,
    system: 'SYS010',
    password: '',
    username: ''
};

const attributeAnswers: AttributesAnswers = {
    namespace: 'customer.app.variant1',
    enableTypeScript: false,
    projectName: 'app.variant1',
    targetFolder: '/some-path',
    title: '',
    ui5Version: '1.134.1'
};

const baseConfig: ConfigOptions = {
    provider: mockAbapProvider,
    configAnswers,
    attributeAnswers,
    layer: FlexLayer.CUSTOMER_BASE,
    publicVersions: { latest: { version: '1.135.0' } as VersionDetail },
    systemVersion: '1.137.0',
    packageJson: { name: '@sap-ux/generator-adp', version: '0.0.1' } as Package,
    logger: {} as ToolsLogger,
    manifest,
    toolsId: 'test-tools-id',
    keyUserChanges: [],
    projectType: AdaptationProjectType.CLOUD_READY
};

describe('getConfig', () => {
    beforeEach(() => {
        mockGetProviderConfig.mockResolvedValue(systemDetails);
        mockGetSupportedProject.mockResolvedValue(SupportedProject.CLOUD_READY_AND_ON_PREM);
        mockIsFeatureEnabled.mockReturnValue(false);
    });

    it('returns the correct config with provided parameters when system and the project type are cloud ready', async () => {
        isAbapCloudMock.mockResolvedValue(true);
        const config = await getConfig(baseConfig);

        expect(config).toEqual({
            app: {
                id: 'customer.app.variant1',
                reference: '1',
                layer: 'CUSTOMER_BASE',
                title: '',
                bspName: 'bsp.name',
                languages: activeLanguages,
                manifest
            },
            customConfig: {
                adp: {
                    environment: 'P',
                    support: {
                        id: '@sap-ux/generator-adp',
                        toolsId: 'test-tools-id',
                        version: '0.0.1'
                    },
                    projectType: AdaptationProjectType.CLOUD_READY,
                    supportedProject: SupportedProject.CLOUD_READY_AND_ON_PREM
                }
            },
            target: {
                client: '010',
                url: 'some-url'
            },
            ui5: {
                frameworkUrl: 'https://ui5.sap.com',
                minVersion: '1.137.0',
                shouldSetMinVersion: true,
                version: '1.135.0'
            },
            options: {
                fioriTools: true,
                enableTypeScript: false,
                importMockServer: undefined,
                isOpaTestingEnabled: false,
                importOpaTests: undefined,
                flpIntent: undefined
            },
            keyUserChanges: []
        });
    });

    it('sets isOpaTestingEnabled to true and importMockServer to undefined for VENDOR layer when feature flag is enabled', async () => {
        isAbapCloudMock.mockResolvedValue(false);
        mockIsFeatureEnabled.mockReturnValue(true);
        const config = await getConfig({ ...baseConfig, layer: FlexLayer.VENDOR });

        expect(mockIsFeatureEnabled).toHaveBeenCalledWith(Feature.OPA_TESTS);
        expect(config.options?.isOpaTestingEnabled).toBe(true);
        expect(config.options?.importMockServer).toBeUndefined();
    });

    it('sets isOpaTestingEnabled to false for VENDOR layer when feature flag is disabled', async () => {
        isAbapCloudMock.mockResolvedValue(false);
        const config = await getConfig({ ...baseConfig, layer: FlexLayer.VENDOR });

        expect(mockIsFeatureEnabled).toHaveBeenCalledWith(Feature.OPA_TESTS);
        expect(config.options?.isOpaTestingEnabled).toBe(false);
        expect(config.options?.importMockServer).toBeUndefined();
    });

    it('sets isOpaTestingEnabled to false for CUSTOMER_BASE layer', async () => {
        isAbapCloudMock.mockResolvedValue(false);
        const config = await getConfig({ ...baseConfig, layer: FlexLayer.CUSTOMER_BASE });

        expect(config.options?.isOpaTestingEnabled).toBe(false);
        expect(config.options?.importMockServer).toBeUndefined();
    });

    it('passes importMockServer: true from attributeAnswers into options when feature flag is enabled', async () => {
        isAbapCloudMock.mockResolvedValue(false);
        mockIsFeatureEnabled.mockReturnValue(true);
        const config = await getConfig({
            ...baseConfig,
            layer: FlexLayer.VENDOR,
            attributeAnswers: { ...attributeAnswers, importMockServer: true }
        });

        expect(config.options?.importMockServer).toBe(true);
        expect(config.options?.isOpaTestingEnabled).toBe(true);
    });

    it('passes importMockServer: false when feature flag is disabled even if attributeAnswers has importMockServer: true', async () => {
        isAbapCloudMock.mockResolvedValue(false);
        const config = await getConfig({
            ...baseConfig,
            layer: FlexLayer.VENDOR,
            attributeAnswers: { ...attributeAnswers, importMockServer: true }
        });

        // importMockServer is passed through from attributeAnswers regardless of feature flag;
        // only isOpaTestingEnabled is gated by the feature flag
        expect(config.options?.importMockServer).toBe(true);
        expect(config.options?.isOpaTestingEnabled).toBe(false);
    });

    it('sets flpIntent from manifest crossNavigation inbounds', async () => {
        isAbapCloudMock.mockResolvedValue(false);
        const config = await getConfig({
            ...baseConfig,
            manifest: {
                ...manifest,
                'sap.app': {
                    ...manifest['sap.app'],
                    crossNavigation: {
                        inbounds: {
                            managePurchaseOrder: {
                                semanticObject: 'PurchaseOrder',
                                action: 'ppsmanage'
                            }
                        }
                    }
                }
            } as any
        });

        expect(config.options?.flpIntent).toBe('PurchaseOrder-ppsmanage');
    });

    it('sets flpIntent to undefined when manifest has no inbounds', async () => {
        isAbapCloudMock.mockResolvedValue(false);
        const config = await getConfig(baseConfig);

        expect(config.options?.flpIntent).toBeUndefined();
    });
});

describe('getCfConfig', () => {
    const mockServiceKeys = [
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
    const baseParams: CreateCfConfigParams = {
        projectPath: '/test/project',
        layer: FlexLayer.CUSTOMER_BASE,
        attributeAnswers: {
            title: 'Test App',
            namespace: 'test.namespace',
            projectName: 'test-project'
        } as AttributesAnswers,
        manifest: {
            'sap.app': {
                id: 'test.app',
                title: 'Test App'
            }
        } as Manifest,
        cfConfig: {
            url: '/test.cf.com',
            org: { GUID: 'org-guid', Name: 'test-org' },
            space: { GUID: 'space-guid', Name: 'test-space' },
            token: 'test-token'
        } as CfConfig,
        cfServicesAnswers: {
            baseApp: {
                appId: 'base-app-id',
                appName: 'Base App',
                appVersion: '1.0.0',
                appHostId: 'app-host-id',
                serviceName: 'base-service',
                title: 'Base App Title'
            },
            approuter: AppRouterType.MANAGED,
            businessService: 'test-service',
            businessSolutionName: 'test-solution'
        } as CfServicesAnswers,
        packageJson: { name: '@sap-ux/generator-adp', version: '0.0.1' } as Package,
        toolsId: 'test-tools-id',
        html5RepoRuntimeGuid: 'runtime-guid',
        publicVersions: { latest: { version: '1.135.0' } as VersionDetail },
        serviceInfo: {
            serviceKeys: mockServiceKeys,
            serviceInstance: { guid: 'service-guid', name: 'service-name' }
        },
        spaceGuid: 'space-guid'
    };

    test('should create CF config with managed approuter', () => {
        const result = getCfConfig(baseParams);

        expect(result.cf.approuter).toBe(AppRouterType.MANAGED);
        expect(result.options?.addStandaloneApprouter).toBe(false);
        expect(result.app.id).toBe('base-app-id');
        expect(result.project.folder).toBe(join('/test/project', 'test-project'));
    });

    test('should throw error when baseApp is missing', () => {
        const params = {
            ...baseParams,
            cfServicesAnswers: {
                ...baseParams.cfServicesAnswers,
                baseApp: undefined
            }
        };

        expect(() => getCfConfig(params)).toThrow(t('errors.baseAppRequired'));
    });
});
