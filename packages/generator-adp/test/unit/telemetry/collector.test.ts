import { PerformanceMeasurementAPI, initTelemetrySettings } from '@sap-ux/telemetry';
import { TelemetryHelper, sendTelemetry } from '@sap-ux/fiori-generator-shared';
import type { ToolsLogger } from '@sap-ux/logger';

import { TelemetryCollector } from '../../../src/telemetry/collector';

jest.mock('@sap-ux/telemetry', () => ({
    PerformanceMeasurementAPI: {
        startMark: jest.fn(),
        endMark: jest.fn(),
        measure: jest.fn(),
        getMeasurementDuration: jest.fn()
    },
    initTelemetrySettings: jest.fn()
}));

jest.mock('@sap-ux/fiori-generator-shared', () => ({
    TelemetryHelper: {
        createTelemetryData: jest.fn()
    },
    sendTelemetry: jest.fn()
}));

const mockSendTelemetry = sendTelemetry as jest.Mock;
const mockEndMark = PerformanceMeasurementAPI.endMark as jest.Mock;
const mockMeasure = PerformanceMeasurementAPI.measure as jest.Mock;
const mockInitTelemetrySettings = initTelemetrySettings as jest.Mock;
const mockStartMark = PerformanceMeasurementAPI.startMark as jest.Mock;
const mockCreateTelemetryData = TelemetryHelper.createTelemetryData as jest.Mock;
const mockGetMeasurementDuration = PerformanceMeasurementAPI.getMeasurementDuration as jest.Mock;

/**
 * Flushes all pending promises in the event loop.
 * This ensures all microtasks and macrotasks are processed. More reliable than setTimeout(0) in CI/CD environments.
 */
const flushPromises = async (): Promise<void> => {
    // Flush microtasks (Promise callbacks)
    await Promise.resolve();
    // Flush macrotasks (setTimeout, setImmediate, etc.)
    return new Promise((resolve) => {
        if (typeof setImmediate !== 'undefined') {
            setImmediate(resolve);
        } else {
            setTimeout(resolve, 0);
        }
    });
};

