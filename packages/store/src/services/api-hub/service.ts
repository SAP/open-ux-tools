import type { Logger } from '@sap-ux/logger';
import type { SecureStore } from '../../secure-store';
import { getSecureStore } from '../../secure-store';
import type { Service } from '..';
import type { DataProvider } from '../../data-provider';
import { ApiHubSettingsProvider } from '../../data-provider/api-hub';
import type { ApiHubSettings } from '../../entities/api-hub';
import { ApiHubSettingsKey } from '../../entities/api-hub';
import { migrateToLatestVersion } from './migration';

export class ApiHubSettingsService implements Service<ApiHubSettings, ApiHubSettingsKey> {
    private readonly dataProvider: DataProvider<ApiHubSettings, ApiHubSettingsKey>;
    private readonly logger: Logger;
    private secureStore: SecureStore;
    private migrationDone = false;
    private readonly key: ApiHubSettingsKey = new ApiHubSettingsKey();

    constructor(logger: Logger) {
        this.logger = logger;
        this.dataProvider = new ApiHubSettingsProvider(this.logger);
    }

    private async migrate(): Promise<void> {
        if (this.migrationDone) {
            return;
        }

        if (!this.secureStore) {
            this.secureStore = getSecureStore(this.logger);
        }

        await migrateToLatestVersion({
            logger: this.logger,
            secureStore: this.secureStore,
            dataProvider: this.dataProvider
        });
        this.migrationDone = true;
    }

    public async partialUpdate(): Promise<ApiHubSettings> {
        await this.migrate();
        throw new Error('NOT IMPLEMENTED');
    }

    public async read(): Promise<ApiHubSettings | undefined> {
        await this.migrate();
        return this.dataProvider.read(this.key);
    }
    public async write(entity: ApiHubSettings): Promise<ApiHubSettings | undefined> {
        await this.migrate();
        return this.dataProvider.write(entity);
    }
    public async delete(entity: ApiHubSettings): Promise<boolean> {
        await this.migrate();
        return this.dataProvider.delete(entity);
    }
    public async getAll(): Promise<ApiHubSettings[] | []> {
        await this.migrate();
        return this.dataProvider.getAll();
    }
}

export function getInstance(logger: Logger): ApiHubSettingsService {
    return new ApiHubSettingsService(logger);
}
