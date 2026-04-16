import type { Logger } from '@sap-ux/logger';
import type { ServiceOptions } from '../types.js';
import type { DataProvider, DataProviderConstructor } from './index.js';
import type { DataAccess } from '../data-access/index.js';
import { getHybridStore } from '../data-access/hybrid.js';
import { Entities } from './constants.js';
import type { ApiHubSettings } from '../entities/api-hub.js';
import { ApiHubSettingsKey } from '../entities/api-hub.js';

export const ApiHubSettingsProvider: DataProviderConstructor<ApiHubSettings, ApiHubSettingsKey> =
    class implements DataProvider<ApiHubSettings, ApiHubSettingsKey> {
        private readonly dataAccessor: DataAccess<ApiHubSettings>;
        private readonly entityName = Entities.ApiHub;
        private readonly logger: Logger;

        constructor(logger: Logger, options: ServiceOptions = {}) {
            this.logger = logger;
            this.dataAccessor = getHybridStore(this.logger, options);
        }

        public read(key: ApiHubSettingsKey): Promise<ApiHubSettings | undefined> {
            return this.dataAccessor.read({ entityName: this.entityName, id: key.getId() });
        }

        public write(entity: ApiHubSettings): Promise<ApiHubSettings | undefined> {
            return this.dataAccessor.write({
                entityName: this.entityName,
                id: ApiHubSettingsKey.SINGLETON,
                entity
            });
        }

        public delete(_entity: ApiHubSettings): Promise<boolean> {
            return this.dataAccessor.del({
                entityName: this.entityName,
                id: ApiHubSettingsKey.SINGLETON
            });
        }

        public getAll(): Promise<ApiHubSettings[] | []> {
            return this.dataAccessor.getAll({ entityName: this.entityName });
        }
    };
