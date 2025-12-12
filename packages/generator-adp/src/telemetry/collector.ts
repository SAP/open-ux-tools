import { PerformanceMeasurementAPI } from '@sap-ux/telemetry';

import type { AdpTelemetryData, AdpTelemetryTimerProperties } from '../types';

const DEFAULT_DATA: AdpTelemetryData = {
    wasExtProjectGenerated: false,
    wasFlpConfigDone: false,
    wasDeployConfigDone: false,
    wasTypeScriptChosen: false
};

/**
 * Telemetry collector for ADP generator. Tracks telemetry data throughout the generation process.
 */
export class TelemetryCollector {
    /**
     * Map of timing mark names.
     */
    private readonly timingMarkNames: Map<string, string> = new Map();
    /**
     * Telemetry data.
     */
    private readonly data: AdpTelemetryData = { ...DEFAULT_DATA };

    /**
     * Gets the telemetry data.
     *
     * @returns {AdpTelemetryData} The telemetry data.
     */
    get telemetryData(): AdpTelemetryData {
        return this.data;
    }

    /**
     * Sets a batch of telemetry data.
     *
     * @param {Partial<AdpTelemetryData>} data - The data to set.
     */
    setBatch(data: Partial<AdpTelemetryData>): void {
        Object.assign(this.data, data);
    }

    /**
     * Starts timing for a specific timer property. Call endTiming with the same key to record the duration.
     *
     * @param {keyof AdpTelemetryTimerProperties} key - The timer property name that will store the duration (e.g., 'applicationListLoadingTime').
     */
    startTiming(key: keyof AdpTelemetryTimerProperties): void {
        const markName = PerformanceMeasurementAPI.startMark(key);
        this.timingMarkNames.set(key, markName);
    }

    /**
     * Ends timing for a specific timer property and sets the duration in the telemetry data in milliseconds.
     *
     * @param {keyof AdpTelemetryTimerProperties} key - The timer property name where the duration should be stored (must match the key used in startTiming).
     */
    endTiming(key: keyof AdpTelemetryTimerProperties): void {
        const markName = this.timingMarkNames.get(key);
        if (markName !== undefined) {
            PerformanceMeasurementAPI.endMark(markName);
            PerformanceMeasurementAPI.measure(markName);
            const duration = PerformanceMeasurementAPI.getMeasurementDuration(markName);
            this.setBatch({ [key]: duration as AdpTelemetryData[typeof key] });
            this.timingMarkNames.delete(key);
        }
    }
}
