import { SampleRate, ClientFactory } from '@sap-ux/telemetry';

/**
 * Log a telemetry event.
 *
 * @param eventName - the name of the event to log
 * @param properties - additional properties to include in the telemetry event
 */
export function logTelemetryEvent(eventName: string, properties: { [key: string]: string } = {}): void {
    const telemetryEvent = { eventName, properties, measurements: {} };
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    ClientFactory.getTelemetryClient().reportEvent(telemetryEvent, SampleRate.NoSampling);
}
