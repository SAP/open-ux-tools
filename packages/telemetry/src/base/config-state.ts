import packageJson from '../../package.json' with { type: 'json' };

/**
 * Runtime telemetry settings
 */
export const TelemetrySettings = {
    // Target Azure apps insight destination, > v3 ApplicationInsightsInstrumentationKey format must be `InstrumentationKey='${key}'`
    azureInstrumentationKey: '',
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
