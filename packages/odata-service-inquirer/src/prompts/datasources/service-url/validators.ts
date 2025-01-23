import { createForAbap, type AxiosRequestConfig, type ODataService, type ODataVersion } from '@sap-ux/axios-extension';
import { ERROR_TYPE, ErrorHandler } from '@sap-ux/inquirer-common';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import { t } from '../../../i18n';
import { SAP_CLIENT_KEY } from '../../../types';
import { PromptState, originToRelative } from '../../../utils';
import { ConnectionValidator } from '../../connectionValidator';
import LoggerHelper from '../../logger-helper';
import { errorHandler } from '../../prompt-helpers';
import { validateODataVersion } from '../../validators';


export type ValidateServiceUrlResult = {
    validationResult: boolean | string;
    showAnnotationWarning?: boolean;
}
/**
 * Validates that a service specified by the service url is accessible, has the required version and returns valid metadata.
 * Retrieves annotations (from Abap backends) if available and stores them in the PromptState.
 *
 * @param url the full odata service url including query parameters
 * @param connectionConfig the connection configuration to use for the validation, a subset of the ConnectionValidator properties
 * @param connectionConfig.odataService the odata service instance used to retrieve the metadata (as used by ConnectionValidator)
 * @param connectionConfig.axiosConfig the axios config to use for the annotations request (as used by ConnectionValidator)
 * @param requiredVersion if specified and the service odata version does not match this version, an error is returned
 * @param ignoreCertError if true some certificate errors are ignored
 * @returns true if a valid odata service was returned, false or an error message string otherwise
 */
export async function validateService(
    url: string,
    { odataService, axiosConfig }: { odataService: ODataService; axiosConfig: AxiosRequestConfig },
    requiredVersion: OdataVersion | undefined = undefined,
    ignoreCertError = false
): Promise<ValidateServiceUrlResult> {
    try {
        if (ignoreCertError === true) {
            ConnectionValidator.setGlobalRejectUnauthorized(!ignoreCertError);
        }
        const metadata = await odataService.metadata();
        const odataVersionValResult = validateODataVersion(metadata, requiredVersion);
        if (odataVersionValResult.validationMsg) {
            return { 
                validationResult: odataVersionValResult.validationMsg
            };
        }
        const serviceOdataVersion = odataVersionValResult.version;

        // Remove all occurrences of the origin from the metadata to make backend uris relative
        PromptState.odataService.metadata = originToRelative(metadata);
        PromptState.odataService.odataVersion = serviceOdataVersion;

        // Extract sap-client and keep the rest of the query params as part of the url
        const fullUrl = new URL(url);
        const sapClient = fullUrl.searchParams.get(SAP_CLIENT_KEY) ?? undefined;
        fullUrl.searchParams.delete(SAP_CLIENT_KEY);

        PromptState.odataService.servicePath = `${fullUrl.pathname}${fullUrl.search}`;
        PromptState.odataService.origin = fullUrl.origin;
        PromptState.odataService.sapClient = sapClient;

        let showAnnotationWarning = false;

        // Best effort attempt to get annotations but dont throw an error if it fails as this may not even be an Abap system
        try {
            // Create an abap provider instance to get the annotations using the same request config
            const abapProvider = createForAbap(axiosConfig);
            const catalogService = abapProvider.catalog(serviceOdataVersion as unknown as ODataVersion);
            LoggerHelper.attachAxiosLogger(catalogService.interceptors);
            LoggerHelper.logger.debug('Getting annotations for service');
            const annotations = await catalogService.getAnnotations({ path: fullUrl.pathname });
            LoggerHelper.logger.debug(`Annotations array of length: ${annotations?.length} returned`);

            if (annotations?.length === 0 || !annotations) {
                LoggerHelper.logger.info(t('prompts.validationMessages.annotationsNotFound'));
                // Only show the warning if the service is v2, since these are backend annotations
                showAnnotationWarning = odataVersionValResult.version === OdataVersion.v2;
            }
            PromptState.odataService.annotations = annotations;
        } catch (err) {
            LoggerHelper.logger.info(t('prompts.validationMessages.annotationsNotFound'));
            // Only show the warning if the service is v2, since these are backend annotations
            showAnnotationWarning = odataVersionValResult.version === OdataVersion.v2;
        }
        return {
            validationResult: true,
            showAnnotationWarning
        };
    } catch (error) {
        delete PromptState.odataService.metadata;
        // Provide a more specific error message if the metadata service URL is not found
        if (ErrorHandler.getErrorType(error) === ERROR_TYPE.NOT_FOUND) {
            // No metadata implies not a valid odata service
            return { 
                validationResult: ErrorHandler.getErrorMsgFromType(ERROR_TYPE.ODATA_URL_NOT_FOUND) ?? false
            }
        }
        return { 
            validationResult: errorHandler.logErrorMsgs(error)
        }
    } finally {
        ConnectionValidator.setGlobalRejectUnauthorized(true);
    }
}
