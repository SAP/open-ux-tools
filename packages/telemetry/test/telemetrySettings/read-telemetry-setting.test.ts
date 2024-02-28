import * as storeMock from '@sap-ux/store';
import { getTelemetrySetting } from '../../src/tooling-telemetry';

describe('Tests for getTelemetrySetting()', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Telemetry setting should be enabled', async () => {
        // Mock setup
        jest.spyOn(storeMock, 'getService').mockImplementation(() =>
            Promise.resolve({
                read: () => Promise.resolve({ enableTelemetry: true })
            } as unknown as storeMock.Service<storeMock.TelemetrySetting, storeMock.TelemetrySettingKey>)
        );

        // Test execution
        const setting = await getTelemetrySetting();

        // Check results
        expect(setting?.enableTelemetry).toBe(true);
    });

    it('Telemetry setting should be disabled', async () => {
        // Mock setup
        jest.spyOn(storeMock, 'getService').mockImplementation(() =>
            Promise.resolve({
                read: () => Promise.resolve({ enableTelemetry: false })
            } as unknown as storeMock.Service<storeMock.TelemetrySetting, storeMock.TelemetrySettingKey>)
        );

        // Test execution
        const setting = await getTelemetrySetting();

        // Check results
        expect(setting?.enableTelemetry).toBe(false);
    });

    it('Telemetry setting should be undefined', async () => {
        // Mock setup
        jest.spyOn(storeMock, 'getService').mockImplementation(() =>
            Promise.resolve({
                read: () => Promise.resolve(undefined)
            } as unknown as storeMock.Service<storeMock.TelemetrySetting, storeMock.TelemetrySettingKey>)
        );

        // Test execution
        const setting = await getTelemetrySetting();

        // Check results
        expect(setting).toBe(undefined);
    });

    it('Error thrown while getTelemetrySetting() - should be undefined', async () => {
        // Mock setup
        jest.spyOn(storeMock, 'getService').mockImplementation(() =>
            Promise.resolve({
                read: () => Promise.reject()
            } as unknown as storeMock.Service<storeMock.TelemetrySetting, storeMock.TelemetrySettingKey>)
        );

        // Test execution
        const setting = await getTelemetrySetting();

        // Check results
        expect(setting).toBe(undefined);
    });
});
