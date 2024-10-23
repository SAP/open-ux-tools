import {
    PerformanceMeasurementAPI as Performance,
    initTelemetrySettings,
    type TelemetryProperties,
    type ToolsSuiteTelemetryInitSettings
} from '@sap-ux/telemetry';
import type { TelemetryData } from './types';
import { getHostEnvironment } from '../environment';
import osName from 'os-name';
import { t } from '../i18n';

export abstract class TelemetryHelper {
    private static _telemetryData: TelemetryData;
    private static _previousEventTimestamp: number;

    /**
     * Returns the telemetry data.
     *
     * @returns telemetry data
     */
    public static get telemetryData(): TelemetryData {
        return this._telemetryData;
    }

    /**
     * Load telemetry settings.
     *
     * @param options - tools suite telemetry init settings
     */
    public static async initTelemetrySettings(options: ToolsSuiteTelemetryInitSettings): Promise<void> {
        await initTelemetrySettings(options);
    }

    /**
     * Creates telemetry data and adds default telemetry props.
     *
     * @param additionalData - set additional properties to be reported by telemetry
     * @param filterDups - filters duplicates by returning undefined if it's suspected to be a repeated event based on previous telemetry data & timestamp (1 second)
     * @returns telemetry data
     */
    public static createTelemetryData<T extends TelemetryProperties>(
        additionalData?: Partial<T>,
        filterDups = false
    ): TelemetryData | undefined {
        const currentTimestamp = new Date().getTime();
        if (!this._previousEventTimestamp) {
            filterDups = false; // can't filter duplicates if no previous event timestamp
            this._previousEventTimestamp = currentTimestamp;
        }

        if (!this._telemetryData) {
            let osVersionName = t('telemetry.unknownOs');
            try {
                osVersionName = osName();
            } catch {
                // no matched os name, possible beta or unreleased version
            }
            this._telemetryData = {
                Platform: getHostEnvironment().technical,
                OperatingSystem: osVersionName
            };
        }

        if (filterDups) {
            const newTelemData = { ...this._telemetryData, ...additionalData };
            if (
                Math.abs(this._previousEventTimestamp - currentTimestamp) < 1000 &&
                JSON.stringify(newTelemData) === JSON.stringify(this._telemetryData)
            ) {
                return undefined;
            }
        }
        this._previousEventTimestamp = currentTimestamp;
        this._telemetryData = Object.assign(this._telemetryData, additionalData);

        return this._telemetryData;
    }

    /**
     * Marks the start time. Example usage:
     * At the start of of the writing phase of the yeoman generator.
     * It should not be updated everytime calling createTelemetryData().
     */
    public static markAppGenStartTime(): void {
        TelemetryHelper.createTelemetryData({
            markName: Performance.startMark('LOADING_TIME')
        });
    }

    /**
     * Marks the end time. Example usage:
     * At the end of the writing phase of yeoman generator.
     */
    public static markAppGenEndTime(): void {
        if (this._telemetryData?.markName) {
            Performance.endMark(this._telemetryData.markName);
            Performance.measure(this._telemetryData.markName);
        }
    }
}
