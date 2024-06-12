import { V2CatalogService, createServiceForUrl } from '@sap-ux/axios-extension';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import type { AxiosResponse, AxiosError } from 'axios';
import { ErrorHandler } from '../../../../src/error-handler/error-handler';
import { initI18nOdataServiceInquirer, t } from '../../../../src/i18n';
import { validateService } from '../../../../src/prompts/datasources/service-url/validators'; // Import the validateService function from its module
import LoggerHelper from '../../../../src/prompts/logger-helper';
import { PromptState } from '../../../../src/utils';

/**
 * Workaround to allow spyOn
 */
jest.mock('@sap-ux/axios-extension', () => ({
    __esModule: true,
    ...jest.requireActual('@sap-ux/axios-extension')
}));

describe('Test service url validators', () => {
    const validMetadata =
        '<?xml version="1.0" encoding="utf-8"?><edmx:Edmx Version="1.0" xmlns:edmx="http://schemas.microsoft.com/ado/2007/06/edmx"></edmx:Edmx>';
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
        jest.restoreAllMocks();
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
        ).toMatch(t('prompts.validationMessages.metadataInvalid'));

        // Valid metadata
        jest.spyOn(odataService, 'metadata').mockResolvedValue(validMetadata);
        expect(
            await validateService(serviceUrl, {
                odataService,
                axiosConfig: {}
            })
        ).toBe(true);

        // Valid metadata with required version
        expect(await validateService(serviceUrl, { odataService, axiosConfig: {} }, OdataVersion.v4)).toBe(
            t('prompts.validationMessages.odataVersionMismatch', {
                requiredOdataVersion: OdataVersion.v4,
                providedOdataVersion: OdataVersion.v2
            })
        );
        expect(await validateService(serviceUrl, { odataService, axiosConfig: {} }, OdataVersion.v2)).toBe(true);
    });

    test('should set the prompt state', async () => {
        const serviceUrl = 'https://some.host:1234/service/path?sap-client=999';
        const odataService = createServiceForUrl(serviceUrl);
        jest.spyOn(odataService, 'metadata').mockResolvedValue(validMetadata);
        jest.spyOn(V2CatalogService.prototype, 'getAnnotations').mockResolvedValue([
            {
                Definitions: v2Annotations,
                TechnicalName: 'TEST_SERVICE',
                Version: '0001',
                Uri: 'https://some.host:1234/service/path'
            }
        ]);

        expect(
            await validateService(serviceUrl, {
                odataService,
                axiosConfig: {}
            })
        ).toBe(true);
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
            ]
        });
    });

    test('should catch errors and log if annotations are not available', async () => {
        const serviceUrl = 'https://some.host:1234/service/path?sap-client=999';
        const odataService = createServiceForUrl('https://some.host:1234/service/path?sap-client=999');
        jest.spyOn(odataService, 'metadata').mockResolvedValue(validMetadata);
        jest.spyOn(V2CatalogService.prototype, 'getAnnotations').mockResolvedValue([]);
        const loggerSpy = jest.spyOn(LoggerHelper.logger, 'info');

        expect(
            await validateService(serviceUrl, {
                odataService,
                axiosConfig: {}
            })
        ).toBe(true);
        expect(loggerSpy).toHaveBeenCalledWith(t('prompts.validationMessages.annotationsNotFound'));

        jest.spyOn(V2CatalogService.prototype, 'getAnnotations').mockRejectedValue(
            new Error('Annotations request failed')
        );
        expect(
            await validateService(serviceUrl, {
                odataService,
                axiosConfig: {}
            })
        ).toBe(true);
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
                axiosConfig: {}
            })
        ).toBe(t('errors.unknownError', { error: metadataRequestError.message }));
        expect(loggerSpy).toHaveBeenCalled();
        expect(PromptState.odataService.metadata).toBeUndefined();

        // Context specific error if 404
        const errorNotFound = newAxiosErrorWithStatus(404);
        jest.spyOn(odataService, 'metadata').mockRejectedValue(errorNotFound);
        expect(
            await validateService(serviceUrl, {
                odataService,
                axiosConfig: {}
            })
        ).toBe(t('errors.odataServiceUrlNotFound'));
    });
});
