import { PerformanceMeasurementAPI } from '@sap-ux/telemetry';

import type { AdpTelemetryData, AdpTelemetryTimerProperties } from '../types';

/**
 * Telemetry collector for ADP generator.
 * Tracks telemetry data throughout the generation process.
 * Uses a static class pattern to maintain state across the generator lifecycle.
 */
export class TelemetryCollector {
    private static readonly timingMarkNames: Map<string, string> = new Map();
    private static data: AdpTelemetryData = {
        wasExtProjectGenerated: false,
        wasFlpConfigDone: false,
        wasDeployConfigDone: false,
        wasTypeScriptChosen: false
    };

    /**
     * Initializes the telemetry collector for a new generation session.
     * Resets all timing marks and telemetry data to default values.
     */
    public static init(): void {
        this.timingMarkNames.clear();
    }

    /**
     * Sets a telemetry data value by key.
     *
     * @param key - The key of the telemetry data property to set.
     * @param value - The value to set.
     */
    public static setData<K extends keyof AdpTelemetryData>(key: K, value: AdpTelemetryData[K]): void {
        this.data[key] = value;
    }

    /**
     * Starts timing for a specific timer property. Call endTiming with the same key to record the duration.
     *
     * @param key - The timer property name that will store the duration (e.g., 'applicationListLoadingTime').
     */
    public static startTiming(key: keyof AdpTelemetryTimerProperties): void {
        const markName = PerformanceMeasurementAPI.startMark(key);
        this.timingMarkNames.set(key, markName);
    }

    /**
     * Ends timing for a specific timer property and sets the duration in the telemetry data.
     * The duration is calculated using PerformanceMeasurementAPI and stored in milliseconds.
     *
     * @param key - The timer property name where the duration should be stored (must match the key used in startTiming).
     */
    public static endTiming(key: keyof AdpTelemetryTimerProperties): void {
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
     * Returns a shallow copy to prevent external modifications.
     *
     * @returns A copy of the telemetry data object, or undefined if no data exists.
     */
    public static getData(): AdpTelemetryData | undefined {
        return this.data ? { ...this.data } : undefined;
    }
}
