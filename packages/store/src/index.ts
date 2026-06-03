import type { Logger } from '@sap-ux/logger';
import type { ServiceOptions } from './types.js';
import { Entity } from './constants.js';
import { initI18n, text } from './i18n.js';
import type { Service } from './services/index.js';
import { getInstance as getSystemService } from './services/backend-system.js';
import { getInstance as getTelemetrySettingService } from './services/telemetry-setting.js';
import { getInstance as getApiHubSettingsService } from './services/api-hub/index.js';
import { getDefaultLogger } from './defaults.js';

export type EnityName = 'system' | 'telemetrySetting' | 'api-hub';

const services: {
    [entityName: string]: (logger: Logger, options: ServiceOptions) => Service<unknown, unknown>;
} = {
    system: getSystemService,
    telemetrySetting: getTelemetrySettingService,
    'api-hub': getApiHubSettingsService
};

export async function getService<Entity, Key>({
    logger = getDefaultLogger(),
    entityName,
    options = {}
}: {
    logger?: Logger;
    entityName: EnityName;
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

export * from './services/index.js';
export * from './entities/backend-system.js';
export * from './entities/telemetry-setting.js';
export * from './entities/api-hub.js';

// @todo: change notification needs to be more generic and not tied to filesystems
// Support any filesystem watchers
export { getFilesystemWatcherFor } from './data-access/index.js';
export type { ServiceOptions };
export { Entity };
export { getBackendSystemType } from './utils/index.js';
export { getFioriToolsDirectory, getSapToolsDirectory, FioriToolsSettings, SapTools } from './utils/index.js';
export { SystemType, AuthenticationType, ConnectionType } from './types.js';
