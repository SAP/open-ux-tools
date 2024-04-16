import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import { ClientFactory, SampleRate, initTelemetrySettings } from '@sap-ux/telemetry';
import modulePackageJson from '../../package.json';
// import { join } from 'path';
// import dotenv from 'dotenv';
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
            // const envFilePath = { path: join(__dirname, '..', '..', '.env') };
            // dotenv.config(envFilePath);
            const internalFeature = isInternalFeaturesSettingEnabled();
            await initTelemetrySettings({
                consumerModule: modulePackageJson,
                internalFeature,
                watchTelemetrySettingStore: true,
                //resourceId: process.env['OpenUxTools_ResourceId']
                resourceId: key
            });
            this.initialized = true;
        } catch (e) {
            this.initialized = false;
            this.logger.error(`Could not initialize telemetry. ${e}`);
        }
    }

    public reportTelemetry(data: any): void {
        if (!this.initialized) {
            throw new Error('Telemetry not initialized');
        }
        const telemetryEvent = {
            eventName: this.eventName,
            properties: { ...data, layer: this.layer },
            measurements: {}
        };
        ClientFactory.getTelemetryClient().reportEvent(telemetryEvent, SampleRate.NoSampling, {
            appPath: process.cwd()
        });
    }
}
