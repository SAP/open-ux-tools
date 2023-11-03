import type { SampleRate } from './model/SampleRate';
import type { EventName } from './model/EventName';

abstract class Client {
    abstract report(
        event: EventName,
        properties: Record<string, string>,
        metrics: Record<string, number>,
        sampleRate: SampleRate | undefined,
        telemetryHelperProperties?: Record<string, string>,
        ignoreSettings?: boolean
    ): Promise<void>;

    protected applicationKey = '';
    protected extensionName = '';
    protected extensionVersion = '';

    public getApplicationKey(): string {
        return this.applicationKey;
    }

    public getExtensionVersion(): string {
        return this.extensionVersion;
    }

    public getExtensionName(): string {
        return this.extensionName;
    }
}

export { Client };
