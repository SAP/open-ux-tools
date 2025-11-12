import { type IMessageSeverity, Severity } from '@sap-devx/yeoman-ui-types';
import {
    type Annotations,
    type AxiosRequestConfig,
    type CatalogService,
    createForAbap,
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
import { showCollabDraftWarning } from '../../service-helpers/service-helpers';
import type { ConvertedMetadata } from '@sap-ux/vocabularies-types';

// Service ids continaining these paths should not be offered as UI compatible services
const nonUIServicePaths = ['/IWBEP/COMMON'];
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
        ?.filter((service) => !nonUIServicePaths.some((path) => service.id.includes(path)))
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
                    serviceType: service.serviceType,
                    serviceId: service.id
                }
            }) as ListChoiceOptions<ServiceAnswer>;
        });
    LoggerHelper.logger.debug(`Number of unique service choices: ${choices.length}`);
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
 * Get the service choices from the specified catalogs.
 *
 * @param catalogs catalogs to get the services from. There should be one per odata version required.
 * @param serviceFilter list of service ids used for filtering the choices
 * @returns service choices based on the provided catalogs
 */
export async function getServiceChoices(
    catalogs: CatalogService[],
    serviceFilter?: string[]
): Promise<ListChoiceOptions<ServiceAnswer>[]> {
    const requestErrors: Record<ODataVersion, unknown> | {} = {};
    // Performance tracking for the requests
    const requestTimes: Record<string, { serviceCount: number; duration: string }> = {}; // [v2, v4] request times in ms
    const listServicesRequests = [];

    for (const catalog of catalogs) {
        const catalogVer = catalog instanceof V2CatalogService ? ODataVersion.v2 : ODataVersion.v4;
        try {
            const startTime = Date.now();
            const res = await catalog.listServices();
            const endTime = Date.now();
            const duration = endTime - startTime === 0 ? '<1 ms' : `${endTime - startTime}ms`;
            requestTimes[`v${catalogVer}`] = {
                serviceCount: res.length,
                duration
            };
            LoggerHelper.logger.debug(
                `Number of service${catalogVer === ODataVersion.v4 ? ' groups' : 's'}: ${
                    res.length
                } returned in: ${duration}}`
            );
            listServicesRequests.push(res);
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
                [catalogVer]: error
            });
            listServicesRequests.push([]);
        }
    }
    // Log the request times for debugging purposes
    LoggerHelper.logger.debug(`Service catalog request times: ${JSON.stringify(requestTimes, undefined, '    ')}`);

    // Flatten the array of arrays
    let flatServices = listServicesRequests?.flat() ?? [];
    LoggerHelper.logger.debug(`Number of services available: ${flatServices.length}`);

    if (flatServices.length === 0) {
        logServiceCatalogErrorsForHelp(requestErrors, catalogs.length);
    }

    if (serviceFilter) {
        flatServices = flatServices.filter(
            (service) => serviceFilter.includes(service.id) || serviceFilter.includes(service.path)
        );
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
 * Gets the service metadata and annotations for the specified service path. Validate that the service metadata is of the required OData version.
 * If a catalog service is provided, it will be used to get the annotations for the specified service path.
 * If the catalog service is not provided and the metadata is OData version 2, a catalog service will be created using the axios config to get the annotations.
 * Note this is a best effort attempt to get the annotations and may fail if the catalog service cannot be created.
 *
 * @param servicePath service path
 * @param odataService the odata service used to get the metadata for the specified service path
 * @param catalog the catalog service used to get the annotations for the specified service path
 * @param axiosConfig the axios config which may be used to create the catalog service, if not provided (for v2 services),
 * @param requiredOdataVersion the required OData version used to validate the service
 * @returns the service metadata and annotations
 */
async function getServiceMetadataAndValidate(
    servicePath: string,
    odataService: ODataService,
    catalog?: CatalogService,
    axiosConfig?: AxiosRequestConfig,
    requiredOdataVersion?: OdataVersion
): Promise<{
    annotations?: Annotations[];
    metadata?: string;
    validationMsg?: string;
    version?: OdataVersion;
    convertedMetadata?: ConvertedMetadata;
}> {
    let annotations: Annotations[] = [];
    try {
        const metadata = await odataService.metadata();

        const { validationMsg, version, convertedMetadata } = validateODataVersion(metadata, requiredOdataVersion);

        if (validationMsg) {
            return { validationMsg };
        }

        // For non `odata_abap` (full/partial v2 urls) destinations we wont have a catalog defined, but the annotations may be available so we need to try or warn.
        // Creation of the catalog service is a best effort and makes no assumptions about the existence of a real catalog service. The annotation call does not rely on it.
        if (!catalog && version === OdataVersion.v2 && axiosConfig) {
            try {
                // Create an abap provider instance to get the annotations using the same request config
                LoggerHelper.logger.debug(
                    'Creating a catalog service object for v2 service path to request annotations.'
                );
                const abapProvider = createForAbap(axiosConfig);
                catalog = abapProvider.catalog(ODataVersion.v2);
                LoggerHelper.attachAxiosLogger(catalog.interceptors);
            } catch (err) {
                LoggerHelper.logger.warn(t('error.v2CatalogServiceNoAnnotations', err));
            }
        }

        if (catalog) {
            try {
                annotations = await catalog.getAnnotations({ path: servicePath });
            } catch {
                LoggerHelper.logger.info(t('prompts.validationMessages.noAnnotations'));
            }
        }

        return {
            annotations,
            metadata,
            version,
            convertedMetadata
        };
    } catch (error) {
        LoggerHelper.logger.error(t('errors.serviceMetadataErrorLog', { servicePath, error }));
        return {
            validationMsg: t('errors.serviceMetadataErrorUI', { servicePath })
        };
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

type ValidateServiceResult = {
    validationResult: boolean | string;
    hasAnnotations?: boolean;
    convertedMetadata?: ConvertedMetadata;
};

/**
 * If we are validating a v2 service and do not have a catalog connection, we may still attempt to get the annotations but need a catalog.
 * This scenario occurs for full/partial url destinations.
 *
 */

/**
 * Requests and sets the service details to the PromptState.odataService properties.
 * If an error occurs, the error message is returned for use in validators.
 *
 * @param service the specific service to get details for
 * @param connectionValidator a reference to the connection validator which has an active connection to the backend
 * @param requiredOdataVersion the required OData version used to validate the service
 * @returns true if successful, setting the PromptState.odataService properties, or an error message indicating why the service details could not be retrieved.
 */
export async function validateService(
    service: ServiceAnswer,
    connectionValidator: ConnectionValidator,
    requiredOdataVersion?: OdataVersion
): Promise<ValidateServiceResult> {
    const serviceCatalog = connectionValidator.catalogs?.[service.serviceODataVersion];

    if (!connectionValidator.serviceProvider) {
        LoggerHelper.logger.error('ConnectionValidator connection is not initialized');
        return { validationResult: false };
    }
    // We may already have an odata service endpoint connection
    let odataService = connectionValidator.odataService;
    if (!odataService) {
        odataService = connectionValidator.serviceProvider.service<ODataService>(service.servicePath);
    }

    const { validationMsg, version, convertedMetadata, annotations, metadata } = await getServiceMetadataAndValidate(
        service.servicePath,
        odataService,
        serviceCatalog,
        connectionValidator.axiosConfig,
        requiredOdataVersion
    );
    if (validationMsg) {
        return { validationResult: validationMsg };
    }

    // If destinationUrl is available, use it, as validatedUrl may be in the form <protocal>:<destinationName>.dest
    const url = connectionValidator.destinationUrl ?? connectionValidator.validatedUrl;
    let origin;
    if (url) {
        origin = new URL(url).origin;
    }
    PromptState.odataService.annotations = annotations;
    PromptState.odataService.metadata = metadata;
    PromptState.odataService.odataVersion =
        version ?? (service.serviceODataVersion === ODataVersion.v2 ? OdataVersion.v2 : OdataVersion.v4);
    PromptState.odataService.servicePath = service.servicePath;
    PromptState.odataService.serviceId = service.serviceId;
    PromptState.odataService.origin = origin;
    PromptState.odataService.sapClient = connectionValidator.validatedClient;
    PromptState.odataService.ignoreCertError = connectionValidator.ignoreCertError;
    return {
        validationResult: true,
        hasAnnotations: !!PromptState.odataService.annotations && PromptState.odataService.annotations.length > 0,
        convertedMetadata
    };
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

type ShowCollabDraftWarnOptions = {
    edmx: ConvertedMetadata;
    showCollabDraftWarning: boolean;
};
/**
 * Get the service selection prompt additional message. This prompt will make an additional call to the system backend
 * to retrieve the service type and display a warning message if the service type is not UI.
 *
 * @param serviceChoices a list of service choices
 * @param selectedService the selected service
 * @param connectValidator the connection validator
 * @param options additional options
 * @param options.requiredOdataVersion the required OData version for the service
 * @param options.hasAnnotations used to determine whether to show a warning message that annotations could not be retrieved
 * @param options.showCollabDraftWarnOptions to show the collaborative draft warning, the option `showCollabDraftWarning` must be true
 *  and the edmx metadata must be provided
 * @returns the service selection prompt additional message
 */
export async function getSelectedServiceMessage(
    serviceChoices: ListChoiceOptions<ServiceAnswer>[],
    selectedService: ServiceAnswer,
    connectValidator: ConnectionValidator,
    {
        requiredOdataVersion,
        hasAnnotations = true,
        showCollabDraftWarnOptions
    }: {
        requiredOdataVersion?: OdataVersion;
        hasAnnotations?: boolean;
        showCollabDraftWarnOptions?: ShowCollabDraftWarnOptions;
    }
): Promise<IMessageSeverity | undefined> {
    if (serviceChoices?.length === 0) {
        if (requiredOdataVersion) {
            return {
                message: t('warnings.noServicesAvailableForOdataVersion', {
                    odataVersion: requiredOdataVersion
                }),
                severity: Severity.warning
            };
        } else {
            return {
                message: t('warnings.noServicesAvailable'),
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
                    message: t('warnings.noAnnotations'),
                    severity: Severity.warning
                };
            }
            serviceType = await getServiceType(
                selectedService.servicePath,
                selectedService.serviceType,
                connectValidator.catalogs[ODataVersion.v2] as V2CatalogService
            );
        } else if (
            showCollabDraftWarnOptions?.showCollabDraftWarning &&
            selectedService.serviceODataVersion === ODataVersion.v4
        ) {
            const result = showCollabDraftWarning(showCollabDraftWarnOptions.edmx);
            if (result) {
                return {
                    message: t('warnings.collaborativeDraftMessage'),
                    severity: Severity.warning
                };
            }
        }
        if (serviceType && serviceType !== ServiceType.UI) {
            return {
                message: t('warnings.nonUIServiceTypeWarningMessage', { serviceType: 'A2X' }),
                severity: Severity.warning
            };
        }
    }
}
