import type { EntityKey } from './index.js';
import { serializable } from '../decorators/index.js';

/**
 * Central telemetry settings data to be accessed by
 * the filesystem store
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
