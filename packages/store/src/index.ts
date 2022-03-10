import type { Logger } from '@sap-ux/logger';
import { ServiceOptions } from './types';
import { Entity } from './constants';
import { initI18n, text } from './i18n';
import type { Service } from './services';
import { getInstance as getSystemService } from './services/backend-system';
import { getInstance as getTelemetrySettingService } from './services/telemetry-setting';
import { getDefaultLogger } from './defaults';

const services: {
    [entityName: string]: (logger: Logger, options: ServiceOptions) => Service<unknown, unknown>;
} = {
    system: getSystemService,
    telemetrySetting: getTelemetrySettingService
};

export async function getService<Entity, Key>({
    logger = getDefaultLogger(),
    entityName,
    options = {}
}: {
    logger?: Logger;
    entityName: string;
    options?: ServiceOptions;
}): Promise<Service<Entity, Key>> {
    await initI18n();
    const factory = services[entityName] as (logger: Logger, options: ServiceOptions) => Service<Entity, Key>;
    if (factory) {
        return factory(logger, options);
    } else {
        throw new Error(text('error.unsupportedEntity', { entityName }));
    }
}

export * from './services';
export * from './secure-store';
export * from './entities/backend-system';
export * from './entities/telemetry-setting';

// @todo: change notification needs to be more generic and not tied to filesystems
// Support any filesystem watchers
export { getFilesystemWatcherFor } from './data-access';
export { ServiceOptions };
export { Entity };
