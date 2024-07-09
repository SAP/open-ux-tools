import type { CatalogService, ODataServiceInfo } from '@sap-ux/axios-extension';
import type { ListChoiceOptions } from 'inquirer';
import LoggerHelper from '../../../logger-helper';
import type { ServiceAnswer } from './questions';

// Service ids continaining these paths should not be offered as UI compatible services
const nonUIServicePaths = ['/IWBEP/COMMON/'];
/**
 * Builds and formats the service choices list.
 *
 * @param serviceInfos service information to build the choices from. Services with a service id contains=ing '/IWBEP/COMMON' are ignored.
 * @returns service choices list
 */
const createServiceChoices = (serviceInfos?: ODataServiceInfo[]): ListChoiceOptions<ServiceAnswer>[] => {
    const choices: ListChoiceOptions<ServiceAnswer>[] = [];
    //const isLogTrace = LoggerHelper.logger. === 'trace';

    serviceInfos
        // Exclude non-UI compatible services
        ?.filter((service) => !nonUIServicePaths.some((path) => service.path.includes(path)))
        .forEach((service) => {
            let serviceName = service.name;
            const servicePath = service.path;

            serviceName = `${serviceName} (${service.serviceVersion}) - OData V${service.odataVersion}`;

            /*  if (isLogTrace) {
            serviceName = `${serviceName} Service Type: ${service.ServiceType}`;
        } */

            choices?.push({
                name: serviceName,
                value: {
                    servicePath,
                    serviceODataVersion: service.odataVersion,
                    toString: () => serviceName,
                    serviceType: (service as any).ServiceType ?? 'Not implemented' // Not implemented yet
                }
            }) as ListChoiceOptions<ServiceAnswer>;
        });
    return choices;
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
