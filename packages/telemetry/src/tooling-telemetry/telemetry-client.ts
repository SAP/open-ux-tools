import { ApplicationInsightClient } from '../base/client/azure-appinsight-client';
import type { SampleRate } from '../base/types/sample-rate';
import type {
    TelemetryHelperProperties,
    TelemetryEvent,
    CommonTelemetryProperties,
    TelemetryProperties
} from './types';
import { processToolsSuiteTelemetry } from '.';
import { localDatetimeToUTC } from '../base/utils/date';

/**
 *
 */
class ToolsSuiteTelemetryClient extends ApplicationInsightClient {
    /**
     *
     * @param applicationKey Application key to identify the Azure Application Insight resource
     * @param extensionName Unique name of the extension in the format of {publisher}.{extension}
     * @param extensionVersion Conventional version number of the extension
     */
    public constructor(applicationKey: string, extensionName: string, extensionVersion: string) {
        super(applicationKey, extensionName, extensionVersion);
    }

    /**
     * Send a telemetry event to Azure Application Insights.
     *
     * @deprecated Use reportEvent instead.
     * @param eventName Categorize the type of the event within the scope of an extension.
     * @param properties A set of string properties to be reported
     * @param measurements  A set of numeric measurements to be reported
     * @param sampleRate Sampling the event to be sent
     * @param telemetryHelperProperties Properties that are passed to the processCommonPropertiesHelper function to assit generate project specific telemetry data
     * @param ignoreSettings Ignore telemetryEnabled settings and skip submitting telemetry data
     * @returns Promise<void>
     */
    public async report(
        eventName: string,
        properties: { [key: string]: string },
        measurements: { [key: string]: number },
        sampleRate: SampleRate | undefined,
        telemetryHelperProperties?: TelemetryHelperProperties,
        ignoreSettings?: boolean
    ): Promise<void> {
        const fioriProjectCommonProperties = await processToolsSuiteTelemetry(telemetryHelperProperties);
        const commonProperties = {
            v: this.extensionVersion,
            datetime: localDatetimeToUTC()
        };

        const finalProperties = {
            ...properties,
            ...fioriProjectCommonProperties,
            ...commonProperties
        } as TelemetryProperties;

        await super.report(
            eventName,
            finalProperties,
            measurements,
            sampleRate,
            telemetryHelperProperties as { [key: string]: string },
            ignoreSettings
        );
    }

    /**
     * Send a telemetry event to Azure Application Insights.
     *
     * @param event Telemetry Event
     * @param sampleRate Sampling the event to be sent
     * @param telemetryHelperProperties Properties that are passed to the processCommonPropertiesHelper function to assit generate project specific telemetry data
     * @param ignoreSettings Ignore telemetryEnabled settings and skip submitting telemetry data
     * @returns Promise<void>
     */
    public async reportEvent(
        event: TelemetryEvent,
        sampleRate?: SampleRate,
        telemetryHelperProperties?: TelemetryHelperProperties,
        ignoreSettings?: boolean
    ): Promise<void> {
        const { finalProperties, finalMeasurements } = await this.collectToolsSuiteTelemetry(
            event,
            telemetryHelperProperties
        );

        return super.report(
            event.eventName,
            finalProperties,
            finalMeasurements,
            sampleRate,
            telemetryHelperProperties as { [key: string]: string },
            ignoreSettings
        );
    }

    /**
     * Send a telemetry event to Azure Application Insights. This API makes sure the telemetry event
     * is flushed to Azure backend before executing the next statement. Since this API blocks
     * normal execution flow, please use this API cautiously. See `reportEvent()` method for non-blocking
     * usage.
     *
     * @param event Telemetry Event
     * @param sampleRate Sampling the event to be sent
     * @param telemetryHelperProperties Properties that are passed to the processCommonPropertiesHelper function to assit generate project specific telemetry data
     * @param ignoreSettings Ignore telemetryEnabled settings and skip submitting telemetry data
     * @returns Promise<void>
     */
    public async reportEventBlocking(
        event: TelemetryEvent,
        sampleRate?: SampleRate,
        telemetryHelperProperties?: TelemetryHelperProperties,
        ignoreSettings?: boolean
    ): Promise<void> {
        const { finalProperties, finalMeasurements } = await this.collectToolsSuiteTelemetry(
            event,
            telemetryHelperProperties
        );

        return super.reportBlocking(event.eventName, finalProperties, finalMeasurements, sampleRate, ignoreSettings);
    }

    /**
     * Add common properties to properties and measurements of consumer's telemetry event.
     *
     * @param event telemetry event
     * @param telemetryHelperProperties Additional properties that can be undefined
     * @returns Telemetry properties and measurements
     */
    private async collectToolsSuiteTelemetry(
        event: TelemetryEvent,
        telemetryHelperProperties?: TelemetryHelperProperties
    ): Promise<{ finalProperties: Record<string, string | boolean>; finalMeasurements: Record<string, number> }> {
        const fioriProjectCommonProperties = await processToolsSuiteTelemetry(telemetryHelperProperties);
        const telemetryEventCommonProperties = {
            v: this.extensionVersion,
            datetime: localDatetimeToUTC()
        } as CommonTelemetryProperties;

        const finalProperties = {
            ...event.properties,
            ...fioriProjectCommonProperties,
            ...telemetryEventCommonProperties
        };

        const finalMeasurements = {
            ...event.measurements
        };

        return {
            finalProperties,
            finalMeasurements
        };
    }
}

export { ToolsSuiteTelemetryClient };
