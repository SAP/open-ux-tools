import type { Logger } from '@sap-ux/logger';
import type { Service } from '.';
import type { DataProvider } from '../data-provider';
import { TelemetryDataProvider } from '../data-provider/telemetry-setting';
import type { TelemetrySetting, TelemetrySettingKey } from '../entities/telemetry-setting';

export class TelemetrySettingService implements Service<TelemetrySetting, TelemetrySettingKey> {
    private readonly dataProvider: DataProvider<TelemetrySetting, TelemetrySettingKey>;
    private readonly logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
        this.dataProvider = new TelemetryDataProvider(this.logger);
    }

    public async partialUpdate(): Promise<TelemetrySetting> {
        throw new Error('NOT IMPLEMENTED');
    }

    public async read(key: TelemetrySettingKey): Promise<TelemetrySetting | undefined> {
        return this.dataProvider.read(key);
    }
    public async write(entity: TelemetrySetting): Promise<TelemetrySetting | undefined> {
        return this.dataProvider.write(entity);
    }
    public async delete(entity: TelemetrySetting): Promise<boolean> {
        return this.dataProvider.delete(entity);
    }
    public async getAll(): Promise<TelemetrySetting[] | []> {
        return this.dataProvider.getAll();
    }
}

export function getInstance(logger: Logger): TelemetrySettingService {
    return new TelemetrySettingService(logger);
}
