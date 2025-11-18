import { sendTelemetryEvent } from '@sap-ux/inquirer-common';
import { TelemetryHelper } from '@sap-ux/fiori-generator-shared';

// Telemetry event names for value help functionality
const TELEMETRY_VALUE_HELP_DETECTED = 'VALUE_HELP_DETECTED';
const TELEMETRY_VALUE_HELP_DOWNLOAD_DECISION = 'VALUE_HELP_DOWNLOAD_DECISION';
const TELEMETRY_VALUE_HELP_DOWNLOAD_PERFORMANCE = 'VALUE_HELP_DOWNLOAD_PERFORMANCE';

/**
 * Send telemetry event when value helps are detected in V4 service.
 *
 * @param valueHelpCount - Number of value helps detected
 */
export function sendValueHelpDetectedTelemetry(valueHelpCount: number): void {
    const telemetryData =
        TelemetryHelper.createTelemetryData({
            valueHelpCount,
            odataVersion: 'v4'
        }) ?? {};
    sendTelemetryEvent(TELEMETRY_VALUE_HELP_DETECTED, telemetryData);
}

/**
 * Send telemetry event for user decision on value help download.
 *
 * @param downloadDecision - Whether user chose to download value helps
 * @param valueHelpCount - Number of value helps available
 */
export function sendValueHelpDownloadDecisionTelemetry(downloadDecision: boolean, valueHelpCount: number): void {
    const telemetryData =
        TelemetryHelper.createTelemetryData({
            downloadDecision,
            valueHelpCount,
            odataVersion: 'v4'
        }) ?? {};
    sendTelemetryEvent(TELEMETRY_VALUE_HELP_DOWNLOAD_DECISION, telemetryData);
}

/**
 * Send telemetry event for value help download performance.
 *
 * @param downloadTimeMs - Time taken to download value helps in milliseconds
 * @param valueHelpCount - Number of value helps downloaded
 * @param success - Whether the download was successful
 */
export function sendValueHelpDownloadPerformanceTelemetry(
    downloadTimeMs: number,
    valueHelpCount: number,
    success: boolean
): void {
    const telemetryData =
        TelemetryHelper.createTelemetryData({
            downloadTimeMs,
            valueHelpCount,
            success,
            odataVersion: 'v4'
        }) ?? {};
    sendTelemetryEvent(TELEMETRY_VALUE_HELP_DOWNLOAD_PERFORMANCE, telemetryData);
}
