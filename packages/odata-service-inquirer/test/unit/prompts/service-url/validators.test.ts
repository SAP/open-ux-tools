import type { Annotations } from '@sap-ux/axios-extension';
import { AbapServiceProvider, V2CatalogService, createServiceForUrl } from '@sap-ux/axios-extension';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import type { AxiosError, AxiosResponse } from 'axios';
import { ErrorHandler } from '@sap-ux/inquirer-common';
import { initI18nOdataServiceInquirer, t } from '../../../../src/i18n';
import { validateService } from '../../../../src/prompts/datasources/service-url/validators'; // Import the validateService function from its module
import LoggerHelper from '../../../../src/prompts/logger-helper';
import { PromptState } from '../../../../src/utils';

let mockAnnotations: Annotations[] = [];
const catalogServiceMock = jest.fn().mockImplementation(() => ({
    getAnnotations: jest.fn().mockResolvedValue(mockAnnotations),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } }
}));

jest.mock('@sap-ux/axios-extension', () => ({
    __esModule: true,
    ...jest.requireActual('@sap-ux/axios-extension'),
    AbapServiceProvider: jest.fn().mockImplementation(() => ({
        catalog: catalogServiceMock
    })),
    createForAbap: jest.fn().mockImplementation(() => new AbapServiceProvider())
}));

describe('Test service url validators', () => {
    const validMetadata =
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

    const newAxiosErrorWithStatus = (status: number | string): AxiosError => {
        const e = new Error() as AxiosError;
        e.response = { status } as AxiosResponse;
        e.isAxiosError = true;
        return e;
    };

    beforeAll(async () => {
        // Pre-load i18 texts
        await initI18nOdataServiceInquirer();
    });

    beforeEach(() => {
        jest.restoreAllMocks();
        mockAnnotations = [];
    });

    test('should validate service metadata', async () => {
        // Invalid metadata
        const invalidMetadata = '<METADATA>';
        const serviceUrl = 'https://some.host:1234/service/path';
        const odataService = createServiceForUrl(serviceUrl);
        jest.spyOn(odataService, 'metadata').mockResolvedValueOnce(invalidMetadata);

        expect(
            await validateService(serviceUrl, {
                odataService,
                axiosConfig: {}
            })
        ).toMatchObject({ validationResult: t('prompts.validationMessages.metadataInvalid') });

        // Valid metadata
        jest.spyOn(odataService, 'metadata').mockResolvedValue(validMetadata);
        const validationResult = await validateService(serviceUrl, {
            odataService,
            axiosConfig: {}
        });
        expect(validationResult).toMatchObject({ validationResult: true });
        expect(catalogServiceMock).toHaveBeenCalledWith(OdataVersion.v2);

        // Valid metadata with required version
        expect(await validateService(serviceUrl, { odataService, axiosConfig: {} }, OdataVersion.v4)).toEqual({
            validationResult: t('prompts.validationMessages.odataVersionMismatch', {
                requiredOdataVersion: OdataVersion.v4,
                providedOdataVersion: OdataVersion.v2
            })
        });
        expect(await validateService(serviceUrl, { odataService, axiosConfig: {} }, OdataVersion.v2)).toMatchObject({
            validationResult: true
        });
    });

    test('should set the prompt state', async () => {
        const serviceUrl = 'https://some.host:1234/service/path?sap-client=999';
        const odataService = createServiceForUrl(serviceUrl);
        jest.spyOn(odataService, 'metadata').mockResolvedValue(validMetadata);
        mockAnnotations = [
            {
                Definitions: v2Annotations,
                TechnicalName: 'TEST_SERVICE',
                Version: '0001',
                Uri: 'https://some.host:1234/service/path'
            }
        ];

        expect(
            await validateService(serviceUrl, {
                odataService,
                'axiosConfig': {}
            })
        ).toMatchObject({ validationResult: true });
        expect(PromptState.odataService).toEqual({
            metadata: validMetadata,
            odataVersion: '2',
            origin: 'https://some.host:1234',
            sapClient: '999',
            servicePath: '/service/path',
            annotations: [
                {
                    Definitions: v2Annotations,
                    TechnicalName: 'TEST_SERVICE',
                    Version: '0001',
                    Uri: 'https://some.host:1234/service/path'
                }
            ],
            ignoreCertError: false
        });
    });

    test('should catch errors, log and return state if annotations are not available', async () => {
        const serviceUrl = 'https://some.host:1234/service/path?sap-client=999';
        const odataService = createServiceForUrl('https://some.host:1234/service/path?sap-client=999');
        jest.spyOn(odataService, 'metadata').mockResolvedValue(validMetadata);
        const loggerSpy = jest.spyOn(LoggerHelper.logger, 'info');

        expect(
            await validateService(serviceUrl, {
                odataService,
                'axiosConfig': {}
            })
        ).toMatchObject({ validationResult: true });
        expect(loggerSpy).toHaveBeenCalledWith(t('prompts.validationMessages.annotationsNotFound'));

        jest.spyOn(V2CatalogService.prototype, 'getAnnotations').mockRejectedValue(
            new Error('Annotations request failed')
        );
        expect(
            await validateService(serviceUrl, {
                odataService,
                'axiosConfig': {}
            })
        ).toMatchObject({ validationResult: true, showAnnotationWarning: true });
        expect(loggerSpy).toHaveBeenCalledWith(t('prompts.validationMessages.annotationsNotFound'));
    });

    test('should reset prompt state and log if an error occurs', async () => {
        const serviceUrl = 'https://some.host:1234/service/path?sap-client=999';
        const odataService = createServiceForUrl('https://some.host:1234/service/path?sap-client=999');
        const metadataRequestError = new Error('Metadata request failed');
        jest.spyOn(odataService, 'metadata').mockRejectedValue(metadataRequestError);
        const loggerSpy = jest.spyOn(ErrorHandler.logger, 'error');

        expect(
            await validateService(serviceUrl, {
                odataService,
                'axiosConfig': {}
            })
        ).toMatchObject({ validationResult: t('errors.unknownError', { error: metadataRequestError.message }) });
        expect(loggerSpy).toHaveBeenCalled();
        expect(PromptState.odataService.metadata).toBeUndefined();

        // Context specific error if 404
        const errorNotFound = newAxiosErrorWithStatus(404);
        jest.spyOn(odataService, 'metadata').mockRejectedValue(errorNotFound);
        expect(
            await validateService(serviceUrl, {
                odataService,
                'axiosConfig': {}
            })
        ).toMatchObject({
            validationResult:
                'The service URL you have provided is not a valid OData Service. SAP Fiori applications require an OData service as the data source.'
        });
    });

    test('should return converted metadata', async () => {
        const serviceUrl = 'https://some.host:1234/service/path?sap-client=999';
        const odataService = createServiceForUrl('https://some.host:1234/service/path?sap-client=999');
        jest.spyOn(odataService, 'metadata').mockResolvedValue(validMetadata);

        expect(
            await validateService(serviceUrl, {
                odataService,
                'axiosConfig': {}
            })
        ).toMatchObject({ convertedMetadata: expect.objectContaining({ version: '1.0' }) });
    });
});
