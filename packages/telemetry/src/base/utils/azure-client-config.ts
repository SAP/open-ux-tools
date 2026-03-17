import type { TelemetryClient as AzureTelemetryClient } from 'applicationinsights';
import type { TelemetryItem } from 'applicationinsights/out/src/declarations/generated';

/**
 * Enable local caching of telemetry data when offline.
 * Disable GDPR private data that are collected by Azure AppInsight client.
 *
 * @param client Azure App Insights telemetry client instance
 */
export function configAzureTelemetryClient(client: AzureTelemetryClient) {
    client.setUseDiskRetryCaching(true);
    client.addTelemetryProcessor((envelope: TelemetryItem) => {
        if (envelope.tags) {
            envelope.tags['ai.location.ip'] = '0.0.0.0';
            envelope.tags['ai.cloud.roleInstance'] = 'masked';
            envelope.tags['ai.cloud.role'] = 'masked';
            envelope.tags['ai.device.type'] = 'masked';
        }
        return true;
    });
}
