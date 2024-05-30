import { OdataVersion } from '@sap-ux/odata-service-writer';
import type { ConnectionValidator } from './connectionValidator';
import type { ODataVersion } from '@sap-ux/axios-extension';
import { createForAbap } from '@sap-ux/axios-extension';
import { PromptState, removeOrigin } from '../../../utils';
import { MetadataFactory } from '@sap/wing-service-explorer';
import { ProtocolType } from '@sap/wing-service-explorer/dist/lib/metadata/metadataFactory';
import { t } from '../../../i18n';
import { SAP_CLIENT_KEY } from '../../../types';
import { errorHandler } from '../../prompt-helpers';
import LoggerHelper from '../../logger-helper';
import { ERROR_TYPE, ErrorHandler } from '../../../error-handler/error-handler';

/**
 * Validates that a service specified by the url, username and password is accessible, has the required version and returns valid metadata.
 *
 * @param url The full url of the service
 * @param requiredVersion if specified and the service odata version does not match this an error is returned
 * @param connectValidator a connection validator instance
 * @param ignoreCertError if true, some certificate errors are ignored
 * @returns true, false or an error message string
 */
export async function validateService(
    url: string,
    requiredVersion: OdataVersion | undefined,
    connectValidator: ConnectionValidator,
    ignoreCertError = false
): Promise<boolean | string> {
    if (connectValidator.validity.authenticated === true || connectValidator.validity.authRequired === false) {
        try {
            if (ignoreCertError === true) {
                connectValidator.setRejectUnauthorized(!ignoreCertError);
            }
            const metadata = await connectValidator.odataService.metadata();
            // The next loc throws an error if the edmx is invalid
            const explorer = MetadataFactory.getMetadataFactory().getMetadataExplorer(metadata);
            const serviceOdataVersion =
                explorer.getProtocolType() === ProtocolType.ODATAV2 ? OdataVersion.v2 : OdataVersion.v4;

            if (requiredVersion && requiredVersion !== serviceOdataVersion) {
                return `${t('errors.odataServiceVersionMismatch', {
                    serviceVersion: serviceOdataVersion,
                    requiredVersion
                })}`;
            }
            PromptState.odataService.metadata = removeOrigin(metadata);
            PromptState.odataService.odataVersion = serviceOdataVersion;

            const serviceAsUrl = new URL(url);
            const urlSearch = new URLSearchParams(serviceAsUrl.search);
            let sapClient;
            if (urlSearch.has(SAP_CLIENT_KEY)) {
                sapClient = urlSearch.get(SAP_CLIENT_KEY) ?? undefined;
                urlSearch.delete(SAP_CLIENT_KEY);
            }
            // Query params without sap-client
            const queryParams = urlSearch.toString() ? '?' + urlSearch.toString() : '';
            PromptState.odataService.servicePath = serviceAsUrl.pathname + queryParams;
            PromptState.odataService.origin = serviceAsUrl.origin;
            PromptState.odataService.sapClient = sapClient;

            // Best effort attempt to get annotations but dont throw an error if it fails as this may not even be an Abap system
            try {
                const abapProvider = createForAbap(connectValidator.axiosConfig);
                const catalogService = abapProvider.catalog(serviceOdataVersion as unknown as ODataVersion);
                LoggerHelper.attachAxiosLogger(catalogService.interceptors);
                LoggerHelper.logger.debug('Getting annotations for service');
                const annotations = await catalogService.getAnnotations({ path: serviceAsUrl.pathname }, false);
                LoggerHelper.logger.debug(`Annotations array of length: ${annotations?.length} returned`);
                PromptState.odataService.annotations = annotations;
            } catch (err) {
                LoggerHelper.logger.info(t('prompts.validationMessages.annotationsNotFound'));
            }
            return true;
        } catch (error) {
            delete PromptState.odataService.metadata;
            // Provide a more specific error message if the metadata service URL is not found
            if (ErrorHandler.getErrorType(error) === ERROR_TYPE.NOT_FOUND) {
                return ErrorHandler.getErrorMsgFromType(ERROR_TYPE.ODATA_URL_NOT_FOUND) ?? false;
            }
            return errorHandler.logErrorMsgs(error);
        } finally {
            connectValidator.setRejectUnauthorized(true);
        }
    }
    return false;
}
