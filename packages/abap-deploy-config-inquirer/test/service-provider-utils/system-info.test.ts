import { AdaptationProjectType } from '@sap-ux/axios-extension';
import * as axiosExt from '@sap-ux/axios-extension';
import { initI18n, t } from '../../src/i18n';
import LoggerHelper from '../../src/logger-helper';
import { getSystemInfo } from '../../src/service-provider-utils';
import { AbapServiceProviderManager } from '../../src/service-provider-utils/abap-service-provider';

jest.mock('../../src/service-provider-utils/abap-service-provider', () => ({
    ...jest.requireActual('../../src/service-provider-utils/abap-service-provider'),
    AbapServiceProviderManager: { getOrCreateServiceProvider: jest.fn() }
}));

const mockGetOrCreateServiceProvider = AbapServiceProviderManager.getOrCreateServiceProvider as jest.Mock;

describe('Test get system info', () => {
    beforeAll(async () => {
        await initI18n();
    });

    const packageName = 'ZPACK';

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

        const result = await getSystemInfo(packageName);
        expect(result).toStrictEqual({ apiExist: true, systemInfo });
    });

    it('should log error and return undefined', async () => {
        const errorObj = { message: 'Missing API', response: { status: 405 } };
        const loggerSpy = jest.spyOn(LoggerHelper.logger, 'debug');
        const mockLrepService = {
            getSystemInfo: jest.fn().mockRejectedValueOnce(errorObj)
        };
        jest.spyOn(axiosExt, 'isAxiosError').mockReturnValueOnce(true);
        mockGetOrCreateServiceProvider.mockResolvedValueOnce({
            getLayeredRepository: jest.fn().mockReturnValue(mockLrepService)
        });
        const systemInfo = await getSystemInfo(packageName);
        expect(systemInfo).toStrictEqual({ apiExist: false });
        expect(loggerSpy).toBeCalledWith(
            t('errors.debugAbapTargetSystem', { method: 'getSystemInfo', error: errorObj.message })
        );
    });
});
