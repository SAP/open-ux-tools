import { AxiosError } from 'axios';
import { initI18n, t } from '../../src/i18n';
import LoggerHelper from '../../src/logger-helper';
import { listPackagesFromService } from '../../src/service-provider-utils';
import { AbapServiceProviderManager } from '../../src/service-provider-utils/abap-service-provider';

jest.mock('../../src/service-provider-utils/abap-service-provider', () => ({
    ...jest.requireActual('../../src/service-provider-utils/abap-service-provider'),
    AbapServiceProviderManager: { getOrCreateServiceProvider: jest.fn() }
}));

const mockGetOrCreateServiceProvider = AbapServiceProviderManager.getOrCreateServiceProvider as jest.Mock;

describe('Test list packages', () => {
    beforeAll(async () => {
        await initI18n();
    });

    const phrase = 'ZPACK';

    it('should return a list of packages', async () => {
        const packages = ['ZPACK1', 'ZPACK2'];
        const mockGetAdtService = {
            listPackages: jest.fn().mockResolvedValueOnce(packages)
        };

        mockGetOrCreateServiceProvider.mockResolvedValueOnce({
            getAdtService: jest.fn().mockResolvedValueOnce(mockGetAdtService)
        });

        const allPackages = await listPackagesFromService(phrase);
        expect(allPackages).toBe(packages);
    });

    it('should log errors and return an empty array, if not a cert error', async () => {
        const errorObj = new Error('Failed to create service provider');
        const loggerSpy = jest.spyOn(LoggerHelper.logger, 'debug');
        mockGetOrCreateServiceProvider.mockRejectedValueOnce(errorObj);

        const allPackages = await listPackagesFromService(phrase);
        expect(allPackages).toStrictEqual([]);
        expect(loggerSpy).toHaveBeenCalledWith(
            t('errors.debugAbapTargetSystem', { method: 'listPackagesFromService', error: errorObj.message })
        );
    });

    it('should log cert errors and throw', async () => {
        const error = new AxiosError('self signed certificate', 'DEPTH_ZERO_SELF_SIGNED_CERT');
        const logWarnSpy = jest.spyOn(LoggerHelper.logger, 'warn');
        mockGetOrCreateServiceProvider.mockRejectedValueOnce(error);

        await expect(listPackagesFromService(phrase, { abapTarget: { url: 'http://somehost:1234' } })).rejects.toThrow(
            'self signed cert'
        );
        expect(logWarnSpy).toHaveBeenCalledWith(
            t('warnings.certificateError', { url: 'http://somehost:1234', error: error.message })
        );
    });
});
