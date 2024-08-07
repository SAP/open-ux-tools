import { getTransportConfigInstance } from '../../src/service-provider-utils';
import { getOrCreateServiceProvider } from '../../src/service-provider-utils/abap-service-provider';

jest.mock('../../src/service-provider-utils/abap-service-provider', () => ({
    ...jest.requireActual('../../src/service-provider-utils/abap-service-provider'),
    getOrCreateServiceProvider: jest.fn()
}));

const mockGetOrCreateServiceProvider = getOrCreateServiceProvider as jest.Mock;

describe('getTransportConfigInstance', () => {
    it('should return the dummy instance of TransportConfig', async () => {
        const transportConfigResult = await getTransportConfigInstance({
            options: {},
            scp: true,
            credentials: {},
            systemConfig: {}
        });
        expect(transportConfigResult.transportConfig?.getPackage()).toBe(undefined);
        expect(transportConfigResult.transportConfig?.getApplicationPrefix()).toBe(undefined);
        expect(transportConfigResult.transportConfig?.isTransportRequired()).toBe(false);
        expect(transportConfigResult.transportConfig?.getDefaultTransport()).toBe(undefined);
        expect(transportConfigResult.transportConfig?.getOperationsType()).toBe(undefined);
    });

    it('should return the default instance of TransportConfig', async () => {
        const mockGetAdtService = {
            getAtoInfo: jest.fn().mockResolvedValueOnce({
                developmentPackage: 'Z_PACK',
                developmentPrefix: 'Z_',
                operationsType: 'P',
                isExtensibilityDevelopmentSystem: false,
                isTransportRequestRequired: true
            })
        };

        mockGetOrCreateServiceProvider.mockResolvedValueOnce({
            getAdtService: jest.fn().mockResolvedValueOnce(mockGetAdtService)
        });

        const transportConfigResult = await getTransportConfigInstance({
            options: {},
            scp: false,
            credentials: {},
            systemConfig: {}
        });

        expect(transportConfigResult.transportConfig?.getOperationsType()).toBe('P');
    });
});
