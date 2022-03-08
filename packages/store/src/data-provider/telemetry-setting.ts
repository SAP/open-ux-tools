import type { DataProvider, DataProviderConstructor } from '.';
import type { DataAccess } from '../data-access';
import { getFilesystemStore } from '../data-access/filesystem';
import type { TelemetrySetting } from '../entities/telemetry-setting';
import { TelemetrySettingKey } from '../entities/telemetry-setting';
import { Entities } from './constants';
import type { Logger } from '@sap-ux/logger';

export const TelemetryDataProvider: DataProviderConstructor<TelemetrySetting, TelemetrySettingKey> = class
    implements DataProvider<TelemetrySetting, TelemetrySettingKey>
{
    private readonly dataAccessor: DataAccess<TelemetrySetting>;
    private readonly entityName = Entities.TelemetrySetting;
    private readonly logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
        this.dataAccessor = getFilesystemStore(this.logger);
    }

    public read(key: TelemetrySettingKey): Promise<TelemetrySetting | undefined> {
        return this.dataAccessor.read({ entityName: this.entityName, id: key.getId() });
    }

    public write(entity: TelemetrySetting): Promise<TelemetrySetting | undefined> {
        return this.dataAccessor.write({
            entityName: this.entityName,
            id: new TelemetrySettingKey().getId(),
            entity
        });
    }

    public delete(_entity: TelemetrySetting): Promise<boolean> {
        return this.dataAccessor.del({
            entityName: this.entityName,
            id: new TelemetrySettingKey().getId()
        });
    }

    public getAll(): Promise<TelemetrySetting[] | []> {
        return this.dataAccessor.getAll({ entityName: this.entityName });
    }
};
