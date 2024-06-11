import type { OdataVersion } from '@sap-ux/odata-service-writer';
import { ConnectionValidator } from './connectionValidator';
import type { AxiosRequestConfig, ODataService } from '@sap-ux/axios-extension';
import { createForAbap, type ODataVersion } from '@sap-ux/axios-extension';
import { PromptState, originToRelative, parseOdataVersion } from '../../../utils';
import { t } from '../../../i18n';
import { SAP_CLIENT_KEY } from '../../../types';
import { errorHandler } from '../../prompt-helpers';
import LoggerHelper from '../../logger-helper';
import { ERROR_TYPE, ErrorHandler } from '../../../error-handler/error-handler';

/**
 * Validates that a service specified by the odata service is accessible, has the required version and returns valid metadata.
 *
 * @param odataService the odata service instance to validate
 * @param requiredVersion if specified and the service odata version does not match this version, an error is returned
 * @param ignoreCertError if true some certificate errors are ignored
 * @returns true, false or an error message string
 */
export async function validateService(
    odataService: ODataService,
    requiredVersion: OdataVersion | undefined = undefined,
    ignoreCertError = false
): Promise<boolean | string> {
    try {
        if (ignoreCertError === true) {
            ConnectionValidator.setGlobalRejectUnauthorized(!ignoreCertError);
        }
        const metadata = await odataService.metadata();
        const serviceOdataVersion = parseOdataVersion(metadata);

        if (requiredVersion && requiredVersion !== serviceOdataVersion) {
            return `${t('errors.odataServiceVersionMismatch', {
                serviceVersion: serviceOdataVersion,
                requiredVersion
            })}`;
        }

        // Remove all occurrences of the origin from the metadata to make backend uris relative
        PromptState.odataService.metadata = originToRelative(metadata);
        PromptState.odataService.odataVersion = serviceOdataVersion;

        // Extract sap-client and keep the rest of the query params as part of the url
        const axiosRequesConfig = odataService.defaults as AxiosRequestConfig;
        const sapClient = removeQueryParam(SAP_CLIENT_KEY, axiosRequesConfig);
        const urlSearchParams = new URLSearchParams(axiosRequesConfig.params);
        const queryParams = urlSearchParams.toString() ? `?${urlSearchParams}` : '';
        const fullUrl = new URL(`${axiosRequesConfig.baseURL}${axiosRequesConfig.url ?? ''}${queryParams}`);

        PromptState.odataService.servicePath = fullUrl.pathname + queryParams;
        PromptState.odataService.origin = fullUrl.origin;
        PromptState.odataService.sapClient = sapClient;

        // Best effort attempt to get annotations but dont throw an error if it fails as this may not even be an Abap system
        try {
            // Create an abap provider instance to get the annotations using the same request config
            const abapProvider = createForAbap(axiosRequesConfig);
            const catalogService = abapProvider.catalog(serviceOdataVersion as unknown as ODataVersion);
            LoggerHelper.attachAxiosLogger(catalogService.interceptors);
            LoggerHelper.logger.debug('Getting annotations for service');
            const annotations = await catalogService.getAnnotations({ path: axiosRequesConfig.url });
            LoggerHelper.logger.debug(`Annotations array of length: ${annotations?.length} returned`);
            if (annotations?.length === 0 || !annotations) {
                LoggerHelper.logger.info(t('prompts.validationMessages.annotationsNotFound'));
            }
            PromptState.odataService.annotations = annotations;
        } catch (err) {
            LoggerHelper.logger.info(t('prompts.validationMessages.annotationsNotFound'));
        }
        return true;
    } catch (error) {
        delete PromptState.odataService.metadata;
        // Provide a more specific error message if the metadata service URL is not found
        if (ErrorHandler.getErrorType(error) === ERROR_TYPE.NOT_FOUND) {
            // No metdata implies not a valid odata service
            return ErrorHandler.getErrorMsgFromType(ERROR_TYPE.ODATA_URL_NOT_FOUND) ?? false;
        }
        return errorHandler.logErrorMsgs(error);
    } finally {
        ConnectionValidator.setGlobalRejectUnauthorized(true);
    }
}

/**
 * Remove specified param from the query params and return the value.
 * The passed axiosConfig params object is modified.
 *
 * @param paramKey the key of the param to remove from the specified axiosConfig params property
 * @param axiosConfig the axios request config containing the params to modify
 * @returns the value of the removed param, the axiosConfig params object is also modified
 */
function removeQueryParam(paramKey: string, axiosConfig: AxiosRequestConfig): string {
    let paramValue;
    if (axiosConfig.params) {
        // Axios config params may be a URLSearchParams object or a plain object
        if (axiosConfig.params instanceof URLSearchParams) {
            paramValue = axiosConfig.params.get(paramKey) ?? undefined;
            axiosConfig.params.delete(paramKey);
        } else {
            paramValue = axiosConfig.params[paramKey] ?? undefined;
            delete axiosConfig.params[paramKey];
        }
    }
    return paramValue;
}
