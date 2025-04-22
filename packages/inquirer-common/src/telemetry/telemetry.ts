import {
    type Destination,
    isAbapODataDestination,
    isFullUrlDestination,
    isPartialUrlDestination
} from '@sap-ux/btp-utils';
import type { TelemetryEvent, TelemetryProperties, ToolsSuiteTelemetryClient } from '@sap-ux/telemetry';
import { SampleRate } from '@sap-ux/telemetry';
import osName from 'os-name';
import type { TelemPropertyDestinationType } from '../types';
import { getHostEnvironment } from '@sap-ux/fiori-generator-shared';

let telemetryClient: ToolsSuiteTelemetryClient | undefined;
const osVersionName = osName();

/**
 * Set the telemetry client for use with sending telemetry events.
 *
 * @param toolsSuiteTelemetryClient the telemetry client instance to use when sending telemetry events
 */
export function setTelemetryClient(toolsSuiteTelemetryClient: ToolsSuiteTelemetryClient | undefined): void {
    telemetryClient = toolsSuiteTelemetryClient;
}

/**
 * Get the telemetry client if set.
 *
 * @returns the telemetry client instance if previously set.
 */
export function getTelemetryClient(): ToolsSuiteTelemetryClient | undefined {
    return telemetryClient;
}

/**
 * Send telemetry event.
 *
 * @param eventName the name of the telemetry event
 * @param telemetryData the telemetry values to report
 */
export function sendTelemetryEvent(eventName: string, telemetryData: TelemetryProperties): void {
    const telemetryEvent = createTelemetryEvent(eventName, telemetryData);
    if (telemetryClient) {
        // Do not wait for the telemetry event to be sent, it cannot be recovered if it fails, do not block the process
        /* eslint-disable @typescript-eslint/no-floating-promises */
        telemetryClient.reportEvent(telemetryEvent, SampleRate.NoSampling);
    }
}

/**
 * Create telemetry event.
 *
 * @param eventName the name of the telemetry event
 * @param telemetryData the telemetry values to add to he returned telemetry event
 * @returns the telemetry event
 */
function createTelemetryEvent(eventName: string, telemetryData: TelemetryProperties): TelemetryEvent {
    const telemProps: TelemetryProperties = Object.assign(telemetryData, {
        OperatingSystem: osVersionName,
        Platform: telemetryData.Platform || getHostEnvironment().technical
    });
    return {
        eventName,
        properties: telemProps,
        measurements: {}
    };
}

/**
 * Used only to generate telemetry events in the case of destination errors.
 *
 * @param destination the destination used to set the telemetry destination type
 * @returns the telemetry property destination type
 */
export function getTelemPropertyDestinationType(destination: Destination): TelemPropertyDestinationType {
    if (isAbapODataDestination(destination)) {
        return 'AbapODataCatalogDest';
    } else if (isFullUrlDestination(destination)) {
        return 'GenericODataFullUrlDest';
    } else if (isPartialUrlDestination(destination)) {
        return 'GenericODataPartialUrlDest';
    } else {
        return 'Unknown';
    }
}
