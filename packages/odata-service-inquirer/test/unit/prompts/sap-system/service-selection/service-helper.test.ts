import { Severity } from '@sap-devx/yeoman-ui-types';
import {
    type Annotations,
    type ODataServiceInfo,
    ODataVersion,
    type ServiceProvider,
    ServiceType,
    type V2CatalogService
} from '@sap-ux/axios-extension';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import type { ConvertedMetadata } from '@sap-ux/vocabularies-types';
import { initI18nOdataServiceInquirer, t } from '../../../../../src/i18n';
import type { ConnectionValidator } from '../../../../../src/prompts/connectionValidator';
import {
    getSelectedServiceMessage,
    validateService
} from '../../../../../src/prompts/datasources/sap-system/service-selection/service-helper';
import type { ServiceAnswer } from '../../../../../src/prompts/datasources/sap-system/service-selection/types';
import * as sharedServiceHelpers from '../../../../../src/prompts/datasources/service-helpers/service-helpers';
import { PromptState } from '../../../../../src/utils';
import { errorHandler } from '../../../../../src/prompts/prompt-helpers';

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

let catalogServiceMock = {};
jest.mock('@sap-ux/axios-extension', () => {
    return {
        ...jest.requireActual('@sap-ux/axios-extension'),
        createForAbap: jest.fn().mockImplementation(() => ({
            catalog: jest.fn().mockImplementation(() => catalogServiceMock)
        }))
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
            message: t('warnings.noServicesAvailable'),
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
            message: t('warnings.noServicesAvailableForOdataVersion', {
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
            message: t('warnings.noAnnotations'),
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
            message: t('warnings.nonUIServiceTypeWarningMessage', { serviceType: 'A2X' }),
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
            message: t('warnings.collaborativeDraftMessage'),
            severity: Severity.warning
        });
    });

    test('should return info if some catalog requests failed', async () => {
        jest.spyOn(errorHandler, 'getErrorMsg').mockReturnValue('A catalog error occurred.');
        const serviceMsgResult = await getSelectedServiceMessage(
            [
                {
                    name: 'DMO_GRP > /DMO/FLIGHT (0001) - OData V2'
                }
            ],
            undefined,
            connectionValidatorMock as ConnectionValidator,
            {}
        );
        expect(serviceMsgResult).toEqual({
            message: `A catalog error occurred. ${t('texts.seeLogForDetails')}`,
            severity: Severity.information
        });
    });

    test('should return warning if a service filter was specified and the service is not found', async () => {
        let serviceMsgResult = await getSelectedServiceMessage(
            [],
            undefined!,
            connectionValidatorMock as ConnectionValidator,
            {
                serviceFilter: ['/sap/odata4/service/sales']
            }
        );
        expect(serviceMsgResult).toEqual({
            message: t('warnings.specifiedServicesNotAvailable_one', { service: '/sap/odata4/service/sales' }),
            severity: Severity.warning
        });

        // Service filter and required odata version specified
        serviceMsgResult = await getSelectedServiceMessage(
            [],
            undefined!,
            connectionValidatorMock as ConnectionValidator,
            {
                serviceFilter: ['/sap/odata4/service/sales'],
                requiredOdataVersion: OdataVersion.v4
            }
        );
        expect(serviceMsgResult).toEqual({
            message: t('warnings.specifiedServicesNotAvailable_one', {
                service: '/sap/odata4/service/sales',
                odataVersion: 'V4 '
            }),
            severity: Severity.warning
        });

        // Multiple services specified
        serviceMsgResult = await getSelectedServiceMessage(
            [],
            undefined!,
            connectionValidatorMock as ConnectionValidator,
            {
                serviceFilter: ['/sap/odata4/service/sales', '/sap/odata4/service/purchases']
            }
        );
        expect(serviceMsgResult).toEqual({
            message: t('warnings.specifiedServicesNotAvailable_other', { service: '/sap/odata4/service/sales' }),
            severity: Severity.warning
        });

        // Service filter and required odata version specified
        serviceMsgResult = await getSelectedServiceMessage(
            [],
            undefined!,
            connectionValidatorMock as ConnectionValidator,
            {
                serviceFilter: ['/sap/odata4/service/sales', '/sap/odata4/service/purchases'],
                requiredOdataVersion: OdataVersion.v4
            }
        );
        expect(serviceMsgResult).toEqual({
            message: t('warnings.specifiedServicesNotAvailable_other', {
                service: '/sap/odata4/service/sales',
                odataVersion: 'V4 '
            }),
            severity: Severity.warning
        });
    });
});

