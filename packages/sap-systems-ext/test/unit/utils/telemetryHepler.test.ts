import { jest } from '@jest/globals';
const mockInitTelemetrySettings = jest.fn().mockResolvedValue(undefined);

const realTelemetry = await import('@sap-ux/telemetry');
jest.unstable_mockModule('@sap-ux/telemetry', () => ({
    ...realTelemetry,
    initTelemetrySettings: mockInitTelemetrySettings
}));

jest.unstable_mockModule('os-name', () => ({
    default: () => 'mocked-os'
}));

const { TelemetryHelper } = await import('../../../src/utils');

describe('Test the TelemetryHelper', () => {
    it('should create telemetry data with default properties', async () => {
        const additionalData = {
            customProp1: 'value1',
            customProp2: 'value2'
        };
        await TelemetryHelper.initTelemetrySettings();
        expect(mockInitTelemetrySettings).toHaveBeenCalled();

        const telemetryData = TelemetryHelper.createTelemetryData(additionalData);
        expect(telemetryData).toBeDefined();
        expect(telemetryData).toHaveProperty('customProp1', 'value1');
        expect(telemetryData).toHaveProperty('customProp2', 'value2');

        const telemetryName = TelemetryHelper.getTelemetryName();
        expect(telemetryName).toBe('sap-systems-ext');
    });
});
