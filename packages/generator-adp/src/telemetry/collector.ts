import {
    PerformanceMeasurementAPI,
    initTelemetrySettings,
    type ToolsSuiteTelemetryInitSettings
} from '@sap-ux/telemetry';
import type { ToolsLogger } from '@sap-ux/logger';
import { TelemetryHelper, sendTelemetry } from '@sap-ux/fiori-generator-shared';

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
    private data: AdpTelemetryData = { ...DEFAULT_DATA };

    /**
     * Private constructor to enforce initialization via init().
     */
    private constructor() {
        this.timingMarkNames.clear();
        this.data = { ...DEFAULT_DATA };
    }

    /**
     * Initializes the telemetry collector with settings and resets data to default values.
     *
     * @param {string} generatorVersion - The version of the generator.
     * @param {boolean} internalFeature - Whether the generator is used internally.
     * @returns {Promise<TelemetryCollector>} A new instance of TelemetryCollector.
     */
    static async init(generatorVersion: string, internalFeature: boolean): Promise<TelemetryCollector> {
        const settings: ToolsSuiteTelemetryInitSettings = {
            consumerModule: {
                name: '@sap/generator-fiori:generator-adp',
                version: generatorVersion
            },
            internalFeature,
            watchTelemetrySettingStore: false
        };

        const instance = new TelemetryCollector();
        await initTelemetrySettings(settings);
        return instance;
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
     * Sets a telemetry data value by key.
     *
     * @param key - The key of the telemetry data property to set.
     * @param value - The value to set.
     */
    setData<K extends keyof AdpTelemetryData>(key: K, value: AdpTelemetryData[K]): void {
        this.data[key] = value;
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
     * Ends timing for a specific timer property and sets the duration in the telemetry data.
     * The duration is calculated using PerformanceMeasurementAPI and stored in milliseconds.
     *
     * @param {keyof AdpTelemetryTimerProperties} key - The timer property name where the duration should be stored (must match the key used in startTiming).
     */
    endTiming(key: keyof AdpTelemetryTimerProperties): void {
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
    private getData(): AdpTelemetryData | undefined {
        return this.data ? { ...this.data } : undefined;
    }

    /**
     * Sends telemetry data by merging collected data with additional properties.
     *
     * @param {string} eventName - The name of the telemetry event.
     * @param {string} projectPath - Optional project path.
     * @param {Record<string, unknown>} additionalData - Optional additional telemetry data to merge.
     * @param {ToolsLogger} logger - Optional logger for error handling.
     */
    send(
        eventName: string,
        projectPath?: string,
        additionalData?: Record<string, unknown>,
        logger?: ToolsLogger
    ): void {
        const data = TelemetryHelper.createTelemetryData({
            appType: 'generator-adp',
            ...additionalData,
            ...this.getData()
        });

        if (data) {
            sendTelemetry(eventName, data, projectPath)
                .then(() => {
                    logger?.log(`Event ${eventName} successfully sent`);
                })
                .catch((error) => {
                    logger?.error(`Failed to send telemetry: ${error}`);
                });
        }
    }
}
