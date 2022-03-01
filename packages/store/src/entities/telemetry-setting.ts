import { EntityKey } from '.';
import { serializable } from '../decorators';

/** This represents the migration status of the systems from pure secure store
 * the hybrid filesystem/secure store
 */
export class TelemetrySetting {
    @serializable public readonly enableTelemetry: boolean;

    constructor({ enableTelemetry }: { enableTelemetry: boolean }) {
        this.enableTelemetry = enableTelemetry;
    }
}

export class TelemetrySettingKey implements EntityKey {
    public getId(): string {
        return 'telemetrySetting'; // A singleton
    }
}
