import type { AtoSettings } from '@sap-ux/axios-extension';
import { TenantType } from '@sap-ux/axios-extension';
import { t } from '../../src/i18n';
import { getTransportConfigInstance } from '../../src/service-provider-utils';
import { AbapServiceProviderManager } from '../../src/service-provider-utils/abap-service-provider';
import LoggerHelper from '../../src/logger-helper';
import { AxiosError } from 'axios';
import { addi18nResourceBundle } from '@sap-ux/inquirer-common';

jest.mock('../../src/service-provider-utils/abap-service-provider', () => ({
    ...jest.requireActual('../../src/service-provider-utils/abap-service-provider'),
    AbapServiceProviderManager: { getOrCreateServiceProvider: jest.fn(), deleteExistingServiceProvider: jest.fn() }
}));

const mockGetOrCreateServiceProvider = AbapServiceProviderManager.getOrCreateServiceProvider as jest.Mock;

describe('getTransportConfigInstance', () => {
    it('should return the dummy instance of TransportConfig', async () => {
        const transportConfigResult = await getTransportConfigInstance({
            backendTarget: undefined,
            credentials: {}
        });
        expect(transportConfigResult.transportConfig?.getPackage()).toBe(undefined);
        expect(transportConfigResult.transportConfig?.getApplicationPrefix()).toBe(undefined);
        expect(transportConfigResult.transportConfig?.isTransportRequired()).toBe(false);
        expect(transportConfigResult.transportConfig?.getDefaultTransport()).toBe(undefined);
        expect(transportConfigResult.transportConfig?.getOperationsType()).toBe(undefined);
    });

    it('should return the default instance of TransportConfig', async () => {
        const mockGetAdtService = {
            getAtoInfo: jest.fn().mockResolvedValueOnce({
                developmentPackage: 'Z_PACK',
                developmentPrefix: 'Z_',
                operationsType: 'P',
                isExtensibilityDevelopmentSystem: false,
                isTransportRequestRequired: true
            })
        };

        mockGetOrCreateServiceProvider.mockResolvedValueOnce({
            getAdtService: jest.fn().mockResolvedValueOnce(mockGetAdtService)
        });

        const transportConfigResult = await getTransportConfigInstance({
            backendTarget: undefined,
            credentials: {}
        });

        expect(transportConfigResult.transportConfig?.getOperationsType()).toBe('P');
    });

    it('should return the correct errors when creating instance of TransportConfig', async () => {
        const mockAtoSettings: AtoSettings = {
            developmentPrefix: 'Z_',
            operationsType: 'C',
            isExtensibilityDevelopmentSystem: false,
            isTransportRequestRequired: true,
            tenantType: TenantType.Customer,
            isConfigured: true
        };

        // s4 system not configured as extensibility development system
        const mockGetAdtService = {
            getAtoInfo: jest.fn().mockResolvedValueOnce(mockAtoSettings)
        };

        mockGetOrCreateServiceProvider.mockResolvedValueOnce({
            getAdtService: jest.fn().mockResolvedValueOnce(mockGetAdtService)
        });

        const transportConfigResult = await getTransportConfigInstance({
            backendTarget: undefined,
            credentials: {}
        });

        expect(transportConfigResult.error).toBe(t('errors.s4SystemNoExtensible'));

        // incorrect ato settings
        mockAtoSettings.isExtensibilityDevelopmentSystem = true;
        mockAtoSettings.developmentPrefix = undefined;

        mockGetOrCreateServiceProvider.mockResolvedValueOnce({
            getAdtService: jest
                .fn()
                .mockResolvedValueOnce({ getAtoInfo: jest.fn().mockResolvedValueOnce(mockAtoSettings) })
        });

        const transportConfigResult2 = await getTransportConfigInstance({
            backendTarget: undefined,
            credentials: {}
        });

        expect(transportConfigResult2.error).toBe(t('errors.incorrectAtoSettings'));
    });

    it('should apply S4C defaults', async () => {
        const mockAtoSettings: AtoSettings = {
            developmentPrefix: 'Z_',
            operationsType: 'C',
            isExtensibilityDevelopmentSystem: true,
            isTransportRequestRequired: true,
            tenantType: TenantType.Customer,
            isConfigured: true
        };

        mockGetOrCreateServiceProvider.mockResolvedValueOnce({
            getAdtService: jest
                .fn()
                .mockResolvedValueOnce({ getAtoInfo: jest.fn().mockResolvedValueOnce(mockAtoSettings) })
        });

        const transportConfigResult = await getTransportConfigInstance({
            backendTarget: undefined,
            credentials: {}
        });

        expect(transportConfigResult.transportConfig?.isTransportRequired()).toBe(false);
        expect(transportConfigResult.transportConfig?.getPackage()).toBe('TEST_YY1_DEFAULT');
        expect(transportConfigResult.transportConfig?.getDefaultTransport()).toBe('');
        expect(transportConfigResult.transportConfig?.getApplicationPrefix()).toBe('Z_');
    });

    it('should handle errors and return transport config', async () => {
        // 401 with headers
        const mockGetAdtService401 = {
            getAtoInfo: jest.fn().mockRejectedValueOnce({
                message: 'Failed to get ATO info',
                response: { status: 401, headers: { 'www-authenticate': 'Basic' } }
            })
        };

        mockGetOrCreateServiceProvider.mockResolvedValueOnce({
            getAdtService: jest.fn().mockResolvedValueOnce(mockGetAdtService401)
        });

        const transportConfigResult = await getTransportConfigInstance({
            backendTarget: undefined,
            credentials: {}
        });
        expect(transportConfigResult.transportConfigNeedsCreds).toBe(true);

        // 401 without headers
        const mockGetAdtService401WithoutHeaders = {
            getAtoInfo: jest.fn().mockRejectedValueOnce({
                message: 'Failed to get ATO info',
                response: { status: 401 }
            })
        };

        mockGetOrCreateServiceProvider.mockResolvedValueOnce({
            getAdtService: jest.fn().mockResolvedValueOnce(mockGetAdtService401WithoutHeaders)
        });

        const transportConfigResultWithoutHeaders = await getTransportConfigInstance({
            backendTarget: undefined,
            credentials: {}
        });
        expect(transportConfigResultWithoutHeaders.transportConfigNeedsCreds).toBe(false);

        // 500 error
        const mockGetAdtService500 = {
            getAtoInfo: jest.fn().mockRejectedValueOnce({
                message: 'Failed to get ATO info',
                response: { status: 500 }
            })
        };

        mockGetOrCreateServiceProvider.mockResolvedValueOnce({
            getAdtService: jest.fn().mockResolvedValueOnce(mockGetAdtService500)
        });

        const transportConfigResult2 = await getTransportConfigInstance({
            backendTarget: undefined,
            credentials: {}
        });
        expect(transportConfigResult2.transportConfigNeedsCreds).toBe(false);

        // Certificate errors
        mockGetOrCreateServiceProvider.mockResolvedValueOnce({
            getAdtService: jest
                .fn()
                .mockRejectedValueOnce(new AxiosError('self signed certificate', 'DEPTH_ZERO_SELF_SIGNED_CERT'))
        });
        const loggerSpyWarn = jest.spyOn(LoggerHelper.logger, 'warn');
        const loggerSpyDebug = jest.spyOn(LoggerHelper.logger, 'debug');
        const loggerSpyInfo = jest.spyOn(LoggerHelper.logger, 'info');
        addi18nResourceBundle(); // Ensure i18n is initialized for GA link creation testing

        const transportConfigResult3 = await getTransportConfigInstance({
            backendTarget: {
                abapTarget: { url: 'https://example.com' }
            },
            credentials: {}
        });
        expect(transportConfigResult3.transportConfigNeedsCreds).toBe(undefined);
        // Expect GA link to be logged
        expect(loggerSpyWarn).toHaveBeenCalledWith(
            t('warnings.certificateError', { url: 'https://example.com', error: 'self signed certificate' })
        );
        expect(loggerSpyDebug).toHaveBeenCalledWith(
            t('errors.debugAbapTargetSystem', { url: 'https://example.com', error: 'self signed certificate' })
        );
        expect(loggerSpyInfo).toHaveBeenCalledWith(
            expect.stringContaining('https://ga.support.sap.com/dtp/viewer/index.html#/tree/3046/actions/53643')
        );
    });
});
