import {
    type CatalogService,
    ServiceType,
    V2CatalogService,
    type Annotations,
    type ODataServiceInfo,
    type ServiceProvider,
    ODataVersion
} from '@sap-ux/axios-extension';
import type { ListChoiceOptions } from 'inquirer';
import { t } from '../../../../i18n';
import LoggerHelper from '../../../logger-helper';
import type { ServiceAnswer } from './types';
import type { ConnectionValidator } from '../../../connectionValidator';
import { PromptState } from '../../../../utils';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import { errorHandler } from '../../../prompt-helpers';
import { type IMessageSeverity, Severity } from '@sap-devx/yeoman-ui-types';

// Service ids continaining these paths should not be offered as UI compatible services
const nonUIServicePaths = ['/IWBEP/COMMON/'];
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
 * Logs the catalog reuest errors.
 *
 * @param requestErrors catalog request errors
 */
function logErrorsForHelp(requestErrors: Record<ODataVersion, unknown> | {}): void {
    // Log the first error only
    const catalogErrors = Object.values(requestErrors);
    if (catalogErrors.length > 0) {
        catalogErrors.forEach((error) => errorHandler.logErrorMsgs(error));
    }
}

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
        logErrorsForHelp(requestErrors);
    }

    return createServiceChoices(flatServices);
}

/**
 * Gets the service metadata and annotations for the specified service path.
 *
 * @param servicePath service path
 * @param catalog the catalog service used to get the annotations for the specified service path
 * @param serviceProvider the service provider for the connected system
 * @returns Promise<string | boolean>, string error message or true if successful
 */
export async function getServiceMetadata(
    servicePath: string,
    catalog: CatalogService,
    serviceProvider: ServiceProvider
): Promise<{ annotations: Annotations[]; metadata: string; serviceProvider: ServiceProvider } | string> {
    let annotations: Annotations[] = [];
    try {
        try {
            annotations = await catalog.getAnnotations({ path: servicePath });
        } catch {
            LoggerHelper.logger.info(t('prompts.validationMessages.noAnnotations'));
        }

        const odataService = serviceProvider.service(servicePath);
        const metadata = await odataService.metadata();
        return {
            annotations,
            metadata,
            serviceProvider
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
 * @returns true if successful, setting the PromptState.odataService properties, or an error message indicating why the service details could not be retrieved.
 */
export async function getServiceDetails(
    service: ServiceAnswer,
    connectionValidator: ConnectionValidator
): Promise<string | boolean> {
    const serviceCatalog = connectionValidator.catalogs[service.serviceODataVersion];

    if (!serviceCatalog || !connectionValidator.serviceProvider) {
        LoggerHelper.logger.error('ConnectionValidator is not initialized');
        return false;
    }

    const serviceResult = await getServiceMetadata(
        service.servicePath,
        serviceCatalog,
        connectionValidator.serviceProvider
    );
    if (typeof serviceResult === 'string') {
        return serviceResult;
    }
    PromptState.odataService.annotations = serviceResult?.annotations;
    PromptState.odataService.metadata = serviceResult?.metadata;
    PromptState.odataService.odataVersion =
        service.serviceODataVersion === ODataVersion.v2 ? OdataVersion.v2 : OdataVersion.v4;
    PromptState.odataService.servicePath = service.servicePath;
    PromptState.odataService.origin = connectionValidator.validatedUrl;
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
 * @returns the service selection prompt additional message
 */
export async function getSelectedServiceMessage(
    serviceChoices: ListChoiceOptions<ServiceAnswer>[],
    selectedService: ServiceAnswer,
    connectValidator: ConnectionValidator,
    requiredOdataVersion?: OdataVersion
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
