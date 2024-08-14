import { join } from 'path';

import type { ToolsLogger } from '@sap-ux/logger';
import { isAppStudio } from '@sap-ux/btp-utils';
import { createAbapServiceProvider } from '@sap-ux/system-access';

import { EndpointsService, ProviderService } from '../../../../src';

jest.mock('fs');

const appManifest = jest
    .requireActual('fs')
    .readFileSync(join(__dirname, '../../../fixtures/base-app', 'manifest.json'), 'utf-8');

const mockAppInfo = { ExampleApp: { manifestUrl: 'https://sap.example' } };

const createProviderMock = createAbapServiceProvider as jest.Mock;
const mockIsAppStudio = isAppStudio as jest.Mock;

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn()
}));

jest.mock('@sap-ux/system-access', () => {
    return {
        ...jest.requireActual('@sap-ux/system-access'),
        createAbapServiceProvider: jest.fn().mockImplementation(() => {
            return {
                getAppIndex: jest.fn().mockReturnValue({
                    getAppInfo: () => Promise.resolve(mockAppInfo)
                }),
                get: () => Promise.resolve({ data: appManifest })
            };
        })
    };
});

describe('ProviderService', () => {
    let service: ProviderService;
    let endpointsService: EndpointsService;

    const loggerMock = {
        error: jest.fn(),
        warn: jest.fn()
    } as Partial<ToolsLogger> as ToolsLogger;
    const system = 'http://u1y.sap.corp';
    const destination = 'U1Y';

    beforeEach(() => {
        endpointsService = new EndpointsService(loggerMock);
        service = new ProviderService(endpointsService, loggerMock);
        mockIsAppStudio.mockReturnValue(false);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('setProvider', () => {
        it('configures the provider successfully for VS Code', async () => {
            const client = '001';
            const username = 'username';
            const password = 'password';
            const mockTarget = {
                url: system,
                client,
                username,
                password
            };

            jest.spyOn(endpointsService, 'getSystemDetails').mockResolvedValue(mockTarget);

            await service.setProvider(system, client, username, password);

            expect(createProviderMock).toHaveBeenCalledWith(mockTarget, expect.anything(), false, expect.anything());
            expect(service.getProvider()).toBeTruthy();
        });

        it('configures the provider successfully for BAS', async () => {
            const mockTarget = {
                destination
            };
            mockIsAppStudio.mockReturnValue(true);

            await service.setProvider(destination);

            expect(createProviderMock).toHaveBeenCalledWith(mockTarget, expect.anything(), false, expect.anything());
            expect(service.getProvider()).toBeTruthy();
        });

        it('throws an error when provider instantiation fails', async () => {
            createProviderMock.mockImplementation(() => {
                throw new Error('Provider setup failed');
            });

            await expect(service.setProvider(system)).rejects.toThrow('Provider setup failed');
            expect(loggerMock.error).toHaveBeenCalled();
        });

        it('throws an error when provider is not found', async () => {
            createProviderMock.mockImplementation(() => undefined);

            await service.setProvider(system);
            expect(() => service.getProvider()).toThrow('Provider was not set!');
        });
    });
});
