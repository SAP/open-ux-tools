import { type IMessageSeverity, Severity } from '@sap-devx/yeoman-ui-types';
import {
    type Annotations,
    type CatalogService,
    type ODataService,
    type ODataServiceInfo,
    ODataVersion,
    ServiceType,
    V2CatalogService
} from '@sap-ux/axios-extension';
import type { Destination } from '@sap-ux/btp-utils';
import { TelemetryHelper } from '@sap-ux/fiori-generator-shared';
import { getTelemPropertyDestinationType, sendTelemetryEvent } from '@sap-ux/inquirer-common';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import type { ListChoiceOptions } from 'inquirer';
import { t } from '../../../../i18n';
import { PromptState } from '../../../../utils';
import type { ConnectionValidator } from '../../../connectionValidator';
import LoggerHelper from '../../../logger-helper';
import { errorHandler } from '../../../prompt-helpers';
import { validateODataVersion } from '../../../validators';
import type { ServiceAnswer } from './types';

// Service ids continaining these paths should not be offered as UI compatible services
const nonUIServicePaths = ['/IWBEP/COMMON/'];
// Telemetry event name for successful service validation on BAS, note: legacy event names should not be changed
export const telemEventBASServiceSuccess = 'SERVICE_INQUIRER_BAS_SUCCESS';
/**
 * Builds and formats the service choices list.
 *
 * @param serviceInfos service information to build the choices from. Services with a service id containing '/IWBEP/COMMON' are ignored.
 * @returns service choices list
 */
const createServiceChoices = (serviceInfos?: ODataServiceInfo[]): ListChoiceOptions<ServiceAnswer>[] => {
    const choices: ListChoiceOptions<ServiceAnswer>[] = [];
    // Provide additional service information in trace mode (YUI only)
    let isLogTrace = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Only specific loggers have this method
    if (typeof (LoggerHelper.logger as any).getLogLevel === 'function') {
        isLogTrace = (LoggerHelper.logger as any).getLogLevel() === 'trace';
    }

    serviceInfos
        // Exclude non-UI compatible services
        ?.filter((service) => !nonUIServicePaths.some((path) => service.path.includes(path)))
        .forEach((service) => {
            let serviceName = service.name;
            const servicePath = service.path;

            serviceName = `${serviceName} (${service.serviceVersion}) - OData V${service.odataVersion}`;

            if (isLogTrace) {
                serviceName = `${serviceName} Service Type: ${service.serviceType}`;
            }

            choices.push({
                name: serviceName,
                value: {
                    servicePath,
                    serviceODataVersion: service.odataVersion,
                    toString: () => serviceName,
                    serviceType: service.serviceType
                }
            }) as ListChoiceOptions<ServiceAnswer>;
        });
    return choices.sort((a, b) => (a.name ? a.name.localeCompare(b.name ?? '') : 0));
};

/**
 * Logs the catalog request errors using the error handler.
 *
 * @param requestErrors catalog request errors, keyed by the OData version of the catalog service, with the error, status code number or error message as the value
 * @param numOfRequests the number of catalog service requests made
 */
function logServiceCatalogErrorsForHelp(
    requestErrors: Record<ODataVersion, Error | number | string> | {},
    numOfRequests: number
): void {
    const catalogRequesErrors = Object.values(requestErrors);
    catalogRequesErrors.forEach((error) => {
        errorHandler.logErrorMsgs(error); // Log and process the error -> error type
    });
    // If all requests failed, log a generic message, this will be stored in the error handler
    if (numOfRequests === catalogRequesErrors.length) {
        errorHandler.logErrorMsgs(
            t('errors.allCatalogServiceRequestsFailed', { version: Object.keys(requestErrors).join(', ') })
        );
    }
}

/**
 * Refines the error type and logs based on the specified options. This should log more precise error messages based on inputs
 * and the platform making the call i.e. VSC | SBAS. Errors are mapped to GA links if the platform is SBAS.
 *
 * @param options Options
 * @param options.system - sap system used
 * @param options.catRequestErrorTypes - all catalog service request error types, used to do further root cause analysis
 * @param options.rootCauseErrorType - the error type as determined by the caller, will be used if a more precise error type cannot be determined by rca
 * @param options.logMsg - the log message that will be used if a better root cause is not determined
 * @param options.error - the original error, used to determine the error log message if otherwise not determined
 * @param option.reqVersion - specific odata version that is required by the template
 */

