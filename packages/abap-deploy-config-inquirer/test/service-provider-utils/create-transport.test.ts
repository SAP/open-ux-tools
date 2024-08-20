import { initI18n, t } from '../../src/i18n';
import LoggerHelper from '../../src/logger-helper';
import { createTransportNumberFromService } from '../../src/service-provider-utils';
import { getOrCreateServiceProvider } from '../../src/service-provider-utils/abap-service-provider';

jest.mock('../../src/service-provider-utils/abap-service-provider', () => ({
    ...jest.requireActual('../../src/service-provider-utils/abap-service-provider'),
    getOrCreateServiceProvider: jest.fn()
}));

const mockGetOrCreateServiceProvider = getOrCreateServiceProvider as jest.Mock;

describe('Test create transport', () => {
    beforeAll(async () => {
        await initI18n();
    });

    const createTransportParams = {
        packageName: 'mockPackage',
        ui5AppName: 'mockApp',
        description: 'mockDescription'
    };
    const systemConfig = {
        url: 'https://mock.url.target1.com',
        client: '000'
    };

    it('should return a new transport number', async () => {
        const mockGetAdtService = {
            createTransportRequest: jest.fn().mockResolvedValueOnce('NEWTR123')
        };

        mockGetOrCreateServiceProvider.mockResolvedValueOnce({
            getAdtService: jest.fn().mockResolvedValueOnce(mockGetAdtService)
        });

        const transportNumber = await createTransportNumberFromService(createTransportParams, systemConfig);
        expect(transportNumber).toBe('NEWTR123');
    });

    it('should log error and returned undefined', async () => {
        const errorObj = new Error('Failed to create service provider');
        const loggerSpy = jest.spyOn(LoggerHelper.logger, 'debug');
        mockGetOrCreateServiceProvider.mockRejectedValueOnce(errorObj);

        const transportNumber = await createTransportNumberFromService(createTransportParams, systemConfig);
        expect(transportNumber).toBe(undefined);
        expect(loggerSpy).toBeCalledWith(
            t('errors.debugAbapTargetSystem', { method: 'createTransportNumberFromService', error: errorObj.message })
        );
    });
});
