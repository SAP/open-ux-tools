/**
 * Value Help Telemetry Events
 *
 * Defines telemetry event constants and interfaces for value help functionality.
 * These events track user interactions with value help downloads in OData service inquirer.
 *
 * Note: The actual sending of telemetry events should be handled by the consumer packages
 * using their preferred telemetry mechanisms (e.g., inquirer-common, fiori-generator-shared).
 */

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
    /** Service metadata version (v2/v4) */
    odataVersion?: string;
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
