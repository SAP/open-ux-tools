import { jest } from '@jest/globals';
import type { TelemetryData } from '../../src/telemetry.js';

const mockInitTelemetrySettings = jest.fn().mockResolvedValue(undefined);
const mockGetTelemetryClient = jest.fn();
const mockStartMark = jest.fn();
const mockEndMark = jest.fn();

jest.unstable_mockModule('@sap-ux/telemetry', () => ({
    initTelemetrySettings: mockInitTelemetrySettings,
    ClientFactory: {
        getTelemetryClient: mockGetTelemetryClient
    },
    PerformanceMeasurementAPI: {
        startMark: mockStartMark,
        endMark: mockEndMark,
        getMeasurementDuration: jest.fn(),
        measure: jest.fn()
    },
    SampleRate: { NoSampling: 2 }
}));

jest.unstable_mockModule('@sap-ux/feature-toggle', () => ({
    isInternalFeaturesSettingEnabled: jest.fn().mockReturnValue(false)
}));

jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn().mockReturnValue(false)
}));

const { TelemetryHelper, mcpServerName } = await import('../../src/telemetry');

describe('TelemetryHelper', () => {
    const opts = {
        consumerModule: { name: 'test', version: '1.0.0' },
        internalFeature: true,
        resourceId: 'resource-id',
        watchTelemetrySettingStore: false
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('initTelemetrySettings', () => {
        it('should call initTelemetrySettings with the provided options', async () => {
            await TelemetryHelper.initTelemetrySettings(opts);
            expect(mockInitTelemetrySettings).toHaveBeenCalledWith(opts);
        });
    });

    describe('createTelemetryData', () => {
        it('should return default telemetry data', () => {
            const telemetryData = TelemetryHelper.createTelemetryData();
            expect(telemetryData).toStrictEqual({
                Platform: 'VSCode',
                OperatingSystem: expect.any(String),
                SessionId: expect.any(String)
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
                SessionId: expect.any(String),
                test: 'test2'
            });
        });
    });

    test('sendTelemetry', async () => {
        const reportEventSpy = jest.fn();
        mockGetTelemetryClient.mockReturnValue({
            reportEvent: reportEventSpy
        });

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
                    OperatingSystem: expect.any(String),
                    SessionId: expect.any(String)
                }
            },
            2,
            undefined
        );
    });

    test('sendTelemetry - error case', async () => {
        const reportEventSpy = jest.fn();
        mockGetTelemetryClient.mockReturnValue({
            reportEvent: reportEventSpy
        });

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
                    OperatingSystem: expect.any(String),
                    SessionId: expect.any(String)
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
            TelemetryHelper.markToolStartTime();
            expect(mockStartMark).toHaveBeenCalledWith('MCP_LOADING_TIME');
        });

        it('should call Performance.endMark with "LOADING_TIME"', () => {
            mockStartMark.mockReturnValue('MCP_LOADING_TIME_mock');
            TelemetryHelper.markToolStartTime();
            TelemetryHelper.markToolsEndTime();
            expect(mockEndMark).toHaveBeenCalledWith(expect.stringContaining('MCP_LOADING_TIME'));
        });
    });
});
