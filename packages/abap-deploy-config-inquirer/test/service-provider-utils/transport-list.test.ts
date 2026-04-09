import { jest } from '@jest/globals';
import { AxiosError } from 'axios';

const mockGetOrCreateServiceProvider = jest.fn();
const mockDeleteExistingServiceProvider = jest.fn();

jest.unstable_mockModule('../../src/service-provider-utils/abap-service-provider', () => ({
    AbapServiceProviderManager: {
        getOrCreateServiceProvider: mockGetOrCreateServiceProvider,
        deleteExistingServiceProvider: mockDeleteExistingServiceProvider
    }
}));

const { initI18n, t } = await import('../../src/i18n');
const LoggerHelper = (await import('../../src/logger-helper')).default;
const { getTransportListFromService, transportName } = await import('../../src/service-provider-utils');

describe('Test list transports', () => {
    beforeAll(async () => {
        await initI18n();
    });

    const packageName = 'ZPACK';
    const appName = 'MOCK_APP';

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

        const allTransports = await getTransportListFromService(packageName, appName);

        expect(allTransports).toStrictEqual([
            { transportReqNumber: 'TR122C', transportReqDescription: 'TR1 description' },
            { transportReqNumber: 'TR123C', transportReqDescription: 'TR2 description' }
        ]);
    });

    it('should log error and return an empty array, if not a cert error', async () => {
        const errorObj = new Error('Failed to create service provider');
        const loggerSpy = jest.spyOn(LoggerHelper.logger, 'debug');
        mockGetOrCreateServiceProvider.mockRejectedValueOnce(errorObj);

        const allTransports = await getTransportListFromService(packageName, appName);
        expect(allTransports).toStrictEqual(undefined);
        expect(loggerSpy).toHaveBeenCalledWith(
            t('errors.debugAbapTargetSystem', { method: 'getTransportListFromService', error: errorObj.message })
        );
    });

    it('should log cert errors and throw', async () => {
        const error = new AxiosError('self signed certificate', 'DEPTH_ZERO_SELF_SIGNED_CERT');
        const logWarnSpy = jest.spyOn(LoggerHelper.logger, 'warn');
        mockGetOrCreateServiceProvider.mockRejectedValueOnce(error);

        await expect(
            getTransportListFromService(packageName, appName, { abapTarget: { url: 'http://somehost:1234' } })
        ).rejects.toThrow('self signed cert');
        expect(logWarnSpy).toHaveBeenCalledWith(
            t('warnings.certificateError', { url: 'http://somehost:1234', error: error.message })
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
