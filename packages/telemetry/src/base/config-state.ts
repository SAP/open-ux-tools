/**
 * Runtime telemetry settings
 */
export const TelemetrySettings = {
    // Target Azure apps insight destination
    azureInstrumentationKey: 'c01f3247-2dd5-4f13-884d-62747e6af2f5',
    // Allow user to opt out from telemetry collection
    telemetryEnabled: true,
    // Module name in telemetry/pacakge.json
    telemetryLibName: '@sap-ux/telemetry',
    // Version in telemetry/pacakge.json
    telemetryLibVersion: '0.0.1',

    // Name of module that uses telemetry library
    consumerModuleName: '',
    // Version of module that uses telemetry library
    consumerModuleVersion: ''
};
