import { Severity } from '@sap-devx/yeoman-ui-types';
import { type ODataServiceInfo, ODataVersion, ServiceType, type V2CatalogService } from '@sap-ux/axios-extension';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import type { ConvertedMetadata } from '@sap-ux/vocabularies-types';
import { initI18nOdataServiceInquirer, t } from '../../../../../src/i18n';
import type { ConnectionValidator } from '../../../../../src/prompts/connectionValidator';
import { getSelectedServiceMessage } from '../../../../../src/prompts/datasources/sap-system/service-selection/service-helper';
import type { ServiceAnswer } from '../../../../../src/prompts/datasources/sap-system/service-selection/types';
import * as sharedServiceHelpers from '../../../../../src/prompts/datasources/service-helpers/service-helpers';

const serviceV2a = {
    id: 'ZTRAVEL_DESK_SRV_0002',
    serviceVersion: '2',
    serviceType: 'Not Classified',
    name: 'ZTRAVEL_DESK_SRV',
    path: '/sap/opu/odata/sap/ZTRAVEL_DESK_SRV_0002',
    odataVersion: ODataVersion.v2
} as ODataServiceInfo;

const v2ServiceTypeNotDetermined = { ...serviceV2a, serviceType: ServiceType.NotDetermined };
const catalogs = {
    [ODataVersion.v2]: {
        listServices: jest.fn().mockResolvedValue([v2ServiceTypeNotDetermined]),
        getServiceType: jest.fn().mockResolvedValue(ServiceType.UI)
    } as Partial<V2CatalogService> | undefined
};

const connectionValidatorMock = {
    catalogs
};

const serviceAnswerV2: ServiceAnswer = {
    serviceODataVersion: ODataVersion.v2,
    servicePath: '/sap/opu/odata/sap/ZTRAVEL_DESK_SRV_0002',
    serviceType: 'Not Classified',
    toString: expect.any(Function)
};

const serviceAnswerV4: ServiceAnswer = {
    serviceODataVersion: ODataVersion.v4,
    servicePath: '/sap/opu/odata4/dmo/flight/0001/?sap-client=000',
    serviceType: 'WEB_API',
    toString: expect.any(Function)
};

const serviceChoices = [
    {
        name: 'DMO_GRP > /DMO/FLIGHT (0001) - OData V4',
        value: serviceAnswerV4
    },
    {
        name: 'ZTRAVEL_DESK_SRV (2) - OData V2',
        value: serviceAnswerV2
    }
];

jest.mock('../../../../../src/prompts/connectionValidator', () => {
    return {
        ConnectionValidator: jest.fn().mockImplementation(() => connectionValidatorMock)
    };
});

describe('Test service-helper function `getSelectedServiceMessage`', () => {
    // Note: there is some test overlap with the `questions.test.ts` which are more focused on integration between prompt functions.
    // This is additionally needed to test uncovered branches in the `getSelectedServiceMessage` function.

    beforeAll(async () => {
        await initI18nOdataServiceInquirer();
    });

    test('should return warning if no service choices', async () => {
        const serviceMsgResult = await getSelectedServiceMessage(
            [],
            undefined!,
            connectionValidatorMock as ConnectionValidator,
            {}
        );
        expect(serviceMsgResult).toEqual({
            message: t('prompts.warnings.noServicesAvailable'),
            severity: Severity.warning
        });
    });

    test('should return warning if required odata version is not matching', async () => {
        const serviceMsgResult = await getSelectedServiceMessage(
            [],
            undefined!,
            connectionValidatorMock as ConnectionValidator,
            {
                requiredOdataVersion: OdataVersion.v4
            }
        );
        expect(serviceMsgResult).toEqual({
            message: t('prompts.warnings.noServicesAvailableForOdataVersion', {
                odataVersion: OdataVersion.v4
            }),
            severity: Severity.warning
        });
    });

    test('should return warning if backend annotations are not available', async () => {
        const serviceMsgResult = await getSelectedServiceMessage(
            serviceChoices,
            serviceAnswerV2,
            connectionValidatorMock as ConnectionValidator,
            {
                hasAnnotations: false
            }
        );
        expect(serviceMsgResult).toEqual({
            message: t('prompts.warnings.noAnnotations'),
            severity: Severity.warning
        });
    });

    test('should return warning if service type is not `UI`', async () => {
        const serviceMsgResult = await getSelectedServiceMessage(
            serviceChoices,
            serviceAnswerV2,
            connectionValidatorMock as ConnectionValidator,
            {
                hasAnnotations: true
            }
        );
        expect(serviceMsgResult).toEqual({
            message: t('prompts.warnings.nonUIServiceTypeWarningMessage', { serviceType: 'A2X' }),
            severity: Severity.warning
        });
    });

    test('should return warning if collaborative draft is not enabled', async () => {
        jest.spyOn(sharedServiceHelpers, 'showCollabDraftWarning').mockReturnValue(true);
        const serviceMsgResult = await getSelectedServiceMessage(
            serviceChoices,
            serviceAnswerV4,
            connectionValidatorMock as ConnectionValidator,
            {
                showCollabDraftWarnOptions: {
                    showCollabDraftWarning: true,
                    edmx: { version: '4.0' } as ConvertedMetadata
                }
            }
        );
        expect(serviceMsgResult).toEqual({
            message: t('prompts.warnings.collaborativeDraftMessage'),
            severity: Severity.warning
        });
    });
});
