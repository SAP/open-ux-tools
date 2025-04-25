import { initI18n, t } from '../../src/i18n';
import LoggerHelper from '../../src/logger-helper';
import { isAbapCloud } from '../../src/service-provider-utils/abap-cloud';
import { AbapServiceProviderManager } from '../../src/service-provider-utils/abap-service-provider';

jest.mock('../../src/service-provider-utils/abap-service-provider', () => ({
    ...jest.requireActual('../../src/service-provider-utils/abap-service-provider'),
    AbapServiceProviderManager: { getOrCreateServiceProvider: jest.fn() }
}));

const mockGetOrCreateServiceProvider = AbapServiceProviderManager.getOrCreateServiceProvider as jest.Mock;

describe('Test get is Abap Cloud', () => {
    beforeAll(async () => {
        await initI18n();
    });

    it('should get is Abap Cloud', async () => {
        mockGetOrCreateServiceProvider.mockResolvedValueOnce({
            isAbapCloud: jest.fn().mockResolvedValueOnce(true)
        });

        const result = await isAbapCloud();
        expect(result).toBe(true);
    });

    it('should log error and return undefined', async () => {
        const loggerSpy = jest.spyOn(LoggerHelper.logger, 'debug');
        mockGetOrCreateServiceProvider.mockResolvedValueOnce({
            isAbapCloud: jest.fn().mockImplementationOnce(() => {
                throw new Error('Service unavailable');
            })
        });
        const result = await isAbapCloud();
        expect(result).toBe(undefined);
        expect(loggerSpy).toBeCalledWith(
            t('errors.debugAbapTargetSystem', { method: 'isAbapCloud', error: 'Service unavailable' })
        );
    });
});
