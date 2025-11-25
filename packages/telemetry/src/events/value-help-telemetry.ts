/**
 * Value Help Telemetry Events
 *
 * Defines telemetry event constants and interfaces for value help functionality.
 * These events track user interactions with value help downloads in OData service inquirer.
 *
 * Note: The actual sending of telemetry events should be handled by the consumer packages
 * using their preferred telemetry mechanisms (e.g., inquirer-common, fiori-generator-shared).
 */

import type { TelemetryMeasurements, TelemetryProperties } from '../base/types';
import { ClientFactory } from '../base/client';

/**
 * Telemetry event names for value help functionality
 */
export const VALUE_HELP_TELEMETRY_EVENTS = {
    /**
     * Fired when value list references are detected in the metadata
     */
    VALUE_HELP_DETECTED: 'ValueHelpDetected',

    /**
     * Fired when user makes a decision about downloading value help
     */
    VALUE_HELP_DOWNLOAD_DECISION: 'ValueHelpDownloadDecision',

    /**
     * Fired to track performance metrics of value help download process
     */
    VALUE_HELP_DOWNLOAD_PERFORMANCE: 'ValueHelpDownloadPerformance'
} as const;

/**
 * Properties for value help detected telemetry event
 */
export interface ValueHelpDetectedProperties {
    /** Number of value list references detected */
    valueListCount: number;
    /** Entity container name where references were found */
    entityContainer?: string;
    /** Source of the metadata (url, file, etc.) */
    metadataSource?: string;
}

/**
 * Properties for value help download decision telemetry event
 */
export interface ValueHelpDownloadDecisionProperties {
    /** Whether user chose to download value help */
    downloadDecision: 'yes' | 'no';
    /** Number of value list references available */
    availableValueLists: number;
    /** Reason for the decision if provided */
    decisionReason?: string;
    /** Time taken to make the decision in milliseconds */
    decisionTimeMs?: number;
}

/**
 * Properties for value help download performance telemetry event
 */
export interface ValueHelpDownloadPerformanceProperties {
    /** Total time taken for download process in milliseconds */
    downloadDurationMs: number;
    /** Number of value lists successfully downloaded */
    successCount: number;
    /** Number of value lists that failed to download */
    failureCount: number;
    /** Total number of entries downloaded across all value lists */
    totalEntriesDownloaded?: number;
    /** Average download time per value list in milliseconds */
    averageDownloadTimeMs?: number;
    /** Whether the download was completed or cancelled */
    downloadStatus: 'completed' | 'cancelled' | 'error';
    /** Error details if download failed */
    errorType?: string;
}

/**
 * Type definitions for telemetry event sender functions
 * These should be implemented by consumer packages using their preferred telemetry mechanisms
 */
export type ValueHelpDetectedSender = (properties: ValueHelpDetectedProperties) => void;
export type ValueHelpDownloadDecisionSender = (properties: ValueHelpDownloadDecisionProperties) => void;
export type ValueHelpDownloadPerformanceSender = (properties: ValueHelpDownloadPerformanceProperties) => void;

/**
 * Helper function to create a performance tracking context for value help downloads.
 *
 * @param startTime - Start time of the download process
 * @param performanceSender - Function to send performance telemetry
 * @returns Object with helper methods for tracking performance
 */
export function createValueHelpPerformanceTracker(
    startTime: number = Date.now(),
    performanceSender?: ValueHelpDownloadPerformanceSender
): {
    markCompleted: (
        successCount: number,
        failureCount?: number,
        additionalProperties?: Partial<ValueHelpDownloadPerformanceProperties>
    ) => void;
    markCancelled: () => void;
    markFailed: (errorType: string, additionalProperties?: Partial<ValueHelpDownloadPerformanceProperties>) => void;
} {
    return {
        /**
         * Mark the download as completed and send performance telemetry.
         *
         * @param successCount - Number of successful downloads
         * @param failureCount - Number of failed downloads
         * @param additionalProperties - Additional properties to include
         */
        markCompleted(
            successCount: number,
            failureCount: number = 0,
            additionalProperties: Partial<ValueHelpDownloadPerformanceProperties> = {}
        ): void {
            if (performanceSender) {
                const duration = Date.now() - startTime;
                const totalCount = successCount + failureCount;

                performanceSender({
                    downloadDurationMs: duration,
                    successCount,
                    failureCount,
                    downloadStatus: failureCount > 0 ? 'error' : 'completed',
                    averageDownloadTimeMs: totalCount > 0 ? duration / totalCount : 0,
                    ...additionalProperties
                });
            }
        },

        /**
         * Mark the download as cancelled and send performance telemetry.
         */
        markCancelled(): void {
            if (performanceSender) {
                const duration = Date.now() - startTime;

                performanceSender({
                    downloadDurationMs: duration,
                    successCount: 0,
                    failureCount: 0,
                    downloadStatus: 'cancelled'
                });
            }
        },

        /**
         * Mark the download as failed and send performance telemetry.
         *
         * @param errorType - Type of error that occurred
         * @param additionalProperties - Additional properties to include
         */
        markFailed(
            errorType: string,
            additionalProperties: Partial<ValueHelpDownloadPerformanceProperties> = {}
        ): void {
            if (performanceSender) {
                const duration = Date.now() - startTime;

                performanceSender({
                    downloadDurationMs: duration,
                    successCount: 0,
                    failureCount: 1,
                    downloadStatus: 'error',
                    errorType,
                    ...additionalProperties
                });
            }
        }
    };
}