/**
 * Get the service choices from the specified catalogs.
 *
 * @param catalogs catalogs to get the services from. There should be one per odata version required.
 * @returns service choices based on the provided catalogs
 */
export async function getServiceChoices(catalogs: CatalogService[]): Promise<ListChoiceOptions<ServiceAnswer>[]> {
    const requestErrors: Record<ODataVersion, unknown> | {} = {};
    const listServicesRequests = catalogs.map(async (catalog) => {
        try {
            return await catalog.listServices();
        } catch (error) {
            LoggerHelper.logger.error(
                t('errors.serviceCatalogRequest', {
                    catalogRequestUri: catalog.getUri(),
                    entitySet: catalog.entitySet,
                    error
                })
            );
            // Save any errors for processing later as we may show more useful message to the user
            Object.assign(requestErrors, {
                [catalog instanceof V2CatalogService ? ODataVersion.v2 : ODataVersion.v4]: error
            });
            return [];
        }
    });
    const serviceInfos: ODataServiceInfo[][] = await Promise.all(listServicesRequests);
    const flatServices = serviceInfos?.flat() ?? [];
    LoggerHelper.logger.debug(`Number of services available: ${flatServices.length}`);

    if (flatServices.length === 0) {
        logServiceCatalogErrorsForHelp(requestErrors, catalogs.length);
    }

    return createServiceChoices(flatServices);
}

/**
 * Generates a telemetry event for successfully listing service(s) using a destination.
 *
 * @param destination the destination used to list the service(s)
 */
export function sendDestinationServiceSuccessTelemetryEvent(destination: Destination): void {
    // May return undefined if the same event was already sent within some time frame
    const telemetryData =
        TelemetryHelper.createTelemetryData({
            destODataType: getTelemPropertyDestinationType(destination)
        }) ?? {};
    sendTelemetryEvent(telemEventBASServiceSuccess, telemetryData);
}

/**
 * Gets the service metadata and annotations for the specified service path.
 *
 * @param servicePath service path
 * @param odataService the odata service used to get the metadata for the specified service path
 * @param catalog the catalog service used to get the annotations for the specified service path
 * @returns Promise<string | boolean>, string error message or true if successful
 */
async function getServiceMetadata(
    servicePath: string,
    odataService: ODataService,
    catalog?: CatalogService
): Promise<{ annotations: Annotations[]; metadata: string } | string> {
    let annotations: Annotations[] = [];
    try {
        if (catalog) {
            try {
                annotations = await catalog.getAnnotations({ path: servicePath });
            } catch {
                LoggerHelper.logger.info(t('prompts.validationMessages.noAnnotations'));
            }
        }

        const metadata = await odataService.metadata();
        return {
            annotations,
            metadata
        };
    } catch (error) {
        LoggerHelper.logger.error(t('errors.serviceMetadataErrorLog', { servicePath, error }));
        return t('errors.serviceMetadataErrorUI', { servicePath });
    }
}

/**
 * Get service type for 'Not Determined' services from `ServiceTypeForHUBServices()`
 *
 * @param servicePath service path
 * @param serviceType service type
 * @param catalog the catalog service used to get the service type for the specified service path
 * @returns service type
 */
export async function getServiceType(
    servicePath: string,
    serviceType: string | undefined,
    catalog: V2CatalogService
): Promise<ServiceType | undefined> {
    let resolvedServiceType: ServiceType | undefined;
    if (serviceType === ServiceType.NotDetermined) {
        try {
            resolvedServiceType = (await catalog.getServiceType(servicePath)) ?? ServiceType.NotDetermined;
        } catch (e) {
            LoggerHelper.logger.error(t('errors.serviceTypeRequestError', { error: e.message }));
        }
    }
    return resolvedServiceType ?? (serviceType as ServiceType);
}

/**
 * Requests and sets the service details to the PromptState.odataService properties.
 * If an error occurs, the error message is returned for use in validators.
 *
 * @param service the specific service to get details for
 * @param connectionValidator a reference to the connection validator which has an active connection to the backend
 * @param requiredOdataVersion the required OData version used to validate the service
 * @returns true if successful, setting the PromptState.odataService properties, or an error message indicating why the service details could not be retrieved.
 */
