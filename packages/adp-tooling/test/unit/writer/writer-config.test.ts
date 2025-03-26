import type { ToolsLogger } from '@sap-ux/logger';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

import { FlexLayer, getAbapTarget, getConfig } from '../../../src';
import type { ConfigAnswers, TargetApplication } from '../../../src';

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
        const config = await getConfig(
            mockAbapProvider,
            configAnswers,
            FlexLayer.CUSTOMER_BASE,
            defaults,
            {} as ToolsLogger
        );

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
                        id: '@sap-ux/adp-tooling',
                        toolsId: expect.any(String),
                        version: expect.any(String)
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
