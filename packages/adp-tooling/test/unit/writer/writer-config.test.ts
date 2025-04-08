import type { ToolsLogger } from '@sap-ux/logger';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

import { FlexLayer, UI5VersionInfo, getProviderConfig, getConfig } from '../../../src';
import type { ConfigAnswers, PackageJson, SourceApplication } from '../../../src';

jest.mock('../../../src/abap/config.ts', () => ({
    getProviderConfig: jest.fn()
}));

const systemDetails = {
    client: '010',
    url: 'some-url'
};

const getAtoInfoMock = jest.fn().mockResolvedValue({ operationsType: 'P' });
const isAbapCloudMock = jest.fn();
const mockAbapProvider = {
    getAtoInfo: getAtoInfoMock,
    isAbapCloud: isAbapCloudMock
} as unknown as AbapServiceProvider;

const getProviderConfigMock = getProviderConfig as jest.Mock;

const configAnswers: ConfigAnswers = {
    application: { id: '1' } as SourceApplication,
    system: 'SYS010',
    password: '',
    username: ''
};

const defaults = {
    namespace: 'customer.app.variant1'
};

describe('getConfig', () => {
    beforeEach(() => {
        getProviderConfigMock.mockResolvedValue(systemDetails);
    });

    it('returns the correct config with provided parameters when system is cloud ready', async () => {
        jest.spyOn(UI5VersionInfo, 'getInstance').mockReturnValue({
            getLatestVersion: jest.fn().mockReturnValue('1.135.0')
        } as unknown as UI5VersionInfo);
        isAbapCloudMock.mockResolvedValue(true);
        const config = await getConfig({
            provider: mockAbapProvider,
            configAnswers,
            layer: FlexLayer.CUSTOMER_BASE,
            defaults,
            packageJson: { name: '@sap-ux/generator-adp', version: '0.0.1' } as PackageJson,
            logger: {} as ToolsLogger
        });

        expect(config).toEqual({
            app: {
                id: 'customer.app.variant1',
                reference: '1',
                layer: 'CUSTOMER_BASE',
                title: '',
                content: [expect.any(Object)]
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
