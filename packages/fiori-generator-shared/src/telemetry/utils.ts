import { ClientFactory, PerformanceMeasurementAPI as Performance, SampleRate } from '@sap-ux/telemetry';
import type { TelemetryEvent } from '@sap-ux/telemetry';
import type { TelemetryData } from './types';
import { TelemetryHelper } from './telemetryHelper';

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
