import type { ToolsLogger } from '@sap-ux/logger';
import type { Package } from '@sap-ux/project-access';
import { type AbapServiceProvider, AdaptationProjectType } from '@sap-ux/axios-extension';

import { FlexLayer, getProviderConfig, getConfig } from '../../../src';
import type { AttributesAnswers, ConfigAnswers, Language, SourceApplication, VersionDetail } from '../../../src';

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

describe('getConfig', () => {
    beforeEach(() => {
        getProviderConfigMock.mockResolvedValue(systemDetails);
    });

    it('returns the correct config with provided parameters when system is cloud ready', async () => {
        isAbapCloudMock.mockResolvedValue(true);
        const config = await getConfig({
            provider: mockAbapProvider,
            configAnswers,
            attributeAnswers,
            layer: FlexLayer.CUSTOMER_BASE,
            publicVersions: { latest: { version: '1.135.0' } as VersionDetail },
            systemVersion: undefined,
            packageJson: { name: '@sap-ux/generator-adp', version: '0.0.1' } as Package,
            logger: {} as ToolsLogger
        });

        expect(config).toEqual({
            app: {
                id: 'customer.app.variant1',
                reference: '1',
                layer: 'CUSTOMER_BASE',
                title: '',
                bspName: 'bsp.name',
                languages: activeLanguages,
                i18nDescription: expect.stringContaining('SAP Fiori application keys'),
                content: [
                    {
                        changeType: 'appdescr_ui5_addNewModelEnhanceWith',
                        content: {
                            bundleUrl: 'i18n/i18n.properties',
                            fallbackLocale: '',
                            modelId: 'i18n',
                            supportedLocales: ['']
                        }
                    }
                ]
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
                minVersion: '1.135.0',
                version: '1.135.0'
            },
            options: { fioriTools: true, enableTypeScript: false }
        });
    });
});
