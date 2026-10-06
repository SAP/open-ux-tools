import type { TelemetryClient as AzureTelemetryClient } from 'applicationinsights';
// import type { TelemetryItem } from 'applicationinsights'; // not exported

// Mask OTEL resource attributes that become cloud_RoleName / cloud_RoleInstance in Azure Portal.
// Must be set before the first TelemetryClient.initialize() call (which happens lazily on first trackEvent).
// applicationinsights v3 reads these via envDetector during initialize(); context.tags has no effect on them.
process.env.OTEL_RESOURCE_ATTRIBUTES ??= 'service.name=masked,service.instance.id=masked';

/**
 * Enable local caching of telemetry data when offline.
 * Disable GDPR private data that are collected by Azure AppInsight client.
 *
 * @param client Azure App Insights telemetry client instance
 */
export function configAzureTelemetryClient(client: AzureTelemetryClient): void {
    if (client.setUseDiskRetryCaching) {
        try {
            client.setUseDiskRetryCaching(true);
        } catch {
            // setUseDiskRetryCaching may throw "Not implemented"
        }
    }
    client.context.tags ??= {};
    client.context.tags['ai.location.ip'] = '0.0.0.0';
    client.context.tags['microsoft.client.ip'] = '0.0.0.0';
    client.context.tags['ai.cloud.roleInstance'] = 'masked';
    client.context.tags['ai.cloud.role'] = 'masked';
    client.context.tags['ai.device.type'] = 'masked';
}
