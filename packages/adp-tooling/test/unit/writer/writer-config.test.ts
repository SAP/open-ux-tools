import { join } from 'node:path';
import { readFileSync } from 'node:fs';

import type { ToolsLogger } from '@sap-ux/logger';
import type { Manifest, Package } from '@sap-ux/project-access';
import { type AbapServiceProvider, AdaptationProjectType } from '@sap-ux/axios-extension';

import type {
    AttributesAnswers,
    ConfigAnswers,
    ConfigOptions,
    Language,
    SourceApplication,
    VersionDetail
} from '../../../src';
import { t } from '../../../src/i18n';
import { AppRouterType } from '../../../src/types';
import { getCfConfig } from '../../../src/writer/writer-config';
import { FlexLayer, getProviderConfig, getConfig } from '../../../src';
import type { CfConfig, CfServicesAnswers, CreateCfConfigParams } from '../../../src/types';

const basePath = join(__dirname, '../../fixtures/base-app/manifest.json');
const manifest = JSON.parse(readFileSync(basePath, 'utf-8'));

jest.mock('../../../src/abap/config.ts', () => ({
    getProviderConfig: jest.fn()
}));

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

const getProviderConfigMock = getProviderConfig as jest.Mock;

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
    manifest
};

describe('getConfig', () => {
    beforeEach(() => {
        getProviderConfigMock.mockResolvedValue(systemDetails);
    });

    it('returns the correct config with provided parameters when system is cloud ready', async () => {
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
                        toolsId: expect.any(String),
                        version: '0.0.1'
                    }
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
            options: { fioriTools: true, enableTypeScript: false }
        });
    });
});

describe('getCfConfig', () => {
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
        html5RepoRuntimeGuid: 'runtime-guid',
        publicVersions: { latest: { version: '1.135.0' } as VersionDetail }
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
