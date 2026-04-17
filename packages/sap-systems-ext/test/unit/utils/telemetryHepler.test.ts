import { TelemetryHelper } from '../../../src/utils';
import * as uxTelemetry from '@sap-ux/telemetry';

jest.mock('@sap-ux/telemetry', () => {
    jest.requireActual('@sap-ux/telemetry');
    return {
        ...jest.requireActual('@sap-ux/telemetry'),
        initTelemetrySettings: jest.fn().mockResolvedValue(undefined)
    };
});

jest.mock('os-name', () => {
    return () => 'mocked-os';
});

describe('Test the TelemetryHelper', () => {
    it('should create telemetry data with default properties', async () => {
        const additionalData = {
            customProp1: 'value1',
            customProp2: 'value2'
        };
        const initTelemetrySpy = jest.spyOn(uxTelemetry, 'initTelemetrySettings');
        await TelemetryHelper.initTelemetrySettings();
        expect(initTelemetrySpy).toHaveBeenCalled();

        const telemetryData = TelemetryHelper.createTelemetryData(additionalData);
        expect(telemetryData).toBeDefined();
        expect(telemetryData).toHaveProperty('customProp1', 'value1');
        expect(telemetryData).toHaveProperty('customProp2', 'value2');

        const telemetryName = TelemetryHelper.getTelemetryName();
        expect(telemetryName).toBe('sap-systems-ext');
    });
});
