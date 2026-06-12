// Manual mock for @sap-ux/telemetry

export enum SampleRate {
    NoTelemetry = 'NoTelemetry',
    Low = 'Low',
    Medium = 'Medium',
    High = 'High',
    Full = 'Full'
}

export enum TelemetryEvent {
    Error = 'error',
    Info = 'info',
    Warning = 'warning'
}

export interface TelemetryProperties {
    [key: string]: string | number | boolean;
}

export const initTelemetrySettings = jest.fn();
export const getTelemetryClient = jest.fn(() => ({
    report: jest.fn(),
    reportError: jest.fn(),
    reportWarning: jest.fn()
}));
