import { isAppStudio } from '@sap-ux/btp-utils';

import { WriterConfig, FlexLayer } from '../../../src';
import type { AbapProvider, ConfigAnswers, TargetApplication } from '../../../src';

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn()
}));

const getAtoInfoMock = jest.fn().mockResolvedValue({ operationsType: 'P' });

const systemDetails = {
    client: '010',
    url: 'https://SYS010'
};

const mockAbapProvider = {
    getProvider: jest.fn().mockReturnValue({
        getAtoInfo: getAtoInfoMock
    }),
    determineTarget: jest.fn().mockResolvedValue(systemDetails)
} as unknown as AbapProvider;

const configAnswers: ConfigAnswers = {
    application: { id: '1' } as TargetApplication,
    system: 'SYS010',
    password: '',
    username: ''
};

const defaults = {
    namespace: 'customer.app.variant1'
};

const mockIsAppStudio = isAppStudio as jest.Mock;

describe('Writer Config', () => {
    let writerConfig: WriterConfig;

    beforeEach(() => {
        writerConfig = new WriterConfig(mockAbapProvider, FlexLayer.CUSTOMER_BASE);
    });

    describe('getConfig', () => {
        it('returns the correct config with provided parameters when system is cloud ready', async () => {
            mockIsAppStudio.mockReturnValue(false);
            getAtoInfoMock.mockResolvedValue({ operationsType: 'C' });

            const config = await writerConfig.getConfig(configAnswers, defaults);

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
                        environment: 'C',
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

        it('returns the correct config with provided parameters when system type is undefined', async () => {
            mockIsAppStudio.mockReturnValue(false);
            getAtoInfoMock.mockResolvedValue({ operationsType: undefined });

            const config = await writerConfig.getConfig(configAnswers, defaults);

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
                target: { client: '010', url: 'https://SYS010' },
                options: { fioriTools: true, enableTypeScript: false }
            });
        });
    });
});
