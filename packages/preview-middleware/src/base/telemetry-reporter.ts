import { ClientFactory, SampleRate, initTelemetrySettings } from '@sap-ux/telemetry';
import modulePackageJson from '../../package.json';
import { Logger } from '@sap-ux/logger';

const key = 'ApplicationInsightsInstrumentationKeyPLACEH0LDER';

/**
 * Class handling telemetry initialization and reporting.
 */
export class TelemetryReporter {
    private initialized: boolean;
    constructor(private eventName: string, private readonly logger: Logger, private layer?: string) {}
    public async initializeTelemetry() {
        try {
            await initTelemetrySettings({
                consumerModule: modulePackageJson,
                internalFeature: false,
                watchTelemetrySettingStore: true,
                resourceId: key
            });
            this.initialized = true;
        } catch (e) {
            this.initialized = false;
            this.logger.error(`Could not initialize telemetry. ${e}`);
        }
    }

    public reportTelemetry(data: { [key: string]: string | boolean }): void {
        if (!this.initialized) {
            throw new Error('Telemetry not initialized');
        }
        const telemetryEvent = {
            eventName: this.eventName,
            properties: { ...data, layer: this.layer ? this.layer : 'NO_LAYER_FOUND' },
            measurements: {}
        };
        ClientFactory.getTelemetryClient().reportEvent(telemetryEvent, SampleRate.NoSampling, {
            appPath: process.cwd()
        });
    }
}
