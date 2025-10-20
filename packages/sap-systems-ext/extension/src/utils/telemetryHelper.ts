import {
    ClientFactory,
    SampleRate,
    initTelemetrySettings,
    type TelemetryEvent,
    type TelemetryProperties,
    type ToolsSuiteTelemetryInitSettings
} from '@sap-ux/telemetry';
import { version } from '../../package.json';
import osName from 'os-name';
import { t } from './i18n';
import SystemsLogger from './logger';

export const sapSystemsExtName = 'sap-systems-ext';
const resourceId = 'ApplicationInsightsInstrumentationKeyPLACEH0LDER';

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
        const telemetryOptions = {
            consumerModule: {
                name: sapSystemsExtName,
                version
            },
            watchTelemetrySettingStore: false,
            resourceId,
            ...options
        } as ToolsSuiteTelemetryInitSettings;
        try {
            await initTelemetrySettings(telemetryOptions);
        } catch (error) {
            SystemsLogger.logger.error(t('telemetry.initializeError', { error }));
        }
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
                Platform: 'VSCode',
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
     * Prepares the telemetry event by calculating the generation time if a mark name is provided.
     *
     * @param telemetryEventName - The name of the telemetry event
     * @param telemetryData - The telemetry data
     * @returns The prepared telemetry event
     */
    private static prepareTelemetryEvent(telemetryEventName: string, telemetryData: TelemetryData): TelemetryEvent {
        return {
            eventName: telemetryEventName,
            properties: telemetryData,
            measurements: {}
        };
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
        await ClientFactory.getTelemetryClient().reportEvent(
            telemetryEvent,
            SampleRate.NoSampling,
            appPath ? { appPath } : undefined
        );
    }

    /**
     * Gets the telemetry name of the module.
     *
     * @returns The module telemetry name.
     */
    public static getTelemetryName(): string {
        return sapSystemsExtName;
    }
}
