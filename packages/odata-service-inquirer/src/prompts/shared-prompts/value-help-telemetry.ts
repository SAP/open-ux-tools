/**
 * Value Help Telemetry Functions
 *
 * This module provides telemetry functions for value help functionality using the
 * shared telemetry event definitions from @sap-ux/telemetry.
 */

// Import shared telemetry event definitions and types
import {
    VALUE_HELP_TELEMETRY_EVENTS,
    ValueHelpDetectedProperties,
    ValueHelpDownloadDecisionProperties,
    ValueHelpDownloadPerformanceProperties
} from '@sap-ux/telemetry';

import { sendTelemetryEvent } from '@sap-ux/inquirer-common';
import { TelemetryHelper } from '@sap-ux/fiori-generator-shared';

/**
 * Send telemetry event when value helps are detected in V4 service.
 *
 * @param valueHelpCount - Number of value helps detected
 */
export function sendValueHelpDetectedTelemetry(valueHelpCount: number): void {
    try {
        const telemetryData =
            TelemetryHelper.createTelemetryData({
                valueListCount: valueHelpCount,
                odataVersion: 'v4'
            }) ?? {};
        sendTelemetryEvent(VALUE_HELP_TELEMETRY_EVENTS.VALUE_HELP_DETECTED, telemetryData);
    } catch (error) {
        // Silently fail - telemetry should never crash the application
        console.debug('Failed to send value help detected telemetry:', error);
    }
}

/**
 * Send telemetry event for user decision on value help download.
 *
 * @param downloadDecision - Whether user chose to download value helps
 * @param valueHelpCount - Number of value helps available
 */
export function sendValueHelpDownloadDecisionTelemetry(downloadDecision: boolean, valueHelpCount: number): void {
    try {
        const telemetryData =
            TelemetryHelper.createTelemetryData({
                downloadDecision: downloadDecision ? 'yes' : 'no',
                availableValueLists: valueHelpCount
            }) ?? {};
        sendTelemetryEvent(VALUE_HELP_TELEMETRY_EVENTS.VALUE_HELP_DOWNLOAD_DECISION, telemetryData);
    } catch (error) {
        // Silently fail - telemetry should never crash the application
        console.debug('Failed to send value help download decision telemetry:', error);
    }
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
    try {
        const telemetryData =
            TelemetryHelper.createTelemetryData({
                downloadDurationMs: downloadTimeMs,
                successCount: success ? valueHelpCount : 0,
                failureCount: success ? 0 : valueHelpCount,
                downloadStatus: success ? 'completed' : 'error'
            }) ?? {};
        sendTelemetryEvent(VALUE_HELP_TELEMETRY_EVENTS.VALUE_HELP_DOWNLOAD_PERFORMANCE, telemetryData);
    } catch (error) {
        // Silently fail - telemetry should never crash the application
        console.debug('Failed to send value help download performance telemetry:', error);
    }
}
