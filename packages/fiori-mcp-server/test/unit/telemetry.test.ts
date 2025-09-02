import { TelemetryHelper } from '../../src/telemetry';
import * as sapUxTelemetry from '@sap-ux/telemetry';
import { ClientFactory } from '@sap-ux/telemetry';
import type { TelemetryData } from '../../src/telemetry';
import { mcpServerName } from '../../src/telemetry';

describe('TelemetryHelper', () => {
    describe('initTelemetrySettings', () => {
        it('should call initTelemetrySettings with the provided options', async () => {
            const initTelemetrySettingsSpy = jest.spyOn(sapUxTelemetry, 'initTelemetrySettings').mockResolvedValue();
            const opts = {
                consumerModule: { name: 'test', version: '1.0.0' },
                internalFeature: true,
                resourceId: 'resource-id',
                watchTelemetrySettingStore: false
            };
            await TelemetryHelper.initTelemetrySettings(opts);
            expect(initTelemetrySettingsSpy).toHaveBeenCalledWith(opts);
        });
    });

    describe('createTelemetryData', () => {
        it('should return default telemetry data', () => {
            const telemetryData = TelemetryHelper.createTelemetryData();
            expect(telemetryData).toStrictEqual({
                Platform: 'VSCode',
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
                Platform: 'VSCode',
                OperatingSystem: expect.any(String),
                test: 'test2'
            });
        });
    });

    test('sendTelemetry', async () => {
        const reportEventSpy = jest.fn();
        jest.spyOn(ClientFactory, 'getTelemetryClient').mockReturnValue({
            reportEvent: reportEventSpy
        } as any);

        const opts = {
            consumerModule: { name: 'test', version: '1.0.0' },
            internalFeature: true,
            resourceId: 'resource-id',
            watchTelemetrySettingStore: false
        };
        await TelemetryHelper.initTelemetrySettings(opts);
        const telemetryData = TelemetryHelper.createTelemetryData({ test: 'test' }) as TelemetryData;
        await TelemetryHelper.sendTelemetry('event', telemetryData);
        expect(reportEventSpy).toHaveBeenCalledWith(
            {
                eventName: 'event',
                measurements: {},
                properties: {
                    test: 'test',
                    Platform: 'VSCode',
                    OperatingSystem: expect.any(String)
                }
            },
            2,
            undefined
        );
    });

    test('getTelemetryName', async () => {
        expect(TelemetryHelper.getTelemetryName()).toEqual(mcpServerName);
    });

    describe('markToolsStartTime / markToolsEndTime', () => {
        it('should call Performance.startMark with "LOADING_TIME"', () => {
            const startMarkSpy = jest.spyOn(sapUxTelemetry.PerformanceMeasurementAPI, 'startMark');
            TelemetryHelper.markToolStartTime();
            expect(startMarkSpy).toHaveBeenCalledWith('MCP_LOADING_TIME');
        });

        it('should call Performance.endMark with "LOADING_TIME"', () => {
            const endMarkSpy = jest.spyOn(sapUxTelemetry.PerformanceMeasurementAPI, 'endMark');
            TelemetryHelper.markToolsEndTime();
            expect(endMarkSpy).toHaveBeenCalledWith(expect.stringContaining('MCP_LOADING_TIME'));
        });
    });
});
