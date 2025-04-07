import type { ToolsLogger } from '@sap-ux/logger';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

import { FlexLayer, getAbapTarget, getConfig } from '../../../src';
import type { ConfigAnswers, PackageJson, TargetApplication } from '../../../src';

jest.mock('../../../src/client/abap-provider.ts', () => ({
    getAbapTarget: jest.fn()
}));

const systemDetails = {
    client: '010',
    url: 'https://SYS010'
};

const getAtoInfoMock = jest.fn().mockResolvedValue({ operationsType: 'P' });
const mockAbapProvider = {
    getAtoInfo: getAtoInfoMock
} as unknown as AbapServiceProvider;

const getAbapTargetMock = getAbapTarget as jest.Mock;

const configAnswers: ConfigAnswers = {
    application: { id: '1' } as TargetApplication,
    system: 'SYS010',
    password: '',
    username: ''
};

const defaults = {
    namespace: 'customer.app.variant1'
};

describe('getConfig', () => {
    beforeEach(() => {
        getAbapTargetMock.mockResolvedValue(systemDetails);
    });

    it('returns the correct config with provided parameters when system is cloud ready', async () => {
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
                url: 'https://SYS010'
            },
            options: { fioriTools: true, enableTypeScript: false }
        });
    });
});
