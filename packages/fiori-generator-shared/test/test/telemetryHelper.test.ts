import { TelemetryHelper } from '../../src/telemetry';
import * as sapUxTelemetry from '@sap-ux/telemetry';
import * as envUtils from '../../src/environment';
import { hostEnvironment } from '../../src/types';

describe('TelemetryHelper', () => {
    describe('initTelemetrySettings', () => {
        it('should call initTelemetrySettings with the provided options', async () => {
            const initTelemetrySettingsSpy = jest.spyOn(sapUxTelemetry, 'initTelemetrySettings').mockResolvedValue();
            const opts = {
                consumerModule: { name: 'test', version: '1.0.0' },
                internalFeature: true,
                watchTelemetrySettingStore: false
            };
            await TelemetryHelper.initTelemetrySettings(opts);
            expect(initTelemetrySettingsSpy).toHaveBeenCalledWith(opts);
        });
    });

    describe('createTelemetryData', () => {
        beforeAll(() => {
            jest.spyOn(envUtils, 'getHostEnvironment').mockReturnValue(hostEnvironment.cli);
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
