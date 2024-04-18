import { isAppStudio } from '@sap-ux/btp-utils';
import type { TelemetryEvent, TelemetryProperties } from '@sap-ux/telemetry';
import { ClientFactory, SampleRate } from '@sap-ux/telemetry';
import osName from 'os-name';
import { PLATFORMS } from '../types';

const osVersionName = osName();

/**
 * Determine if the current prompting environment is cli or a hosted extension (app studio or vscode).
 *
 * @returns the platform name and technical name
 */
export function getPlatform(): { name: string; technical: string } {
    if ((process.mainModule && process.mainModule.filename.includes('yo')) ?? process.stdin.isTTY) {
        return PLATFORMS.CLI;
    } else {
        return isAppStudio() ? PLATFORMS.SBAS : PLATFORMS.VSCODE;
    }
}

/**
 * Send telemetry event.
 *
 * @param eventName the name of the telemetry event
 * @param telemetryData the telemetry values to report
 */
export function sendTelemetryEvent(eventName: string, telemetryData: TelemetryProperties): void {
    const telemetryEvent = createTelemetryEvent(eventName, telemetryData);
    /* eslint-disable @typescript-eslint/no-floating-promises */
    ClientFactory.getTelemetryClient().reportEvent(telemetryEvent, SampleRate.NoSampling);
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
        Platform: getPlatform().technical,
        OperatingSystem: osVersionName
    });
    return {
        eventName,
        properties: telemProps,
        measurements: {}
    };
}
