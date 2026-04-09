import { jest } from '@jest/globals';
import type { ServiceInstanceInfo } from '@sap/cf-tools';

let cfAbapServices: ServiceInstanceInfo[] = [];

const mockApiGetServicesInstancesFilteredByType = jest
    .fn<(...args: unknown[]) => Promise<ServiceInstanceInfo[]>>()
    .mockImplementation(() => Promise.resolve(cfAbapServices));

jest.unstable_mockModule('@sap/cf-tools', () => ({
    apiGetServicesInstancesFilteredByType: mockApiGetServicesInstancesFilteredByType,
    apiCreateServiceInstance: jest.fn(),
    apiGetInstanceCredentials: jest.fn(),
    cfGetInstanceKeyParameters: jest.fn(),
    cfGetTarget: jest.fn()
}));

jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn().mockReturnValue(false),
    isHTML5DynamicConfigured: jest.fn().mockReturnValue(false),
    isOnPremiseDestination: jest.fn().mockReturnValue(false),
    isAbapODataDestination: jest.fn().mockReturnValue(false),
    isFullUrlDestination: jest.fn().mockReturnValue(false),
    isPartialUrlDestination: jest.fn().mockReturnValue(false),
    AbapEnvType: {
        ABAP: 'abap',
        ABAP_TRIAL: 'abap-trial',
        ABAP_CANARY: 'abap-canary',
        ABAP_OEM: 'abap-oem',
        ABAP_OEM_CANARY: 'abap-oem-canary',
        ABAP_HAAS: 'abap-haas',
        ABAP_STAGING: 'abap-staging',
        ABAP_INTERNAL_STAGING: 'abap-internal-staging'
    },
    Authentication: {}
}));

jest.unstable_mockModule('@sap-ux/fiori-generator-shared', () => ({
    getHostEnvironment: jest.fn().mockReturnValue({ name: 'CLI', technical: 'CLI' })
}));

const { ERROR_TYPE, ErrorHandler } = await import('../../../src/error-handler/error-handler');
const { initI18nInquirerCommon, t } = await import('../../../src/i18n');
const { getCFAbapInstanceChoices } = await import('../../../src/prompts/cf-helper');

describe('cf-helper', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockApiGetServicesInstancesFilteredByType.mockImplementation(() => Promise.resolve(cfAbapServices));
    });

    beforeAll(async () => {
        await initI18nInquirerCommon();
    });

    test('should return the correct value', async () => {
        // No services
        const errorHandler = new ErrorHandler();
        expect(await getCFAbapInstanceChoices(errorHandler)).toEqual([]);

        // Services
        cfAbapServices = [
            { serviceName: 'serviceName1', label: 'serviceLabel1' },
            { serviceName: 'serviceName2', label: 'serviceLabel2' }
        ];
        mockApiGetServicesInstancesFilteredByType.mockImplementation(() => Promise.resolve(cfAbapServices));

        expect(await getCFAbapInstanceChoices(errorHandler)).toEqual([
            { name: 'serviceLabel1', value: cfAbapServices[0] },
            { name: 'serviceLabel2', value: cfAbapServices[1] }
        ]);

        // Exception
        const logErrorMsgsSpy = jest.spyOn(errorHandler, 'logErrorMsgs');
        mockApiGetServicesInstancesFilteredByType.mockRejectedValueOnce(new Error('cannot get cf services'));
        expect(await getCFAbapInstanceChoices(errorHandler)).toEqual([]);
        expect(logErrorMsgsSpy).toHaveBeenCalledWith(ERROR_TYPE.NO_ABAP_ENVS, t('errors.abapEnvsCFDiscoveryFailed'));
    });

    test('should append ABAP service types when loading ABAP instances', async () => {
        // Reset
        cfAbapServices = [];
        mockApiGetServicesInstancesFilteredByType.mockImplementation(() => Promise.resolve(cfAbapServices));
        // Pass instances
        process.env.ABAPEnvServiceTypes = 'TestInternal, internal';
        expect(await getCFAbapInstanceChoices(new ErrorHandler())).toEqual([]);
        expect(mockApiGetServicesInstancesFilteredByType).toHaveBeenCalledWith(
            expect.arrayContaining(['TestInternal', 'internal'])
        );
        delete process.env.ABAPEnvServiceTypes;
    });
});
