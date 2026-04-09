import { jest } from '@jest/globals';

const mockGetOrCreateServiceProvider = jest.fn();

jest.unstable_mockModule('../../src/service-provider-utils/abap-service-provider', () => ({
    AbapServiceProviderManager: { getOrCreateServiceProvider: mockGetOrCreateServiceProvider }
}));

const { initI18n, t } = await import('../../src/i18n');
const LoggerHelper = (await import('../../src/logger-helper')).default;
const { createTransportNumberFromService } = await import('../../src/service-provider-utils');

describe('Test create transport', () => {
    beforeAll(async () => {
        await initI18n();
    });

    const createTransportParams = {
        packageName: 'mockPackage',
        ui5AppName: 'mockApp',
        description: 'mockDescription'
    };

    it('should return a new transport number', async () => {
        const mockGetAdtService = {
            createTransportRequest: jest.fn().mockResolvedValueOnce('NEWTR123')
        };

        mockGetOrCreateServiceProvider.mockResolvedValueOnce({
            getAdtService: jest.fn().mockResolvedValueOnce(mockGetAdtService)
        });

        const transportNumber = await createTransportNumberFromService(createTransportParams);
        expect(transportNumber).toBe('NEWTR123');
    });

    it('should log error and returned undefined', async () => {
        const errorObj = new Error('Failed to create service provider');
        const loggerSpy = jest.spyOn(LoggerHelper.logger, 'debug');
        mockGetOrCreateServiceProvider.mockRejectedValueOnce(errorObj);

        const transportNumber = await createTransportNumberFromService(createTransportParams);
        expect(transportNumber).toBe(undefined);
        expect(loggerSpy).toHaveBeenCalledWith(
            t('errors.debugAbapTargetSystem', { method: 'createTransportNumberFromService', error: errorObj.message })
        );
    });
});
