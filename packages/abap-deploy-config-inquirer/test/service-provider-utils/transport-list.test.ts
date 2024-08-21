import { initI18n, t } from '../../src/i18n';
import LoggerHelper from '../../src/logger-helper';
import { getTransportListFromService, transportName } from '../../src/service-provider-utils';
import { getOrCreateServiceProvider } from '../../src/service-provider-utils/abap-service-provider';

jest.mock('../../src/service-provider-utils/abap-service-provider', () => ({
    ...jest.requireActual('../../src/service-provider-utils/abap-service-provider'),
    getOrCreateServiceProvider: jest.fn()
}));

const mockGetOrCreateServiceProvider = getOrCreateServiceProvider as jest.Mock;

describe('Test list transports', () => {
    beforeAll(async () => {
        await initI18n();
    });

    const packageName = 'ZPACK';
    const appName = 'MOCK_APP';
    const systemConfig = {
        url: 'https://mock.url.target1.com',
        client: '000'
    };

    it('should return a list of transports', async () => {
        const transports = [
            { transportNumber: 'TR122C', description: 'TR1 description' },
            { transportNumber: 'TR123C', description: 'TR2 description' }
        ];
        const mockGetAdtService = {
            getTransportRequests: jest.fn().mockResolvedValueOnce(transports)
        };

        mockGetOrCreateServiceProvider.mockResolvedValueOnce({
            getAdtService: jest.fn().mockResolvedValueOnce(mockGetAdtService)
        });

        const allTransports = await getTransportListFromService(packageName, appName, systemConfig);

        expect(allTransports).toStrictEqual([
            { transportReqNumber: 'TR122C', transportReqDescription: 'TR1 description' },
            { transportReqNumber: 'TR123C', transportReqDescription: 'TR2 description' }
        ]);
    });

    it('should log error and return an empty array', async () => {
        const errorObj = new Error('Failed to create service provider');
        const loggerSpy = jest.spyOn(LoggerHelper.logger, 'debug');
        mockGetOrCreateServiceProvider.mockRejectedValueOnce(errorObj);

        const allTransports = await getTransportListFromService(packageName, appName, systemConfig);
        expect(allTransports).toStrictEqual(undefined);
        expect(loggerSpy).toBeCalledWith(
            t('errors.debugAbapTargetSystem', { method: 'getTransportListFromService', error: errorObj.message })
        );
    });

    it('should format transport name', () => {
        const transport = {
            transportReqNumber: 'TR122C',
            transportReqDescription: 'TR1 description'
        };
        const expectedTRName = 'TR122C (TR1 description)';

        expect(transportName(transport)).toStrictEqual({
            name: expectedTRName,
            value: 'TR122C'
        });

        transport.transportReqDescription = '';
        expect(transportName(transport)).toStrictEqual({
            name: 'TR122C',
            value: 'TR122C'
        });
    });
});
