import type { ServiceProvider } from '@sap-ux/axios-extension';
import type { Logger as AppLogger } from '@sap-ux/logger';

/**
 * Restore the loggers for the service provider if they are missing.
 * This is necessary because the service provider may have been serialized and deserialized, which can lead to missing loggers which contain circular refs.
 * Not doing this will result in the loggers being undefined when trying to access them, and calling services will throw.
 *
 * @param logger - The logger instance to be restored.
 * @param serviceProvider - The service provider object that may have missing loggers.
 * @returns The service provider with restored loggers.
 */
export function restoreServiceProviderLoggers(
    logger: AppLogger,
    serviceProvider?: ServiceProvider
): ServiceProvider | undefined {
    for (const service in (serviceProvider as any)?.services) {
        if ((serviceProvider as any).services?.[service].log && !(serviceProvider as any).services[service].log.info) {
            (serviceProvider as any).services[service].log = logger;
        }
    }
    if (serviceProvider?.log && !serviceProvider.log.info) {
        serviceProvider.log = logger;
    }
    return serviceProvider;
}