describe('Test service-helper function `validateService`', () => {
    const v2Metadata =
        '<?xml version="1.0" encoding="utf-8"?><edmx:Edmx Version="1.0" xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx">' +
        '<edmx:DataServices m:DataServiceVersion="2.0">' +
        '<Schema xmlns="http://schemas.microsoft.com/ado/2008/09/edm" Namespace="SEPMRA_PROD_MAN" xml:lang="en" sap:schema-version="1">' +
        '<EntityContainer Name="SEPMRA_PROD_MAN_Entities" m:IsDefaultEntityContainer="true" sap:supported-formats="atom json xlsx">' +
        '</EntityContainer>' +
        '</Schema>' +
        '</edmx:DataServices></edmx:Edmx>';

    const v2Annotations = `<?xml version="1.0" encoding="utf-8"?>
        <edmx:Edmx Version="1.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
            <edmx:Reference Uri="../../catalogservice;v=2/Vocabularies(TechnicalName=\'%2FIWBEP%2FVOC_COMMON\',Version=\'0001\',SAP__Origin=\'\')/$value">
                <edmx:Include Namespace="com.sap.vocabularies.Common.v1" Alias="Common"/>
            </edmx:Reference>
        </edmx:Edmx>`;

    beforeAll(async () => {
        await initI18nOdataServiceInquirer();
    });

    test('Should get metadata and annotations for v2 services when using partial/full url destinations', async () => {
        /**
         * Partial/full URL destinations wont have a catalog defined in the connection validator.
         * This test is to replicate that scenario.
         */
        const serviceAnswer = {
            servicePath: '/sap/opu/odata/sap/ZTRAVEL_DESK_SRV_0002'
        } as ServiceAnswer;

        const connectionValidatorMockNoCatalogs = {
            axiosConfig: {
                auth: {
                    username: 'anzeiger',
                    password: 'display'
                },
                baseURL: 'https://uia_partial_url_host_only.dest',
                url: '/sap/opu/odata/bobf/SB_TRAVEL_DESK/'
            },
            serviceProvider: {} as ServiceProvider,
            odataService: {
                metadata: jest.fn().mockResolvedValue(v2Metadata)
            }
        } as unknown as ConnectionValidator;

        let validateServiceResult = await validateService(serviceAnswer, connectionValidatorMockNoCatalogs);
        expect(validateServiceResult.hasAnnotations).toBe(false);

        const mockAnnotations: Annotations[] = [
            {
                TechnicalName: 'SomeAnnotations',
                Version: ODataVersion.v2,
                Uri: 'https://annotations.url',
                Definitions: v2Annotations
            }
        ];
        catalogServiceMock = {
            getAnnotations: jest.fn().mockResolvedValue(mockAnnotations),
            interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } }
        };

        validateServiceResult = await validateService(serviceAnswer, connectionValidatorMockNoCatalogs);
        expect(PromptState.odataService.annotations).toBe(mockAnnotations);
    });

    test('Should return error message with HTTP status when metadata request fails with response status', async () => {
        const serviceAnswer = {
            servicePath: '/sap/opu/odata/sap/ZTRAVEL_DESK_SRV_0002',
            serviceODataVersion: ODataVersion.v2
        } as ServiceAnswer;

        const errorWithStatus = {
            response: {
                status: 404
            },
            message: 'Not Found'
        };

        const connectionValidatorWithError = {
            axiosConfig: {},
            serviceProvider: {} as ServiceProvider,
            odataService: {
                metadata: jest.fn().mockRejectedValue(errorWithStatus)
            },
            catalogs: {}
        } as unknown as ConnectionValidator;

        const validateServiceResult = await validateService(serviceAnswer, connectionValidatorWithError);
        expect(validateServiceResult.validationResult).toContain('HTTP Status 404');
        expect(validateServiceResult.validationResult).toContain(serviceAnswer.servicePath);
        expect(validateServiceResult.validationResult).toContain('For more information, view the logs');
    });

    test('Should return error message with HTTP status when metadata request fails with direct status', async () => {
        const serviceAnswer = {
            servicePath: '/sap/opu/odata/sap/TEST_SRV',
            serviceODataVersion: ODataVersion.v2
        } as ServiceAnswer;

        const errorWithDirectStatus = {
            status: 401,
            message: 'Unauthorized'
        };

        const connectionValidatorWithError = {
            axiosConfig: {},
            serviceProvider: {} as ServiceProvider,
            odataService: {
                metadata: jest.fn().mockRejectedValue(errorWithDirectStatus)
            },
            catalogs: {}
        } as unknown as ConnectionValidator;

        const validateServiceResult = await validateService(serviceAnswer, connectionValidatorWithError);
        expect(validateServiceResult.validationResult).toContain('HTTP Status 401');
    });

    test('Should return error message with error code when metadata request fails with code', async () => {
        const serviceAnswer = {
            servicePath: '/sap/opu/odata/sap/TEST_SRV',
            serviceODataVersion: ODataVersion.v2
        } as ServiceAnswer;

        const errorWithCode = {
            code: 'ECONNREFUSED',
            message: 'Connection refused'
        };

        const connectionValidatorWithError = {
            axiosConfig: {},
            serviceProvider: {} as ServiceProvider,
            odataService: {
                metadata: jest.fn().mockRejectedValue(errorWithCode)
            },
            catalogs: {}
        } as unknown as ConnectionValidator;

        const validateServiceResult = await validateService(serviceAnswer, connectionValidatorWithError);
        expect(validateServiceResult.validationResult).toContain('ECONNREFUSED');
        expect(validateServiceResult.validationResult).toContain(serviceAnswer.servicePath);
    });

    test('Should return error message without error info when no status or code is available', async () => {
        const serviceAnswer = {
            servicePath: '/sap/opu/odata/sap/TEST_SRV',
            serviceODataVersion: ODataVersion.v2
        } as ServiceAnswer;

        const genericError = new Error('Some generic error');

        const connectionValidatorWithError = {
            axiosConfig: {},
            serviceProvider: {} as ServiceProvider,
            odataService: {
                metadata: jest.fn().mockRejectedValue(genericError)
            },
            catalogs: {}
        } as unknown as ConnectionValidator;

        const validateServiceResult = await validateService(serviceAnswer, connectionValidatorWithError);
        expect(validateServiceResult.validationResult).toContain(serviceAnswer.servicePath);
        expect(validateServiceResult.validationResult).not.toContain('HTTP Status');
        expect(validateServiceResult.validationResult).not.toContain('ECONNREFUSED');
        expect(validateServiceResult.validationResult).toContain('For more information, view the logs');
    });
});