/**
 * Shared telemetry functions for value help functionality.
 * These functions can be used across different tools and contexts where value help data is downloaded.
 */

/**
 * Send telemetry event when value helps are detected in V4 service.
 *
 * @param valueHelpCount - Number of value helps detected
 * @param additionalProperties - Additional telemetry properties
 */
export function sendValueHelpDetectedTelemetry(
    valueHelpCount: number,
    additionalProperties: Partial<ValueHelpDetectedProperties> = {}
): void {
    try {
        const properties: TelemetryProperties = {
            valueListCount: valueHelpCount.toString(),
            odataVersion: 'v4',
            ...Object.fromEntries(
                Object.entries(additionalProperties).map(([key, value]) => [key, value?.toString() ?? ''])
            )
        };

        const measurements: TelemetryMeasurements = {
            valueListCount: valueHelpCount
        };

        ClientFactory.getTelemetryClient()
            .reportEvent({
                eventName: VALUE_HELP_TELEMETRY_EVENTS.VALUE_HELP_DETECTED,
                properties,
                measurements
            })
            .catch(() => {
                // Silently ignore telemetry errors
            });
    } catch (error) {
        // Silently fail - telemetry should never crash the application
    }
}

/**
 * Send telemetry event for user decision on value help download.
 *
 * @param downloadDecision - Whether user chose to download value helps
 * @param valueHelpCount - Number of value helps available
 * @param additionalProperties - Additional telemetry properties
 */
export function sendValueHelpDownloadDecisionTelemetry(
    downloadDecision: boolean,
    valueHelpCount: number,
    additionalProperties: Partial<ValueHelpDownloadDecisionProperties> = {}
): void {
    try {
        const properties: TelemetryProperties = {
            downloadDecision: downloadDecision ? 'yes' : 'no',
            availableValueLists: valueHelpCount.toString(),
            ...Object.fromEntries(
                Object.entries(additionalProperties).map(([key, value]) => [key, value?.toString() ?? ''])
            )
        };

        const measurements: TelemetryMeasurements = {
            availableValueLists: valueHelpCount
        };

        ClientFactory.getTelemetryClient()
            .reportEvent({
                eventName: VALUE_HELP_TELEMETRY_EVENTS.VALUE_HELP_DOWNLOAD_DECISION,
                properties,
                measurements
            })
            .catch(() => {
                // Silently ignore telemetry errors
            });
    } catch (error) {
        // Silently fail - telemetry should never crash the application
    }
}

/**
 * Send telemetry event for value help download performance.
 *
 * @param downloadTimeMs - Time taken to download value helps in milliseconds
 * @param valueHelpCount - Number of value helps downloaded
 * @param success - Whether the download was successful
 * @param additionalProperties - Additional telemetry properties
 */
export function sendValueHelpDownloadPerformanceTelemetry(
    downloadTimeMs: number,
    valueHelpCount: number,
    success: boolean,
    additionalProperties: Partial<ValueHelpDownloadPerformanceProperties> = {}
): void {
    try {
        const properties: TelemetryProperties = {
            downloadDurationMs: downloadTimeMs.toString(),
            successCount: (success ? valueHelpCount : 0).toString(),
            failureCount: (success ? 0 : valueHelpCount).toString(),
            downloadStatus: success ? 'completed' : 'error',
            ...Object.fromEntries(
                Object.entries(additionalProperties).map(([key, value]) => [key, value?.toString() ?? ''])
            )
        };

        const measurements: TelemetryMeasurements = {
            downloadDurationMs: downloadTimeMs,
            successCount: success ? valueHelpCount : 0,
            failureCount: success ? 0 : valueHelpCount
        };

        ClientFactory.getTelemetryClient()
            .reportEvent({
                eventName: VALUE_HELP_TELEMETRY_EVENTS.VALUE_HELP_DOWNLOAD_PERFORMANCE,
                properties,
                measurements
            })
            .catch(() => {
                // Silently ignore telemetry errors
            });
    } catch (error) {
        // Silently fail - telemetry should never crash the application
    }
}
