import type * as appInsights from 'applicationinsights';

export function configAzureTelemetryClient(client: appInsights.TelemetryClient) {
    client.channel.setUseDiskRetryCaching(true);
    // disable GDPR private data that are collected by Azure AppInsight client.
    client.addTelemetryProcessor((envelope: appInsights.Contracts.Envelope) => {
        envelope.tags['ai.location.ip'] = '0.0.0.0';
        envelope.tags['ai.cloud.roleInstance'] = 'masked';
        envelope.tags['ai.cloud.role'] = 'masked';
        envelope.tags['ai.device.type'] = 'masked';
        return true;
    });
}
