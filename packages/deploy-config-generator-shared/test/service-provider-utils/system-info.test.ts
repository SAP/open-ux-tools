import { AdaptationProjectType } from '@sap-ux/axios-extension';
import { t } from '../../src/utils/i18n';
import { getSystemInfo } from '../../src/service-provider-utils';
import { ToolsLogger } from '@sap-ux/logger';
import { getOrCreateServiceProvider } from '../../src/service-provider-utils/abap-service-provider';

jest.mock('../../src/service-provider-utils/abap-service-provider', () => ({
    ...jest.requireActual('../../src/service-provider-utils/abap-service-provider'),
    getOrCreateServiceProvider: jest.fn()
}));

const mockGetOrCreateServiceProvider = getOrCreateServiceProvider as jest.Mock;

describe('Test get system info', () => {
    const logger = new ToolsLogger();

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

        const result = await getSystemInfo(packageName, systemConfig, logger);
        expect(result).toStrictEqual(systemInfo);
    });

    it('should log error and return undefined', async () => {
        const errorObj = new Error('Failed to create service provider');
        const loggerSpy = jest.spyOn(logger, 'debug');
        mockGetOrCreateServiceProvider.mockRejectedValueOnce(errorObj);

        const systemInfo = await getSystemInfo(packageName, systemConfig, logger);
        expect(systemInfo).toStrictEqual(undefined);
        expect(loggerSpy).toBeCalledWith(
            t('errors.debugAbapTargetSystem', { method: 'getSystemInfo', error: errorObj.message })
        );
    });
});
