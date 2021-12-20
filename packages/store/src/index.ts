import { Logger } from '@sap-ux/common-utils';
import { Entity } from './contants';
import { initI18n, text } from './i18n';
import { Service } from './services';
import { getInstance as getSystemService } from './services/backend-system';

const services: {
    [entityName: string]: (logger: Logger) => Service<unknown, unknown>;
} = {
    system: getSystemService
};

export async function getService<Entity, Key>({
    logger = console,
    entityName
}: {
    logger?: Logger;
    entityName: string;
}): Promise<Service<Entity, Key>> {
    await initI18n();
    const factory = services[entityName] as (logger: Logger) => Service<Entity, Key>;
    if (factory) {
        return factory(logger);
    } else {
        throw new Error(text('error.unsupportedEntity', { entityName }));
    }
}

export * from './services';
export * from './secure-store';
export * from './entities/backend-system';

// Support any filesystem watchers
export { getFilesystemWatcherFor } from './data-access';
export { Entity };
