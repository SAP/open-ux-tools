import { ClientFactory, PerformanceMeasurementAPI as Performance, SampleRate } from '@sap-ux/telemetry';
import type { TelemetryEvent } from '@sap-ux/telemetry';
import type { TelemetryData } from './types';
import { TelemetryHelper } from './telemetryHelper';

/**
 * Prepares the telemetry event to be sent to the telemetry client.
 *
 * @param generationEvent - the event name to be reported
 * @param telemetryData - the telemetry data
 * @returns - the telemetry event
 */
function prepareTelemetryEvent(generationEvent: string, telemetryData: TelemetryData): TelemetryEvent {
    // Make sure performance measurement end is called
    TelemetryHelper.markAppGenEndTime();
    const generationTime = telemetryData.markName
        ? Performance.getMeasurementDuration(telemetryData.markName)
        : undefined;

    return {
        eventName: generationEvent,
        properties: telemetryData,
        measurements: generationTime ? { GenerationTime: generationTime } : {}
    };
}

/**
 * Sends the telemetry event to the telemetry client.
 *
 * @param generationEvent - the event name to be reported
 * @param telemetryData - the telemetry data
 * @param appPath - the path of the application
 * @returns - a promise that resolves when the event is sent
 */
export async function sendTelemetry(
    generationEvent: string,
    telemetryData: TelemetryData,
    appPath?: string
): Promise<void> {
    const telemetryEvent = prepareTelemetryEvent(generationEvent, telemetryData);
    return ClientFactory.getTelemetryClient().reportEvent(
        telemetryEvent,
        SampleRate.NoSampling,
        appPath ? { appPath } : undefined
    );
}

/**
 * Sends the telemetry event to the telemetry client and blocks the execution until the event is sent.
 *
 * @param generationEvent - the event name to be reported
 * @param telemetryData - the telemetry data
 * @param appPath - the path of the application
 * @returns - a promise that resolves when the event is sent
 */
export async function sendTelemetryBlocking(
    generationEvent: string,
    telemetryData: TelemetryData,
    appPath?: string
): Promise<void> {
    const telemetryEvent = prepareTelemetryEvent(generationEvent, telemetryData);
    return ClientFactory.getTelemetryClient().reportEventBlocking(
        telemetryEvent,
        SampleRate.NoSampling,
        appPath ? { appPath } : undefined
    );
}
