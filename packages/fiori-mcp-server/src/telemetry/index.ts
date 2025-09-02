import {
    ClientFactory,
    PerformanceMeasurementAPI as Performance,
    SampleRate,
    TelemetryEvent,
    initTelemetrySettings,
    type TelemetryProperties,
    type ToolsSuiteTelemetryInitSettings
} from '@sap-ux/telemetry';
import { isInternalFeaturesSettingEnabled } from '@sap-ux/feature-toggle';
import { isAppStudio } from '@sap-ux/btp-utils';
import osName from 'os-name';
import i18next from 'i18next';

export const mcpServerName = '@sap-ux/fiori-mcp-server';
const resourceId = process.env.INSTRUMENTATION_KEY;

export interface TelemetryData {
    [key: string]: string;
}

/**
 * Helper class for intialising and preparing event data for telemetry.
 */
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
    public static async initTelemetrySettings(options?: ToolsSuiteTelemetryInitSettings): Promise<void> {
        const telemetryOptions: ToolsSuiteTelemetryInitSettings = {
            consumerModule: {
                name: mcpServerName,
                version: '0.1.0'
            },
            watchTelemetrySettingStore: false,
            internalFeature: isInternalFeaturesSettingEnabled(),
            resourceId: 'resource-id',
            ...options
        };
        await initTelemetrySettings(telemetryOptions);
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
            let osVersionName = i18next.t('telemetry.unknownOs');
            try {
                osVersionName = osName();
            } catch {
                // no matched os name, possible beta or unreleased version
            }
            this._telemetryData = {
                Platform: isAppStudio() ? 'SBAS' : 'VSCode',
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

    private static prepareTelemetryEvent(telemetryEventName: string, telemetryData: TelemetryData): TelemetryEvent {
        // Make sure performance measurement end is called
        TelemetryHelper.markToolsEndTime();
        const generationTime = telemetryData.markName
            ? Performance.getMeasurementDuration(telemetryData.markName)
            : undefined;

        return {
            eventName: telemetryEventName,
            properties: telemetryData,
            measurements: generationTime ? { GenerationTime: generationTime } : {}
        };
    }

    /**
     * Marks the start time. Example usage:
     * At the start of the MCP tool calling phase.
     * It should not be updated everytime calling createTelemetryData().
     */
    public static markToolStartTime(): void {
        TelemetryHelper.createTelemetryData({
            markName: Performance.startMark('MCP_LOADING_TIME')
        });
    }

    /**
     * Marks the end time. Example usage:
     * At the end of the writing phase of the MCP tool calling phase.
     */
    public static markToolsEndTime(): void {
        if (this._telemetryData?.markName) {
            Performance.endMark(this._telemetryData.markName);
            Performance.measure(this._telemetryData.markName);
        }
    }

    /**
     * Sends the telemetry event to the telemetry client.
     *
     * @param telemetryEventName - the event name to be reported
     * @param telemetryData - the telemetry data
     * @param appPath - the path of the application
     * @returns - a promise that resolves when the event is sent
     */
    public static async sendTelemetry(
        telemetryEventName: string,
        telemetryData: TelemetryData,
        appPath?: string
    ): Promise<void> {
        const telemetryEvent = this.prepareTelemetryEvent(telemetryEventName, telemetryData);
        ClientFactory.getTelemetryClient().reportEvent(
            telemetryEvent,
            SampleRate.NoSampling,
            appPath ? { appPath } : undefined
        );
    }

    public static getTelemetryName(): string {
        return mcpServerName;
    }
}
