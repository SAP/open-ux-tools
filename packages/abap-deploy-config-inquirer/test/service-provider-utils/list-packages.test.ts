import { initI18n, t } from '../../src/i18n';
import LoggerHelper from '../../src/logger-helper';
import { listPackagesFromService } from '../../src/service-provider-utils';
import { getOrCreateServiceProvider } from '../../src/service-provider-utils/abap-service-provider';

jest.mock('../../src/service-provider-utils/abap-service-provider', () => ({
    ...jest.requireActual('../../src/service-provider-utils/abap-service-provider'),
    getOrCreateServiceProvider: jest.fn()
}));

const mockGetOrCreateServiceProvider = getOrCreateServiceProvider as jest.Mock;

describe('Test list packages', () => {
    beforeAll(async () => {
        await initI18n();
    });

    const phrase = 'ZPACK';

    const systemConfig = {
        url: 'https://mock.url.target1.com',
        client: '000'
    };

    it('should return a list of packages', async () => {
        const packages = ['ZPACK1', 'ZPACK2'];
        const mockGetAdtService = {
            listPackages: jest.fn().mockResolvedValueOnce(packages)
        };

        mockGetOrCreateServiceProvider.mockResolvedValueOnce({
            getAdtService: jest.fn().mockResolvedValueOnce(mockGetAdtService)
        });

        const allPackages = await listPackagesFromService(phrase, systemConfig);
        expect(allPackages).toBe(packages);
    });

    it('should log error and return an empty array', async () => {
        const errorObj = new Error('Failed to create service provider');
        const loggerSpy = jest.spyOn(LoggerHelper.logger, 'debug');
        mockGetOrCreateServiceProvider.mockRejectedValueOnce(errorObj);

        const allPackages = await listPackagesFromService(phrase, systemConfig);
        expect(allPackages).toStrictEqual([]);
        expect(loggerSpy).toBeCalledWith(
            t('errors.debugAbapTargetSystem', { method: 'listPackagesFromService', error: errorObj.message })
        );
    });
});
