import {
    ClientFactory,
    SampleRate,
    initTelemetrySettings,
    type TelemetryEvent,
    type ToolsSuiteTelemetryInitSettings
} from '@sap-ux/telemetry';
import { isAppStudio } from '@sap-ux/btp-utils';
import { randomUUID } from 'node:crypto';
import osName from 'os-name';
import i18next from 'i18next';
import { version } from '../../package.json';
import { ODataDownloadGenerator } from '../data-download';

const generatorName = '@sap-ux/odata-download-sub-generator';

const resourceId = 'ApplicationInsightsInstrumentationKeyPLACEH0LDER';

export interface TelemetryData {
    [key: string]: string;
}

/**
 * Helper class for initialising and preparing event data for telemetry.
 */
export abstract class TelemetryHelper {
    private static _telemetryData: TelemetryData;
    private static _sessionId: string;

    /**
     * Load telemetry settings.
     *
     * @param options - tools suite telemetry init settings
     */
    public static async initTelemetrySettings(options?: ToolsSuiteTelemetryInitSettings): Promise<void> {
        this._sessionId = randomUUID();
        ODataDownloadGenerator.logger.info(`Telemetry session initialized with ID: ${this._sessionId}`);

        const telemetryOptions: ToolsSuiteTelemetryInitSettings = {
            consumerModule: {
                name: generatorName,
                version
            },
            watchTelemetrySettingStore: false,
            internalFeature: true,
            resourceId,
            ...options
        };
        try {
            await initTelemetrySettings(telemetryOptions);
        } catch (error) {
            ODataDownloadGenerator.logger.error(`Error initializing telemetry settings: ${error}`);
        }
    }

    /**
     * Creates telemetry data and adds default telemetry props.
     *
     * @param additionalData - set additional properties to be reported by telemetry
     * @returns telemetry data
     */
    private static createTelemetryData(additionalData?: Partial<TelemetryData>): TelemetryData {
        if (!this._telemetryData) {
            let osVersionName = i18next.t('telemetry.unknownOs');
            try {
                osVersionName = osName();
            } catch {
                // no matched os name, possible beta or unreleased version
            }
            this._telemetryData = {
                Platform: isAppStudio() ? 'SBAS' : 'VSCode',
                OperatingSystem: osVersionName,
                SessionId: this._sessionId
            };
        }

        this._telemetryData = Object.assign(this._telemetryData, additionalData);
        return this._telemetryData;
    }

    /**
     * Prepares the telemetry event.
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
     * Automatically enriches the telemetry data with base properties (SessionId, Platform, OperatingSystem).
     *
     * @param telemetryEventName - the event name to be reported
     * @param telemetryData - the telemetry data
     * @returns - a promise that resolves when the event is sent
     */
    public static async sendTelemetry(telemetryEventName: string, telemetryData: TelemetryData): Promise<void> {
        const telemetryDataWithContext = this.createTelemetryData(telemetryData);
        const telemetryEvent = this.prepareTelemetryEvent(telemetryEventName, telemetryDataWithContext);
        await ClientFactory.getTelemetryClient().reportEvent(telemetryEvent, SampleRate.NoSampling);
    }
}
