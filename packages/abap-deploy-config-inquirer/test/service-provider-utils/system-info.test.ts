import { AdaptationProjectType } from '@sap-ux/axios-extension';
import { initI18n, t } from '../../src/i18n';
import LoggerHelper from '../../src/logger-helper';
import { getSystemInfo } from '../../src/service-provider-utils';
import { getOrCreateServiceProvider } from '../../src/service-provider-utils/abap-service-provider';

jest.mock('../../src/service-provider-utils/abap-service-provider', () => ({
    ...jest.requireActual('../../src/service-provider-utils/abap-service-provider'),
    getOrCreateServiceProvider: jest.fn()
}));

const mockGetOrCreateServiceProvider = getOrCreateServiceProvider as jest.Mock;

describe('Test get system info', () => {
    beforeAll(async () => {
        await initI18n();
    });

    const packageName = 'ZPACK';
    const systemConfig = {
        url: 'https://mock.url.target1.com',
        client: '000'
    };

    it('should get system info', async () => {
        const systemInfo = {
            adaptationProjectTypes: [AdaptationProjectType.CLOUD_READY],
            activeLanguages: []
        };
        const mockLrepService = {
            getSystemInfo: jest.fn().mockResolvedValueOnce(systemInfo)
        };

        mockGetOrCreateServiceProvider.mockResolvedValueOnce({
            getLayeredRepository: jest.fn().mockReturnValue(mockLrepService)
        });

        const result = await getSystemInfo(packageName, systemConfig);
        expect(result).toStrictEqual(systemInfo);
    });

    it('should log error and return undefined', async () => {
        const errorObj = new Error('Failed to create service provider');
        const loggerSpy = jest.spyOn(LoggerHelper.logger, 'debug');
        mockGetOrCreateServiceProvider.mockRejectedValueOnce(errorObj);

        const systemInfo = await getSystemInfo(packageName, systemConfig);
        expect(systemInfo).toStrictEqual(undefined);
        expect(loggerSpy).toBeCalledWith(
            t('errors.debugAbapTargetSystem', { method: 'getSystemInfo', error: errorObj.message })
        );
    });
});