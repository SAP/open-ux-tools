import {
    ServiceType,
    type Annotations,
    type CatalogService,
    type V2CatalogService,
    type ODataServiceInfo,
    type ServiceProvider
} from '@sap-ux/axios-extension';
import type { ListChoiceOptions } from 'inquirer';
import { t } from '../../../../i18n';
import LoggerHelper from '../../../logger-helper';
import type { ServiceAnswer } from './questions';

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
 * Get the service choices from the specified catalogs.
 *
 * @param catalogs catalogs to get the services from. There should be one per odata version required.
 * @returns service choices based on the provided catalogs
 */
export async function getServiceChoices(catalogs: CatalogService[]): Promise<ListChoiceOptions<ServiceAnswer>[]> {
    const listServicesRequests = catalogs.map(async (catalog) => {
        try {
            return await catalog.listServices();
        } catch (error) {
            LoggerHelper.logger.error(
                `An error occurred requesting services from: ${catalog.entitySet}. Some services may not be listed.`
            );
            return [];
        }
    });
    const serviceInfos: ODataServiceInfo[][] = await Promise.all(listServicesRequests);
    const flatServices = serviceInfos?.flat() ?? [];
    LoggerHelper.logger.debug(`Number of services available: ${flatServices.length}`);

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