export async function getServiceDetails(
    service: ServiceAnswer,
    connectionValidator: ConnectionValidator,
    requiredOdataVersion?: OdataVersion
): Promise<string | boolean> {
    const serviceCatalog = connectionValidator.catalogs?.[service.serviceODataVersion];

    if (!connectionValidator.serviceProvider) {
        LoggerHelper.logger.error('ConnectionValidator connection is not initialized');
        return false;
    }
    // We may already have an odata service endpoint connection
    let odataService = connectionValidator.odataService;
    if (!odataService) {
        odataService = connectionValidator.serviceProvider.service<ODataService>(service.servicePath);
    }

    const serviceResult = await getServiceMetadata(service.servicePath, odataService, serviceCatalog);
    if (typeof serviceResult === 'string') {
        return serviceResult;
    }

    const { validationMsg, version } = validateODataVersion(serviceResult.metadata, requiredOdataVersion);
    if (validationMsg) {
        return validationMsg;
    }

    // If destinationUrl is available, use it, as validatedUrl may be in the form <protocal>:<destinationName>.dest
    const url = connectionValidator.destinationUrl ?? connectionValidator.validatedUrl;
    let origin;
    if (url) {
        origin = new URL(url).origin;
    }
    PromptState.odataService.annotations = serviceResult?.annotations;
    PromptState.odataService.metadata = serviceResult?.metadata;
    PromptState.odataService.odataVersion =
        version ?? (service.serviceODataVersion === ODataVersion.v2 ? OdataVersion.v2 : OdataVersion.v4);
    PromptState.odataService.servicePath = service.servicePath;
    PromptState.odataService.origin = origin;
    PromptState.odataService.sapClient = connectionValidator.validatedClient;
    return true;
}

/**
 * Create a value for the service selection prompt message, which may include thge active connected user name.
 *
 * @param username The connected user name
 * @returns The service selection prompt message
 */
export function getSelectedServiceLabel(username: string | undefined): string {
    let message = t('prompts.systemService.message');
    if (username) {
        message = message.concat(` ${t('texts.forUserName', { username })}`);
    }
    return message;
}

/**
 * Get the service selection prompt additional message. This prompt will make an additional call to the system backend
 * to retrieve the service type and display a warning message if the service type is not UI.
 *
 * @param serviceChoices a list of service choices
 * @param selectedService the selected service
 * @param connectValidator the connection validator
 * @param requiredOdataVersion the required OData version for the service
 * @param hasAnnotations used to determine whether to show a warning message that annotations could not be retrieved
 * @returns the service selection prompt additional message
 */
export async function getSelectedServiceMessage(
    serviceChoices: ListChoiceOptions<ServiceAnswer>[],
    selectedService: ServiceAnswer,
    connectValidator: ConnectionValidator,
    requiredOdataVersion?: OdataVersion,
    hasAnnotations = true
): Promise<IMessageSeverity | undefined> {
    if (serviceChoices?.length === 0) {
        if (requiredOdataVersion) {
            return {
                message: t('prompts.warnings.noServicesAvailableForOdataVersion', {
                    odataVersion: requiredOdataVersion
                }),
                severity: Severity.warning
            };
        } else {
            return {
                message: t('prompts.warnings.noServicesAvailable'),
                severity: Severity.warning
            };
        }
    }
    if (selectedService) {
        let serviceType = selectedService.serviceType;
        if (selectedService.serviceODataVersion === ODataVersion.v2) {
            // Warn if odata service is version is '2' and no annotations are present
            if (!hasAnnotations) {
                return {
                    message: t('prompts.warnings.noAnnotations'),
                    severity: Severity.warning
                };
            }
            serviceType = await getServiceType(
                selectedService.servicePath,
                selectedService.serviceType,
                connectValidator.catalogs[ODataVersion.v2] as V2CatalogService
            );
        }
        if (serviceType && serviceType !== ServiceType.UI) {
            return {
                message: t('prompts.warnings.nonUIServiceTypeWarningMessage', { serviceType: 'A2X' }),
                severity: Severity.warning
            };
        }
    }
}