describe('TelemetryCollector', () => {
    let collector: TelemetryCollector;
    let mockLogger: ToolsLogger;

    beforeEach(() => {
        jest.clearAllMocks();
        mockInitTelemetrySettings.mockResolvedValue(undefined);
        mockSendTelemetry.mockResolvedValue(undefined);
        mockLogger = {
            log: jest.fn(),
            error: jest.fn()
        } as unknown as ToolsLogger;
    });

    describe('init', () => {
        it('should create instance and initialize telemetry settings', async () => {
            collector = await TelemetryCollector.init('1.0.0', false);

            expect(mockInitTelemetrySettings).toHaveBeenCalledWith({
                consumerModule: {
                    name: '@sap/generator-fiori:generator-adp',
                    version: '1.0.0'
                },
                internalFeature: false,
                watchTelemetrySettingStore: false
            });
            expect(collector).toBeInstanceOf(TelemetryCollector);
        });
    });

    describe('setData', () => {
        beforeEach(async () => {
            collector = await TelemetryCollector.init('1.0.0', false);
        });

        it('should set string property', async () => {
            collector.setData('baseAppTechnicalName', 'test-app-id');
            collector.setData('projectType', 'cloudReady');
            collector.setData('ui5VersionSelected', '1.120.0');
            collector.setData('applicationListLoadingTime', 150.5);
            collector.setData('wasTypeScriptChosen', true);

            mockCreateTelemetryData.mockReturnValue({});
            collector.send('TEST_EVENT');

            await flushPromises();

            expect(mockCreateTelemetryData).toHaveBeenCalledWith(
                expect.objectContaining({
                    baseAppTechnicalName: 'test-app-id',
                    projectType: 'cloudReady',
                    ui5VersionSelected: '1.120.0',
                    applicationListLoadingTime: 150.5,
                    wasTypeScriptChosen: true
                })
            );
        });

        it('should set boolean property', async () => {
            collector.setData('wasExtProjectGenerated', true);
            collector.setData('wasFlpConfigDone', true);
            collector.setData('wasDeployConfigDone', false);

            mockCreateTelemetryData.mockReturnValue({});
            collector.send('TEST_EVENT');

            await flushPromises();

            expect(mockCreateTelemetryData).toHaveBeenCalledWith(
                expect.objectContaining({
                    wasExtProjectGenerated: true,
                    wasFlpConfigDone: true,
                    wasDeployConfigDone: false,
                    wasTypeScriptChosen: false
                })
            );
        });
    });

    describe('setBatch', () => {
        beforeEach(async () => {
            collector = await TelemetryCollector.init('1.0.0', false);
        });

        it('should set multiple properties at once', async () => {
            collector.setData('baseAppTechnicalName', 'initial-app');
            collector.setBatch({
                projectType: 'onPremise',
                numberOfApplications: 30,
                wasFlpConfigDone: true,
                wasTypeScriptChosen: false
            });

            mockCreateTelemetryData.mockReturnValue({});
            collector.send('TEST_EVENT');

            await flushPromises();

            expect(mockCreateTelemetryData).toHaveBeenCalledWith(
                expect.objectContaining({
                    baseAppTechnicalName: 'initial-app',
                    projectType: 'onPremise',
                    numberOfApplications: 30,
                    wasFlpConfigDone: true,
                    wasTypeScriptChosen: false,
                    wasExtProjectGenerated: false, // Default value
                    wasDeployConfigDone: false // Default value
                })
            );
        });
    });

    describe('startTiming', () => {
        beforeEach(async () => {
            collector = await TelemetryCollector.init('1.0.0', false);
        });

        it('should start timing and store mark name', () => {
            const markName = 'mark-123';
            mockStartMark.mockReturnValue(markName);

            collector.startTiming('applicationListLoadingTime');

            expect(mockStartMark).toHaveBeenCalledWith('applicationListLoadingTime');
            // Verify mark is stored by checking endTiming works
            mockGetMeasurementDuration.mockReturnValue(250.75);
            collector.endTiming('applicationListLoadingTime');
            expect(mockEndMark).toHaveBeenCalledWith(markName);
        });
    });

    describe('endTiming', () => {
        beforeEach(async () => {
            collector = await TelemetryCollector.init('1.0.0', false);
        });

        it('should end timing and store duration', async () => {
            const markName = 'mark-123';
            mockStartMark.mockReturnValue(markName);
            mockGetMeasurementDuration.mockReturnValue(250.75);

            collector.startTiming('applicationListLoadingTime');
            collector.endTiming('applicationListLoadingTime');

            expect(mockEndMark).toHaveBeenCalledWith(markName);
            expect(mockMeasure).toHaveBeenCalledWith(markName);
            expect(mockGetMeasurementDuration).toHaveBeenCalledWith(markName);

            mockCreateTelemetryData.mockReturnValue({});
            collector.send('TEST_EVENT');

            await flushPromises();

            expect(mockCreateTelemetryData).toHaveBeenCalledWith(
                expect.objectContaining({
                    applicationListLoadingTime: 250.75
                })
            );
        });

        it('should remove mark after ending timing', () => {
            const markName = 'mark-123';
            mockStartMark.mockReturnValue(markName);
            mockGetMeasurementDuration.mockReturnValue(100);

            collector.startTiming('applicationListLoadingTime');
            collector.endTiming('applicationListLoadingTime');

            // Calling endTiming again should not call endMark (mark was removed)
            jest.clearAllMocks();
            collector.endTiming('applicationListLoadingTime');
            expect(mockEndMark).not.toHaveBeenCalled();
        });

        it('should handle endTiming without startTiming', () => {
            collector.endTiming('applicationListLoadingTime');

            expect(mockEndMark).not.toHaveBeenCalled();
            expect(mockMeasure).not.toHaveBeenCalled();
        });
    });

    describe('send', () => {
        beforeEach(async () => {
            collector = await TelemetryCollector.init('1.0.0', false);
        });

        it('should send telemetry with collected data', async () => {
            collector.setData('baseAppTechnicalName', 'test-app');
            collector.setData('projectType', 'cloudReady');

            const telemetryData = {
                appType: 'generator-adp',
                baseAppTechnicalName: 'test-app',
                projectType: 'cloudReady',
                wasExtProjectGenerated: false,
                wasFlpConfigDone: false,
                wasDeployConfigDone: false,
                wasTypeScriptChosen: false
            };

            mockCreateTelemetryData.mockReturnValue(telemetryData);
            mockSendTelemetry.mockResolvedValue(undefined);

            collector.send('TEST_EVENT', '/project/path', undefined, mockLogger);

            await flushPromises();

            expect(mockCreateTelemetryData).toHaveBeenCalledWith(
                expect.objectContaining({
                    appType: 'generator-adp',
                    baseAppTechnicalName: 'test-app',
                    projectType: 'cloudReady'
                })
            );
            expect(mockSendTelemetry).toHaveBeenCalledWith('TEST_EVENT', telemetryData, '/project/path');

            expect(mockLogger.log).toHaveBeenCalledWith('Event TEST_EVENT successfully sent');
        });

        it('should merge additional data with collected data', async () => {
            collector.setData('baseAppTechnicalName', 'collected-app');

            const telemetryData = { merged: 'data' };
            mockCreateTelemetryData.mockReturnValue(telemetryData);
            mockSendTelemetry.mockResolvedValue(undefined);

            collector.send('TEST_EVENT', undefined, { customProp: 'customValue' }, mockLogger);

            await flushPromises();

            expect(mockCreateTelemetryData).toHaveBeenCalledWith(
                expect.objectContaining({
                    appType: 'generator-adp',
                    customProp: 'customValue',
                    baseAppTechnicalName: 'collected-app'
                })
            );

            expect(mockSendTelemetry).toHaveBeenCalledWith('TEST_EVENT', telemetryData, undefined);
        });

        it('should not send if createTelemetryData returns undefined', () => {
            mockCreateTelemetryData.mockReturnValue(undefined);

            collector.send('TEST_EVENT');

            expect(mockSendTelemetry).not.toHaveBeenCalled();
        });

        it('should handle sendTelemetry rejection', async () => {
            collector.setData('baseAppTechnicalName', 'test-app');
            const error = new Error('Network error');
            mockCreateTelemetryData.mockReturnValue({ data: 'test' });
            mockSendTelemetry.mockRejectedValue(error);

            collector.send('TEST_EVENT', undefined, undefined, mockLogger);

            await flushPromises();

            expect(mockLogger.error).toHaveBeenCalledWith(`Failed to send telemetry: ${error}`);
        });
    });
});
