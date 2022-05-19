import type { Logger } from '@sap-ux/logger';
import type { Service } from '.';
import type { DataProvider } from '../data-provider';
import { ApiHubSettingsProvider } from '../data-provider/api-hub';
import type { ApiHubSettings } from '../entities/api-hub';
import { ApiHubSettingsKey } from '../entities/api-hub';

export class ApiHubSettingsService implements Service<ApiHubSettings, ApiHubSettingsKey> {
    private readonly dataProvider: DataProvider<ApiHubSettings, ApiHubSettingsKey>;
    private readonly logger: Logger;
    private readonly key: ApiHubSettingsKey = new ApiHubSettingsKey();

    constructor(logger: Logger) {
        this.logger = logger;
        this.dataProvider = new ApiHubSettingsProvider(this.logger);
    }

    public async partialUpdate(): Promise<ApiHubSettings> {
        throw new Error('NOT IMPLEMENTED');
    }

    public async read(): Promise<ApiHubSettings | undefined> {
        return this.dataProvider.read(this.key);
    }
    public async write(entity: ApiHubSettings): Promise<ApiHubSettings | undefined> {
        return this.dataProvider.write(entity);
    }
    public async delete(entity: ApiHubSettings): Promise<boolean> {
        return this.dataProvider.delete(entity);
    }
    public async getAll(): Promise<ApiHubSettings[] | []> {
        return this.dataProvider.getAll();
    }
}

export function getInstance(logger: Logger): ApiHubSettingsService {
    return new ApiHubSettingsService(logger);
}
