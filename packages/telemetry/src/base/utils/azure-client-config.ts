import type { TelemetryClient as AzureTelemetryClient, Contracts } from 'applicationinsights';

/**
 * Enable local caching of telemetry data when offline.
 * Disable GDPR private data that are collected by Azure AppInsight client.
 *
 * @param client Azure App Insights telemetry client instance
 */
export function configAzureTelemetryClient(client: AzureTelemetryClient) {
    client.channel.setUseDiskRetryCaching(true);
    client.addTelemetryProcessor((envelope: Contracts.Envelope) => {
        envelope.tags['ai.location.ip'] = '0.0.0.0';
        envelope.tags['ai.cloud.roleInstance'] = 'masked';
        envelope.tags['ai.cloud.role'] = 'masked';
        envelope.tags['ai.device.type'] = 'masked';
        return true;
    });
}
