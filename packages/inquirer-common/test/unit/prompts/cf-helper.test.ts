import { type ServiceInstanceInfo, apiGetServicesInstancesFilteredByType } from '@sap/cf-tools';
import { ERROR_TYPE, ErrorHandler } from '../../../src/error-handler/error-handler';
import { initI18nInquirerCommon, t } from '../../../src/i18n';
import { getCFAbapInstanceChoices } from '../../../src/prompts/cf-helper';

let cfAbapServices: ServiceInstanceInfo[] = [];
jest.mock('@sap/cf-tools', () => ({
    ...jest.requireActual('@sap/cf-tools'),
    apiGetServicesInstancesFilteredByType: jest.fn().mockImplementation(() => cfAbapServices)
}));

describe('cf-helper', () => {
    beforeEach(() => {
        jest.clearAllMocks();
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

        expect(await getCFAbapInstanceChoices(errorHandler)).toEqual([
            { name: 'serviceLabel1', value: cfAbapServices[0] },
            { name: 'serviceLabel2', value: cfAbapServices[1] }
        ]);

        // Exception
        const logErrorMsgsSpy = jest.spyOn(errorHandler, 'logErrorMsgs');
        (apiGetServicesInstancesFilteredByType as jest.Mock).mockRejectedValueOnce(new Error('cannot get cf services'));
        expect(await getCFAbapInstanceChoices(errorHandler)).toEqual([]);
        expect(logErrorMsgsSpy).toHaveBeenCalledWith(ERROR_TYPE.NO_ABAP_ENVS, t('errors.abapEnvsCFDiscoveryFailed'));
    });

    test('should append ABAP instance read from env', async () => {
        // Reset
        cfAbapServices = [];
        // Pass instances
        process.env.ABAPEnvServiceTypes = 'TestInternal, internal';
        expect(await getCFAbapInstanceChoices(new ErrorHandler())).toEqual([]);
        expect(apiGetServicesInstancesFilteredByType).toBeCalledWith(
            expect.arrayContaining(['TestInternal', 'internal'])
        );
        delete process.env.ABAPEnvServiceTypes;
    });
});
