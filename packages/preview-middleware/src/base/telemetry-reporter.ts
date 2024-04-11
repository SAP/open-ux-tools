import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import { ClientFactory, EventName, SampleRate, initTelemetrySettings } from '@sap-ux/telemetry';
import modulePackageJson from '../../package.json';
import dotenv from 'dotenv';
import { join } from 'path';
import { enableTelemetry } from '@sap-ux-private/control-property-editor-common';

export class TelemetryReporter {
    constructor(private eventName: string, private layer?: string) {}
    public async initializeTelemetry() {
        const envFilePath = { path: join(__dirname, '..', '..', '.env') };
        dotenv.config(envFilePath);
        const internalFeature = isInternalFeaturesSettingEnabled();
        await initTelemetrySettings({
            consumerModule: modulePackageJson,
            internalFeature,
            watchTelemetrySettingStore: true,
            resourceId: process.env['OpenUxTools_ResourceId']
        });
        enableTelemetry();
    }

    public reportTelemetry(data: any) {
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
