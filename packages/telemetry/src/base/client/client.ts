import type { SampleRate } from '../types/sample-rate';

/**
 *
 */
abstract class Client {
    abstract report(
        event: string,
        properties: Record<string, string>,
        metrics: Record<string, number>,
        sampleRate: SampleRate | undefined,
        telemetryHelperProperties?: Record<string, string>,
        ignoreSettings?: boolean
    ): Promise<void>;

    protected applicationKey = '';
    protected extensionName = '';
    protected extensionVersion = '';

    /**
     * @returns Target Azure application insights resource Id
     */
    public getApplicationKey(): string {
        return this.applicationKey;
    }

    /**
     * @returns Consumer module version
     */
    public getExtensionVersion(): string {
        return this.extensionVersion;
    }

    /**
     * @returns Consumer module name
     */
    public getExtensionName(): string {
        return this.extensionName;
    }
}

export { Client };
