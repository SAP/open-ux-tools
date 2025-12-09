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
    private static readonly timingMarkNames: Map<string, string> = new Map();
    /**
     * Telemetry data.
     */
    private static data: AdpTelemetryData = { ...DEFAULT_DATA };

    /**
     * Resets all timing marks and telemetry data to default values.
     */
    static init(): void {
        this.timingMarkNames.clear();
        this.data = { ...DEFAULT_DATA };
    }

    /**
     * Sets a batch of telemetry data.
     *
     * @param {Partial<AdpTelemetryData>} data - The data to set.
     */
    static setBatch(data: Partial<AdpTelemetryData>): void {
        Object.assign(this.data, data);
    }

    /**
     * Sets a telemetry data value by key.
     *
     * @param key - The key of the telemetry data property to set.
     * @param value - The value to set.
     */
    static setData<K extends keyof AdpTelemetryData>(key: K, value: AdpTelemetryData[K]): void {
        this.data[key] = value;
    }

    /**
     * Starts timing for a specific timer property. Call endTiming with the same key to record the duration.
     *
     * @param {keyof AdpTelemetryTimerProperties} key - The timer property name that will store the duration (e.g., 'applicationListLoadingTime').
     */
    static startTiming(key: keyof AdpTelemetryTimerProperties): void {
        const markName = PerformanceMeasurementAPI.startMark(key);
        this.timingMarkNames.set(key, markName);
    }

    /**
     * Ends timing for a specific timer property and sets the duration in the telemetry data.
     * The duration is calculated using PerformanceMeasurementAPI and stored in milliseconds.
     *
     * @param {keyof AdpTelemetryTimerProperties} key - The timer property name where the duration should be stored (must match the key used in startTiming).
     */
    static endTiming(key: keyof AdpTelemetryTimerProperties): void {
        const markName = this.timingMarkNames.get(key);
        if (markName !== undefined) {
            PerformanceMeasurementAPI.endMark(markName);
            PerformanceMeasurementAPI.measure(markName);
            const duration = PerformanceMeasurementAPI.getMeasurementDuration(markName);
            this.setData(key, duration as AdpTelemetryData[typeof key]);
            this.timingMarkNames.delete(key);
        }
    }

    /**
     * Gets all collected telemetry data.
     *
     * @returns {AdpTelemetryData | undefined} A copy of the telemetry data object, or undefined if no data exists.
     */
    static getData(): AdpTelemetryData | undefined {
        return this.data ? { ...this.data } : undefined;
    }
}
