import packageJson from '../../package.json' with { type: 'json' };

/**
 * Runtime telemetry settings
 */
export const TelemetrySettings = {
    // Target Azure apps insight destination
    azureInstrumentationKey: '',
    // Regional Azure App Insights ingestion endpoint. Must be set explicitly because the
    // @azure/monitor-opentelemetry-exporter (>= 1.0.0-beta.44) refuses to follow the global
    // endpoint's cross-origin redirect to the regional endpoint. Consumers may override this default.
    azureIngestionEndpoint: 'https://westus2-0.in.applicationinsights.azure.com/',
    // Regional Azure App Insights live-metrics endpoint. Consumers may override this default.
    azureLiveEndpoint: 'https://westus2.livediagnostics.monitor.azure.com/',
    // Allow user to opt out from telemetry collection
    telemetryEnabled: true,
    // Module name in telemetry/pacakge.json
    telemetryLibName: packageJson.name,
    // Version in telemetry/pacakge.json
    telemetryLibVersion: packageJson.version,

    // Name of module that uses telemetry library
    consumerModuleName: '',
    // Version of module that uses telemetry library
    consumerModuleVersion: ''
};
