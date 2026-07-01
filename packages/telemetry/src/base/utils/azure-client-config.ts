import type { TelemetryClient as AzureTelemetryClient } from 'applicationinsights';
// import type { TelemetryItem } from 'applicationinsights'; // not exported

/**
 * Enable local caching of telemetry data when offline.
 * Disable GDPR private data that are collected by Azure AppInsight client.
 *
 * @param client Azure App Insights telemetry client instance
 */
export function configAzureTelemetryClient(client: AzureTelemetryClient): void {
    if (client.setUseDiskRetryCaching) {
        client.setUseDiskRetryCaching(true);
    }
    client.addTelemetryProcessor((envelope: any /* TelemetryItem */): boolean => {
        envelope.tags ??= {};
        envelope.tags['ai.location.ip'] = '0.0.0.0';
        envelope.tags['ai.cloud.roleInstance'] = 'masked';
        envelope.tags['ai.cloud.role'] = 'masked';
        envelope.tags['ai.device.type'] = 'masked';
        return true;
    });
}
