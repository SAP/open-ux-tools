// @ts-ignore
import packageJson from '../../package.json';
import azure from '../../azure.json';

/**
 * Runtime telemetry settings
 */
export const TelemetrySettings = {
    // Target Azure apps insight destination
    azureInstrumentationKey: azure.azureInstrumentationKey,
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
