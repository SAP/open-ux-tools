import { jest } from '@jest/globals';
import { hostEnvironment } from '../../src/types';
import * as actualSapUxTelemetry from '@sap-ux/telemetry';

jest.unstable_mockModule('@vscode-logging/logger', () => ({
    getExtensionLogger: jest.fn()
}));

const mockGetHostEnvironment = jest.fn();
jest.unstable_mockModule('../../src/environment', () => ({
    getHostEnvironment: mockGetHostEnvironment,
    isCli: jest.fn()
}));

const mockInitTelemetrySettings = jest.fn<any>();
jest.unstable_mockModule('@sap-ux/telemetry', () => ({
    ...actualSapUxTelemetry,
    initTelemetrySettings: mockInitTelemetrySettings
}));

const { TelemetryHelper } = await import('../../src/telemetry');
const sapUxTelemetry = await import('@sap-ux/telemetry');

describe('TelemetryHelper', () => {
    describe('initTelemetrySettings', () => {
        it('should call initTelemetrySettings with the provided options', async () => {
            mockInitTelemetrySettings.mockResolvedValue(undefined);
            const opts = {
                consumerModule: { name: 'test', version: '1.0.0' },
                internalFeature: true,
                watchTelemetrySettingStore: false
            };
            await TelemetryHelper.initTelemetrySettings(opts);
            expect(mockInitTelemetrySettings).toHaveBeenCalledWith(opts);
        });
    });

    describe('createTelemetryData', () => {
        beforeAll(() => {
            mockGetHostEnvironment.mockReturnValue(hostEnvironment.cli);
        });

        it('should return default telemtry data', () => {
            const telemetryData = TelemetryHelper.createTelemetryData();
            expect(telemetryData).toStrictEqual({
                Platform: 'CLI',
                OperatingSystem: expect.any(String)
            });
        });

        it('should return undefined if filterDups is true and previous event timestamp is less than 1 second ago', () => {
            TelemetryHelper.createTelemetryData({ test: 'test' });
            const telemetryData = TelemetryHelper.createTelemetryData({ test: 'test' }, true);
            expect(telemetryData).toBe(undefined);
        });

        it('should return telemetry data if filterDups is true and additionalData is different from previous additionalData', () => {
            TelemetryHelper.createTelemetryData({ test: 'test' });
            TelemetryHelper.createTelemetryData({ test: 'test2' }, true);
            expect(TelemetryHelper.telemetryData).toEqual({
                Platform: 'CLI',
                OperatingSystem: expect.any(String),
                test: 'test2'
            });
        });
    });

    describe('markAppGenStartTime / markAppGenEndTime', () => {
        it('should call Performance.startMark with "LOADING_TIME"', () => {
            const startMarkSpy = jest.spyOn(sapUxTelemetry.PerformanceMeasurementAPI, 'startMark');
            TelemetryHelper.markAppGenStartTime();
            expect(startMarkSpy).toHaveBeenCalledWith('LOADING_TIME');
        });

        it('should call Performance.endMark with "LOADING_TIME"', () => {
            const endMarkSpy = jest.spyOn(sapUxTelemetry.PerformanceMeasurementAPI, 'endMark');
            TelemetryHelper.markAppGenEndTime();
            expect(endMarkSpy).toHaveBeenCalledWith(expect.stringContaining('LOADING_TIME'));
        });
    });
});
